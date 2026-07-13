"use server"

import {
  getBuyQuote,
  getOrderSnapshot,
  validateBuyAsset,
} from "@/lib/alpaca/orders"

export async function readOrderSnapshot() {
  return getOrderSnapshot()
}

export async function validateBuySymbol(symbol: unknown) {
  return validateBuyAsset(symbol)
}

export async function refreshBuyQuote(symbol: unknown) {
  return getBuyQuote(symbol)
}
