import { SignOutButton } from "@/components/auth/sign-out-button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { requireSession } from "@/lib/auth/session"

function getInitials(name?: string | null, email?: string | null) {
  if (name) {
    const initials = name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase()

    if (initials) {
      return initials
    }
  }

  return (email?.charAt(0) ?? "W").toUpperCase()
}

export default async function AppPage() {
  const session = await requireSession()
  const { user } = session

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-6 md:p-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-muted-foreground">
            Wealth Manager
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Workspace</h1>
        </div>
        <SignOutButton />
      </header>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar size="lg">
              {user.image ? (
                <AvatarImage src={user.image} alt={`${user.name}'s avatar`} />
              ) : null}
              <AvatarFallback>
                {getInitials(user.name, user.email)}
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col gap-1">
              <CardTitle>{user.name}</CardTitle>
              <CardDescription>{user.email}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <p className="text-muted-foreground">
            Wealth Manager workspace coming soon.
          </p>
          <p className="text-sm text-muted-foreground">
            Your authenticated dashboard will live here as account aggregation,
            portfolio insights, and planning workflows are added.
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
