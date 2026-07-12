# 03 — Enable whole-dollar deposits

**What to build:** Allow a User with an approved Funding Source and deposit-enabled Brokerage Account to review, confirm, and submit a one-time whole-dollar ACH deposit safely.

**Blocked by:** 02 — Prepare the synthetic Funding Source

**Status:** resolved

- [x] The **Add funds** action opens an accessible deposit dialog containing only the amount and fixed Funding Source.
- [x] The deposit flow requires a separate review and explicit confirmation before submission.
- [x] Deposit amounts must be positive whole USD amounts; decimals, malformed values, zero, and negative values are rejected on both client and server.
- [x] Amount validation and submission preserve decimal-string money semantics without floating-point calculations.
- [x] The Server Action authenticates independently and derives the Brokerage Account and ACH Relationship from trusted server state.
- [x] The Server Action rechecks Funding Source approval and the Trading Account's global `transfers_blocked` state immediately before mutation.
- [x] Because Alpaca does not expose `depositable_status` in the Trading Account schema, a direction-specific `403` rejection is surfaced after submission rather than predicted in the UI.
- [x] Deposits are submitted to Alpaca as one-time incoming ACH Transfers.
- [x] The submit control remains disabled while pending so a double-click cannot dispatch twice.
- [x] The UI does not optimistically change balances or add a Transfer before Alpaca accepts it.
- [x] A successful submission closes or completes the dialog and refreshes balances and recent Transfers in the same interaction.
- [x] Definitive Alpaca validation or restriction failures are shown as concise, actionable errors.
- [x] Authentication failures, timeouts, unreadable responses, and other ambiguous outcomes are never automatically replayed.
- [x] An ambiguous result states that the outcome is unknown and refreshes recent Transfer history once so the User can verify before trying again.
- [x] No recurrence, scheduling, notes, bank selection, Transfer intent persistence, or local Transfer ledger is introduced.
- [x] Server-unit tests cover all amount boundaries, authorization, global Transfer blocking, direction-specific `403` rejection, approved-source enforcement, accepted deposits, definitive failures, ambiguous outcomes, and no replay.
- [x] Browser-component tests cover dialog focus, keyboard operation, whole-dollar validation, review content, confirmation, pending protection, success, errors, and unknown outcomes.
- [x] A manual Alpaca sandbox acceptance pass verifies one whole-dollar deposit and confirms the refreshed balance and recent Transfer.

## Answer

Implemented a reviewed, explicitly confirmed whole-dollar deposit flow using an authenticated no-replay Server Action and trusted Brokerage Account/Funding Source lookup. Added fail-closed Transfer checks, definitive and unknown outcome handling, same-interaction refresh, and server/browser coverage. A $10 Alpaca sandbox ACH deposit was accepted and appeared after refresh as a +$10.00 `SENT_TO_CLEARING` Transfer and +$10.00 net pending cash.
