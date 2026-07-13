import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  account: {
    alpacaAccountId: "brokerage-account-123",
    provisioningStatus: "linked",
  } as { alpacaAccountId: string | null; provisioningStatus: string },
  brokerRequest: vi.fn(),
  marketRequest: vi.fn(),
  userId: vi.fn(async () => 42),
}))

vi.mock("../../lib/auth/session", () => ({ getCurrentUserId: mocks.userId }))
vi.mock("../../lib/alpaca/broker-client", () => ({
  alpacaBrokerRequest: mocks.brokerRequest,
}))
vi.mock("../../lib/alpaca/market-data-client", () => ({
  alpacaMarketDataRequest: mocks.marketRequest,
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

import {
  dollarAmountError,
  getBuyQuote,
  getOrderSnapshot,
  validateBuyAsset,
} from "../../lib/alpaca/orders"

function accountResponse(overrides: Record<string, unknown> = {}) {
  return Response.json({
    status: "ACTIVE",
    account_blocked: false,
    trading_blocked: false,
    trade_suspended_by_user: false,
    buying_power: "1250.00",
    ...overrides,
  })
}

beforeEach(() => {
  mocks.account = {
    alpacaAccountId: "brokerage-account-123",
    provisioningStatus: "linked",
  }
  mocks.brokerRequest.mockReset().mockResolvedValue(accountResponse())
  mocks.marketRequest.mockReset().mockResolvedValue(
    Response.json({
      symbol: "VTI",
      quote: { ap: 250.25, bp: 250.15, t: "2026-07-10T19:59:00Z" },
    }),
  )
  mocks.userId.mockReset().mockResolvedValue(42)
})

describe("Order snapshot", () => {
  it("returns a ready Buy snapshot for the authenticated User's order-capable Brokerage Account", async () => {
    await expect(getOrderSnapshot()).resolves.toEqual({
      accountState: "ready",
      buyingPower: "1250.00",
    })

    expect(mocks.userId).toHaveBeenCalledOnce()
    expect(mocks.brokerRequest).toHaveBeenCalledWith(
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
      expect(mocks.brokerRequest).not.toHaveBeenCalled()
    },
  )

  it("returns missing when the authenticated User has no Brokerage Account", async () => {
    mocks.account = undefined as never

    await expect(getOrderSnapshot()).resolves.toEqual({
      accountState: "missing",
    })
    expect(mocks.brokerRequest).not.toHaveBeenCalled()
  })

  it.each([
    [{ account_blocked: true }, "account-blocked"],
    [{ trading_blocked: true }, "trading-blocked"],
    [{ trade_suspended_by_user: true }, "suspended"],
    [{ status: "ACCOUNT_UPDATED" }, "inactive"],
  ] as const)(
    "returns %s as an unavailable Brokerage Account state",
    async (restriction, accountState) => {
      mocks.brokerRequest.mockResolvedValueOnce(accountResponse(restriction))

      await expect(getOrderSnapshot()).resolves.toEqual({ accountState })
    },
  )

  it("reports an Order restriction even when the Brokerage Account is inactive", async () => {
    mocks.brokerRequest.mockResolvedValueOnce(
      accountResponse({ status: "ACCOUNT_UPDATED", trading_blocked: true }),
    )

    await expect(getOrderSnapshot()).resolves.toEqual({
      accountState: "trading-blocked",
    })
  })

  it("fails closed when Alpaca account readiness cannot be established", async () => {
    mocks.brokerRequest.mockResolvedValueOnce(
      new Response(null, { status: 503 }),
    )

    await expect(getOrderSnapshot()).resolves.toEqual({
      accountState: "unknown",
    })
  })
})

describe("Buy order preparation", () => {
  const asset = {
    class: "us_equity",
    status: "active",
    tradable: true,
    fractionable: true,
    symbol: "VTI",
    name: "Vanguard Total Stock Market ETF",
  }

  it("normalizes and validates an eligible Asset and maps its latest stock quote", async () => {
    mocks.brokerRequest.mockResolvedValueOnce(Response.json(asset))

    await expect(validateBuyAsset("  vti ")).resolves.toEqual({
      status: "valid",
      asset: {
        symbol: "VTI",
        name: "Vanguard Total Stock Market ETF",
        fractionable: true,
      },
      quote: {
        askPrice: 250.25,
        bidPrice: 250.15,
        timestamp: "2026-07-10T19:59:00Z",
      },
    })
    expect(mocks.brokerRequest).toHaveBeenCalledWith(
      "/v1/assets/VTI",
      expect.objectContaining({ authenticationReplay: "safe-once" }),
    )
    expect(mocks.marketRequest).toHaveBeenCalledWith(
      "/v2/stocks/VTI/quotes/latest",
      { cache: "no-store", signal: expect.any(AbortSignal) },
    )
  })

  it.each([
    [{ status: "inactive" }, "This Asset is inactive."],
    [{ tradable: false }, "This Asset is not tradable."],
    [{ class: "fixed_income" }, "Only US stocks and ETFs are supported."],
  ])("rejects an unsupported Alpaca Asset", async (override, reason) => {
    mocks.brokerRequest.mockResolvedValueOnce(
      Response.json({ ...asset, ...override }),
    )

    await expect(validateBuyAsset("VTI")).resolves.toEqual({
      status: "invalid",
      symbol: "VTI",
      reason,
    })
    expect(mocks.marketRequest).not.toHaveBeenCalled()
  })

  it("rejects a non-string Symbol before Alpaca access", async () => {
    await expect(validateBuyAsset({ symbol: "VTI" })).resolves.toEqual({
      status: "invalid",
      symbol: "",
      reason: "Enter a Symbol.",
    })
    expect(mocks.brokerRequest).not.toHaveBeenCalled()
    expect(mocks.marketRequest).not.toHaveBeenCalled()
  })

  it.each(["AAPL💸", "A".repeat(33)])(
    "rejects malformed Symbol %j before Alpaca access",
    async (symbol) => {
      await expect(validateBuyAsset(symbol)).resolves.toEqual({
        status: "invalid",
        symbol: symbol.toUpperCase(),
        reason: "Enter a valid stock or ETF Symbol.",
      })
      expect(mocks.brokerRequest).not.toHaveBeenCalled()
      expect(mocks.marketRequest).not.toHaveBeenCalled()
    },
  )

  it("returns fractionability even when Alpaca has no usable Buy quote", async () => {
    mocks.brokerRequest.mockResolvedValueOnce(
      Response.json({ ...asset, fractionable: false }),
    )
    mocks.marketRequest.mockResolvedValueOnce(
      Response.json({
        symbol: "A-DIFFERENT-ASSET",
        quote: { ap: 1, bp: 1, t: "2026-07-10T19:59:00Z" },
      }),
    )

    await expect(validateBuyAsset("VTI")).resolves.toEqual({
      status: "valid",
      asset: {
        symbol: "VTI",
        name: "Vanguard Total Stock Market ETF",
        fractionable: false,
      },
      quote: null,
    })
  })

  it("rejects a malformed quote-refresh Symbol before Market Data access", async () => {
    await expect(getBuyQuote("VTI/../SPY")).resolves.toBeNull()
    expect(mocks.marketRequest).not.toHaveBeenCalled()
  })

  it.each([
    { ap: 0, bp: 1, t: "2026-07-10T19:59:00Z" },
    { ap: 10, bp: 9, t: "not-a-timestamp" },
  ])("rejects a malformed latest quote", async (quote) => {
    mocks.marketRequest.mockResolvedValueOnce(
      Response.json({ symbol: "VTI", quote }),
    )

    await expect(getBuyQuote("VTI")).resolves.toBeNull()
  })

  it("authenticates and maps a refreshed quote independently", async () => {
    await expect(getBuyQuote("vti")).resolves.toEqual({
      askPrice: 250.25,
      bidPrice: 250.15,
      timestamp: "2026-07-10T19:59:00Z",
    })
    expect(mocks.userId).toHaveBeenCalledOnce()
  })

  it.each([
    ["", "Enter a dollar amount."],
    ["0", "Enter at least $1.00."],
    ["0.99", "Enter at least $1.00."],
    [
      "-1",
      "Enter a positive dollar amount with no more than two decimal places.",
    ],
    [
      "1.001",
      "Enter a positive dollar amount with no more than two decimal places.",
    ],
    [
      "one",
      "Enter a positive dollar amount with no more than two decimal places.",
    ],
    ["1", null],
    ["1250.25", null],
  ])("validates dollar amount %j", (amount, error) => {
    expect(dollarAmountError(amount)).toBe(error)
  })
})
