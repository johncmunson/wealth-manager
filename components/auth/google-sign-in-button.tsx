"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"

export function GoogleSignInButton() {
  const [isPending, setIsPending] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleSignIn() {
    setIsPending(true)
    setErrorMessage(null)

    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/app",
    })

    if (error) {
      setErrorMessage(error.message ?? "Unable to start Google sign-in.")
      setIsPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Button type="button" onClick={handleSignIn} disabled={isPending}>
        {isPending ? "Redirecting..." : "Continue with Google"}
      </Button>
      {errorMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}
