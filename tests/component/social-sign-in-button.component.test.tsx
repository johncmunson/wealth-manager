import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { SocialSignInButton } from "../../components/auth/social-sign-in-button"

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

function renderGoogleSignInButton() {
  return render(
    <SocialSignInButton provider="google">
      Continue with Google
    </SocialSignInButton>,
  )
}

describe("SocialSignInButton", () => {
  beforeEach(() => {
    signInSocial.mockReset()
  })

  it("starts sign-in for the selected provider with the workspace callback", async () => {
    signInSocial.mockResolvedValue({ error: null })
    const user = userEvent.setup()

    renderGoogleSignInButton()
    await user.click(
      screen.getByRole("button", { name: "Continue with Google" }),
    )

    expect(signInSocial).toHaveBeenCalledWith({
      provider: "google",
      callbackURL: "/app/portfolio",
    })
  })

  it("disables the control while sign-in is pending", async () => {
    signInSocial.mockReturnValue(new Promise(() => undefined))
    const user = userEvent.setup()

    renderGoogleSignInButton()
    await user.click(
      screen.getByRole("button", { name: "Continue with Google" }),
    )

    expect(
      screen.getByRole("button", { name: "Redirecting..." }),
    ).toBeDisabled()
  })

  it("announces provider errors", async () => {
    signInSocial.mockResolvedValue({
      error: { message: "Provider unavailable" },
    })
    const user = userEvent.setup()

    renderGoogleSignInButton()
    await user.click(
      screen.getByRole("button", { name: "Continue with Google" }),
    )

    expect(screen.getByRole("alert")).toHaveTextContent("Provider unavailable")
    expect(
      screen.getByRole("button", { name: "Continue with Google" }),
    ).toBeEnabled()
  })
})
