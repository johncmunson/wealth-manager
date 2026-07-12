import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  prepare: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock("next/cache", () => ({ refresh: mocks.refresh }))
vi.mock("@/lib/alpaca/funding", () => ({
  prepareCurrentUserFundingSource: mocks.prepare,
}))

import { prepareFunding } from "../../app/app/funding/actions"

beforeEach(() => {
  mocks.prepare.mockReset()
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
