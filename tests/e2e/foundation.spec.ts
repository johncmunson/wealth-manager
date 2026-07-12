import { expect, test } from "@playwright/test"

test("the public landing page exposes primary navigation", async ({ page }) => {
  await page.goto("/")

  await expect(page.getByText("Wealth Manager", { exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Open app" })).toBeVisible()
})

test("a visitor can navigate to sign in", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("button", { name: "Sign in" }).click()

  await expect(page).toHaveURL(/\/sign-in$/)
  await expect(
    page.getByText("Sign in to Wealth Manager", { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Continue with Google" }),
  ).toBeEnabled()
})

test("the protected workspace redirects anonymous visitors", async ({
  page,
}) => {
  await page.goto("/app")

  await expect(page).toHaveURL(/\/sign-in$/)
})
