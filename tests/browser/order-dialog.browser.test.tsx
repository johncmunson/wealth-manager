import { beforeEach, expect, test, vi } from "vitest"
import { page, userEvent } from "vitest/browser"
import { render } from "vitest-browser-react"

import { AppSidebar } from "../../components/sidebar/app-sidebar"
import { OrderDialog } from "../../components/order/order-dialog"
import { SidebarProvider } from "../../components/ui/sidebar"
import type { OrderSnapshot } from "../../lib/alpaca/orders"

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
      <AppSidebar readOrderSnapshotAction={readOrderSnapshotAction} />
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

test("the modal remains usable on a narrow viewport", async () => {
  await page.viewport(375, 180)
  const screen = await render(
    <OrderDialog
      readOrderSnapshotAction={async () => ({
        accountState: "ready",
        buyingPower: "1250.00",
      })}
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
    .element(screen.getByRole("button", { name: "Continue" }))
    .toBeVisible()
})
