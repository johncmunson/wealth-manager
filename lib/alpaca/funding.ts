import "server-only"

import { eq } from "drizzle-orm"

import { db } from "../../db"
import { alpacaAccounts, type AlpacaProvisioningStatus } from "../../db/schema"
import { getCurrentUserId } from "../auth/session"
import { alpacaBrokerRequest } from "./broker-client"

const transferStatuses = [
  "QUEUED",
  "APPROVAL_PENDING",
  "PENDING",
  "SENT_TO_CLEARING",
  "REJECTED",
  "CANCELED",
  "APPROVED",
  "COMPLETE",
  "RETURNED",
] as const

type TransferStatus = (typeof transferStatuses)[number]
type FundingSourceState = "ready" | "preparing" | "missing" | "unavailable"

export interface FundingTransfer {
  readonly id: string
  readonly direction: "INCOMING" | "OUTGOING"
  readonly status: TransferStatus
  readonly statusLabel: string
  readonly createdAt: string
  readonly signedAmount: string
}

export type FundingSnapshot =
  | {
      readonly accountState:
        Exclude<AlpacaProvisioningStatus, "linked"> | "missing"
    }
  | {
      readonly accountState: "linked"
      readonly balances: {
        readonly buyingPower: string | null
        readonly withdrawableCash: string | null
        readonly cash: string | null
        readonly netPending: string | null
      }
      readonly balancesError?: string
      readonly transfersBlocked: boolean | null
      readonly fundingSource: {
        readonly state: FundingSourceState
        readonly name: "Chase Checking •••• 4242"
        readonly message: string
        readonly error?: boolean
      }
      readonly transfers: readonly FundingTransfer[]
      readonly transfersError?: string
    }

const TRANSFER_STATUS_SET = new Set<string>(transferStatuses)
const NONTERMINAL_STATUSES = new Set<TransferStatus>([
  "QUEUED",
  "APPROVAL_PENDING",
  "PENDING",
  "SENT_TO_CLEARING",
  "APPROVED",
])
const RELATIONSHIP_STATUSES = new Set([
  "QUEUED",
  "APPROVED",
  "REJECTED",
  "PENDING",
  "CANCEL_REQUESTED",
])
const DECIMAL = /^-?\d+(?:\.\d+)?$/
const POSITIVE_DECIMAL = /^\d+(?:\.\d+)?$/
const POSITIVE_WHOLE_DOLLARS = /^[1-9]\d*$/
const FUNDING_REQUEST_TIMEOUT_MS = 10_000
const SYNTHETIC_ACCOUNT_SUFFIX = "4242" as const
const SYNTHETIC_ACCOUNT_NUMBER = `000000${SYNTHETIC_ACCOUNT_SUFFIX}` as const
const SOURCE_NAME = `Chase Checking •••• ${SYNTHETIC_ACCOUNT_SUFFIX}` as const
const UNKNOWN_DEPOSIT_RESULT = {
  state: "unknown",
  message:
    "Deposit outcome is unknown. Check recent Transfers before trying again.",
} as const
const SYNTHETIC_ACH_DETAILS = {
  account_owner_name: "Wealth Manager Sandbox",
  bank_account_type: "CHECKING",
  bank_account_number: SYNTHETIC_ACCOUNT_NUMBER,
  bank_routing_number: "121000358",
  nickname: "Chase Checking",
} as const

interface TradingAccount {
  readonly buying_power?: string
  readonly cash_withdrawable?: string
  readonly cash?: string
  readonly transfers_blocked?: boolean
}

interface AlpacaAchRelationship {
  readonly id: string
  readonly status: string
  readonly bankAccountNumber?: string
}

interface TransferResponse {
  readonly id: string
  readonly direction: "INCOMING" | "OUTGOING"
  readonly status: TransferStatus
  readonly amount: string
  readonly created_at: string
}

function optionalDecimal(value: unknown) {
  if (value === undefined || value === null) return undefined
  if (typeof value !== "string" || !DECIMAL.test(value)) throw new Error()
  return value
}

async function readAlpacaError(response: Response) {
  try {
    const value: unknown = await response.json()
    if (typeof value !== "object" || value === null) return {}

    const error = value as Record<string, unknown>
    return {
      code:
        typeof error.code === "string" || typeof error.code === "number"
          ? error.code
          : undefined,
      message:
        typeof error.message === "string"
          ? error.message.slice(0, 500)
          : undefined,
    }
  } catch {
    return {}
  }
}

function parseTradingAccount(value: unknown): TradingAccount {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error()
  }
  const account = value as Record<string, unknown>
  if (
    account.transfers_blocked !== undefined &&
    typeof account.transfers_blocked !== "boolean"
  ) {
    throw new Error()
  }

  return {
    buying_power: optionalDecimal(account.buying_power),
    cash_withdrawable: optionalDecimal(account.cash_withdrawable),
    cash: optionalDecimal(account.cash),
    transfers_blocked: account.transfers_blocked as boolean | undefined,
  }
}

