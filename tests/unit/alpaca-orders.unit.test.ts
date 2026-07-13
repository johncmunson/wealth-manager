import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  account: {
    alpacaAccountId: "brokerage-account-123",
    provisioningStatus: "linked",
  } as { alpacaAccountId: string | null; provisioningStatus: string },
  request: vi.fn(),
  userId: vi.fn(async () => 42),
}))

vi.mock("../../lib/auth/session", () => ({ getCurrentUserId: mocks.userId }))
vi.mock("../../lib/alpaca/broker-client", () => ({
  alpacaBrokerRequest: mocks.request,
}))
vi.mock("../../db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => (mocks.account ? [mocks.account] : []),
        }),
      }),
    }),
  },
}))

import { getOrderSnapshot } from "../../lib/alpaca/orders"

function accountResponse(overrides: Record<string, unknown> = {}) {
  return new Response(
    JSON.stringify({
      status: "ACTIVE",
      account_blocked: false,
      trading_blocked: false,
      trade_suspended_by_user: false,
      buying_power: "1250.00",
      ...overrides,
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  )
}

beforeEach(() => {
  mocks.account = {
    alpacaAccountId: "brokerage-account-123",
    provisioningStatus: "linked",
  }
  mocks.request.mockReset().mockResolvedValue(accountResponse())
  mocks.userId.mockReset().mockResolvedValue(42)
})

describe("Order snapshot", () => {
  it("returns a ready Buy snapshot for the authenticated User's order-capable Brokerage Account", async () => {
    await expect(getOrderSnapshot()).resolves.toEqual({
      accountState: "ready",
      buyingPower: "1250.00",
    })

    expect(mocks.userId).toHaveBeenCalledOnce()
    expect(mocks.request).toHaveBeenCalledWith(
      "/v1/trading/accounts/brokerage-account-123/account",
      expect.objectContaining({ authenticationReplay: "safe-once" }),
    )
  })

  it.each(["pending", "failed", "unknown"] as const)(
    "returns the local %s Provisioning state without asking Alpaca",
    async (provisioningStatus) => {
      mocks.account = { alpacaAccountId: null, provisioningStatus }

      await expect(getOrderSnapshot()).resolves.toEqual({
        accountState: provisioningStatus,
      })
      expect(mocks.request).not.toHaveBeenCalled()
    },
  )

  it("returns missing when the authenticated User has no Brokerage Account", async () => {
    mocks.account = undefined as never

    await expect(getOrderSnapshot()).resolves.toEqual({
      accountState: "missing",
    })
    expect(mocks.request).not.toHaveBeenCalled()
  })

  it.each([
    [{ account_blocked: true }, "account-blocked"],
    [{ trading_blocked: true }, "trading-blocked"],
    [{ trade_suspended_by_user: true }, "suspended"],
    [{ status: "ACCOUNT_UPDATED" }, "inactive"],
  ] as const)(
    "returns %s as an unavailable Brokerage Account state",
    async (restriction, accountState) => {
      mocks.request.mockResolvedValueOnce(accountResponse(restriction))

      await expect(getOrderSnapshot()).resolves.toEqual({ accountState })
    },
  )

  it("reports an Order restriction even when the Brokerage Account is inactive", async () => {
    mocks.request.mockResolvedValueOnce(
      accountResponse({ status: "ACCOUNT_UPDATED", trading_blocked: true }),
    )

    await expect(getOrderSnapshot()).resolves.toEqual({
      accountState: "trading-blocked",
    })
  })

  it("fails closed when Alpaca account readiness cannot be established", async () => {
    mocks.request.mockResolvedValueOnce(new Response(null, { status: 503 }))

    await expect(getOrderSnapshot()).resolves.toEqual({
      accountState: "unknown",
    })
  })
})
