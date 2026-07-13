import { beforeEach, expect, test, vi } from "vitest"
import { page, userEvent } from "vitest/browser"
import { render } from "vitest-browser-react"

import { AppSidebar } from "../../components/sidebar/app-sidebar"
import { OrderDialog } from "../../components/order/order-dialog"
import { SidebarProvider } from "../../components/ui/sidebar"
import type {
  BuyAssetValidation,
  OrderQuote,
  OrderSnapshot,
} from "../../lib/alpaca/orders"

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href, ...props }: React.ComponentProps<"a">) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))
vi.mock("next/navigation", () => ({
  usePathname: () => "/app/portfolio",
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
}))
vi.mock("../../lib/auth-client", () => ({
  authClient: { signOut: vi.fn() },
}))

beforeEach(() => {
  mocks.replace.mockReset()
  mocks.refresh.mockReset()
})

async function renderSidebar(
  readOrderSnapshotAction: () => Promise<OrderSnapshot>,
) {
  await page.viewport(1280, 800)
  return render(
    <SidebarProvider>
      <AppSidebar
        readOrderSnapshotAction={readOrderSnapshotAction}
        validateBuyAssetAction={async (symbol) => ({
          status: "invalid",
          symbol,
          reason: "Not used in this test.",
        })}
        refreshBuyQuoteAction={async () => null}
      />
    </SidebarProvider>,
  )
}

test("the sidebar Trade action opens a fresh Buy form", async () => {
  const readSnapshot = vi.fn(async () => ({
    accountState: "ready" as const,
    buyingPower: "1250.00",
  }))
  const screen = await renderSidebar(readSnapshot)
  const trigger = screen.getByRole("button", { name: "Trade" })

  await trigger.click()

  await expect
    .element(screen.getByRole("heading", { name: "Place an order" }))
    .toBeVisible()
  await expect
    .element(screen.getByRole("form", { name: "Buy order" }))
    .toHaveTextContent("Buy")
  const symbol = screen.getByRole("textbox", { name: "Symbol" })
  await expect.element(symbol).toHaveFocus()
  await symbol.fill("VTI")
  await userEvent.keyboard("{Escape}")
  await expect.element(trigger).toHaveFocus()

  await trigger.click()

  await expect
    .element(screen.getByRole("textbox", { name: "Symbol" }))
    .toHaveValue("")
  expect(readSnapshot).toHaveBeenCalledTimes(2)
})

test("reopening does not wait for an earlier account read", async () => {
  const firstRead = new Promise<OrderSnapshot>(() => undefined)
  const readSnapshot = vi
    .fn<() => Promise<OrderSnapshot>>()
    .mockReturnValueOnce(firstRead)
    .mockResolvedValue({ accountState: "ready", buyingPower: "1250.00" })
  const screen = await renderSidebar(readSnapshot)
  const trigger = screen.getByRole("button", { name: "Trade" })

  await trigger.click()
  await expect.element(screen.getByRole("status")).toBeVisible()
  await userEvent.keyboard("{Escape}")
  await trigger.click()

  await expect
    .element(screen.getByRole("textbox", { name: "Symbol" }))
    .toBeVisible()
})

test.each([
  ["missing", "Brokerage Account required"],
  ["pending", "Brokerage Account is being prepared"],
  ["failed", "Brokerage Account unavailable"],
  ["unknown", "Brokerage Account status unavailable"],
  ["inactive", "Brokerage Account is not active"],
  ["account-blocked", "Brokerage Account is blocked"],
  ["trading-blocked", "Orders are blocked"],
  ["suspended", "Orders are suspended"],
] as const)(
  "shows the %s unavailable state without an Order form",
  async (accountState, heading) => {
    const screen = await renderSidebar(async () => ({ accountState }))

    await screen.getByRole("button", { name: "Trade" }).click()

    await expect
      .element(screen.getByRole("heading", { name: heading }))
      .toBeVisible()
    await expect
      .element(screen.getByRole("dialog").getByRole("form"))
      .not.toBeInTheDocument()
  },
)

function renderReadyDialog({
  validate = async (): Promise<BuyAssetValidation> => ({
    status: "valid",
    asset: {
      symbol: "VTI",
      name: "Vanguard Total Stock Market ETF",
      fractionable: true,
    },
    quote: {
      askPrice: 250,
      bidPrice: 249.9,
      timestamp: "2026-07-10T19:59:00Z",
    },
  }),
  refreshQuote = async (): Promise<OrderQuote | null> => ({
    askPrice: 251,
    bidPrice: 250.9,
    timestamp: "2026-07-10T20:00:00Z",
  }),
  buyingPower = "1250.00",
}: {
  validate?: (symbol: string) => Promise<BuyAssetValidation>
  refreshQuote?: (symbol: string) => Promise<OrderQuote | null>
  buyingPower?: string | null
} = {}) {
  return render(
    <OrderDialog
      readOrderSnapshotAction={async () => ({
        accountState: "ready",
        buyingPower,
      })}
      validateBuyAssetAction={validate}
      refreshBuyQuoteAction={refreshQuote}
    />,
  )
}

