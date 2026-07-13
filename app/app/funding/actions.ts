"use server"

import { refresh } from "next/cache"

import {
  prepareCurrentUserFundingSource,
  submitCurrentUserDeposit,
  submitCurrentUserWithdrawal,
} from "@/lib/alpaca/funding"

export type TransferFundingActionState =
  | { readonly status: "success"; readonly message: string }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "unknown"; readonly message: string }
  | undefined

export type DepositFundingActionState = TransferFundingActionState

export async function depositFunding(
  _previousState: DepositFundingActionState,
  formData: FormData,
): Promise<DepositFundingActionState> {
  void _previousState
  const result = await submitCurrentUserDeposit(formData.get("amount"))

  if (result.state === "accepted" || result.state === "unknown") refresh()

  return {
    status:
      result.state === "accepted"
        ? "success"
        : result.state === "unknown"
          ? "unknown"
          : "error",
    message: result.message,
  }
}

export type WithdrawalFundingActionState = TransferFundingActionState

export async function withdrawFunding(
  _previousState: WithdrawalFundingActionState,
  formData: FormData,
): Promise<WithdrawalFundingActionState> {
  void _previousState
  const result = await submitCurrentUserWithdrawal(formData.get("amount"))

  if (result.state === "accepted" || result.state === "unknown") refresh()

  return {
    status:
      result.state === "accepted"
        ? "success"
        : result.state === "unknown"
          ? "unknown"
          : "error",
    message: result.message,
  }
}

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
