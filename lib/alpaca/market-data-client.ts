import "server-only"

import { alpacaTokenService, type AlpacaTokenService } from "./token-service"

const ALPACA_MARKET_DATA_URL = "https://data.sandbox.alpaca.markets"

type Fetch = typeof fetch

export interface CreateAlpacaMarketDataClientOptions {
  readonly fetch: Fetch
  readonly tokenService: AlpacaTokenService
}

export class AlpacaMarketDataRequestError extends Error {
  readonly name = "AlpacaMarketDataRequestError"
}

export function createAlpacaMarketDataClient({
  fetch: fetchImplementation,
  tokenService,
}: CreateAlpacaMarketDataClientOptions) {
  const baseUrl = new URL(ALPACA_MARKET_DATA_URL)

  return {
    async request(path: string, options: RequestInit = {}) {
      const url = new URL(path, baseUrl)
      if (url.origin !== baseUrl.origin) {
        throw new AlpacaMarketDataRequestError(
          "Alpaca Market Data requests must use the sandbox API origin.",
        )
      }

      const headers = new Headers(options.headers)
      if (headers.has("authorization")) {
        throw new AlpacaMarketDataRequestError(
          "Callers cannot set the Alpaca Authorization header.",
        )
      }

      let accessToken = await tokenService.getAccessToken()
      for (let attempt = 0; attempt < 2; attempt += 1) {
        options.signal?.throwIfAborted()
        headers.set("authorization", `Bearer ${accessToken}`)
        const response = await fetchImplementation(url, {
          ...options,
          method: "GET",
          headers: Object.fromEntries(headers),
        })
        if (response.status !== 401) return response

        tokenService.invalidateIfCurrent(accessToken)
        if (attempt === 1) return response
        try {
          await response.body?.cancel()
        } catch {
          // A closed error body does not prevent retrying this safe read.
        }
        accessToken = await tokenService.getAccessToken()
      }

      throw new AlpacaMarketDataRequestError("Alpaca Market Data read failed.")
    },
  }
}

let productionClient:
  ReturnType<typeof createAlpacaMarketDataClient> | undefined

export function alpacaMarketDataRequest(path: string, options?: RequestInit) {
  productionClient ??= createAlpacaMarketDataClient({
    fetch,
    tokenService: alpacaTokenService,
  })
  return productionClient.request(path, options)
}