function parseRelationships(value: unknown): AlpacaAchRelationship[] {
  if (!Array.isArray(value)) throw new Error()
  return value.map((item) => {
    if (typeof item !== "object" || item === null) throw new Error()
    const relationship = item as Record<string, unknown>
    if (
      typeof relationship.id !== "string" ||
      typeof relationship.status !== "string" ||
      !RELATIONSHIP_STATUSES.has(relationship.status) ||
      (relationship.bank_account_number !== undefined &&
        typeof relationship.bank_account_number !== "string")
    ) {
      throw new Error()
    }
    return {
      id: relationship.id,
      status: relationship.status,
      bankAccountNumber: relationship.bank_account_number as string | undefined,
    }
  })
}

function parseTransfers(value: unknown): TransferResponse[] {
  if (!Array.isArray(value)) throw new Error()
  return value.map((item) => {
    if (typeof item !== "object" || item === null) throw new Error()
    const transfer = item as Record<string, unknown>
    if (
      typeof transfer.id !== "string" ||
      (transfer.direction !== "INCOMING" &&
        transfer.direction !== "OUTGOING") ||
      typeof transfer.status !== "string" ||
      !TRANSFER_STATUS_SET.has(transfer.status) ||
      typeof transfer.amount !== "string" ||
      !POSITIVE_DECIMAL.test(transfer.amount) ||
      typeof transfer.created_at !== "string" ||
      !Number.isFinite(Date.parse(transfer.created_at))
    ) {
      throw new Error()
    }
    return transfer as unknown as TransferResponse
  })
}

async function readAlpaca<T>(
  responsePromise: Promise<Response>,
  parse: (value: unknown) => T,
) {
  const response = await responsePromise
  if (!response.ok) throw new Error()
  return parse(await response.json())
}

function sumPending(transfers: readonly TransferResponse[]) {
  const pending = transfers.filter((transfer) =>
    NONTERMINAL_STATUSES.has(transfer.status),
  )
  const scale = Math.max(
    0,
    ...pending.map(({ amount }) => amount.split(".")[1]?.length ?? 0),
  )
  const total = pending.reduce((sum, transfer) => {
    const [whole, fraction = ""] = transfer.amount.split(".")
    const units = BigInt(whole + fraction.padEnd(scale, "0"))
    return sum + (transfer.direction === "INCOMING" ? units : -units)
  }, BigInt(0))
  if (scale === 0) return total.toString()

  const negative = total < BigInt(0)
  const digits = (negative ? -total : total).toString().padStart(scale + 1, "0")
  return `${negative ? "-" : ""}${digits.slice(0, -scale)}.${digits.slice(-scale)}`
}

function mapTransfers(
  transfers: readonly TransferResponse[],
): FundingTransfer[] {
  return transfers
    .toSorted(
      (left, right) =>
        Date.parse(right.created_at) - Date.parse(left.created_at),
    )
    .slice(0, 10)
    .map((transfer) => ({
      id: transfer.id,
      direction: transfer.direction,
      status: transfer.status,
      statusLabel: transfer.status
        .toLowerCase()
        .split("_")
        .map((word) => word[0].toUpperCase() + word.slice(1))
        .join(" "),
      createdAt: transfer.created_at,
      signedAmount:
        transfer.direction === "OUTGOING"
          ? `-${transfer.amount}`
          : transfer.amount,
    }))
}

function relationshipState(status: string): FundingSourceState {
  if (status === "APPROVED") return "ready"
  if (status === "QUEUED" || status === "PENDING") return "preparing"
  return "unavailable"
}

function isSyntheticRelationship({ bankAccountNumber }: AlpacaAchRelationship) {
  return bankAccountNumber?.endsWith(SYNTHETIC_ACCOUNT_SUFFIX) ?? false
}

function syntheticRelationshipCandidates(
  relationships: readonly AlpacaAchRelationship[],
) {
  const matching = relationships.filter(isSyntheticRelationship)
  return matching.length > 0
    ? matching
    : relationships.length === 1 &&
        relationships[0].bankAccountNumber === undefined
      ? relationships
      : []
}

function findSyntheticRelationship(
  relationships: readonly AlpacaAchRelationship[],
) {
  const candidates = syntheticRelationshipCandidates(relationships)
  return (
    candidates.find(({ status }) => status === "APPROVED") ??
    candidates.find(
      ({ status }) => relationshipState(status) === "preparing",
    ) ??
    candidates[0]
  )
}

function preparedRelationshipResult(relationship: AlpacaAchRelationship) {
  const state = relationshipState(relationship.status)
  return state === "ready" || state === "preparing"
    ? { state, relationshipId: relationship.id }
    : {
        state: "failed" as const,
        message: "Funding Source preparation was rejected by Alpaca.",
      }
}

