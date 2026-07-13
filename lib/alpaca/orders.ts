import "server-only"

import { eq } from "drizzle-orm"

import { db } from "../../db"
import { alpacaAccounts, type AlpacaProvisioningStatus } from "../../db/schema"
import { getCurrentUserId } from "../auth/session"
import { isOrderSymbol, normalizeOrderSymbol } from "../order-input"
import { alpacaBrokerRequest } from "./broker-client"
import { alpacaMarketDataRequest } from "./market-data-client"

export { dollarAmountError } from "../order-input"

export type OrderSnapshot =
  | {
      readonly accountState:
        | Exclude<AlpacaProvisioningStatus, "linked">
        | "missing"
        | "inactive"
        | "account-blocked"
        | "trading-blocked"
        | "suspended"
    }
  | { readonly accountState: "ready"; readonly buyingPower: string | null }

export interface OrderAsset {
  readonly symbol: string
  readonly name: string
  readonly fractionable: boolean
}

export interface OrderQuote {
  readonly askPrice: number
  readonly bidPrice: number | null
  readonly timestamp: string
}

export type BuyAssetValidation =
  | {
      readonly status: "valid"
      readonly asset: OrderAsset
      readonly quote: OrderQuote | null
    }
  | {
      readonly status: "invalid"
      readonly symbol: string
      readonly reason: string
    }

const DECIMAL = /^-?\d+(?:\.\d+)?$/

function parseTradingAccount(value: unknown) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error()
  }

  const account = value as Record<string, unknown>
  if (
    typeof account.status !== "string" ||
    typeof account.account_blocked !== "boolean" ||
    typeof account.trading_blocked !== "boolean" ||
    typeof account.trade_suspended_by_user !== "boolean" ||
    (account.buying_power !== undefined &&
      account.buying_power !== null &&
      (typeof account.buying_power !== "string" ||
        !DECIMAL.test(account.buying_power)))
  ) {
    throw new Error()
  }

  return account as {
    readonly status: string
    readonly account_blocked: boolean
    readonly trading_blocked: boolean
    readonly trade_suspended_by_user: boolean
    readonly buying_power?: string | null
  }
}

function parseAsset(value: unknown) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null
  }

  const asset = value as Record<string, unknown>
  if (
    typeof asset.symbol !== "string" ||
    typeof asset.name !== "string" ||
    typeof asset.status !== "string" ||
    typeof asset.class !== "string" ||
    typeof asset.tradable !== "boolean" ||
    typeof asset.fractionable !== "boolean"
  ) {
    return null
  }
  return asset as {
    readonly symbol: string
    readonly name: string
    readonly status: string
    readonly class: string
    readonly tradable: boolean
    readonly fractionable: boolean
  }
}

function parseQuote(value: unknown, expectedSymbol: string): OrderQuote | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null
  }
  const response = value as Record<string, unknown>
  if (normalizeOrderSymbol(response.symbol) !== expectedSymbol) return null
  const quote = response.quote
  if (typeof quote !== "object" || quote === null || Array.isArray(quote)) {
    return null
  }
  const { ap, bp, t } = quote as Record<string, unknown>
  if (
    typeof ap !== "number" ||
    !Number.isFinite(ap) ||
    ap <= 0 ||
    typeof t !== "string" ||
    !Number.isFinite(Date.parse(t))
  ) {
    return null
  }
  return {
    askPrice: ap,
    bidPrice:
      typeof bp === "number" && Number.isFinite(bp) && bp > 0 ? bp : null,
    timestamp: t,
  }
}

async function readBuyQuote(symbol: string) {
  try {
    const response = await alpacaMarketDataRequest(
      `/v2/stocks/${encodeURIComponent(symbol)}/quotes/latest`,
      { cache: "no-store", signal: AbortSignal.timeout(10_000) },
    )
    if (!response.ok) return null
    return parseQuote(await response.json(), symbol)
  } catch {
    return null
  }
}

export async function getBuyQuote(symbol: unknown) {
  await getCurrentUserId()
  const normalizedSymbol = normalizeOrderSymbol(symbol)
  return isOrderSymbol(normalizedSymbol) ? readBuyQuote(normalizedSymbol) : null
}

export async function validateBuyAsset(
  symbol: unknown,
): Promise<BuyAssetValidation> {
  await getCurrentUserId()
  const normalizedSymbol = normalizeOrderSymbol(symbol)
  if (!normalizedSymbol) {
    return { status: "invalid", symbol: "", reason: "Enter a Symbol." }
  }
  if (!isOrderSymbol(normalizedSymbol)) {
    return {
      status: "invalid",
      symbol: normalizedSymbol,
      reason: "Enter a valid stock or ETF Symbol.",
    }
  }

  try {
    const response = await alpacaBrokerRequest(
      `/v1/assets/${encodeURIComponent(normalizedSymbol)}`,
      {
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
        authenticationReplay: "safe-once",
      },
    )
    if (response.status === 404) {
      return {
        status: "invalid",
        symbol: normalizedSymbol,
        reason: "Alpaca could not find this Symbol.",
      }
    }
    if (!response.ok) throw new Error()

    const asset = parseAsset(await response.json())
    if (!asset || normalizeOrderSymbol(asset.symbol) !== normalizedSymbol) {
      throw new Error()
    }
    const invalidReason =
      asset.class !== "us_equity"
        ? "Only US stocks and ETFs are supported."
        : asset.status !== "active"
          ? "This Asset is inactive."
          : !asset.tradable
            ? "This Asset is not tradable."
            : null
    if (invalidReason) {
      return {
        status: "invalid",
        symbol: normalizedSymbol,
        reason: invalidReason,
      }
    }

    return {
      status: "valid",
      asset: {
        symbol: normalizeOrderSymbol(asset.symbol),
        name: asset.name,
        fractionable: asset.fractionable,
      },
      quote: await readBuyQuote(normalizedSymbol),
    }
  } catch {
    return {
      status: "invalid",
      symbol: normalizedSymbol,
      reason: "This Symbol could not be validated right now.",
    }
  }
}

export async function getOrderSnapshot(): Promise<OrderSnapshot> {
  const userId = await getCurrentUserId()
  const [account] = await db
    .select({
      alpacaAccountId: alpacaAccounts.alpacaAccountId,
      provisioningStatus: alpacaAccounts.provisioningStatus,
    })
    .from(alpacaAccounts)
    .where(eq(alpacaAccounts.userId, userId))
    .limit(1)

  if (!account) return { accountState: "missing" }
  if (account.provisioningStatus !== "linked") {
    return { accountState: account.provisioningStatus }
  }
  if (!account.alpacaAccountId) return { accountState: "unknown" }

  try {
    const response = await alpacaBrokerRequest(
      `/v1/trading/accounts/${encodeURIComponent(account.alpacaAccountId)}/account`,
      {
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
        authenticationReplay: "safe-once",
      },
    )
    if (!response.ok) return { accountState: "unknown" }

    const brokerageAccount = parseTradingAccount(await response.json())
    if (brokerageAccount.account_blocked) {
      return { accountState: "account-blocked" }
    }
    if (brokerageAccount.trading_blocked) {
      return { accountState: "trading-blocked" }
    }
    if (brokerageAccount.trade_suspended_by_user) {
      return { accountState: "suspended" }
    }
    if (brokerageAccount.status !== "ACTIVE") {
      return { accountState: "inactive" }
    }

    return {
      accountState: "ready",
      buyingPower: brokerageAccount.buying_power ?? null,
    }
  } catch {
    return { accountState: "unknown" }
  }
}
