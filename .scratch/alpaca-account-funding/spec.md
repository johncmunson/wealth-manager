# Alpaca account funding

**Status:** resolved

## Problem Statement

A User with a linked Brokerage Account cannot currently understand available cash, deposit sandbox funds, withdraw funds, or review Transfers in Wealth Manager. The Funding route is a placeholder, and the directional mockup assumes a linked bank experience that the product does not intend to support. Users need a complete sandbox Funding experience without Plaid, real bank linking, journaling, or a locally replicated financial ledger.

## Solution

Build a functional Funding page backed directly by Alpaca's sandbox Broker API. Wealth Manager will create one synthetic Funding Source for each Brokerage Account and represent it consistently as “Chase Checking •••• 4242,” while clearly identifying its transfers as simulated. Users can make one-time ACH deposits and withdrawals, see Alpaca-provided cash availability, and review the latest Transfers.

Alpaca remains the source of truth. Wealth Manager will read current state on page load and refresh, submit authenticated mutations without automatic replay, and avoid database schema changes, SSE consumers, polling, and local Transfer persistence.

## User Stories

1. As a signed-in User, I want to open Funding inside the authenticated application shell, so that my financial information remains private.
2. As a signed-in User, I want Funding to use my linked Brokerage Account automatically, so that I do not need to select or provide an account identifier.
3. As a User with a linked Brokerage Account, I want to see my Buying Power, so that I know how much is currently available for Orders.
4. As a User with a linked Brokerage Account, I want to see my Withdrawable Cash, so that I know how much I can move out of the account.
5. As a User with a linked Brokerage Account, I want to see my current cash value, so that I can distinguish cash from Buying Power.
6. As a User with pending Transfers, I want to see their net pending cash effect, so that I understand expected cash movement.
7. As a User, I want Wealth Manager to show Alpaca's financial values rather than estimates, so that I am not given conflicting balances.
8. As a User, I want the Funding Source to appear consistently as “Chase Checking •••• 4242,” so that the sandbox workflow has a clear source and destination.
9. As a User, I want the Funding Source described as simulated, so that I do not mistake it for a real linked bank account.
10. As a newly provisioned User, I want my synthetic Funding Source prepared after my Brokerage Account is created, so that Funding is normally ready when I first visit it.
11. As an existing User without a Funding Source, I want a one-time Prepare funding action, so that I can enable Funding without creating a new Brokerage Account.
12. As a User whose Funding Source is still being prepared, I want clear status feedback, so that I know why Transfers are temporarily unavailable.
13. As a User whose Funding Source is unavailable, I want balances and Transfer history to remain visible, so that a setup problem does not hide unrelated account information.
14. As a User, I want to make a one-time deposit, so that I can add simulated cash to my Brokerage Account.
15. As a User making a deposit, I want to enter a whole-dollar amount, so that deposits follow the product's round-dollar rule.
16. As a User, I want decimal deposit amounts rejected before submission, so that I can correct the amount without waiting for Alpaca.
17. As a User, I want to make a one-time withdrawal, so that I can remove simulated cash from my Brokerage Account.
18. As a User making a withdrawal, I want to enter dollars and cents, so that I can withdraw an exact amount.
19. As a User making a withdrawal, I want amounts above my latest Withdrawable Cash rejected, so that I do not submit a transfer Alpaca cannot fulfill.
20. As a User entering a Transfer, I want non-positive and malformed amounts rejected, so that only valid USD amounts can be submitted.
21. As a User, I want deposits and withdrawals presented as separate actions, so that the direction of cash movement is unambiguous.
22. As a User, I want to review the direction, amount, and fixed Funding Source before confirming, so that I can catch mistakes before moving money.
23. As a User submitting a Transfer, I want the submit control disabled while the request is pending, so that an accidental double-click does not submit twice.
24. As a User, I want a successful Transfer to refresh the page, so that I can see Alpaca's latest balances and history.
25. As a User, I do not want a Transfer displayed optimistically, so that an unconfirmed mutation is never presented as accepted.
26. As a User, I want a clear error when Alpaca definitively rejects a Transfer, so that I know the request did not succeed.
27. As a User, I want an ambiguous timeout or infrastructure failure identified as an unknown outcome, so that I do not assume the Transfer failed.
28. As a User with an unknown Transfer outcome, I want history refreshed before I try again, so that I can avoid duplicate money movement.
29. As a User, I want to see my latest 10 Transfers newest first, so that recent cash movement is easy to review.
30. As a User, I want each Transfer to show its direction, creation date, Alpaca status, and signed amount, so that I can understand what happened.
31. As a User, I want deposits displayed as positive amounts and withdrawals as negative amounts, so that direction is visually clear.
32. As a User, I want pending, completed, rejected, canceled, and other Alpaca statuses represented honestly, so that Wealth Manager does not invent a conflicting lifecycle.
33. As a User, I want to refresh balances and Transfer statuses manually, so that I can check for changes without reloading the entire browser tab.
34. As a User whose Brokerage Account has Transfers blocked, I want both Transfer actions disabled with an explanation, so that I understand the account restriction.
35. As a User whose specific deposit or withdrawal is rejected by Alpaca, I want a clear direction-specific error, so that I understand why that request was not permitted.
36. As a User whose Brokerage Account is still pending Provisioning, I want a status-specific unavailable state, so that I understand why Funding cannot load.
37. As a User whose Brokerage Account Provisioning failed, I want a status-specific unavailable state, so that I do not see controls that cannot work.
38. As a User whose Brokerage Account Provisioning outcome is unknown, I want a status-specific unavailable state, so that Wealth Manager does not risk creating or using the wrong external account.
39. As a keyboard User, I want dialogs, forms, confirmations, errors, and refresh controls to be operable and announced accessibly, so that I can complete Funding tasks without a pointer.
40. As a mobile User, I want the cash summary, Funding Source, Transfer actions, and recent history to remain usable on a small screen, so that Funding is not desktop-only.

