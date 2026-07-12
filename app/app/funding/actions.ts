"use server"

import { refresh } from "next/cache"

import { prepareCurrentUserFundingSource } from "@/lib/alpaca/funding"

export type PrepareFundingActionState =
  | { readonly status: "success"; readonly message: string }
  | { readonly status: "error"; readonly message: string }
  | undefined

export async function prepareFunding(
  _previousState: PrepareFundingActionState,
): Promise<PrepareFundingActionState> {
  void _previousState
  const result = await prepareCurrentUserFundingSource()

  if (result.state === "ready" || result.state === "preparing") {
    refresh()
    return {
      status: "success",
      message:
        result.state === "ready"
          ? "Funding Source is ready."
          : "Funding source is being prepared.",
    }
  }

  return {
    status: "error",
    message: result.message ?? "Funding Source preparation failed.",
  }
}
