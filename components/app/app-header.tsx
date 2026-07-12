"use client"

import { usePathname } from "next/navigation"

import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

const routeTitles: Record<string, string> = {
  "/app/portfolio": "Portfolio",
  "/app/strategy": "Strategy",
  "/app/activity": "Activity",
  "/app/funding": "Funding",
}

export function AppHeader() {
  const pathname = usePathname()
  const title = routeTitles[pathname] ?? "Wealth Manager"

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator
        orientation="vertical"
        className="mr-2 data-vertical:h-4 data-vertical:self-center"
      />
      <h1 className="text-base font-medium">{title}</h1>
    </header>
  )
}