test("validates the normalized Symbol on blur and ignores stale responses", async () => {
  let resolveFirst!: (result: BuyAssetValidation) => void
  let resolveSecond!: (result: BuyAssetValidation) => void
  const validate = vi
    .fn<(symbol: string) => Promise<BuyAssetValidation>>()
    .mockReturnValueOnce(new Promise((resolve) => (resolveFirst = resolve)))
    .mockReturnValueOnce(new Promise((resolve) => (resolveSecond = resolve)))
  const screen = await renderReadyDialog({ validate })
  await screen.getByRole("button", { name: "Trade" }).click()
  const symbol = screen.getByRole("textbox", { name: "Symbol" })

  await symbol.fill(" vti ")
  await userEvent.tab()
  await expect
    .element(screen.getByRole("status", { name: "Validating Symbol" }))
    .toBeVisible()
  expect(validate).toHaveBeenLastCalledWith("VTI")

  await symbol.fill("spy")
  await userEvent.tab()
  resolveSecond({
    status: "valid",
    asset: {
      symbol: "SPY",
      name: "SPDR S&P 500 ETF Trust",
      fractionable: true,
    },
    quote: {
      askPrice: 600,
      bidPrice: 599.9,
      timestamp: "2026-07-10T20:00:00Z",
    },
  })
  await expect.element(screen.getByText("SPDR S&P 500 ETF Trust")).toBeVisible()

  resolveFirst({
    status: "valid",
    asset: { symbol: "VTI", name: "Stale Asset", fractionable: true },
    quote: {
      askPrice: 250,
      bidPrice: 249.9,
      timestamp: "2026-07-10T19:59:00Z",
    },
  })
  await expect.element(screen.getByText("Stale Asset")).not.toBeInTheDocument()
  await expect.element(symbol).toHaveValue("SPY")
})

async function renderInvalidAsset() {
  const reason = "Only US stocks and ETFs are supported."
  const screen = await renderReadyDialog({
    validate: async (symbol) => ({ status: "invalid", symbol, reason }),
  })
  await screen.getByRole("button", { name: "Trade" }).click()
  const symbol = screen.getByRole("textbox", { name: "Symbol" })
  await symbol.fill("bond")
  await userEvent.tab()
  return {
    feedback: screen.getByRole("button", { name: "Symbol is invalid" }),
    reason,
    screen,
    symbol,
  }
}

test("exposes invalid Asset feedback through a hover tooltip", async () => {
  const { feedback, screen } = await renderInvalidAsset()
  await expect.element(feedback).toBeVisible()
  // The component harness omits Tailwind's dialog stacking styles.
  document
    .querySelectorAll<HTMLElement>("[role=presentation]")
    .forEach((element) => (element.style.pointerEvents = "none"))
  const tooltip = screen.getByText(/Why invalid:/)

  await feedback.hover()
  await expect.element(tooltip).toBeVisible()
  await feedback.unhover()
  await expect.element(tooltip).not.toBeInTheDocument()
})

test("exposes invalid Asset feedback through keyboard focus and its field description", async () => {
  const { feedback, reason, screen, symbol } = await renderInvalidAsset()
  const tooltip = screen.getByText(/Why invalid:/)

  await userEvent.keyboard("{Shift>}{Tab}{/Shift}")
  await expect.element(feedback).toHaveFocus()
  await expect.element(tooltip).toBeVisible()
  await expect.element(symbol).toHaveAttribute("aria-describedby")
  await expect
    .element(screen.getByText(reason, { exact: true }))
    .toBeInTheDocument()
})

