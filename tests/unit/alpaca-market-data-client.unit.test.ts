import { describe, expect, it, vi } from "vitest"

import {
  AlpacaMarketDataRequestError,
  createAlpacaMarketDataClient,
} from "../../lib/alpaca/market-data-client"
import type { AlpacaTokenService } from "../../lib/alpaca/token-service"

function setup() {
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockResolvedValue(new Response("{}", { status: 200 }))
  const tokenService = {
    getAccessToken: vi.fn(async () => "broker-oauth-token"),
    invalidateIfCurrent: vi.fn(),
  } satisfies AlpacaTokenService
  return {
    fetch,
    tokenService,
    client: createAlpacaMarketDataClient({ fetch, tokenService }),
  }
}

describe("Alpaca Market Data client", () => {
  it("authenticates a read against only the sandbox Market Data origin", async () => {
    const { client, fetch } = setup()

    await client.request("/v2/stocks/VTI/quotes/latest", { cache: "no-store" })

    expect(fetch).toHaveBeenCalledWith(
      new URL(
        "https://data.sandbox.alpaca.markets/v2/stocks/VTI/quotes/latest",
      ),
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          authorization: "Bearer broker-oauth-token",
        }),
      }),
    )
  })

  it("refreshes authentication and safely retries one 401 read", async () => {
    const { client, fetch, tokenService } = setup()
    fetch
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(Response.json({ quote: {} }))
    tokenService.getAccessToken
      .mockResolvedValueOnce("expired-token")
      .mockResolvedValueOnce("fresh-token")

    await expect(
      client.request("/v2/stocks/VTI/quotes/latest"),
    ).resolves.toHaveProperty("status", 200)
    expect(tokenService.invalidateIfCurrent).toHaveBeenCalledWith(
      "expired-token",
    )
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      expect.any(URL),
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: "Bearer fresh-token",
        }),
      }),
    )
  })

  it("stops after a second authentication failure", async () => {
    const { client, fetch, tokenService } = setup()
    fetch.mockResolvedValue(new Response(null, { status: 401 }))
    tokenService.getAccessToken
      .mockResolvedValueOnce("expired-token")
      .mockResolvedValueOnce("fresh-token")

    await expect(
      client.request("/v2/stocks/VTI/quotes/latest"),
    ).resolves.toHaveProperty("status", 401)
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(tokenService.getAccessToken).toHaveBeenCalledTimes(2)
  })

  it("rejects caller-supplied authentication before token or network access", async () => {
    const { client, fetch, tokenService } = setup()

    await expect(
      client.request("/v2/stocks/VTI/quotes/latest", {
        headers: { authorization: "Bearer caller-token" },
      }),
    ).rejects.toBeInstanceOf(AlpacaMarketDataRequestError)
    expect(tokenService.getAccessToken).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })

  it("rejects another origin before token or network access", async () => {
    const { client, fetch, tokenService } = setup()

    await expect(
      client.request("https://data.alpaca.markets/v2/stocks/VTI/quotes/latest"),
    ).rejects.toBeInstanceOf(AlpacaMarketDataRequestError)
    expect(tokenService.getAccessToken).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })
})
