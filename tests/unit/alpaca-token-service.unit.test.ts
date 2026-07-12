import { describe, expect, it, vi } from "vitest"

import {
  ALPACA_TOKEN_URL,
  getAlpacaConfig,
  type AlpacaConfig,
} from "../../lib/alpaca/config"
import {
  AlpacaTokenError,
  createAlpacaTokenService,
  type AlpacaLogEvent,
} from "../../lib/alpaca/token-service"

const config: AlpacaConfig = {
  environment: "sandbox",
  tokenUrl: ALPACA_TOKEN_URL,
  clientId: "CLIENT_ID_DO_NOT_EXPOSE",
  clientSecret: "CLIENT_SECRET_DO_NOT_EXPOSE",
}

function tokenResponse(token: string, expiresIn = 900) {
  return new Response(
    JSON.stringify({
      access_token: token,
      expires_in: expiresIn,
      token_type: "Bearer",
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  )
}

function setup(
  fetchImplementation: typeof fetch,
  initialTime = 1_000_000,
) {
  let time = initialTime
  const logs: AlpacaLogEvent[] = []
  const sleep = vi.fn(async () => {})
  const service = createAlpacaTokenService({
    fetch: fetchImplementation,
    now: () => time,
    config,
    logger: (event) => logs.push(event),
    sleep,
    random: () => 0,
  })

  return {
    service,
    logs,
    sleep,
    advance(milliseconds: number) {
      time += milliseconds
    },
  }
}

describe("Alpaca server configuration", () => {
  it("fails closed without disclosing a partially configured credential", () => {
    const secret = "PARTIAL_SECRET_MUST_NOT_LEAK"

    expect(() =>
      getAlpacaConfig({ ALPACA_BROKER_CLIENT_SECRET: secret }),
    ).toThrow("Alpaca Broker API credentials are not configured.")

    try {
      getAlpacaConfig({ ALPACA_BROKER_CLIENT_SECRET: secret })
    } catch (error) {
      expect(String(error)).not.toContain(secret)
    }
  })

  it("always resolves code-defined sandbox endpoints", () => {
    const resolved = getAlpacaConfig({
      ALPACA_BROKER_CLIENT_ID: "id",
      ALPACA_BROKER_CLIENT_SECRET: "secret",
      NODE_ENV: "production",
      APP_ENV: "staging",
    })

    expect(resolved.environment).toBe("sandbox")
    expect(resolved.tokenUrl).toBe(ALPACA_TOKEN_URL)
  })
})

describe("Alpaca token service", () => {
  it("posts the exact client credentials form to the uncached sandbox endpoint", async () => {
    const fetchImplementation = vi.fn<
      (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
    >(async () => tokenResponse("TOKEN_ONE"))
    const { service } = setup(fetchImplementation as typeof fetch)

    await expect(service.getAccessToken()).resolves.toBe("TOKEN_ONE")

    expect(fetchImplementation).toHaveBeenCalledOnce()
    const [url, init] = fetchImplementation.mock.calls[0]
    expect(init).toBeDefined()
    if (!init) throw new Error("Expected token request options")
    expect(url).toBe(ALPACA_TOKEN_URL)
    expect(init).toMatchObject({
      method: "POST",
      cache: "no-store",
      headers: { "content-type": "application/x-www-form-urlencoded" },
    })
    expect(Object.fromEntries((init.body as URLSearchParams).entries())).toEqual(
      {
        grant_type: "client_credentials",
        client_id: config.clientId,
        client_secret: config.clientSecret,
      },
    )
    expect(new Headers(init.headers).has("authorization")).toBe(false)
  })

  it("reuses a token before the refresh window", async () => {
    const fetchImplementation = vi.fn(async () => tokenResponse("TOKEN_ONE"))
    const { service, advance, logs } = setup(fetchImplementation as typeof fetch)

    expect(await service.getAccessToken()).toBe("TOKEN_ONE")
    advance(839_000)
    expect(await service.getAccessToken()).toBe("TOKEN_ONE")

    expect(fetchImplementation).toHaveBeenCalledOnce()
    expect(logs.at(-1)?.category).toBe("token_cache_hit")
  })

  it("refreshes inside the safety window and after a simulated freeze/thaw", async () => {
    const fetchImplementation = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse("TOKEN_ONE", 120))
      .mockResolvedValueOnce(tokenResponse("TOKEN_TWO", 120))
      .mockResolvedValueOnce(tokenResponse("TOKEN_THREE", 120))
    const { service, advance } = setup(fetchImplementation as typeof fetch)

    expect(await service.getAccessToken()).toBe("TOKEN_ONE")
    advance(60_001)
    expect(await service.getAccessToken()).toBe("TOKEN_TWO")
    advance(500_000)
    expect(await service.getAccessToken()).toBe("TOKEN_THREE")
    expect(fetchImplementation).toHaveBeenCalledTimes(3)
  })

  it("deduplicates concurrent refreshes and clears in-flight state after success", async () => {
    let resolveRequest!: (response: Response) => void
    const firstRequest = new Promise<Response>((resolve) => {
      resolveRequest = resolve
    })
    const fetchImplementation = vi
      .fn()
      .mockReturnValueOnce(firstRequest)
      .mockResolvedValueOnce(tokenResponse("TOKEN_TWO"))
    const { service } = setup(fetchImplementation as typeof fetch)

    const callers = [service.getAccessToken(), service.getAccessToken()]
    expect(fetchImplementation).toHaveBeenCalledOnce()
    resolveRequest(tokenResponse("TOKEN_ONE", 1))
    await expect(Promise.all(callers)).resolves.toEqual([
      "TOKEN_ONE",
      "TOKEN_ONE",
    ])

    await expect(service.getAccessToken()).resolves.toBe("TOKEN_TWO")
    expect(fetchImplementation).toHaveBeenCalledTimes(2)
  })

  it("clears in-flight state after failure so a later caller can recover", async () => {
    const fetchImplementation = vi
      .fn()
      .mockRejectedValueOnce(new Error("network secret details"))
      .mockRejectedValueOnce(new Error("network secret details"))
      .mockResolvedValueOnce(tokenResponse("TOKEN_OK"))
    const { service } = setup(fetchImplementation as typeof fetch)

    await expect(service.getAccessToken()).rejects.toMatchObject({
      code: "network",
    })
    await expect(service.getAccessToken()).resolves.toBe("TOKEN_OK")
    expect(fetchImplementation).toHaveBeenCalledTimes(3)
  })

  it("retries network failures, 429, and 5xx at most once", async () => {
    for (const firstFailure of [
      new Error("offline"),
      new Response(null, { status: 429, headers: { "retry-after": "2" } }),
      new Response(null, { status: 503 }),
    ]) {
      const fetchImplementation = vi
        .fn()
        .mockImplementationOnce(async () => {
          if (firstFailure instanceof Error) throw firstFailure
          return firstFailure
        })
        .mockResolvedValueOnce(tokenResponse("TOKEN_OK"))
      const { service, sleep } = setup(fetchImplementation as typeof fetch)

      await expect(service.getAccessToken()).resolves.toBe("TOKEN_OK")
      expect(fetchImplementation).toHaveBeenCalledTimes(2)
      expect(sleep).toHaveBeenCalledOnce()
      if (firstFailure instanceof Response && firstFailure.status === 429) {
        expect(sleep).toHaveBeenCalledWith(2_000)
      }
    }
  })

  it("does not retry non-retryable 4xx responses", async () => {
    const fetchImplementation = vi.fn(async () =>
      Promise.resolve(new Response("credentials", { status: 401 })),
    )
    const { service, sleep } = setup(fetchImplementation as typeof fetch)

    await expect(service.getAccessToken()).rejects.toMatchObject({
      code: "http",
      status: 401,
    })
    expect(fetchImplementation).toHaveBeenCalledOnce()
    expect(sleep).not.toHaveBeenCalled()
  })

  it.each([
    { access_token: "", expires_in: 900, token_type: "Bearer" },
    { access_token: "   ", expires_in: 900, token_type: "Bearer" },
    { access_token: "TOKEN", expires_in: 0, token_type: "Bearer" },
    { access_token: "TOKEN", expires_in: 1.5, token_type: "Bearer" },
    { access_token: "TOKEN", expires_in: 900, token_type: "bearer" },
    { access_token: "TOKEN", expires_in: 900 },
  ])("rejects malformed successful token response %#", async (body) => {
    const fetchImplementation = vi.fn(async () =>
      Promise.resolve(new Response(JSON.stringify(body), { status: 200 })),
    )
    const { service } = setup(fetchImplementation as typeof fetch)

    await expect(service.getAccessToken()).rejects.toMatchObject({
      code: "malformed_response",
    })
    expect(fetchImplementation).toHaveBeenCalledOnce()
  })

  it("rejects non-JSON success responses without caching", async () => {
    const fetchImplementation = vi
      .fn()
      .mockResolvedValueOnce(new Response("not-json", { status: 200 }))
      .mockResolvedValueOnce(tokenResponse("TOKEN_OK"))
    const { service } = setup(fetchImplementation as typeof fetch)

    await expect(service.getAccessToken()).rejects.toBeInstanceOf(AlpacaTokenError)
    await expect(service.getAccessToken()).resolves.toBe("TOKEN_OK")
  })

  it("uses a still-valid old token when early refresh fails, but never after expiry", async () => {
    const fetchImplementation = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse("OLD_TOKEN", 90))
      .mockRejectedValue(new Error("offline"))
    const { service, advance } = setup(fetchImplementation as typeof fetch)

    expect(await service.getAccessToken()).toBe("OLD_TOKEN")
    advance(31_000)
    expect(await service.getAccessToken()).toBe("OLD_TOKEN")
    advance(60_000)
    await expect(service.getAccessToken()).rejects.toMatchObject({
      code: "network",
    })
  })

  it("conditionally invalidates without erasing a newer token", async () => {
    const fetchImplementation = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse("OLD_TOKEN", 90))
      .mockResolvedValueOnce(tokenResponse("NEW_TOKEN", 900))
    const { service, advance } = setup(fetchImplementation as typeof fetch)

    expect(await service.getAccessToken()).toBe("OLD_TOKEN")
    advance(31_000)
    expect(await service.getAccessToken()).toBe("NEW_TOKEN")
    service.invalidateIfCurrent("OLD_TOKEN")
    expect(await service.getAccessToken()).toBe("NEW_TOKEN")
    expect(fetchImplementation).toHaveBeenCalledTimes(2)
  })

  it("times out, retries once, and emits only redaction-safe errors and logs", async () => {
    vi.useFakeTimers()
    try {
      const fetchImplementation = vi.fn(
        (_input: RequestInfo | URL, init?: RequestInit) =>
          new Promise<Response>((_, reject) => {
            init?.signal?.addEventListener(
              "abort",
              () => reject(init.signal?.reason),
              { once: true },
            )
          }),
      )
      const logs: AlpacaLogEvent[] = []
      const service = createAlpacaTokenService({
        fetch: fetchImplementation as typeof fetch,
        now: Date.now,
        config,
        logger: (event) => logs.push(event),
        sleep: async () => {},
        timeoutMs: 10,
      })

      const request = service.getAccessToken().catch((caught: unknown) => caught)
      await vi.advanceTimersByTimeAsync(20)
      const error = await request

      expect(error).toMatchObject({ code: "timeout" })
      expect(fetchImplementation).toHaveBeenCalledTimes(2)
      const output = JSON.stringify({ error: String(error), logs })
      expect(output).not.toContain(config.clientId)
      expect(output).not.toContain(config.clientSecret)
      expect(output).not.toContain("OLD_TOKEN")
    } finally {
      vi.useRealTimers()
    }
  })
})
