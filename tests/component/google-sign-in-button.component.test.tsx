import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { GoogleSignInButton } from "../../components/auth/google-sign-in-button"

const { signInSocial } = vi.hoisted(() => ({
  signInSocial: vi.fn(),
}))

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signIn: {
      social: signInSocial,
    },
  },
}))

describe("GoogleSignInButton", () => {
  beforeEach(() => {
    signInSocial.mockReset()
  })

  it("starts Google sign-in with the workspace callback", async () => {
    signInSocial.mockResolvedValue({ error: null })
    const user = userEvent.setup()

    render(<GoogleSignInButton />)
    await user.click(screen.getByRole("button", { name: "Continue with Google" }))

    expect(signInSocial).toHaveBeenCalledWith({
      provider: "google",
      callbackURL: "/app",
    })
  })

  it("disables the control while sign-in is pending", async () => {
    signInSocial.mockReturnValue(new Promise(() => undefined))
    const user = userEvent.setup()

    render(<GoogleSignInButton />)
    await user.click(screen.getByRole("button", { name: "Continue with Google" }))

    expect(screen.getByRole("button", { name: "Redirecting..." })).toBeDisabled()
  })

  it("announces provider errors", async () => {
    signInSocial.mockResolvedValue({ error: { message: "Provider unavailable" } })
    const user = userEvent.setup()

    render(<GoogleSignInButton />)
    await user.click(screen.getByRole("button", { name: "Continue with Google" }))

    expect(screen.getByRole("alert")).toHaveTextContent("Provider unavailable")
    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeEnabled()
  })
})