## Implementation Decisions

- The existing authenticated Funding route becomes the complete page; the application shell continues to enforce authentication before rendering it.
- Every server-side Funding operation authenticates independently. The User and Brokerage Account are derived from the session and database relationship rather than accepted from client input.
- The Funding read interface returns one page-oriented snapshot containing Brokerage Account availability, Funding Source readiness, Buying Power, Withdrawable Cash, cash, net pending Transfers, action restrictions, and the latest 10 Transfers.
- The snapshot reads Alpaca on demand and is not cached as authoritative application state.
- Buying Power, Withdrawable Cash, and cash come from Alpaca's trading-account response. Wealth Manager does not implement margin, settlement, or Buying Power formulas.
- The UI labels Alpaca's `cash` value as “Cash,” not “Settled cash,” because those terms are not guaranteed to be equivalent.
- Alpaca does not document a pending incoming amount on the Trading Account schema. Net pending value is derived from the signed amounts of nonterminal Transfers returned by the Transfer list endpoint.
- The Transfer list is sorted by `created_at` inside Wealth Manager because Alpaca documents ordering by creation time but not its direction. The newest 10 are displayed after sorting.
- Each Transfer row contains direction, creation date, Alpaca status, and signed amount. The page does not manufacture an expected-completion date.
- Supported Alpaca Transfer statuses are `QUEUED`, `APPROVAL_PENDING`, `PENDING`, `SENT_TO_CLEARING`, `REJECTED`, `CANCELED`, `APPROVED`, `COMPLETE`, and `RETURNED`. Status values may be formatted for human readability but are not collapsed into a separate Wealth Manager state machine.
- `QUEUED`, `APPROVAL_PENDING`, `PENDING`, `SENT_TO_CLEARING`, and `APPROVED` are nonterminal for the pending-net display; rejected, canceled, complete, and returned Transfers are excluded.
- The Funding Source is one synthetic sandbox ACH Relationship per Brokerage Account. Its user-facing identity is always “Chase Checking •••• 4242.”
- Synthetic routing, account, and owner fixture data remains server-only. The fixture uses an account number ending in 4242 and an Alpaca-compatible sandbox routing number.
- The Funding Source helper lists existing ACH Relationships before creating one. It reuses the active synthetic relationship when present and does not blindly replay relationship creation. If creation returns Alpaca's `409` active-relationship response, it lists relationships again instead of replaying the mutation.
- New Brokerage Account Provisioning attempts to prepare the Funding Source only after Alpaca successfully creates the Brokerage Account.
- Funding Source failure does not reverse a linked Brokerage Account or fail authentication. The User can later use Prepare funding, preserving the existing decision to decouple signup success from external provisioning success.
- Existing Brokerage Accounts without the synthetic relationship show an explicit Prepare funding action. ACH Relationship creation never occurs as a side effect of rendering the page.
- A queued Funding Source keeps both Transfer actions disabled and shows “Funding source is being prepared.” The User can use the page's Refresh action to check readiness.
- Funding Source creation uses Alpaca's sandbox ACH Relationship capability directly. Plaid, processor tokens, and user-provided bank credentials are not involved.
- Deposits and withdrawals use Alpaca ACH Transfers with the synthetic relationship ID. Deposits map to incoming Transfers; withdrawals map to outgoing Transfers.
- Deposit and withdrawal controls are focused dialogs built from existing shadcn/ui foundations. Each flow collects only an amount, displays the fixed Funding Source, and requires explicit review and confirmation.
- Deposit input accepts positive whole USD amounts only. Decimal deposits are rejected on both client and server.
- Withdrawal input accepts positive USD amounts with at most two decimal places.
- Money is validated and passed as decimal strings rather than floating-point calculations.
- The withdrawal action fetches current Alpaca account details immediately before mutation and rejects an amount above current Withdrawable Cash.
- Both mutation actions recheck the Brokerage Account, global `transfers_blocked` state, Funding Source approval, and amount server-side.
- Alpaca's OpenAPI schema does not expose `depositable_status` or `withdrawable_status` in the Trading Account response. Wealth Manager therefore cannot pre-disable one direction from those values; direction-specific `403` rejections are surfaced after submission.
- Server Actions are the only application mutation interface in this scope. The page does not introduce public Route Handlers.
- Server Actions return small UI-oriented success or error results and refresh the current page after successful mutation.
- Transfer controls remain disabled while their action is pending. The UI does not optimistically add a Transfer or adjust balances.
- Alpaca mutation requests use the existing no-replay policy. An authentication failure, timeout, unreadable response, or other ambiguous outcome is never automatically retried.
- After an ambiguous Transfer outcome, the UI states that the outcome is unknown and refreshes Transfer history once. No local intent table, reconciliation workflow, or persistent unknown state is introduced.
- Definitive Alpaca validation and restriction failures are surfaced as concise user-facing errors. Request identifiers remain available through existing server logging for diagnosis.
- A Refresh control requests a fresh server-rendered snapshot. There is no timed polling, browser SSE connection, or optimistic cache.
- Brokerage Accounts in pending, failed, or unknown Provisioning states receive status-specific unavailable content and no Transfer controls. Provisioning recovery is not added by this effort.
- The page is responsive and uses accessible labels, focus management, pending states, error announcements, and status text in addition to color.
- No database schema changes are required. Wealth Manager does not persist ACH Relationships, Transfers, balance snapshots, SSE cursors, or transfer intents.
- Alpaca remains the source of truth for the Funding Source, Transfer history, balances, and restrictions.
- The current sandbox-only product decision remains in force. This feature must not be treated as production brokerage funding readiness.

