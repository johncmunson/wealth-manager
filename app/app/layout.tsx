import { readOrderSnapshot } from "@/app/app/order-actions"
import { AppHeader } from "@/components/app/app-header"
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { requireSession } from "@/lib/auth/session"

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  await requireSession()

  return (
    <SidebarProvider>
      <AppSidebar readOrderSnapshotAction={readOrderSnapshot} />
      <SidebarInset>
        <AppHeader />
        <main className="flex flex-1 flex-col gap-4 p-4">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
