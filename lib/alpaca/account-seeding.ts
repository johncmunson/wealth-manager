import "server-only"

import { randomUUID } from "node:crypto"
import { eq, sql } from "drizzle-orm"

import { db } from "../../db"
import { alpacaAccounts, users } from "../../db/schema"
import {
  assertDatabaseTarget,
  getDatabaseTarget,
  type DatabaseTarget,
} from "../databaseTarget"
import { alpacaBrokerRequest, type AlpacaBrokerClient } from "./broker-client"

const AMOUNT = /^\d+(?:\.\d{1,2})?$/
const DECIMAL = /^-?\d+(?:\.\d+)?$/
const EXECUTED_STATUSES = new Set(["executed", "activity_created"])
const PENDING_STATUSES = new Set(["queued", "sent_to_clearing", "pending"])
const FAILED_STATUSES = new Set([
  "rejected",
  "refused",
  "canceled",
  "deleted",
  "correct",
])
const DEFINITIVE_CREATE_FAILURE_STATUSES = new Set([400, 403, 404, 422])
const POLL_INTERVAL_MS = 500
const POLL_TIMEOUT_MS = 10_000
const REQUEST_TIMEOUT_MS = 10_000
const OVER_LIMIT_WARNING =
  "The amount is above Alpaca's documented default $50 immediate-execution limit and may remain pending until batch processing."

interface BrokerageAccountLookup {
  readonly alpacaAccountId: string | null
  readonly provisioningStatus: string | null
}

type BrokerRequest = AlpacaBrokerClient["request"]

export interface AccountSeedingDependencies {
  readonly databaseTarget: DatabaseTarget | "unsafe"
  readonly sweepAccountId: string | undefined
  readonly findBrokerageAccount: (
    normalizedEmail: string,
  ) => Promise<BrokerageAccountLookup | undefined>
  readonly brokerRequest: BrokerRequest
  readonly randomUUID: () => string
  readonly now: () => number
  readonly sleep: (milliseconds: number) => Promise<void>
  readonly warn: (message: string) => void
}

export type AccountSeedingResult =
  | {
      readonly state: "executed"
      readonly journalId: string
      readonly journalStatus: "executed" | "activity_created"
      readonly buyingPower: string | null
      readonly warnings: readonly string[]
      readonly requestId?: string
      readonly detail?: string
    }
  | {
      readonly state: "pending"
      readonly journalId: string
      readonly journalStatus: string
      readonly warnings: readonly string[]
      readonly message: string
      readonly requestId?: string
    }
  | {
      readonly state: "failed"
      readonly message: string
      readonly warnings: readonly string[]
      readonly journalId?: string
      readonly journalStatus?: string
      readonly requestId?: string
      readonly code?: string | number
      readonly detail?: string
    }
  | {
      readonly state: "unknown"
      readonly message: string
      readonly warnings: readonly string[]
      readonly journalId?: string
      readonly requestId?: string
      readonly code?: string | number
      readonly detail?: string
    }

interface Journal {
  readonly id: string
  readonly status: string
  readonly requestId?: string
}

function cents(amount: string) {
  const [whole, fraction = ""] = amount.split(".")
  return BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"))
}

function diagnostics(response: Response) {
  return { requestId: response.headers.get("x-request-id") ?? undefined }
}

function requestIdFromError(error: unknown) {
  return typeof error === "object" &&
    error !== null &&
    "requestId" in error &&
    typeof error.requestId === "string"
    ? error.requestId
    : undefined
}

async function readError(response: Response) {
  try {
    const value: unknown = await response.json()
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return diagnostics(response)
    }
    const error = value as Record<string, unknown>
    return {
      ...diagnostics(response),
      code:
        typeof error.code === "string" || typeof error.code === "number"
          ? error.code
          : undefined,
      detail:
        typeof error.message === "string"
          ? error.message.slice(0, 500)
          : undefined,
    }
  } catch {
    return diagnostics(response)
  }
}

async function readJournal(response: Response): Promise<Journal> {
  const value: unknown = await response.json()
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Unreadable Journal response.")
  }
  const journal = value as Record<string, unknown>
  if (
    typeof journal.id !== "string" ||
    typeof journal.status !== "string" ||
    ![...EXECUTED_STATUSES, ...PENDING_STATUSES, ...FAILED_STATUSES].includes(
      journal.status,
    )
  ) {
    throw new Error("Unreadable Journal response.")
  }
  return { id: journal.id, status: journal.status, ...diagnostics(response) }
}

