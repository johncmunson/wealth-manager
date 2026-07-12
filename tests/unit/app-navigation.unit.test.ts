import { describe, expect, it } from "vitest"

import { getAppNavItem, isAppRouteActive } from "../../lib/app-navigation"

describe("app navigation", () => {
  it.each([
    ["/app/portfolio", "/app/portfolio"],
    ["/app/portfolio/holdings", "/app/portfolio"],
    ["/app/portfolio/", "/app/portfolio"],
  ])("matches %s within %s", (pathname, href) => {
    expect(isAppRouteActive(pathname, href)).toBe(true)
  })

  it.each([
    ["/app/portfolio-settings", "/app/portfolio"],
    ["/app/portfolios", "/app/portfolio"],
    ["/app/strategy", "/app/portfolio"],
  ])("does not match %s within %s", (pathname, href) => {
    expect(isAppRouteActive(pathname, href)).toBe(false)
  })

  it("resolves the navigation item for exact and nested routes", () => {
    expect(getAppNavItem("/app/activity")?.title).toBe("Activity")
    expect(getAppNavItem("/app/activity/transaction-123")?.title).toBe(
      "Activity",
    )
  })

  it("returns no item for an unconfigured route", () => {
    expect(getAppNavItem("/app/settings")).toBeUndefined()
  })
})
