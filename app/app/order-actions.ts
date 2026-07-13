"use server"

import { getOrderSnapshot } from "@/lib/alpaca/orders"

export async function readOrderSnapshot() {
  return getOrderSnapshot()
}
