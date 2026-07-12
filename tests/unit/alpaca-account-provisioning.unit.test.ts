import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  brokerRequest: vi.fn(),
  prepareFundingSource: vi.fn(),
  createdAccount: { id: 7, userId: 42 },
  updates: [] as Record<string, unknown>[],
}))

vi.mock("../../lib/alpaca/broker-client", () => ({
  AlpacaBrokerAuthenticationError: class extends Error {},
  AlpacaBrokerRequestError: class extends Error {},
  alpacaBrokerRequest: mocks.brokerRequest,
}))
vi.mock("../../lib/alpaca/token-service", () => ({
  AlpacaTokenError: class extends Error {},
}))
vi.mock("../../lib/alpaca/funding", () => ({
  prepareSyntheticFundingSource: mocks.prepareFundingSource,
}))
vi.mock("../../db", () => ({
  db: {
    insert: () => ({
      values: () => ({
        onConflictDoNothing: () => ({
          returning: async () => [mocks.createdAccount],
        }),
      }),
    }),
    update: () => ({
      set: (value: Record<string, unknown>) => {
        mocks.updates.push(value)
        return {
          where: () => ({
            returning: async () => [{ ...mocks.createdAccount, ...value }],
          }),
        }
      },
    }),
  },
}))

import { buildSandboxAccountPayload } from "../../lib/alpaca/account-fixture"
import { ensureAlpacaAccount } from "../../lib/alpaca/account-provisioning"

beforeEach(() => {
  mocks.createdAccount = { id: 7, userId: 42 }
  mocks.updates = []
  mocks.prepareFundingSource.mockResolvedValue({ state: "ready" })
})

describe("Alpaca account Provisioning", () => {
  it("prepares funding only after Alpaca creates and links the Brokerage Account", async () => {
    mocks.brokerRequest.mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "alpaca-account-123",
          account_number: "PA123",
          status: "ACTIVE",
        }),
      ),
    )

    await expect(ensureAlpacaAccount({ id: 42 })).resolves.toMatchObject({
      provisioningStatus: "linked",
      alpacaAccountId: "alpaca-account-123",
    })
    expect(mocks.updates[0]).toMatchObject({ provisioningStatus: "linked" })
    expect(mocks.prepareFundingSource).toHaveBeenCalledWith(
      "alpaca-account-123",
    )
  })

  it("preserves the linked account when Funding Source preparation fails", async () => {
    mocks.brokerRequest.mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "alpaca-account-123",
          account_number: "PA123",
          status: "ACTIVE",
        }),
      ),
    )
    mocks.prepareFundingSource.mockRejectedValue(new Error("timeout"))

    await expect(ensureAlpacaAccount({ id: 42 })).resolves.toMatchObject({
      provisioningStatus: "linked",
      alpacaAccountId: "alpaca-account-123",
    })
    expect(mocks.updates).toHaveLength(1)
  })

  it("does not prepare funding when account creation is rejected", async () => {
    mocks.brokerRequest.mockResolvedValue(new Response(null, { status: 400 }))

    await expect(ensureAlpacaAccount({ id: 42 })).resolves.toMatchObject({
      provisioningStatus: "failed",
    })
    expect(mocks.prepareFundingSource).not.toHaveBeenCalled()
  })
})

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
