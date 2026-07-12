"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import {
  Activity,
  ChevronsUpDown,
  DollarSign,
  Gem,
  LayoutDashboard,
  LogOut,
  Search,
  Settings,
  Target,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar"

const navItems = [
  { title: "Portfolio", icon: LayoutDashboard },
  { title: "Strategy", icon: Target },
  { title: "Activity", icon: Activity },
  { title: "Funding", icon: DollarSign },
]

export function AppSidebar() {
  const router = useRouter()
  const [isSigningOut, setIsSigningOut] = useState(false)

  async function handleSignOut() {
    setIsSigningOut(true)

    await authClient.signOut()
    router.replace("/sign-in")
    router.refresh()
  }

  return (
    <Sidebar variant="inset">
      <SidebarHeader className="gap-3 mt-0.5">
        <div className="flex items-center gap-2 px-1 py-1">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Gem className="size-4" />
          </div>
          <span className="text-xl font-semibold">Wealth Manager</span>
        </div>

        <div className="flex flex-col gap-3">
          <Label htmlFor="search" className="sr-only">
            Search Investments
          </Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            <SidebarInput
              id="search"
              placeholder="Search Investments..."
              className="h-12 pl-10 text-base"
            />
          </div>
          <Button className="h-12 w-full text-base font-bold">Trade</Button>
        </div>
      </SidebarHeader>

      <SidebarSeparator className="my-4" />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    size="lg"
                    className="text-base [&>svg]:size-5"
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  />
                }
              >
                <Avatar className="size-8 rounded-lg">
                  <AvatarImage src="/user-avatar.jpg" alt="Jordan Avery" />
                  <AvatarFallback className="rounded-lg">JA</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Jordan Avery</span>
                  <span className="truncate text-xs text-muted-foreground">
                    jordan@wealth.io
                  </span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="end"
                sideOffset={4}
                className="min-w-56 rounded-lg"
              >
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                      <Avatar className="size-8 rounded-lg">
                        <AvatarImage
                          src="/user-avatar.jpg"
                          alt="Jordan Avery"
                        />
                        <AvatarFallback className="rounded-lg">
                          JA
                        </AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-medium">
                          Jordan Avery
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          jordan@wealth.io
                        </span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem>
                    <Settings />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                  >
                    <LogOut />
                    {isSigningOut ? "Signing out..." : "Logout"}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
