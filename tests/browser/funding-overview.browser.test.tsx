import { beforeEach, expect, test, vi } from "vitest"
import { page, userEvent } from "vitest/browser"
import { render } from "vitest-browser-react"

import { FundingOverview } from "../../components/funding/funding-overview"
import type { FundingSnapshot } from "../../lib/alpaca/funding"

const mocks = vi.hoisted(() => ({
  depositFunding: vi.fn(),
  prepareFunding: vi.fn(),
  refresh: vi.fn(),
}))
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}))
vi.mock("../../app/app/funding/actions", () => ({
  depositFunding: mocks.depositFunding,
  prepareFunding: mocks.prepareFunding,
}))

beforeEach(() => {
  mocks.depositFunding.mockReset().mockResolvedValue({
    status: "success",
    message: "Deposit submitted.",
  })
  mocks.prepareFunding.mockReset().mockResolvedValue({
    status: "success",
    message: "Funding Source prepared.",
  })
})

const snapshot = {
  accountState: "linked",
  balances: {
    buyingPower: "12840.00",
    withdrawableCash: "9340.00",
    cash: "10340.00",
    netPending: "2000.00",
  },
  transfersBlocked: false,
  fundingSource: {
    state: "ready",
    name: "Chase Checking •••• 4242",
    message: "Sandbox deposits and withdrawals are simulated.",
  },
  transfers: [
    {
      id: "deposit",
      direction: "INCOMING",
      status: "PENDING",
      statusLabel: "Pending",
      createdAt: "2026-07-02T12:00:00Z",
      signedAmount: "2500.00",
    },
    {
      id: "withdrawal",
      direction: "OUTGOING",
      status: "COMPLETE",
      statusLabel: "Complete",
      createdAt: "2026-06-20T12:00:00Z",
      signedAmount: "-750.00",
    },
  ],
} satisfies FundingSnapshot

test("shows Alpaca cash values, the simulated Funding Source, and recent Transfers", async () => {
  const screen = await render(<FundingOverview snapshot={snapshot} />)

  await expect.element(screen.getByText("$12,840.00")).toBeVisible()
  await expect.element(screen.getByText("$9,340.00")).toBeVisible()
  await expect.element(screen.getByText("$10,340.00")).toBeVisible()
  await expect.element(screen.getByText("+$2,000.00")).toBeVisible()
  await expect
    .element(screen.getByText("Chase Checking •••• 4242"))
    .toBeVisible()
  await expect
    .element(
      screen.getByText("Sandbox deposits and withdrawals are simulated."),
    )
    .toBeVisible()
  await expect
    .element(screen.getByText("Withdrawal", { exact: true }))
    .toBeVisible()
  await expect
    .element(screen.getByText("Pending", { exact: true }))
    .toBeVisible()
  await expect
    .element(screen.getByText("Complete", { exact: true }))
    .toBeVisible()
  await expect.element(screen.getByText("+$2,500.00")).toBeVisible()
  await expect.element(screen.getByText("-$750.00")).toBeVisible()
})

test.each([
  ["missing", "Not prepared", "No Funding Source is available yet."],
  ["preparing", "Preparing", "Funding source is being prepared."],
  ["unavailable", "Unavailable", "The Funding Source is unavailable."],
] as const)(
  "shows the %s Funding Source without hiding balances or Transfers",
  async (state, badge, message) => {
    const screen = await render(
      <FundingOverview
        snapshot={{
          ...snapshot,
          fundingSource: {
            state,
            name: "Chase Checking •••• 4242",
            message,
          },
        }}
      />,
    )

    await expect.element(screen.getByText(badge, { exact: true })).toBeVisible()
    await expect.element(screen.getByRole("status")).toHaveTextContent(message)
    await expect.element(screen.getByText("$12,840.00")).toBeVisible()
    await expect.element(screen.getByText("+$2,500.00")).toBeVisible()
  },
)

test("announces Funding Source read failures", async () => {
  const message = "The Funding Source could not be loaded from Alpaca."
  const screen = await render(
    <FundingOverview
      snapshot={{
        ...snapshot,
        fundingSource: {
          state: "unavailable",
          name: "Chase Checking •••• 4242",
          message,
          error: true,
        },
      }}
    />,
  )

  await expect.element(screen.getByRole("alert")).toHaveTextContent(message)
})

test("keeps Transfer information labeled on a narrow screen", async () => {
  await page.viewport(375, 700)
  const screen = await render(<FundingOverview snapshot={snapshot} />)

  await expect
    .element(screen.getByText("Direction", { exact: true }).nth(0))
    .toBeVisible()
  await expect
    .element(screen.getByText("Created", { exact: true }).nth(0))
    .toBeVisible()
  await expect
    .element(screen.getByText("Status", { exact: true }).nth(0))
    .toBeVisible()
  await expect
    .element(screen.getByText("Amount", { exact: true }).nth(0))
    .toBeVisible()
  await expect
    .element(screen.getByText("Deposit", { exact: true }))
    .toBeVisible()
})

