import "server-only"

import { getAlpacaConfig, type AlpacaConfig } from "./config"

const REFRESH_WINDOW_MS = 60_000
const DEFAULT_TIMEOUT_MS = 5_000
const MAX_RETRY_AFTER_MS = 5_000

type Fetch = typeof fetch

export interface AlpacaTokenService {
  getAccessToken(): Promise<string>
  invalidateIfCurrent(tokenUsed: string): void
}

export interface AlpacaLogEvent {
  readonly category:
    | "token_cache_hit"
    | "token_cache_miss"
    | "token_issuance"
    | "token_refresh_failure"
    | "token_rate_limited"
    | "broker_response"
    | "broker_auth_failure"
  readonly environment: "sandbox"
  readonly status?: number
  readonly durationMs?: number
  readonly retryCount?: number
  readonly remainingLifetimeMs?: number
  readonly requestId?: string
}

export type AlpacaLogger = (event: AlpacaLogEvent) => void

export interface CreateAlpacaTokenServiceOptions {
  readonly fetch: Fetch
  readonly now: () => number
  readonly config: AlpacaConfig
  readonly logger?: AlpacaLogger
  readonly sleep?: (milliseconds: number) => Promise<void>
  readonly random?: () => number
  readonly timeoutMs?: number
}

type TokenErrorCode = "timeout" | "network" | "http" | "malformed_response"

export class AlpacaTokenError extends Error {
  readonly name = "AlpacaTokenError"

  constructor(
    readonly code: TokenErrorCode,
    readonly status?: number,
  ) {
    super(
      status === undefined
        ? `Alpaca token issuance failed (${code}).`
        : `Alpaca token issuance failed with status ${status}.`,
    )
  }
}

interface CachedToken {
  readonly accessToken: string
  readonly expiresAt: number
}

interface TokenResponse {
  readonly access_token: string
  readonly expires_in: number
  readonly token_type: "Bearer"
}

function defaultSleep(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds))
}

function safeLog(logger: AlpacaLogger, event: AlpacaLogEvent) {
  try {
    logger(event)
  } catch {
    // Observability must not affect authentication availability.
  }
}

function isTokenResponse(value: unknown): value is TokenResponse {
  if (typeof value !== "object" || value === null) return false

  const response = value as Record<string, unknown>
  return (
    typeof response.access_token === "string" &&
    response.access_token.trim().length > 0 &&
    Number.isSafeInteger(response.expires_in) &&
    (response.expires_in as number) > 0 &&
    response.token_type === "Bearer"
  )
}

function retryAfterMilliseconds(value: string | null, now: number) {
  if (!value) return undefined

  const seconds = Number(value)
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(seconds * 1_000, MAX_RETRY_AFTER_MS)
  }

  const date = Date.parse(value)
  if (Number.isNaN(date)) return undefined
  return Math.min(Math.max(0, date - now), MAX_RETRY_AFTER_MS)
}

function isRetryableStatus(status: number) {
  return status === 429 || status >= 500
}

export function createAlpacaTokenService({
  fetch: fetchImplementation,
  now,
  config,
  logger = (event) => console.info("alpaca", event),
  sleep = defaultSleep,
  random = Math.random,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: CreateAlpacaTokenServiceOptions): AlpacaTokenService {
  let cachedToken: CachedToken | undefined
  let refreshInFlight: Promise<string> | undefined

  function fetchWithTimeout(request: RequestInfo | URL, init: RequestInit) {
    return fetchImplementation(request, {
      ...init,
      signal: AbortSignal.timeout(timeoutMs),
    })
  }

  async function issueToken() {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const requestStartedAt = now()
      const body = new URLSearchParams({
        grant_type: "client_credentials",
        client_id: config.clientId,
        client_secret: config.clientSecret,
      })

      try {
        const response = await fetchWithTimeout(config.tokenUrl, {
          method: "POST",
          headers: {
            "content-type": "application/x-www-form-urlencoded",
          },
          body,
          cache: "no-store",
        })

        const durationMs = Math.max(0, now() - requestStartedAt)
        safeLog(logger, {
          category: "token_issuance",
          environment: config.environment,
          status: response.status,
          durationMs,
          retryCount: attempt,
        })

        if (!response.ok) {
          if (response.status === 429) {
            safeLog(logger, {
              category: "token_rate_limited",
              environment: config.environment,
              status: response.status,
              retryCount: attempt,
            })
          }

          if (attempt === 0 && isRetryableStatus(response.status)) {
            const retryAfter = retryAfterMilliseconds(
              response.headers.get("retry-after"),
              now(),
            )
            await sleep(retryAfter ?? 50 + Math.floor(random() * 101))
            continue
          }

          throw new AlpacaTokenError("http", response.status)
        }

        let value: unknown
        try {
          value = await response.json()
        } catch {
          throw new AlpacaTokenError("malformed_response")
        }

        if (!isTokenResponse(value)) {
          throw new AlpacaTokenError("malformed_response")
        }

        const token: CachedToken = {
          accessToken: value.access_token,
          // Request start is deliberately used to account for network latency.
          expiresAt: requestStartedAt + value.expires_in * 1_000,
        }
        cachedToken = token
        return token.accessToken
      } catch (error) {
        if (error instanceof AlpacaTokenError) throw error

        const tokenError =
          error instanceof DOMException && error.name === "TimeoutError"
            ? new AlpacaTokenError("timeout")
            : new AlpacaTokenError("network")

        if (attempt === 0) {
          await sleep(50 + Math.floor(random() * 101))
          continue
        }

        throw tokenError
      }
    }

    throw new AlpacaTokenError("network")
  }

  async function getAccessToken() {
    const currentTime = now()
    const remainingLifetimeMs = cachedToken
      ? cachedToken.expiresAt - currentTime
      : undefined

    if (cachedToken && remainingLifetimeMs! > REFRESH_WINDOW_MS) {
      safeLog(logger, {
        category: "token_cache_hit",
        environment: config.environment,
        remainingLifetimeMs,
      })
      return cachedToken.accessToken
    }

    safeLog(logger, {
      category: "token_cache_miss",
      environment: config.environment,
      remainingLifetimeMs,
    })

    const oldToken = cachedToken
    const refresh = refreshInFlight ?? issueToken()
    if (!refreshInFlight) refreshInFlight = refresh

    try {
      return await refresh
    } catch (error) {
      const remainingAfterFailure = oldToken
        ? oldToken.expiresAt - now()
        : undefined
      safeLog(logger, {
        category: "token_refresh_failure",
        environment: config.environment,
        status: error instanceof AlpacaTokenError ? error.status : undefined,
        remainingLifetimeMs: remainingAfterFailure,
      })

      // An early refresh failure does not needlessly discard an unexpired token.
      if (oldToken && oldToken.expiresAt > now()) return oldToken.accessToken
      throw error
    } finally {
      if (refreshInFlight === refresh) refreshInFlight = undefined
    }
  }

  return {
    getAccessToken,
    invalidateIfCurrent(tokenUsed) {
      if (cachedToken?.accessToken === tokenUsed) cachedToken = undefined
    },
  }
}

let productionService: AlpacaTokenService | undefined

/** Per-instance singleton, initialized on first use so builds do not require secrets. */
export const alpacaTokenService: AlpacaTokenService = {
  getAccessToken() {
    productionService ??= createAlpacaTokenService({
      fetch,
      now: Date.now,
      config: getAlpacaConfig(),
    })
    return productionService.getAccessToken()
  },
  invalidateIfCurrent(tokenUsed) {
    productionService?.invalidateIfCurrent(tokenUsed)
  },
}