async function findBrokerageAccount(normalizedEmail: string) {
  const [account] = await db
    .select({
      alpacaAccountId: alpacaAccounts.alpacaAccountId,
      provisioningStatus: alpacaAccounts.provisioningStatus,
    })
    .from(users)
    .leftJoin(alpacaAccounts, eq(alpacaAccounts.userId, users.id))
    .where(sql`lower(${users.email}) = ${normalizedEmail}`)
    .limit(1)

  return account
}

function defaultDependencies(): AccountSeedingDependencies {
  let databaseTarget: DatabaseTarget | "unsafe" = getDatabaseTarget()
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error("DATABASE_URL is not configured.")
  if (databaseTarget !== "production") {
    try {
      assertDatabaseTarget(databaseUrl, databaseTarget)
    } catch {
      databaseTarget = "unsafe"
    }
  }

  return {
    databaseTarget,
    sweepAccountId: process.env.ALPACA_SANDBOX_SWEEP_ACCOUNT_ID,
    findBrokerageAccount,
    brokerRequest: alpacaBrokerRequest,
    randomUUID,
    now: Date.now,
    sleep: (milliseconds) =>
      new Promise((resolve) => setTimeout(resolve, milliseconds)),
    warn: (message) => console.warn(`Account Seeding warning: ${message}`),
  }
}

function pendingResult(
  journal: Journal,
  warnings: readonly string[],
): AccountSeedingResult {
  return {
    state: "pending",
    journalId: journal.id,
    journalStatus: journal.status,
    warnings,
    message: "Account Seeding is still pending; cash is not confirmed usable.",
    requestId: journal.requestId,
  }
}

function unknownResult(
  warnings: readonly string[],
  values: {
    journalId?: string
    requestId?: string
    code?: string | number
    detail?: string
  } = {},
): AccountSeedingResult {
  return {
    state: "unknown",
    message:
      "Account Seeding outcome is unknown. Check Alpaca before continuing; do not rerun blindly.",
    warnings,
    ...values,
  }
}

async function requestBuyingPower(
  accountId: string,
  journal: Journal,
  warnings: readonly string[],
  brokerRequest: BrokerRequest,
): Promise<AccountSeedingResult> {
  let response: Response
  try {
    response = await brokerRequest(
      `/v1/trading/accounts/${encodeURIComponent(accountId)}/account`,
      {
        cache: "no-store",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        authenticationReplay: "safe-once",
      },
    )
  } catch (error) {
    return {
      state: "executed",
      journalId: journal.id,
      journalStatus: journal.status as "executed" | "activity_created",
      buyingPower: null,
      warnings: [...warnings, "Buying Power could not be read from Alpaca."],
      requestId: requestIdFromError(error) ?? journal.requestId,
    }
  }

  if (!response.ok) {
    const error = await readError(response)
    return {
      state: "executed",
      journalId: journal.id,
      journalStatus: journal.status as "executed" | "activity_created",
      buyingPower: null,
      warnings: [...warnings, "Buying Power could not be read from Alpaca."],
      ...error,
    }
  }

  try {
    const value: unknown = await response.json()
    const buyingPower =
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value) &&
      typeof (value as Record<string, unknown>).buying_power === "string" &&
      DECIMAL.test((value as Record<string, string>).buying_power)
        ? (value as Record<string, string>).buying_power
        : undefined
    if (buyingPower === undefined) throw new Error()

    return {
      state: "executed",
      journalId: journal.id,
      journalStatus: journal.status as "executed" | "activity_created",
      buyingPower,
      warnings,
      requestId: journal.requestId,
    }
  } catch {
    return {
      state: "executed",
      journalId: journal.id,
      journalStatus: journal.status as "executed" | "activity_created",
      buyingPower: null,
      warnings: [...warnings, "Buying Power could not be read from Alpaca."],
      requestId: diagnostics(response).requestId ?? journal.requestId,
    }
  }
}

