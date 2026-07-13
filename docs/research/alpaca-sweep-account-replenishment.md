# Alpaca sandbox Sweep Account replenishment

**Date:** 2026-07-12

## Question

Can a depleted Alpaca Broker sandbox Sweep Account be replenished through an API?

## Finding

No documented Broker API operation mints, resets, or deposits synthetic cash directly into a depleted firm Sweep Account.

Alpaca provisions each sandbox team with a firm account initially funded with $50,000 and documents Journals as the way to move that existing balance into customer Brokerage Accounts. `POST /v1/journals` therefore cannot replenish an empty source; it only moves existing cash. Sources: [Getting Started with Broker API](https://docs.alpaca.markets/us/docs/getting-started-with-broker-api), [Journals API](https://docs.alpaca.markets/us/docs/funding-via-journals), and the local OpenAPI definition at `context/alpaca/02_broker_api/broker.openapi.yaml:19154-19390`.

### Candidate APIs

- **ACH Transfers:** `POST /v1/accounts/{account_id}/transfers` supports simulated incoming ACH for customer Brokerage Accounts after an ACH Relationship exists. Alpaca does not document ACH Relationships or synthetic ACH deposits as a way to refill a firm Sweep Account. Sources: [ACH Funding](https://docs.alpaca.markets/us/docs/ach-funding), `context/alpaca/02_broker_api/broker.openapi.yaml:14984-15110`, and `context/alpaca/02_broker_api/broker.openapi.yaml:16128-16334`.
- **Wires:** Incoming wires are initiated externally, not through the Transfer API. Cash-pooling firms may fund firm accounts by wire, but this is an external funding and Alpaca-setup process rather than a synthetic sandbox top-up endpoint. Source: [Funding Accounts](https://docs.alpaca.markets/us/docs/funding-accounts).
- **Funding Wallet demo deposits:** `POST /v1beta/demo/banking/funding` simulates an inbound deposit into an account's dedicated Funding Wallet. It does not credit general Brokerage Account cash or document support for replenishing a Sweep Account. Sources: [Funding Wallets](https://docs.alpaca.markets/us/docs/funding-wallets), [Create sandbox deposit transfer](https://docs.alpaca.markets/us/reference/demodepositfunding), and `context/alpaca/02_broker_api/broker.openapi.yaml:14670-14719`.
- **Instant Funding:** `POST /v1/instant_funding` borrows Buying Power from a configured firm source account for a customer account. It consumes rather than replenishes firm capacity and eventually requires external settlement. Source: `context/alpaca/02_broker_api/03_funding_accounts/05.instant_funding.md:29-43,357-365`.
- **Journal reversal/customer-to-firm Journal:** Existing customer cash could be moved back to the Sweep Account, but this only recovers previously distributed cash; it does not increase total sandbox funds. Source: `context/alpaca/02_broker_api/03_funding_accounts/02.journals_api.md:13-21`.
- **Reset/reprovision:** The Broker OpenAPI contains no firm-account reset, refill, or reprovision operation. Paper Trading account reset documentation applies to Trading API paper accounts, not Broker API firm accounts.

## Recommendation

Ask Alpaca Support to reseed/reset the sandbox firm Sweep Account or provide the supported external replenishment process for this sandbox team. Do not add a Sweep Account funding script around an undocumented ACH or Funding Wallet assumption. If Alpaca identifies a supported endpoint, validate it manually first and only then automate it.
