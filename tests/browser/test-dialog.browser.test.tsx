import { expect, test } from "vitest"
import { userEvent } from "vitest/browser"
import { render } from "vitest-browser-react"

import { TestDialog } from "../fixtures/test-dialog"

test("a modal traps initial focus and restores it when closed", async () => {
  const screen = await render(<TestDialog />)
  const trigger = screen.getByRole("button", { name: "Review plan" })

  await trigger.click()

  await expect.element(screen.getByRole("heading", { name: "Confirm plan" })).toBeVisible()
  await expect.element(screen.getByRole("textbox", { name: "Plan name" })).toHaveFocus()

  await screen.getByRole("button", { name: "Done" }).click()

  expect(document.querySelector("dialog")?.open).toBe(false)
  await expect.element(trigger).toHaveFocus()
})

test("Escape dismisses the native modal", async () => {
  const screen = await render(<TestDialog />)

  await screen.getByRole("button", { name: "Review plan" }).click()
  await screen.getByRole("textbox", { name: "Plan name" }).click()
  await userEvent.keyboard("{Escape}")

  expect(document.querySelector("dialog")?.open).toBe(false)
  await expect.element(screen.getByRole("button", { name: "Review plan" })).toHaveFocus()
})
