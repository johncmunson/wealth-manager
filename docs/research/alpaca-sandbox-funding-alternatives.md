# Alpaca sandbox funding alternatives to ACH

**Decision for the demo tomorrow:** use a **JNLC cash Journal from the sandbox firm/Sweep account**. The Broker API getting-started guide says each sandbox team has a firm account pre-funded with **$50,000**, and explicitly calls journaling from that account the best way to simulate instant funding. A successful JNLC updates the recipient's buying power and is normally near-instant. This is a sandbox fixture, not a customer-facing funding rail. Sources: [Getting Started—Journaling Between Accounts](https://alpaca.markets/docs/api-references/broker-api/getting-started-with-broker-api/#3-journaling-between-accounts), [Journals](https://docs.alpaca.markets/docs/journals).

## Executive comparison

| Alternative                        | Sandbox?                                                                                                                | What it gives the customer                                                                                                                                                                                         | Timing                                                                                                                                                         | Reversal / withdrawal                                                                                                                                              | Main friction                                                                                                                                | Tomorrow?                                                                |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Transfer API, ACH                  | Yes. Sandbox ACH is virtual and settles immediately.                                                                    | Settled/usable cash; sandbox docs say the account can trade after credit.                                                                                                                                          | Immediate in current API spec; older tutorial says 10–30 minutes to simulate ACH delay. Treat the current spec as authoritative, but test the account balance. | Same endpoint supports `OUTGOING` ACH; transfer can be deleted/closed while cancellable.                                                                           | Requires an approved ACH relationship; production normally needs Plaid/bank-linking.                                                         | Already implemented; fallback if the synthetic relationship is approved. |
| Transfer API, non-ACH inbound/demo | **No.** The Transfer API enum is only `ach` and `wire`; `wire` is outgoing-only.                                        | N/A for an inbound non-ACH deposit.                                                                                                                                                                                | N/A.                                                                                                                                                           | N/A.                                                                                                                                                               | There is no documented `demo`, `cash`, or inbound-wire transfer type on this endpoint.                                                       | No.                                                                      |
| JNLC cash Journal from firm/Sweep  | Yes; sandbox firm account is pre-funded.                                                                                | Settled cash and buying power when `executed`; the docs say `activity_created` is informational and buying power is already usable.                                                                                | Usually sub-second/instant; above sandbox JNLC transaction/daily limits can wait for processing/EOD.                                                           | Journal deletion/cancel exists; executed journals can rarely be reversed by Alpaca operations. Journal is firm→customer (or customer→firm), not customer→customer. | Need firm account ID, user account ID, journal permission, and enough firm balance.                                                          | **Best reliable fallback.**                                              |
| Funding Wallet demo deposit        | Yes, but sandbox-only fixture.                                                                                          | Simulates an inbound deposit **to the funding wallet**; it is not the normal Brokerage Account Transfer API. Confirm whether the wallet-to-account flow produces the account cash/buying power needed by this app. | Demo endpoint returns the simulated wallet transfer; ordinary wallet transfers progress through pending/executed/complete.                                     | Funding-wallet transfers cannot be canceled; production withdrawal requires a recipient bank and withdrawal request.                                               | Wallet must be enabled/created, then funding details and wallet-transfer tracking; US local-rail E2E is specifically unsupported in sandbox. | Not the shortest path to buying power.                                   |
| Wire                               | Sandbox supports outgoing wire withdrawals; inbound wires are pushed by the sending bank, not created through this API. | Outgoing wire debits virtual account funds; no inbound buying power through the Transfer API.                                                                                                                      | Sandbox outgoing wire is asynchronous and auto-completes weekdays; weekend requests wait until Monday.                                                         | Outgoing transfer can be closed while allowed; no inbound API-created wire to reverse.                                                                             | Approved Bank Relationship and wire details; real inbound wire needs bank/FFC instructions and prefunded external banking.                   | No for adding cash.                                                      |
| Instant Funding                    | Sandbox test exists, but Alpaca must enable it for the partner.                                                         | **Buying power only first**: a memopost increases `buying_power` and tradable `cash`, while `cash_withdrawable` and settled/equity values do not increase. It becomes settled cash only after settlement.          | Immediate buying power after `EXECUTED`; settlement due T+1 by 1 PM ET. Unsettled transfers are canceled at 8 PM ET T+1 if not settled.                        | `DELETE /v1/instant_funding/{id}` can reverse an existing transfer; settlement is a separate reconciliation step.                                                  | Commercial/pricing amendment, Alpaca technical setup, SI/RF accounts, partner deposit, limits, and a wire or RF prefunding for settlement.   | Not without prior enablement; do not depend on it for tomorrow.          |

## 1. Transfer API: what is and is not available

The current Broker API spec documents only these transfer types:

```http
POST /v1/accounts/{account_id}/transfers
Content-Type: application/json

{
  "transfer_type": "ach",
  "relationship_id": "<approved-ach-relationship>",
  "amount": "100",
  "direction": "INCOMING"
}
```