test.each([
  ["pending", "Funding is being prepared"],
  ["failed", "Funding unavailable"],
  ["unknown", "Funding status needs verification"],
] as const)(
  "shows the %s Brokerage Account state without Transfer controls",
  async (state, heading) => {
    const screen = await render(
      <FundingOverview snapshot={{ accountState: state }} />,
    )

    await expect.element(screen.getByText(heading)).toBeVisible()
    await expect
      .element(
        screen.getByText("Transfer controls are unavailable.", {
          exact: false,
        }),
      )
      .toBeVisible()
    await expect.element(screen.getByRole("button")).not.toBeInTheDocument()
  },
)

test("offers keyboard-accessible preparation once when the Funding Source is missing", async () => {
  const screen = await render(
    <FundingOverview
      snapshot={{
        ...snapshot,
        fundingSource: {
          state: "missing",
          name: "Chase Checking •••• 4242",
          message: "No Funding Source is available yet.",
        },
      }}
    />,
  )
  const button = screen.getByRole("button", { name: "Prepare funding" })

  await expect
    .element(screen.getByText("Chase Checking •••• 4242"))
    .not.toBeInTheDocument()
  await userEvent.tab()
  await userEvent.tab()
  await expect.element(button).toHaveFocus()
  await userEvent.keyboard("{Enter}")

  expect(mocks.prepareFunding).toHaveBeenCalledOnce()
  await expect
    .element(screen.getByRole("status"))
    .toHaveTextContent("Funding Source prepared.")
})

test("announces preparation errors and leaves preparation available", async () => {
  mocks.prepareFunding.mockResolvedValue({
    status: "error",
    message: "Funding Source preparation was rejected by Alpaca.",
  })
  const screen = await render(
    <FundingOverview
      snapshot={{
        ...snapshot,
        fundingSource: {
          state: "missing",
          name: "Chase Checking •••• 4242",
          message: "No Funding Source is available yet.",
        },
      }}
    />,
  )

  await screen.getByRole("button", { name: "Prepare funding" }).click()

  await expect
    .element(screen.getByRole("alert"))
    .toHaveTextContent("Funding Source preparation was rejected by Alpaca.")
  await expect
    .element(screen.getByRole("button", { name: "Prepare funding" }))
    .toBeEnabled()
})

test("shows pending preparation and prevents duplicate submission", async () => {
  let finish!: (value: { status: "success"; message: string }) => void
  mocks.prepareFunding.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve
      }),
  )
  const screen = await render(
    <FundingOverview
      snapshot={{
        ...snapshot,
        fundingSource: {
          state: "missing",
          name: "Chase Checking •••• 4242",
          message: "No Funding Source is available yet.",
        },
      }}
    />,
  )
  const button = screen.getByRole("button", { name: "Prepare funding" })

  await button.click()

  await expect
    .element(screen.getByRole("button", { name: "Preparing funding…" }))
    .toBeDisabled()
  finish({ status: "success", message: "Funding Source prepared." })
  await expect
    .element(screen.getByRole("status"))
    .toHaveTextContent("Funding Source prepared.")
})

test("opens the deposit dialog from the keyboard and focuses its only input", async () => {
  const screen = await render(<FundingOverview snapshot={snapshot} />)
  const addFunds = screen.getByRole("button", { name: "Add funds" })

  await userEvent.tab()
  await userEvent.tab()
  await expect.element(addFunds).toHaveFocus()
  await userEvent.keyboard("{Enter}")

  await expect.element(screen.getByRole("dialog")).toBeVisible()
  await expect
    .element(screen.getByRole("heading", { name: "Add funds" }))
    .toBeVisible()
  await expect.element(screen.getByLabelText("Amount")).toHaveFocus()
  expect(screen.getByRole("textbox").all()).toHaveLength(1)
  await expect
    .element(screen.getByText("Funds are transferring from:"))
    .toBeVisible()
  await expect
    .element(screen.getByText("Chase Checking •••• 4242").nth(1))
    .toBeVisible()

  await userEvent.keyboard("{Escape}")
  await expect.element(screen.getByRole("dialog")).not.toBeInTheDocument()
  await expect.element(addFunds).toHaveFocus()
})

test.each(["0", "-1", "1.25", "abc"])(
  "rejects invalid deposit amount %j before review",
  async (amount) => {
    const screen = await render(<FundingOverview snapshot={snapshot} />)
    await screen.getByRole("button", { name: "Add funds" }).click()
    await screen.getByLabelText("Amount").fill(amount)
    await userEvent.tab()
    await userEvent.keyboard("{Enter}")

    await expect
      .element(screen.getByRole("alert"))
      .toHaveTextContent("Enter a positive whole-dollar amount.")
    expect(mocks.depositFunding).not.toHaveBeenCalled()
  },
)