async function listRelationships(alpacaAccountId: string) {
  return readAlpaca(
    alpacaBrokerRequest(
      `/v1/accounts/${encodeURIComponent(alpacaAccountId)}/ach_relationships`,
      {
        cache: "no-store",
        signal: AbortSignal.timeout(FUNDING_REQUEST_TIMEOUT_MS),
        authenticationReplay: "safe-once",
      },
    ),
    parseRelationships,
  )
}

export async function prepareSyntheticFundingSource(alpacaAccountId: string) {
  let relationships: AlpacaAchRelationship[]
  try {
    relationships = await listRelationships(alpacaAccountId)
  } catch {
    return {
      state: "failed" as const,
      message: "Funding Source preparation could not be started.",
    }
  }

  const existing = findSyntheticRelationship(relationships)
  if (existing) return preparedRelationshipResult(existing)

  let response: Response
  try {
    response = await alpacaBrokerRequest(
      `/v1/accounts/${encodeURIComponent(alpacaAccountId)}/ach_relationships`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(SYNTHETIC_ACH_DETAILS),
        cache: "no-store",
        signal: AbortSignal.timeout(FUNDING_REQUEST_TIMEOUT_MS),
        authenticationReplay: "never",
      },
    )
  } catch {
    return {
      state: "unknown" as const,
      message:
        "Funding Source preparation may have started. Refresh before trying again.",
    }
  }

  if (response.status === 409) {
    try {
      const recovered = findSyntheticRelationship(
        await listRelationships(alpacaAccountId),
      )
      return recovered
        ? preparedRelationshipResult(recovered)
        : {
            state: "failed" as const,
            message: "Funding Source preparation was rejected by Alpaca.",
          }
    } catch {
      return {
        state: "unknown" as const,
        message:
          "Funding Source preparation could not be confirmed. Refresh to check its status.",
      }
    }
  }

  if (!response.ok) {
    return response.status >= 500
      ? {
          state: "unknown" as const,
          message:
            "Funding Source preparation may have started. Refresh before trying again.",
        }
      : {
          state: "failed" as const,
          message: "Funding Source preparation was rejected by Alpaca.",
        }
  }

  try {
    const [created] = parseRelationships([await response.json()])
    return preparedRelationshipResult(created)
  } catch {
    return {
      state: "unknown" as const,
      message:
        "Funding Source preparation may have started. Refresh before trying again.",
    }
  }
}

export async function prepareCurrentUserFundingSource() {
  const userId = await getCurrentUserId()
  const [account] = await db
    .select({
      alpacaAccountId: alpacaAccounts.alpacaAccountId,
      provisioningStatus: alpacaAccounts.provisioningStatus,
    })
    .from(alpacaAccounts)
    .where(eq(alpacaAccounts.userId, userId))
    .limit(1)

  if (account?.provisioningStatus !== "linked" || !account.alpacaAccountId) {
    return {
      state: "failed" as const,
      message: "A linked Brokerage Account is required.",
    }
  }

  return prepareSyntheticFundingSource(account.alpacaAccountId)
}