## Testing Decisions

- Tests assert observable behavior and contracts rather than component structure, internal helper calls, or styling implementation.
- The primary server-unit seam is the public Funding operation layer with Alpaca responses mocked at the existing Broker client boundary.
- Server-unit coverage includes successful snapshot assembly, local latest-10 ordering, cash-field mapping, pending-net derivation from exact nonterminal statuses, Funding Source reuse and creation, `409` relationship recovery, queued-source handling, global account restrictions, direction-specific `403` handling, amount validation, current Withdrawable Cash enforcement, definitive rejection, ambiguous outcomes, and the prohibition on mutation replay.
- Provisioning tests cover the added attempt to prepare a Funding Source after successful Brokerage Account creation and verify that Funding Source failure does not change signup success or the linked Brokerage Account outcome.
- The browser-component seam exercises the rendered Funding page and dialogs with stubbed read data and Server Action results.
- Browser-component coverage includes keyboard-accessible dialog behavior, deposit whole-dollar validation, withdrawal cent validation, confirmation content, pending-submit protection, globally blocked Transfer controls, direction-specific rejection messages, source preparation states, success refresh behavior, unknown-outcome messaging, Transfer rows, responsive information access, and accessible status/error announcements.
- Existing server-unit tests for Alpaca account Provisioning and Broker mutation replay are the prior art for backend coverage.
- Existing real-browser dialog tests are the prior art for modal focus, keyboard interaction, and accessible form behavior.
- Existing Playwright tests remain the prior art for production-build navigation and authentication boundaries, but this feature does not add an automated real-Alpaca journey.
- One manual sandbox acceptance pass verifies: a newly prepared Funding Source becomes approved, a whole-dollar deposit succeeds, a decimal withdrawal succeeds within Withdrawable Cash, balances refresh, and both Transfers appear in recent history.
- Automated tests never create Alpaca sandbox ACH Relationships or Transfers. External mutation responses are mocked to avoid irreversible shared sandbox data and nondeterministic settlement timing.
- No database integration test is required because this specification introduces no schema or local persistence behavior.

