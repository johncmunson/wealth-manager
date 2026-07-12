import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  deposit: vi.fn(),
  prepare: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock("next/cache", () => ({ refresh: mocks.refresh }))
vi.mock("@/lib/alpaca/funding", () => ({
  prepareCurrentUserFundingSource: mocks.prepare,
  submitCurrentUserDeposit: mocks.deposit,
}))

import { depositFunding, prepareFunding } from "../../app/app/funding/actions"

beforeEach(() => {
  mocks.deposit.mockReset()
  mocks.prepare.mockReset()
  mocks.refresh.mockReset()
})

describe("Deposit action", () => {
  const form = (amount: string) => {
    const data = new FormData()
    data.set("amount", amount)
    return data
  }

  it("refreshes balances and recent Transfers after Alpaca accepts a deposit", async () => {
    mocks.deposit.mockResolvedValue({
      state: "accepted",
      message: "Deposit submitted.",
    })

    await expect(depositFunding(undefined, form("2500"))).resolves.toEqual({
      status: "success",
      message: "Deposit submitted.",
    })
    expect(mocks.deposit).toHaveBeenCalledWith("2500")
    expect(mocks.refresh).toHaveBeenCalledOnce()
  })

  it("returns definitive feedback without refreshing", async () => {
    mocks.deposit.mockResolvedValue({
      state: "failed",
      message: "Deposits are not permitted for this Brokerage Account.",
    })

    await expect(depositFunding(undefined, form("10"))).resolves.toEqual({
      status: "error",
      message: "Deposits are not permitted for this Brokerage Account.",
    })
    expect(mocks.refresh).not.toHaveBeenCalled()
  })

  it("refreshes recent Transfer history once for an unknown outcome", async () => {
    mocks.deposit.mockResolvedValue({
      state: "unknown",
      message:
        "Deposit outcome is unknown. Check recent Transfers before trying again.",
    })

    await expect(depositFunding(undefined, form("10"))).resolves.toEqual({
      status: "unknown",
      message:
        "Deposit outcome is unknown. Check recent Transfers before trying again.",
    })
    expect(mocks.refresh).toHaveBeenCalledOnce()
  })
})

describe("Prepare funding action", () => {
  it("refreshes the overview after preparation starts", async () => {
    mocks.prepare.mockResolvedValue({ state: "preparing" })

    await expect(prepareFunding(undefined)).resolves.toEqual({
      status: "success",
      message: "Funding source is being prepared.",
    })
    expect(mocks.refresh).toHaveBeenCalledOnce()
  })

  it("returns definitive feedback without refreshing", async () => {
    mocks.prepare.mockResolvedValue({
      state: "failed",
      message: "Funding Source preparation was rejected by Alpaca.",
    })

    await expect(prepareFunding(undefined)).resolves.toEqual({
      status: "error",
      message: "Funding Source preparation was rejected by Alpaca.",
    })
    expect(mocks.refresh).not.toHaveBeenCalled()
  })
})
