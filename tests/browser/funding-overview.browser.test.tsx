import { expect, test, vi } from "vitest"
import { page } from "vitest/browser"
import { render } from "vitest-browser-react"

import { FundingOverview } from "../../components/funding/funding-overview"
import type { FundingSnapshot } from "../../lib/alpaca/funding"

const refresh = vi.hoisted(() => vi.fn())
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }))

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

  await expect
    .element(screen.getByRole("heading", { name: "Funding", exact: true }))
    .toBeVisible()
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
    .element(screen.getByText("Deposit", { exact: true }))
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
    await expect
      .element(screen.getByText("Deposit", { exact: true }))
      .toBeVisible()
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

test("refreshes the server-rendered snapshot from an accessible control", async () => {
  const screen = await render(<FundingOverview snapshot={snapshot} />)

  await screen.getByRole("button", { name: "Refresh" }).click()

  expect(refresh).toHaveBeenCalledOnce()
})
