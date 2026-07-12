import { describe, expect, it } from "vitest"

import { buildSandboxAccountPayload } from "../../lib/alpaca/account-fixture"

describe("Alpaca sandbox account fixtures", () => {
  it("builds deterministic, user-specific fully-disclosed data", () => {
    const signedAt = new Date("2026-07-12T12:00:00.000Z")
    const first = buildSandboxAccountPayload(
      { id: 1000, email: "ada@example.com" },
      signedAt,
    )
    const second = buildSandboxAccountPayload(
      { id: 1001, email: "grace@example.com" },
      signedAt,
    )

    expect(first.contact.email_address).toBe("ada@example.com")
    expect(first.identity).toMatchObject({
      given_name: "Sandbox",
      family_name: "User1000",
      tax_id_type: "USA_SSN",
    })
    expect(first.identity.tax_id).toMatch(/^\d{3}-\d{2}-\d{4}$/)
    expect(first.identity.tax_id).not.toBe(second.identity.tax_id)
    expect(first.agreements).toEqual([
      {
        agreement: "customer_agreement",
        signed_at: signedAt.toISOString(),
        ip_address: "192.0.2.1",
      },
      {
        agreement: "margin_agreement",
        signed_at: signedAt.toISOString(),
        ip_address: "192.0.2.1",
      },
    ])
  })
})
