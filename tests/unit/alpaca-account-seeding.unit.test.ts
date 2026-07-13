import { describe, expect, it, vi } from "vitest"

import {
  seedBrokerageAccount,
  type AccountSeedingDependencies,
} from "../../lib/alpaca/account-seeding"

function json(value: unknown, status = 200, requestId?: string) {
  return new Response(JSON.stringify(value), {
    status,
    headers: requestId ? { "x-request-id": requestId } : undefined,
  })
}

function dependencies(
  overrides: Partial<AccountSeedingDependencies> = {},
): AccountSeedingDependencies {
  let now = 0
  return {
    databaseTarget: "development",
    sweepAccountId: "sweep-account",
    findBrokerageAccount: vi.fn(async () => ({
      alpacaAccountId: "brokerage-account",
      provisioningStatus: "linked",
    })),
    brokerRequest: vi.fn(async (path) =>
      path.includes("/trading/")
        ? json({ buying_power: "125.50" })
        : json({ id: "journal-1", status: "executed" }),
    ),
    randomUUID: () => "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    now: () => now,
    sleep: async (milliseconds) => {
      now += milliseconds
    },
    warn: vi.fn(),
    ...overrides,
  }
}

describe("Alpaca sandbox Account Seeding", () => {
  it("resolves email case-insensitively, creates one idempotent JNLC Journal, and reports Buying Power", async () => {
    const deps = dependencies()

    await expect(
      seedBrokerageAccount("Demo.User@Example.com", "50.00", deps),
    ).resolves.toEqual({
      state: "executed",
      journalId: "journal-1",
      journalStatus: "executed",
      buyingPower: "125.50",
      warnings: [],
    })

    expect(deps.findBrokerageAccount).toHaveBeenCalledWith(
      "demo.user@example.com",
    )
    expect(deps.brokerRequest).toHaveBeenNthCalledWith(
      1,
      "/v1/journals",
      expect.objectContaining({
        method: "POST",
        authenticationReplay: "safe-once",
        idempotency: "proven",
        headers: expect.any(Headers),
      }),
    )
    const createOptions = vi.mocked(deps.brokerRequest).mock.calls[0][1]
    expect(new Headers(createOptions.headers).get("idempotency-key")).toMatch(
      /^[0-9a-f-]{36}$/,
    )
    expect(JSON.parse(createOptions.body as string)).toEqual({
      entry_type: "JNLC",
      from_account: "sweep-account",
      to_account: "brokerage-account",
      amount: "50.00",
      currency: "USD",
    })
    expect(deps.brokerRequest).toHaveBeenNthCalledWith(
      2,
      "/v1/trading/accounts/brokerage-account/account",
      expect.objectContaining({ authenticationReplay: "safe-once" }),
    )
  })

  it.each([
    ["missing User", undefined, "No User matches that email."],
    [
      "unlinked Brokerage Account",
      { alpacaAccountId: null, provisioningStatus: "pending" },
      "The User does not have a linked Brokerage Account.",
    ],
  ])("rejects a %s before Alpaca access", async (_case, account, message) => {
    const deps = dependencies({
      findBrokerageAccount: vi.fn(async () => account),
    })

    await expect(
      seedBrokerageAccount("demo@example.com", "10", deps),
    ).resolves.toMatchObject({ state: "failed", message })
    expect(deps.brokerRequest).not.toHaveBeenCalled()
  })

  it.each(["", "nope", "0", "0.00", "-1", "+1", "1e2", "1.001"])(
    "rejects invalid amount %j before lookup or Alpaca access",
    async (amount) => {
      const deps = dependencies()

      await expect(
        seedBrokerageAccount("demo@example.com", amount, deps),
      ).resolves.toMatchObject({ state: "failed" })
      expect(deps.findBrokerageAccount).not.toHaveBeenCalled()
      expect(deps.brokerRequest).not.toHaveBeenCalled()
    },
  )

  it("rejects missing Sweep Account configuration and production database targets", async () => {
    const missingSweep = dependencies({ sweepAccountId: undefined })
    const production = dependencies({ databaseTarget: "production" })

    await expect(
      seedBrokerageAccount("demo@example.com", "10", missingSweep),
    ).resolves.toMatchObject({
      state: "failed",
      message: expect.stringMatching(/Sweep Account/),
    })
    await expect(
      seedBrokerageAccount("demo@example.com", "10", production),
    ).resolves.toMatchObject({
      state: "failed",
      message: expect.stringMatching(/production/),
    })
    expect(missingSweep.brokerRequest).not.toHaveBeenCalled()
    expect(production.brokerRequest).not.toHaveBeenCalled()
  })

  it("submits an amount above $50 exactly once and warns before submission", async () => {
    const events: string[] = []
    const deps = dependencies({
      brokerRequest: vi.fn(async () => {
        events.push("submitted")
        return json({ id: "journal-large", status: "pending" })
      }),
      sleep: async () => {},
      now: (() => {
        let now = 0
        return () => (now += 10_000)
      })(),
      warn: vi.fn(() => events.push("warned")),
    })

    await expect(
      seedBrokerageAccount("demo@example.com", "50.01", deps),
    ).resolves.toMatchObject({
      state: "pending",
      journalId: "journal-large",
      journalStatus: "pending",
      warnings: [expect.stringMatching(/\$50/)],
    })
    expect(events).toEqual(["warned", "submitted"])
    expect(deps.brokerRequest).toHaveBeenCalledOnce()
  })

  it("polls one Journal until execution and then reads Buying Power", async () => {
    const brokerRequest = vi
      .fn()
      .mockResolvedValueOnce(json({ id: "journal-1", status: "queued" }))
      .mockResolvedValueOnce(json({ id: "journal-1", status: "pending" }))
      .mockResolvedValueOnce(
        json({ id: "journal-1", status: "activity_created" }),
      )
      .mockResolvedValueOnce(json({ buying_power: "88.40" }))
    const deps = dependencies({ brokerRequest })

    await expect(
      seedBrokerageAccount("demo@example.com", "20", deps),
    ).resolves.toMatchObject({
      state: "executed",
      journalStatus: "activity_created",
      buyingPower: "88.40",
    })
    expect(brokerRequest).toHaveBeenCalledTimes(4)
    expect(brokerRequest).toHaveBeenNthCalledWith(
      2,
      "/v1/journals/journal-1",
      expect.objectContaining({ authenticationReplay: "safe-once" }),
    )
  })

  it("times out after 10 seconds with the latest pending status and no second Journal", async () => {
    const brokerRequest = vi
      .fn()
      .mockResolvedValueOnce(json({ id: "journal-1", status: "queued" }))
      .mockResolvedValueOnce(json({ id: "journal-1", status: "pending" }))
    const deps = dependencies({
      brokerRequest,
      sleep: async () => {},
      now: (() => {
        const values = [0, 0, 9_000, 9_000, 10_000]
        return () => values.shift() ?? 10_000
      })(),
    })

    await expect(
      seedBrokerageAccount("demo@example.com", "20", deps),
    ).resolves.toMatchObject({ state: "pending", journalStatus: "pending" })
    expect(
      brokerRequest.mock.calls.filter(
        ([, options]) => options.method === "POST",
      ),
    ).toHaveLength(1)
  })

  it.each(["rejected", "refused", "canceled", "deleted", "correct"])(
    "reports definitive %s status as failed",
    async (status) => {
      const deps = dependencies({
        brokerRequest: vi.fn(async () =>
          json({ id: "journal-1", status }, 200, "request-1"),
        ),
      })

      await expect(
        seedBrokerageAccount("demo@example.com", "20", deps),
      ).resolves.toMatchObject({
        state: "failed",
        journalStatus: status,
        requestId: "request-1",
      })
      expect(deps.brokerRequest).toHaveBeenCalledOnce()
    },
  )

  it("bounds rejection diagnostics", async () => {
    const deps = dependencies({
      brokerRequest: vi.fn(async () =>
        json(
          { code: "insufficient_cash", message: "x".repeat(700) },
          403,
          "request-403",
        ),
      ),
    })

    const result = await seedBrokerageAccount("demo@example.com", "20", deps)

    expect(result).toMatchObject({
      state: "failed",
      requestId: "request-403",
      code: "insufficient_cash",
    })
    if (result.state !== "failed") throw new Error("Expected failure")
    expect(result.detail).toHaveLength(500)
  })

  it("reports the latest pending status when a poll reaches the deadline", async () => {
    let now = 0
    const brokerRequest = vi
      .fn()
      .mockResolvedValueOnce(json({ id: "journal-1", status: "queued" }))
      .mockImplementationOnce(async () => {
        now = 10_000
        throw new DOMException("Timed out", "TimeoutError")
      })
    const deps = dependencies({
      brokerRequest,
      now: () => now,
      sleep: async () => {},
    })

    await expect(
      seedBrokerageAccount("demo@example.com", "20", deps),
    ).resolves.toMatchObject({
      state: "pending",
      journalId: "journal-1",
      journalStatus: "queued",
    })
  })

  it("retains the Journal ID when polling fails", async () => {
    const deps = dependencies({
      brokerRequest: vi
        .fn()
        .mockResolvedValueOnce(json({ id: "journal-1", status: "queued" }))
        .mockResolvedValueOnce(json({ message: "unavailable" }, 503, "poll-1")),
    })

    await expect(
      seedBrokerageAccount("demo@example.com", "20", deps),
    ).resolves.toMatchObject({
      state: "unknown",
      journalId: "journal-1",
      requestId: "poll-1",
    })
  })

  it.each([
    [
      "transport failure",
      () => {
        const error = Object.assign(new Error("authentication failed"), {
          requestId: "buying-power-1",
        })
        return Promise.reject(error)
      },
    ],
    [
      "malformed response",
      () =>
        Promise.resolve(json({ buying_power: null }, 200, "buying-power-1")),
    ],
  ])(
    "reports the request ID after a Buying Power %s",
    async (_case, response) => {
      const deps = dependencies({
        brokerRequest: vi
          .fn()
          .mockResolvedValueOnce(json({ id: "journal-1", status: "executed" }))
          .mockImplementationOnce(response),
      })

      await expect(
        seedBrokerageAccount("demo@example.com", "20", deps),
      ).resolves.toMatchObject({
        state: "executed",
        buyingPower: null,
        requestId: "buying-power-1",
      })
    },
  )

  it.each([
    [
      "transport failure",
      vi.fn(async () => {
        throw new Error("secret")
      }),
    ],
    ["malformed response", vi.fn(async () => json({ unexpected: true }))],
    [
      "ambiguous HTTP response",
      vi.fn(async () => json({ message: "timeout" }, 408, "request-408")),
    ],
    [
      "server failure",
      vi.fn(async () => json({ message: "try later" }, 503, "request-503")),
    ],
  ])(
    "reports an unknown outcome after %s without retrying",
    async (_case, brokerRequest) => {
      const deps = dependencies({ brokerRequest })

      await expect(
        seedBrokerageAccount("demo@example.com", "20", deps),
      ).resolves.toMatchObject({
        state: "unknown",
        message: expect.stringMatching(/do not rerun/i),
      })
      expect(brokerRequest).toHaveBeenCalledOnce()
    },
  )
})
