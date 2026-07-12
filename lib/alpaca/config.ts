import "server-only"

export const ALPACA_TOKEN_URL =
  "https://authx.sandbox.alpaca.markets/v1/oauth2/token"
export const ALPACA_BROKER_API_URL =
  "https://broker-api.sandbox.alpaca.markets"

export interface AlpacaConfig {
  readonly environment: "sandbox"
  readonly tokenUrl: typeof ALPACA_TOKEN_URL
  readonly clientId: string
  readonly clientSecret: string
}

/** Reads credentials only on the server and never includes their values in errors. */
export function getAlpacaConfig(
  environment: {
    readonly [key: string]: string | undefined
    readonly ALPACA_BROKER_CLIENT_ID?: string
    readonly ALPACA_BROKER_CLIENT_SECRET?: string
  } = process.env,
): AlpacaConfig {
  const clientId = environment.ALPACA_BROKER_CLIENT_ID?.trim()
  const clientSecret = environment.ALPACA_BROKER_CLIENT_SECRET?.trim()

  if (!clientId || !clientSecret) {
    throw new Error("Alpaca Broker API credentials are not configured.")
  }

  return {
    environment: "sandbox",
    tokenUrl: ALPACA_TOKEN_URL,
    clientId,
    clientSecret,
  }
}