## Out of Scope

- Real bank account linking or user-entered bank details.
- Plaid, processor tokens, or any other bank-linking provider.
- Alpaca journaling, firm-account cash pooling, wires, wallets, instant funding, or ACAT transfers.
- Production brokerage funding, real money, KYC, compliance, Travel Rule implementation, or production safeguards.
- Recurring or scheduled deposits.
- Transfer cancellation, reversal, editing, or detail routes.
- Search, filtering, pagination, “View all,” expected-completion dates, or an aggregate pending Transfer count.
- A local Transfer ledger, balance snapshots, Funding Source persistence, mutation-intent persistence, or reconciliation jobs.
- SSE consumers, webhooks, background workers, timed polling, or real-time push updates.
- Custom Buying Power, settlement, or margin calculations.
- Displaying Transfers on the Activity page.
- Recovery controls for failed or unknown Brokerage Account Provisioning.
- Multiple Funding Sources, Funding Source selection, removal, or replacement.
- A public or reusable HTTP funding API for non-Next.js clients.
- Automated tests that mutate Alpaca sandbox state.

## Further Notes

- The Funding mockup is directional for layout and information hierarchy. This specification intentionally removes unsupported controls and replaces misleading real-bank timing copy.
- Current Alpaca documentation states that sandbox ACH deposits and withdrawals are simulated and may settle differently from production. The UI must not promise production timing.
- Existing ADRs require the feature to remain sandbox-only, keep signup independent from external Provisioning success, and avoid replaying Alpaca mutations without proven idempotency.
- The checked-in Alpaca Broker OpenAPI document is the contract reference for endpoint payloads, optional fields, status enums, and documented error responses. It confirms that standard ACH Relationship and ACH Transfer creation do not accept an idempotency key.
- The domain glossary now defines Funding Source, Buying Power, and Withdrawable Cash for this feature.
