import "server-only"

export interface AlpacaProvisioningUser {
  readonly id: number
}

function syntheticSsn(userId: number) {
  const area = 500 + (userId % 100)
  const group = 10 + (Math.floor(userId / 100) % 80)
  const serial = 1000 + (userId % 9000)
  return `${area}-${group}-${serial}`
}

/** Sandbox-only fully-disclosed account fixture. No synthetic KYC data is persisted. */
// ponytail: synthetic identifiers repeat after 10k users; real onboarding replaces them before launch.
export function buildSandboxAccountPayload(
  user: AlpacaProvisioningUser,
  signedAt = new Date(),
) {
  const timestamp = signedAt.toISOString()

  return {
    contact: {
      email_address: `sandbox-${crypto.randomUUID()}@example.com`,
      phone_number: `415555${String(user.id % 10_000).padStart(4, "0")}`,
      street_address: ["123 Market Street"],
      city: "San Francisco",
      postal_code: "94105",
      state: "CA",
    },
    identity: {
      given_name: "Sandbox",
      family_name: `User${user.id}`,
      date_of_birth: "1990-01-01",
      tax_id_type: "USA_SSN",
      tax_id: syntheticSsn(user.id),
      country_of_citizenship: "USA",
      country_of_birth: "USA",
      country_of_tax_residence: "USA",
      funding_source: ["employment_income"],
      annual_income_min: "50000",
      annual_income_max: "100000",
      total_net_worth_min: "50000",
      total_net_worth_max: "100000",
      liquid_net_worth_min: "25000",
      liquid_net_worth_max: "50000",
      liquidity_needs: "does_not_matter",
      investment_experience_with_stocks: "over_5_years",
      investment_experience_with_options: "over_5_years",
      risk_tolerance: "conservative",
      investment_objective: "market_speculation",
      investment_time_horizon: "more_than_10_years",
      marital_status: "SINGLE",
      number_of_dependents: 0,
    },
    disclosures: {
      is_control_person: false,
      is_affiliated_exchange_or_finra: false,
      is_affiliated_exchange_or_iiroc: false,
      is_politically_exposed: false,
      immediate_family_exposed: false,
    },
    agreements: [
      {
        agreement: "customer_agreement",
        signed_at: timestamp,
        ip_address: "192.0.2.1",
      },
      {
        agreement: "margin_agreement",
        signed_at: timestamp,
        ip_address: "192.0.2.1",
      },
    ],
  }
}