test("shows Buying Power, quote details, estimate, and refreshed Buy review", async () => {
  const refreshQuote = vi.fn(async () => ({
    askPrice: 200,
    bidPrice: 199.9,
    timestamp: "2026-07-10T20:00:00Z",
  }))
  const screen = await renderReadyDialog({ refreshQuote })
  await screen.getByRole("button", { name: "Trade" }).click()
  const symbol = screen.getByRole("textbox", { name: "Symbol" })
  await symbol.fill("vti")
  await userEvent.tab()

  await screen.getByRole("textbox", { name: "Dollar amount" }).fill("100.00")
  await expect.element(screen.getByText("$1,250.00")).toBeVisible()
  await expect.element(screen.getByText("$250.00")).toBeVisible()
  await expect.element(screen.getByText("0.4 shares")).toBeVisible()
  await userEvent.tab()
  await userEvent.keyboard("{Enter}")

  expect(refreshQuote).toHaveBeenCalledOnce()
  await expect
    .element(screen.getByRole("heading", { name: "Review buy order" }))
    .toBeVisible()
  const dialog = screen.getByRole("dialog")
  for (const text of [
    "Buy",
    "VTI — Vanguard Total Stock Market ETF",
    "$100.00",
    "Approximately 0.5 shares",
    "Market",
    "Day",
    "Regular market hours only",
    "Execution price is not guaranteed",
    "Applicable fees may affect the final value",
  ]) {
    await expect.element(dialog).toHaveTextContent(text)
  }
})

test("locks the reviewed draft while its quote refresh is pending", async () => {
  let resolveQuote!: (quote: OrderQuote) => void
  const screen = await renderReadyDialog({
    refreshQuote: () => new Promise((resolve) => (resolveQuote = resolve)),
  })
  await screen.getByRole("button", { name: "Trade" }).click()
  const symbol = screen.getByRole("textbox", { name: "Symbol" })
  await symbol.fill("VTI")
  await userEvent.tab()
  const amount = screen.getByRole("textbox", { name: "Dollar amount" })
  await amount.fill("100")
  await userEvent.tab()
  await userEvent.keyboard("{Enter}")

  await expect.element(symbol).toBeDisabled()
  await expect.element(amount).toBeDisabled()
  resolveQuote({
    askPrice: 200,
    bidPrice: 199.9,
    timestamp: "2026-07-10T20:00:00Z",
  })
  await expect
    .element(screen.getByRole("heading", { name: "Review buy order" }))
    .toBeVisible()
})

test.each([
  ["0.99", "Enter at least $1.00."],
  [
    "1.001",
    "Enter a positive dollar amount with no more than two decimal places.",
  ],
  ["1250.01", "This order exceeds your $1,250.00 Buying Power."],
] as const)("blocks review for dollar amount %s", async (amount, message) => {
  const screen = await renderReadyDialog()
  await screen.getByRole("button", { name: "Trade" }).click()
  const symbol = screen.getByRole("textbox", { name: "Symbol" })
  await symbol.fill("VTI")
  await userEvent.tab()
  await screen.getByRole("textbox", { name: "Dollar amount" }).fill(amount)

  await expect.element(screen.getByText(message)).toBeVisible()
  await expect
    .element(screen.getByRole("textbox", { name: "Dollar amount" }))
    .toHaveAttribute("aria-describedby", "order-amount-error")
  await expect
    .element(screen.getByRole("button", { name: "Review buy order" }))
    .toBeDisabled()
})

test("blocks review when the latest Buy quote is unusable", async () => {
  const screen = await renderReadyDialog({
    validate: async () => ({
      status: "valid",
      asset: {
        symbol: "VTI",
        name: "Vanguard Total Stock Market ETF",
        fractionable: true,
      },
      quote: null,
    }),
  })
  await screen.getByRole("button", { name: "Trade" }).click()
  const symbol = screen.getByRole("textbox", { name: "Symbol" })
  await symbol.fill("VTI")
  await userEvent.tab()
  await screen.getByRole("textbox", { name: "Dollar amount" }).fill("100")

  await expect
    .element(screen.getByText("A current ask quote is unavailable."))
    .toBeVisible()
  await expect
    .element(screen.getByRole("button", { name: "Review buy order" }))
    .toBeDisabled()
})

test("the modal remains usable on a narrow viewport", async () => {
  await page.viewport(375, 180)
  const screen = await render(
    <OrderDialog
      readOrderSnapshotAction={async () => ({
        accountState: "ready",
        buyingPower: "1250.00",
      })}
      validateBuyAssetAction={async () => ({
        status: "invalid",
        symbol: "",
        reason: "Enter a Symbol.",
      })}
      refreshBuyQuoteAction={async () => null}
    />,
  )

  await screen.getByRole("button", { name: "Trade" }).click()

  await expect.element(screen.getByRole("dialog")).toBeVisible()
  await expect
    .element(screen.getByRole("button", { name: "Close" }))
    .toBeVisible()
  await expect
    .element(screen.getByRole("textbox", { name: "Symbol" }))
    .toBeVisible()

  await expect
    .element(screen.getByRole("button", { name: "Review buy order" }))
    .toBeVisible()
})
