import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getCurrentSession } from "@/lib/auth/session"

export const metadata: Metadata = {
  title: "Sign in | Wealth Manager",
}

export default async function SignInPage() {
  const session = await getCurrentSession()

  if (session) {
    redirect("/app")
  }

  return (
    <main className="flex min-h-full flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle>Sign in to Wealth Manager</CardTitle>
          <CardDescription>
            Continue with your Google account to open your workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GoogleSignInButton />
        </CardContent>
      </Card>
    </main>
  )
}
