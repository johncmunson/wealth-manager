import type { LucideIcon } from "lucide-react"
import { Activity, DollarSign, LayoutDashboard, Target } from "lucide-react"

type AppNavItem = {
  title: string
  href: string
  icon: LucideIcon
}

export const appNavItems = [
  { title: "Portfolio", href: "/app/portfolio", icon: LayoutDashboard },
  { title: "Strategy", href: "/app/strategy", icon: Target },
  { title: "Activity", href: "/app/activity", icon: Activity },
  { title: "Funding", href: "/app/funding", icon: DollarSign },
] as const satisfies readonly AppNavItem[]

export function isAppRouteActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function getAppNavItem(pathname: string) {
  return appNavItems.reduce<(typeof appNavItems)[number] | undefined>(
    (bestMatch, item) => {
      if (!isAppRouteActive(pathname, item.href)) return bestMatch

      return !bestMatch || item.href.length > bestMatch.href.length
        ? item
        : bestMatch
    },
    undefined,
  )
}