test("reviews the whole-dollar amount and requires explicit confirmation", async () => {
  const screen = await render(<FundingOverview snapshot={snapshot} />)
  await screen.getByRole("button", { name: "Add funds" }).click()
  await screen.getByLabelText("Amount").fill("2500")
  await userEvent.tab()
  await userEvent.keyboard("{Enter}")

  await expect
    .element(screen.getByRole("heading", { name: "Review deposit" }))
    .toBeVisible()
  await expect
    .element(screen.getByText("$2,500.00", { exact: true }))
    .toBeVisible()
  await expect
    .element(screen.getByText("Chase Checking •••• 4242").nth(1))
    .toBeVisible()
  expect(mocks.depositFunding).not.toHaveBeenCalled()

  await userEvent.tab()
  await userEvent.tab()
  await userEvent.keyboard("{Enter}")

  expect(mocks.depositFunding).toHaveBeenCalledOnce()
  const submitted = mocks.depositFunding.mock.calls[0][1] as FormData
  expect(submitted.get("amount")).toBe("2500")
  await expect
    .element(screen.getByRole("heading", { name: "Deposit submitted" }))
    .toBeVisible()
})

test("disables confirmation while pending so it cannot dispatch twice", async () => {
  let finish!: (value: { status: "success"; message: string }) => void
  mocks.depositFunding.mockImplementation(
    () => new Promise((resolve) => (finish = resolve)),
  )
  const screen = await render(<FundingOverview snapshot={snapshot} />)
  await screen.getByRole("button", { name: "Add funds" }).click()
  await screen.getByLabelText("Amount").fill("25")
  await userEvent.tab()
  await userEvent.keyboard("{Enter}")

  await userEvent.tab()
  await userEvent.tab()
  await userEvent.keyboard("{Enter}")

  await expect
    .element(screen.getByRole("button", { name: "Submitting deposit…" }))
    .toBeDisabled()
  expect(mocks.depositFunding).toHaveBeenCalledOnce()
  finish({ status: "success", message: "Deposit submitted." })
  await expect
    .element(screen.getByRole("heading", { name: "Deposit submitted" }))
    .toBeVisible()
})

test.each([
  ["error", "Deposits are not permitted for this Brokerage Account."],
  [
    "unknown",
    "Deposit outcome is unknown. Check recent Transfers before trying again.",
  ],
] as const)(
  "announces a %s deposit outcome without optimistic changes",
  async (status, message) => {
    mocks.depositFunding.mockResolvedValue({ status, message })
    const screen = await render(<FundingOverview snapshot={snapshot} />)
    await screen.getByRole("button", { name: "Add funds" }).click()
    await screen.getByLabelText("Amount").fill("25")
    await userEvent.tab()
    await userEvent.keyboard("{Enter}")
    await userEvent.tab()
    await userEvent.tab()
    await userEvent.keyboard("{Enter}")

    await expect.element(screen.getByRole("alert")).toHaveTextContent(message)
    await expect.element(screen.getByText("$10,340.00")).toBeVisible()
    await expect.element(screen.getByText("+$2,500.00")).toBeVisible()
  },
)

test("disables deposits while the Brokerage Account blocks Transfers", async () => {
  const screen = await render(
    <FundingOverview snapshot={{ ...snapshot, transfersBlocked: true }} />,
  )

  await expect
    .element(
      screen.getByText("Transfers are blocked for this Brokerage Account."),
    )
    .toBeVisible()
  await expect
    .element(screen.getByRole("button", { name: "Add funds" }))
    .toBeDisabled()
})

test("shows Transfer affordances only after the Funding Source is ready", async () => {
  const preparingScreen = await render(
    <FundingOverview
      snapshot={{
        ...snapshot,
        fundingSource: {
          state: "preparing",
          name: "Chase Checking •••• 4242",
          message: "Funding source is being prepared.",
        },
      }}
    />,
  )

  await expect
    .element(preparingScreen.getByRole("button", { name: "Add funds" }))
    .not.toBeInTheDocument()
  await expect
    .element(preparingScreen.getByRole("button", { name: "Withdraw" }))
    .not.toBeInTheDocument()

  const readyScreen = await render(<FundingOverview snapshot={snapshot} />)
  await expect
    .element(readyScreen.getByRole("button", { name: "Add funds" }))
    .toBeVisible()
  await expect
    .element(readyScreen.getByRole("button", { name: "Withdraw" }))
    .toBeVisible()
})

test("refreshes the server-rendered snapshot from an accessible control", async () => {
  const screen = await render(<FundingOverview snapshot={snapshot} />)

  await screen.getByRole("button", { name: "Refresh" }).click()

  expect(mocks.refresh).toHaveBeenCalledOnce()
})