/** Moves synthetic sandbox cash from the Sweep Account to a User's linked Brokerage Account. */
export async function seedBrokerageAccount(
  email: string,
  amount: string,
  dependencies: AccountSeedingDependencies = defaultDependencies(),
): Promise<AccountSeedingResult> {
  const warnings =
    AMOUNT.test(amount) && cents(amount) > BigInt(5_000)
      ? [OVER_LIMIT_WARNING]
      : []

  if (!AMOUNT.test(amount) || cents(amount) <= BigInt(0)) {
    return {
      state: "failed",
      message:
        "Amount must be a positive plain-decimal USD string with at most two fractional digits.",
      warnings,
    }
  }
  if (
    dependencies.databaseTarget === "production" ||
    dependencies.databaseTarget === "unsafe"
  ) {
    return {
      state: "failed",
      message:
        "Account Seeding is sandbox-only and cannot target production or a mismatched database.",
      warnings,
    }
  }
  const sweepAccountId = dependencies.sweepAccountId?.trim()
  if (!sweepAccountId) {
    return {
      state: "failed",
      message: "The Sweep Account is not configured.",
      warnings,
    }
  }

  const account = await dependencies.findBrokerageAccount(
    email.trim().toLowerCase(),
  )
  if (!account) {
    return { state: "failed", message: "No User matches that email.", warnings }
  }
  if (account.provisioningStatus !== "linked" || !account.alpacaAccountId) {
    return {
      state: "failed",
      message: "The User does not have a linked Brokerage Account.",
      warnings,
    }
  }

  for (const warning of warnings) dependencies.warn(warning)

  const headers = new Headers({
    "content-type": "application/json",
    "idempotency-key": dependencies.randomUUID(),
  })
  let response: Response
  try {
    response = await dependencies.brokerRequest("/v1/journals", {
      method: "POST",
      headers,
      body: JSON.stringify({
        entry_type: "JNLC",
        from_account: sweepAccountId,
        to_account: account.alpacaAccountId,
        amount,
        currency: "USD",
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      authenticationReplay: "safe-once",
      idempotency: "proven",
    })
  } catch (error) {
    return unknownResult(warnings, { requestId: requestIdFromError(error) })
  }

  if (!response.ok) {
    const error = await readError(response)
    return DEFINITIVE_CREATE_FAILURE_STATUSES.has(response.status)
      ? {
          state: "failed",
          message: "Alpaca rejected Account Seeding.",
          warnings,
          ...error,
        }
      : unknownResult(warnings, error)
  }

  let journal: Journal
  const createDiagnostics = response.clone()
  try {
    journal = await readJournal(response)
  } catch {
    return unknownResult(warnings, await readError(createDiagnostics))
  }

  if (FAILED_STATUSES.has(journal.status)) {
    return {
      state: "failed",
      message: `Account Seeding did not execute; Alpaca reported ${journal.status}.`,
      warnings,
      journalId: journal.id,
      journalStatus: journal.status,
      requestId: journal.requestId,
    }
  }

  const deadline = dependencies.now() + POLL_TIMEOUT_MS
  while (
    PENDING_STATUSES.has(journal.status) &&
    dependencies.now() < deadline
  ) {
    const remaining = deadline - dependencies.now()
    await dependencies.sleep(Math.min(POLL_INTERVAL_MS, remaining))
    if (dependencies.now() >= deadline) break

    let pollResponse: Response | undefined
    let pollDiagnostics: Response | undefined
    try {
      pollResponse = await dependencies.brokerRequest(
        `/v1/journals/${encodeURIComponent(journal.id)}`,
        {
          cache: "no-store",
          signal: AbortSignal.timeout(
            Math.max(1, deadline - dependencies.now()),
          ),
          authenticationReplay: "safe-once",
        },
      )
      if (!pollResponse.ok) {
        return unknownResult(warnings, {
          journalId: journal.id,
          ...(await readError(pollResponse)),
        })
      }
      pollDiagnostics = pollResponse.clone()
      journal = await readJournal(pollResponse)
    } catch (error) {
      if (dependencies.now() >= deadline) {
        return pendingResult(journal, warnings)
      }
      return unknownResult(warnings, {
        journalId: journal.id,
        ...(pollDiagnostics
          ? await readError(pollDiagnostics)
          : { requestId: requestIdFromError(error) }),
      })
    }

    if (FAILED_STATUSES.has(journal.status)) {
      return {
        state: "failed",
        message: `Account Seeding did not execute; Alpaca reported ${journal.status}.`,
        warnings,
        journalId: journal.id,
        journalStatus: journal.status,
        requestId: journal.requestId,
      }
    }
  }

  if (PENDING_STATUSES.has(journal.status)) {
    return pendingResult(journal, warnings)
  }

  return requestBuyingPower(
    account.alpacaAccountId,
    journal,
    warnings,
    dependencies.brokerRequest,
  )
}
