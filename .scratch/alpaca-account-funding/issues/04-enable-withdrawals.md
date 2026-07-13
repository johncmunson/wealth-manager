# 04 — Enable withdrawals

**What to build:** Allow a User with an approved Funding Source and withdrawal-enabled Brokerage Account to review, confirm, and submit a one-time ACH withdrawal without exceeding current Withdrawable Cash.

**Blocked by:** 03 — Enable whole-dollar deposits

**Status:** resolved

- [x] The **Withdraw** action opens an accessible withdrawal dialog containing only the amount and fixed Funding Source.
- [x] The withdrawal flow requires a separate review and explicit confirmation before submission.
- [x] Withdrawal amounts must be positive USD amounts with no more than two decimal places; malformed values, zero, and negative values are rejected on both client and server.
- [x] Unlike deposits, withdrawals permit cents.
- [x] The Server Action authenticates independently and derives the Brokerage Account and ACH Relationship from trusted server state.
- [x] Immediately before mutation, the backend fetches current Alpaca account details and rejects an amount above current Withdrawable Cash.
- [x] The Server Action rechecks Funding Source approval and the Trading Account's global `transfers_blocked` state immediately before mutation.
- [x] Withdrawals are submitted to Alpaca as one-time outgoing ACH Transfers.
- [x] Because Alpaca does not expose `withdrawable_status` in the Trading Account schema, a direction-specific `403` rejection is surfaced after submission rather than predicted in the UI.
- [x] The submit control remains disabled while pending, and the UI does not optimistically adjust cash or add a Transfer.
- [x] A successful submission refreshes current cash values and recent Transfers in the same interaction.
- [x] Definitive Alpaca rejection is distinguished from an ambiguous outcome and presented accessibly.
- [x] Authentication failures, timeouts, unreadable responses, and other ambiguous outcomes are never automatically replayed.
- [x] An ambiguous result states that the outcome is unknown and refreshes recent Transfer history once so the User can verify before trying again.
- [x] Transfer cancellation, reversal, editing, scheduling, and local persistence remain absent.
- [x] Server-unit tests cover cent precision, malformed amounts, stale client values, current Withdrawable Cash enforcement, global Transfer blocking, direction-specific `403` rejection, authorization, success, definitive failures, ambiguous outcomes, and no replay.
- [x] Browser-component tests cover withdrawal dialog focus, keyboard operation, cent validation, available-cash feedback, review content, confirmation, pending protection, success, and errors.
- [ ] A manual Alpaca sandbox acceptance pass verifies one decimal withdrawal within Withdrawable Cash and confirms the refreshed balance and recent Transfer.

## Answer

Implemented the reviewed, explicitly confirmed one-time ACH withdrawal flow with exact cent validation, current Alpaca Withdrawable Cash enforcement, trusted account/source lookup, no-replay mutation handling, accessible outcome feedback, same-interaction refresh, and server/browser coverage.

The manual sandbox withdrawal remains pending: the authenticated acceptance Brokerage Account currently has $0.00 Withdrawable Cash, and the documented Account Seeding command could not locate that profile's User in the development database.