`ach` supports incoming and outgoing directions and requires an approved ACH relationship. `wire` supports outgoing only and requires an approved Bank Relationship. The spec says sandbox ACH is settled against virtual funds immediately; sandbox outgoing wires are simulated asynchronously and do not transmit money to a bank. Therefore, there is **no documented non-ACH/demo inbound route** through the ordinary Transfer API. Sources: [Create a Transfer](https://docs.alpaca.markets/reference/createtransferforaccount), [TransferType and request schema in the repository spec](../../context/alpaca/02_broker_api/broker.openapi.yaml), [Funding Accounts—Sandbox Funding](https://docs.alpaca.markets/docs/funding-accounts#sandbox-funding).

The repository's current code uses exactly this ACH path: it creates an ACH relationship at `POST /v1/accounts/{account_id}/ach_relationships`, waits for `APPROVED`, then submits `POST /v1/accounts/{account_id}/transfers` with `transfer_type: "ach"`, `relationship_id`, `amount`, and `direction: "INCOMING"`. It also reads trading-account balances and recent transfers. Source: [`lib/alpaca/funding.ts`](../../lib/alpaca/funding.ts).

**Timing caveat:** the repository context contains an older sandbox tutorial saying ACH reflects in a CSD after roughly 10–30 minutes, while the current OpenAPI description says sandbox ACH settles instantly. For a demo, submit once, then poll the trading account/CSD rather than assuming either timing. Source: [Getting Started—sample ACH flow](https://alpaca.markets/docs/api-references/broker-api/getting-started-with-broker-api/#2-funding-your-users-account).

## 2. Cash Journals: the practical sandbox fixture

A cash journal is `JNLC`, from a firm account to the customer's account:

```http
POST /v1/journals
Content-Type: application/json

{
  "entry_type": "JNLC",
  "from_account": "<firm-or-sweep-account-id>",
  "to_account": "<customer-account-id>",
  "amount": "100",
  "currency": "USD"
}
```

The API spec describes `JNLC` as moving cash, requires `entry_type`, `from_account`, `to_account`, and (for JNLC) `amount`, and supports an idempotency key. Alpaca's guide says the sandbox firm account is pre-funded with $50,000 and recommends this route for simulating instant funding. Sources: [Create Journal](https://docs.alpaca.markets/reference/createjournal), [Journals API](https://docs.alpaca.markets/docs/journals), [Getting Started—firm account](https://alpaca.markets/docs/api-references/broker-api/getting-started-with-broker-api/#introducing-the-firm-account).

When executed, the journal updates balances; Alpaca says it is not necessary to wait for the JNLC v2 `activity_created` status to use updated buying power. Normal statuses are `queued`, `sent_to_clearing`, `executed`, and possibly `activity_created`; `pending`, `rejected`, `refused`, and `canceled` are also possible. Sandbox JNLCs are normally near-instant, but the documented default transaction limit is $50 and daily limit $1,000; exceeding limits can delay or require approval. Sources: [Journals status behavior](https://docs.alpaca.markets/docs/journals), [Broker API FAQ—JNLC limits](https://alpaca.markets/docs/api-references/broker-api/broker-api-faq/#how-much-time-does-jnlcs-or-journal-usually-take).

This is **not** a user-facing funding rail: the source is the firm's Alpaca account, not the user's bank. It is also not customer-to-customer; Alpaca documents firm↔customer movement only. The source firm account must have funds, and production use may require Alpaca review and local regulatory/licensing analysis. For tomorrow's stock/ETF test, it is the lowest-friction route because it produces account cash/buying power without ACH relationship setup.

## 3. Funding Wallet demo deposits

Funding Wallets are a separate beta-style wallet flow, with a dedicated wallet/account number and external funding details. The normal shape is:

1. `POST /v1beta/accounts/{account_id}/funding_wallet`
2. `GET /v1beta/accounts/{account_id}/funding_wallet/funding_details`
3. In sandbox only, `POST /v1beta/demo/banking/funding`
4. Track `GET /v1beta/accounts/{account_id}/funding_wallet/transfers`

Demo request shape from the current spec:

```json
{
  "amount": "100",
  "currency": "USD",
  "receiver_account_number": "<funding-wallet-account-number>",
  "receiver_routing_code": "<funding-wallet-routing-code>"
}
```

The spec explicitly says the demo endpoint simulates an inbound deposit **into an account's funding wallet**, only credits accounts belonging to the firm, and is non-production/sandbox-only. The repo context says the flow can be tested E2E with this endpoint, but US local-rail E2E is not supported in sandbox. Wallet transfer statuses include pending, executed, complete, rejected, and failed; wallet transfers cannot be canceled. Sources: [Funding Wallets](https://docs.alpaca.markets/docs/funding-wallets), [Create sandbox deposit](https://docs.alpaca.markets/reference/demodepositfunding), [Funding Wallet API spec](../../context/alpaca/02_broker_api/broker.openapi.yaml).

This should be treated as a **sandbox-only fixture for testing the wallet deposit flow**, not as a direct substitute for crediting a Brokerage Account's buying power. The official material does not promise that calling the demo wallet endpoint alone makes the linked trading account tradable. It also adds more setup than a Journal. Use it only if the demo specifically needs to exercise Funding Wallet UI/API behavior.

## 4. Wire

The current Transfer API spec makes the boundary clear: `wire` is `OUTGOING` only. An incoming wire is sent by the bank and recorded automatically; it cannot be submitted as `POST /transfers` with `direction: INCOMING`. Sandbox outgoing wire withdrawals are virtual, asynchronous, and weekday-dependent. Production incoming wires require Alpaca's bank instructions and an FFC instruction so deposits can be booked automatically. Sources: [Create a Transfer](https://docs.alpaca.markets/reference/createtransferforaccount), [Funding Accounts—Wire](https://docs.alpaca.markets/docs/funding-accounts#wire-us-domestic).

Consequently wire cannot reliably add buying power tomorrow through this API. It is a real user-facing production rail for inbound bank payments, but it needs external banking and operational setup; it is not a sandbox funding shortcut.

## 5. Instant Funding

Instant Funding is explicitly different from settled funding. Create a transfer with:

```http
POST /v1/instant_funding

{
  "account_no": "<customer-account-number>",
  "source_account_no": "<instant-funding-source-account-number>",
  "amount": "100"
}
```

The API says the request creates a memopost. Alpaca's FAQ specifies that `buying_power`, tradable `cash`, and `memoposts` increase, while `cash_withdrawable` and equity/settled-cash measures do not. Settlement converts the memopost to a CSD/settled cash and is initiated with `POST /v1/instant_funding/settlements`; settlement requires funds in the SI account and transmitter information. Sources: [Create Instant Funding](https://docs.alpaca.markets/reference/post-v1-instant-funding), [Instant Funding guide](https://docs.alpaca.markets/docs/instant-funding-1), [Instant Funding FAQ—account balances](https://alpaca.markets/docs/api-references/broker-api/broker-api-faq/instant-funding-faqs/#why-does-the-equity-of-an-account-with-an-unsettled-memopost-go-negative).

Sandbox testing is supported **only after Alpaca enables the feature**. Activation requires sales/commercial discussion, a pricing amendment, Alpaca technical configuration, and SI/RF/FW accounts created by Alpaca. A partner deposit is required; settlement is due T+1 by 1 PM ET, and late transfers can accrue interest and be canceled at 8 PM ET. The API supports `DELETE /v1/instant_funding/{instant_funding_id}` to reverse an existing transfer, but that does not remove the settlement/prefunding obligations if funds were traded or the deadline is missed. Sources: [Instant Funding FAQ](https://alpaca.markets/docs/api-references/broker-api/broker-api-faq/instant-funding-faqs/), [Create settlement](https://docs.alpaca.markets/reference/post-v1-instant-funding-settlements), [Delete Instant Funding](https://docs.alpaca.markets/reference/delete-v1-instant-funding-single).

It is a genuine user-facing rail for instant buying power, but it is not a settled-cash shortcut and is not a viable unenabled fallback for tomorrow.

## Reuse in this repository

[`lib/alpaca/funding.ts`](../../lib/alpaca/funding.ts) already provides useful plumbing:

- shared `alpacaBrokerRequest` authentication/replay behavior;
- account lookup and linked-account checks;
- strict decimal/status parsing;
- trading-account reads (`buying_power`, `cash`, `cash_withdrawable`, `transfers_blocked`);
- transfer listing, pending-transfer aggregation, and user-facing transfer mapping;
- ACH relationship creation/reuse and the current ACH deposit submission.

It has **no** Journal, Funding Wallet, wire-inbound, or Instant Funding implementation. Adding a tomorrow-only fallback would need a new Journal POST using the known firm account ID, then a status poll/read. Do not replace the existing ACH path merely to add this fixture: the Journal source account is a firm/sweep account and cannot represent a user's bank deposit.

## Recommendation

1. For tomorrow: call `POST /v1/journals` with `JNLC`, sandbox firm/Sweep `from_account`, customer `to_account`, and a small amount at or below the configured transaction limit; verify `status: executed` and `buying_power`.
2. Keep the existing synthetic ACH path as the user-facing-looking sandbox flow when its relationship reaches `APPROVED`.
3. Do not spend tomorrow's demo effort on wire or Funding Wallet unless those flows themselves are the demo. Do not choose Instant Funding without written confirmation that Alpaca has enabled it and supplied the required accounts/limits.

The one blocker to confirm before implementation is the sandbox firm/Sweep account ID and current JNLC limits. The public guide documents the pre-funded account, but the ID is environment-specific.
