import "server-only"

import { eq } from "drizzle-orm"

import { db } from "../../db"
import { alpacaAccounts, type AlpacaProvisioningStatus } from "../../db/schema"
import {
  AlpacaBrokerAuthenticationError,
  AlpacaBrokerRequestError,
  alpacaBrokerRequest,
} from "./broker-client"
import {
  buildSandboxAccountPayload,
  type AlpacaProvisioningUser,
} from "./account-fixture"
import { AlpacaTokenError } from "./token-service"

const ACCOUNT_CREATION_TIMEOUT_MS = 10_000

interface AlpacaAccountResponse {
  readonly id: string
  readonly account_number: string
  readonly status: string
}

function isAlpacaAccountResponse(
  value: unknown,
): value is AlpacaAccountResponse {
  if (typeof value !== "object" || value === null) return false

  const account = value as Record<string, unknown>
  return (
    typeof account.id === "string" &&
    account.id.length > 0 &&
    typeof account.account_number === "string" &&
    account.account_number.length > 0 &&
    typeof account.status === "string" &&
    account.status.length > 0
  )
}

function isDefinitePreCreationFailure(error: unknown) {
  return (
    error instanceof AlpacaTokenError ||
    error instanceof AlpacaBrokerAuthenticationError ||
    error instanceof AlpacaBrokerRequestError
  )
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

async function updateFailure(
  id: number,
  provisioningStatus: Extract<AlpacaProvisioningStatus, "failed" | "unknown">,
  failureReason: string,
  requestId?: string,
) {
  const [account] = await db
    .update(alpacaAccounts)
    .set({ provisioningStatus, failureReason, requestId })
    .where(eq(alpacaAccounts.id, id))
    .returning()

  return account
}

async function createAccount(accountId: number, user: AlpacaProvisioningUser) {
  try {
    const response = await alpacaBrokerRequest("/v1/accounts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(buildSandboxAccountPayload(user)),
      cache: "no-store",
      signal: AbortSignal.timeout(ACCOUNT_CREATION_TIMEOUT_MS),
      authenticationReplay: "never",
    })
    const requestId = response.headers.get("x-request-id") ?? undefined

    if (!response.ok) {
      const error = await readAlpacaError(response)
      console.error("Alpaca rejected account creation.", {
        status: response.status,
        requestId,
        ...error,
      })
      return updateFailure(
        accountId,
        "failed",
        `Alpaca rejected account creation with status ${response.status}${error.message ? `: ${error.message}` : ""}.`,
        requestId,
      )
    }

    let value: unknown
    try {
      value = await response.json()
    } catch {
      return updateFailure(
        accountId,
        "unknown",
        "Alpaca returned an unreadable account creation response.",
        requestId,
      )
    }

    if (!isAlpacaAccountResponse(value)) {
      return updateFailure(
        accountId,
        "unknown",
        "Alpaca returned an incomplete account creation response.",
        requestId,
      )
    }

    const [account] = await db
      .update(alpacaAccounts)
      .set({
        alpacaAccountId: value.id,
        accountNumber: value.account_number,
        provisioningStatus: "linked",
        alpacaStatus: value.status,
        failureReason: null,
        requestId,
      })
      .where(eq(alpacaAccounts.id, accountId))
      .returning()

    return account
  } catch (error) {
    const definiteFailure = isDefinitePreCreationFailure(error)
    return updateFailure(
      accountId,
      definiteFailure ? "failed" : "unknown",
      definiteFailure
        ? "Alpaca account creation could not be started."
        : "Alpaca account creation may have completed and needs verification.",
      error instanceof AlpacaBrokerAuthenticationError
        ? error.requestId
        : undefined,
    )
  }
}

export async function ensureAlpacaAccount(user: AlpacaProvisioningUser) {
  const [created] = await db
    .insert(alpacaAccounts)
    .values({ userId: user.id })
    .onConflictDoNothing({ target: alpacaAccounts.userId })
    .returning()

  if (created) return createAccount(created.id, user)

  const [existing] = await db
    .select()
    .from(alpacaAccounts)
    .where(eq(alpacaAccounts.userId, user.id))
    .limit(1)

  return existing
}
