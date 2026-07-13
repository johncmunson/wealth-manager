import "server-only"

import { eq } from "drizzle-orm"

import { db } from "../../db"
import { alpacaAccounts, type AlpacaProvisioningStatus } from "../../db/schema"
import { getCurrentUserId } from "../auth/session"
import { alpacaBrokerRequest } from "./broker-client"

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
