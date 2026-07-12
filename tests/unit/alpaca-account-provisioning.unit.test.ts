import { describe, expect, it } from "vitest"

import { buildSandboxAccountPayload } from "../../lib/alpaca/account-fixture"

describe("Alpaca sandbox account fixtures", () => {
  it("builds user-specific fully-disclosed data with unique sandbox emails", () => {
    const signedAt = new Date("2026-07-12T12:00:00.000Z")
    const first = buildSandboxAccountPayload({ id: 1000 }, signedAt)
    const second = buildSandboxAccountPayload({ id: 1001 }, signedAt)

    expect(first.contact.email_address).toMatch(
      /^sandbox-[0-9a-f-]{36}@example\.com$/,
    )
    expect(first.contact.email_address).not.toBe(second.contact.email_address)
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
