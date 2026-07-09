import { requireSession } from "@/lib/auth/session"

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  await requireSession()

  return <div className="min-h-full flex-1 bg-muted/30">{children}</div>
}
