import "server-only"

import { ALPACA_BROKER_API_URL } from "./config"
import {
  alpacaTokenService,
  type AlpacaLogger,
  type AlpacaTokenService,
} from "./token-service"

type Fetch = typeof fetch

export type AuthenticationReplayPolicy = "safe-once" | "never"

export interface AlpacaBrokerRequestOptions extends RequestInit {
  /** Required. `safe-once` asserts that replaying this operation is safe. */
  readonly authenticationReplay: AuthenticationReplayPolicy
  /** Required for `safe-once` methods other than GET and HEAD. */
  readonly idempotency?: "proven"
}

export interface CreateAlpacaBrokerClientOptions {
  readonly fetch: Fetch
  readonly tokenService: AlpacaTokenService
  readonly logger?: AlpacaLogger
  readonly now?: () => number
}

export interface AlpacaBrokerClient {
  request(
    path: string,
    options: AlpacaBrokerRequestOptions,
  ): Promise<Response>
}

export class AlpacaBrokerRequestError extends Error {
  readonly name = "AlpacaBrokerRequestError"
}

export class AlpacaBrokerAuthenticationError extends Error {
  readonly name = "AlpacaBrokerAuthenticationError"
  readonly status = 401

  constructor(readonly requestId?: string) {
    super("Alpaca Broker API authentication failed.")
  }
}

function safeLog(
  logger: AlpacaLogger,
  event: Parameters<AlpacaLogger>[0],
) {
  try {
    logger(event)
  } catch {
    // Observability must not affect Broker API behavior.
  }
}

export function createAlpacaBrokerClient({
  fetch: fetchImplementation,
  tokenService,
  logger = (event) => console.info("alpaca", event),
  now = Date.now,
}: CreateAlpacaBrokerClientOptions): AlpacaBrokerClient {
  const baseUrl = new URL(ALPACA_BROKER_API_URL)

  return {
    async request(path, options) {
      const url = new URL(path, baseUrl)
      if (url.origin !== baseUrl.origin) {
        throw new AlpacaBrokerRequestError(
          "Alpaca Broker requests must use the sandbox API origin.",
        )
      }

      const { authenticationReplay, idempotency, ...requestInit } = options
      const method = (requestInit.method ?? "GET").toUpperCase()
      if (
        authenticationReplay === "safe-once" &&
        method !== "GET" &&
        method !== "HEAD" &&
        idempotency !== "proven"
      ) {
        throw new AlpacaBrokerRequestError(
          "Safe authentication replay requires a proven idempotent operation.",
        )
      }

      // Validate caller headers before doing token or network work.
      const headers = new Headers(requestInit.headers)
      if (headers.has("authorization")) {
        throw new AlpacaBrokerRequestError(
          "Callers cannot set the Alpaca Authorization header.",
        )
      }

      let accessToken = await tokenService.getAccessToken()

      for (let attempt = 0; attempt < 2; attempt += 1) {
        headers.set("authorization", `Bearer ${accessToken}`)
        const startedAt = now()
        const response = await fetchImplementation(url, {
          ...requestInit,
          method,
          headers,
        })
        const requestId = response.headers.get("x-request-id") ?? undefined

        safeLog(logger, {
          category: "broker_response",
          environment: "sandbox",
          status: response.status,
          durationMs: Math.max(0, now() - startedAt),
          retryCount: attempt,
          requestId,
        })

        if (response.status !== 401) return response

        tokenService.invalidateIfCurrent(accessToken)

        if (authenticationReplay === "never" || attempt === 1) {
          safeLog(logger, {
            category: "broker_auth_failure",
            environment: "sandbox",
            status: 401,
            retryCount: attempt,
            requestId,
          })
          throw new AlpacaBrokerAuthenticationError(requestId)
        }

        // Release the first response before making the one explicitly safe replay.
        try {
          await response.body?.cancel()
        } catch {
          // A consumed/closed error body does not prevent a safe replay.
        }
        accessToken = await tokenService.getAccessToken()
      }

      throw new AlpacaBrokerAuthenticationError()
    },
  }
}

let productionClient: AlpacaBrokerClient | undefined

/** Normal application entry point. Bearer tokens are never returned to callers. */
export function alpacaBrokerRequest(
  path: string,
  options: AlpacaBrokerRequestOptions,
) {
  productionClient ??= createAlpacaBrokerClient({
    fetch,
    tokenService: alpacaTokenService,
  })
  return productionClient.request(path, options)
}