export async function submitCurrentUserDeposit(amount: unknown) {
  const userId = await getCurrentUserId()
  const [account] = await db
    .select({
      alpacaAccountId: alpacaAccounts.alpacaAccountId,
      provisioningStatus: alpacaAccounts.provisioningStatus,
    })
    .from(alpacaAccounts)
    .where(eq(alpacaAccounts.userId, userId))
    .limit(1)

  if (typeof amount !== "string" || !POSITIVE_WHOLE_DOLLARS.test(amount)) {
    return {
      state: "failed" as const,
      message: "Enter a positive whole-dollar amount.",
    }
  }
  if (account?.provisioningStatus !== "linked" || !account.alpacaAccountId) {
    return {
      state: "failed" as const,
      message: "A linked Brokerage Account is required.",
    }
  }

  const accountId = encodeURIComponent(account.alpacaAccountId)
  let preflight: [TradingAccount, AlpacaAchRelationship[]]
  try {
    preflight = await Promise.all([
      readAlpaca(
        alpacaBrokerRequest(`/v1/trading/accounts/${accountId}/account`, {
          cache: "no-store",
          signal: AbortSignal.timeout(FUNDING_REQUEST_TIMEOUT_MS),
          authenticationReplay: "safe-once",
        }),
        parseTradingAccount,
      ),
      listRelationships(account.alpacaAccountId),
    ])
  } catch {
    return {
      state: "failed" as const,
      message: "Deposit could not be submitted. Try again.",
    }
  }

  const [tradingAccount, relationships] = preflight
  if (tradingAccount.transfers_blocked !== false) {
    return {
      state: "failed" as const,
      message: "Transfers are blocked for this Brokerage Account.",
    }
  }
  const relationship = findSyntheticRelationship(relationships)
  if (relationship?.status !== "APPROVED") {
    return {
      state: "failed" as const,
      message: "An approved Funding Source is required.",
    }
  }

  let response: Response
  try {
    response = await alpacaBrokerRequest(
      `/v1/accounts/${accountId}/transfers`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          transfer_type: "ach",
          relationship_id: relationship.id,
          amount,
          direction: "INCOMING",
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(FUNDING_REQUEST_TIMEOUT_MS),
        authenticationReplay: "never",
      },
    )
  } catch {
    return UNKNOWN_DEPOSIT_RESULT
  }

  if (!response.ok) {
    if (response.status === 403) {
      return {
        state: "failed" as const,
        message: "Deposits are not permitted for this Brokerage Account.",
      }
    }
    if (response.status === 400 || response.status === 422) {
      const error = await readAlpacaError(response)
      console.error("Alpaca rejected deposit.", {
        status: response.status,
        requestId: response.headers.get("x-request-id") ?? undefined,
        ...error,
      })
      return {
        state: "failed" as const,
        message: error.message
          ? `Alpaca rejected this deposit: ${error.message}`
          : "Alpaca rejected this deposit. Check recent Transfers.",
      }
    }
    return UNKNOWN_DEPOSIT_RESULT
  }

  try {
    const transfer = await response.json()
    if (
      typeof transfer !== "object" ||
      transfer === null ||
      typeof (transfer as Record<string, unknown>).id !== "string"
    ) {
      throw new Error()
    }
  } catch {
    return UNKNOWN_DEPOSIT_RESULT
  }

  return { state: "accepted" as const, message: "Deposit submitted." }
}

function mapFundingSource(relationships: readonly AlpacaAchRelationship[]) {
  const relationship = findSyntheticRelationship(relationships)

  if (!relationship) {
    return {
      state: "missing" as const,
      name: SOURCE_NAME,
      message: "No Funding Source is available yet.",
    }
  }
  const state = relationshipState(relationship.status)
  return {
    state,
    name: SOURCE_NAME,
    message:
      state === "ready"
        ? "Sandbox deposits and withdrawals are simulated."
        : state === "preparing"
          ? "Funding source is being prepared."
          : "The Funding Source is unavailable.",
  }
}

export async function getFundingSnapshot(): Promise<FundingSnapshot> {
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

  const accountId = encodeURIComponent(account.alpacaAccountId)
  const requests = {
    account: readAlpaca(
      alpacaBrokerRequest(`/v1/trading/accounts/${accountId}/account`, {
        cache: "no-store",
        signal: AbortSignal.timeout(FUNDING_REQUEST_TIMEOUT_MS),
        authenticationReplay: "safe-once",
      }),
      parseTradingAccount,
    ),
    relationships: readAlpaca(
      alpacaBrokerRequest(`/v1/accounts/${accountId}/ach_relationships`, {
        cache: "no-store",
        signal: AbortSignal.timeout(FUNDING_REQUEST_TIMEOUT_MS),
        authenticationReplay: "safe-once",
      }),
      parseRelationships,
    ),
    transfers: readAlpaca(
      alpacaBrokerRequest(`/v1/accounts/${accountId}/transfers`, {
        cache: "no-store",
        signal: AbortSignal.timeout(FUNDING_REQUEST_TIMEOUT_MS),
        authenticationReplay: "safe-once",
      }),
      parseTransfers,
    ),
  }
  const [accountResult, relationshipResult, transferResult] =
    await Promise.allSettled([
      requests.account,
      requests.relationships,
      requests.transfers,
    ])
  const accountData =
    accountResult.status === "fulfilled" ? accountResult.value : undefined
  const transferData =
    transferResult.status === "fulfilled" ? transferResult.value : undefined

  return {
    accountState: "linked",
    balances: {
      buyingPower: accountData?.buying_power ?? null,
      withdrawableCash: accountData?.cash_withdrawable ?? null,
      cash: accountData?.cash ?? null,
      netPending: transferData ? sumPending(transferData) : null,
    },
    ...(accountData
      ? {}
      : {
          balancesError: "Cash availability could not be loaded from Alpaca.",
        }),
    transfersBlocked: accountData?.transfers_blocked ?? null,
    fundingSource:
      relationshipResult.status === "fulfilled"
        ? mapFundingSource(relationshipResult.value)
        : {
            state: "unavailable",
            name: SOURCE_NAME,
            message: "The Funding Source could not be loaded from Alpaca.",
            error: true,
          },
    transfers: transferData ? mapTransfers(transferData) : [],
    ...(transferData
      ? {}
      : {
          transfersError: "Recent Transfers could not be loaded from Alpaca.",
        }),
  }
}
