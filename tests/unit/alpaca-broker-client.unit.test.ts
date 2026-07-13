import { describe, expect, it, vi } from "vitest"

import {
  AlpacaBrokerAuthenticationError,
  AlpacaBrokerRequestError,
  createAlpacaBrokerClient,
} from "../../lib/alpaca/broker-client"
import type {
  AlpacaLogEvent,
  AlpacaTokenService,
} from "../../lib/alpaca/token-service"

function tokenService(tokens: string[]) {
  const getAccessToken = vi.fn(async () => {
    const token = tokens.shift()
    if (!token) throw new Error("No fake token available")
    return token
  })
  const invalidateIfCurrent = vi.fn<(tokenUsed: string) => void>(() => {})

  return {
    getAccessToken,
    invalidateIfCurrent,
  } satisfies AlpacaTokenService
}

describe("Alpaca Broker client", () => {
  it("attaches authorization immediately before a sandbox request", async () => {
    const tokens = tokenService(["SECRET_BEARER"])
    const fetchImplementation = vi.fn(async (_url, init) => {
      expect(new Headers(init?.headers).get("authorization")).toBe(
        "Bearer SECRET_BEARER",
      )
      return new Response("ok", {
        status: 200,
        headers: { "x-request-id": "request-123" },
      })
    }) as unknown as typeof fetch
    const logs: AlpacaLogEvent[] = []
    const client = createAlpacaBrokerClient({
      fetch: fetchImplementation,
      tokenService: tokens,
      logger: (event) => logs.push(event),
    })

    const response = await client.request("/v1/accounts?status=active", {
      authenticationReplay: "safe-once",
    })

    expect(response.status).toBe(200)
    const [url] = (fetchImplementation as ReturnType<typeof vi.fn>).mock
      .calls[0]
    expect(String(url)).toBe(
      "https://broker-api.sandbox.alpaca.markets/v1/accounts?status=active",
    )
    expect(logs).toContainEqual(
      expect.objectContaining({
        category: "broker_response",
        status: 200,
        requestId: "request-123",
      }),
    )
  })

  it("prevents callers from overriding Authorization in any casing", async () => {
    const tokens = tokenService(["TOKEN"])
    const fetchImplementation = vi.fn()
    const client = createAlpacaBrokerClient({
      fetch: fetchImplementation as typeof fetch,
      tokenService: tokens,
      logger: () => {},
    })

    await expect(
      client.request("/v1/accounts", {
        authenticationReplay: "never",
        headers: { AUTHORIZATION: "attacker value" },
      }),
    ).rejects.toBeInstanceOf(AlpacaBrokerRequestError)
    expect(tokens.getAccessToken).not.toHaveBeenCalled()
    expect(fetchImplementation).not.toHaveBeenCalled()
  })

  it("rejects requests to a non-sandbox origin", async () => {
    const tokens = tokenService(["TOKEN"])
    const client = createAlpacaBrokerClient({
      fetch: vi.fn() as unknown as typeof fetch,
      tokenService: tokens,
      logger: () => {},
    })

    await expect(
      client.request("https://example.com/steal", {
        authenticationReplay: "never",
      }),
    ).rejects.toThrow("sandbox API origin")
    expect(tokens.getAccessToken).not.toHaveBeenCalled()
  })

  it("invalidates and safely replays once after a 401", async () => {
    const tokens = tokenService(["TOKEN_ONE", "TOKEN_TWO"])
    const fetchImplementation = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 401,
          headers: { "x-request-id": "first-request" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(null, {
          status: 200,
          headers: { "x-request-id": "second-request" },
        }),
      )
    const client = createAlpacaBrokerClient({
      fetch: fetchImplementation as typeof fetch,
      tokenService: tokens,
      logger: () => {},
    })

    await expect(
      client.request("/v1/accounts", {
        method: "GET",
        authenticationReplay: "safe-once",
      }),
    ).resolves.toMatchObject({ status: 200 })

    expect(tokens.invalidateIfCurrent).toHaveBeenCalledWith("TOKEN_ONE")
    expect(tokens.getAccessToken).toHaveBeenCalledTimes(2)
    expect(
      new Headers(fetchImplementation.mock.calls[1][1].headers).get(
        "authorization",
      ),
    ).toBe("Bearer TOKEN_TWO")
  })

  it("stops waiting for authentication when the caller aborts", async () => {
    let releaseToken: (token: string) => void = () => {}
    const pendingToken = new Promise<string>((resolve) => {
      releaseToken = resolve
    })
    const tokens: AlpacaTokenService = {
      getAccessToken: vi.fn(() => pendingToken),
      invalidateIfCurrent: vi.fn(),
    }
    const fetchImplementation = vi.fn()
    const client = createAlpacaBrokerClient({
      fetch: fetchImplementation as typeof fetch,
      tokenService: tokens,
      logger: () => {},
    })
    const controller = new AbortController()

    const request = client.request("/v1/accounts", {
      signal: controller.signal,
      authenticationReplay: "safe-once",
    })
    controller.abort(new DOMException("Timed out", "TimeoutError"))

    await expect(request).rejects.toMatchObject({ name: "TimeoutError" })
    releaseToken("TOKEN")
    await pendingToken
    expect(fetchImplementation).not.toHaveBeenCalled()
  })

  it("does not make a second replay when the replay also returns 401", async () => {
    const tokens = tokenService(["TOKEN_ONE", "TOKEN_TWO"])
    const fetchImplementation = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(
        new Response(null, {
          status: 401,
          headers: { "x-request-id": "failed-replay" },
        }),
      )
    const client = createAlpacaBrokerClient({
      fetch: fetchImplementation as typeof fetch,
      tokenService: tokens,
      logger: () => {},
    })

    const error = await client
      .request("/v1/accounts", { authenticationReplay: "safe-once" })
      .catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(AlpacaBrokerAuthenticationError)
    expect(error).toMatchObject({ requestId: "failed-replay" })
    expect(fetchImplementation).toHaveBeenCalledTimes(2)
    expect(tokens.invalidateIfCurrent).toHaveBeenNthCalledWith(2, "TOKEN_TWO")
  })

  it("never replays an unverified mutation and returns a typed auth failure", async () => {
    const tokens = tokenService(["MUTATION_TOKEN"])
    const fetchImplementation = vi.fn(async () =>
      Promise.resolve(
        new Response(null, {
          status: 401,
          headers: { "x-request-id": "mutation-request" },
        }),
      ),
    )
    const client = createAlpacaBrokerClient({
      fetch: fetchImplementation as typeof fetch,
      tokenService: tokens,
      logger: () => {},
    })

    await expect(
      client.request("/v1/trading/accounts/account/orders", {
        method: "POST",
        body: JSON.stringify({ symbol: "AAPL" }),
        authenticationReplay: "never",
      }),
    ).rejects.toMatchObject({
      name: "AlpacaBrokerAuthenticationError",
      status: 401,
      requestId: "mutation-request",
    })
    expect(fetchImplementation).toHaveBeenCalledOnce()
    expect(tokens.invalidateIfCurrent).toHaveBeenCalledWith("MUTATION_TOKEN")
    expect(tokens.getAccessToken).toHaveBeenCalledOnce()
  })

  it("requires explicit idempotency proof before safely replaying a mutation", async () => {
    const tokens = tokenService(["TOKEN"])
    const fetchImplementation = vi.fn()
    const client = createAlpacaBrokerClient({
      fetch: fetchImplementation as typeof fetch,
      tokenService: tokens,
      logger: () => {},
    })

    await expect(
      client.request("/v1/accounts", {
        method: "POST",
        authenticationReplay: "safe-once",
      }),
    ).rejects.toThrow("proven idempotent")
    expect(fetchImplementation).not.toHaveBeenCalled()
    expect(tokens.getAccessToken).not.toHaveBeenCalled()
  })

  it("keeps tokens and authorization headers out of logs and thrown errors", async () => {
    const secretToken = "BEARER_MUST_BE_REDACTED"
    const tokens = tokenService([secretToken])
    const logs: AlpacaLogEvent[] = []
    const client = createAlpacaBrokerClient({
      fetch: vi.fn(async () =>
        Promise.resolve(
          new Response(null, {
            status: 401,
            headers: { "x-request-id": "safe-request-id" },
          }),
        ),
      ) as unknown as typeof fetch,
      tokenService: tokens,
      logger: (event) => logs.push(event),
    })

    const error = await client
      .request("/v1/accounts", { authenticationReplay: "never" })
      .catch((caught: unknown) => caught)
    const output = JSON.stringify({ logs, error: String(error) })

    expect(output).not.toContain(secretToken)
    expect(output.toLowerCase()).not.toContain("authorization")
    expect(output).toContain("safe-request-id")
  })
})
