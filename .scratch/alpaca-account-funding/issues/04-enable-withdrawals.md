# 04 — Enable withdrawals

**What to build:** Allow a User with an approved Funding Source and withdrawal-enabled Brokerage Account to review, confirm, and submit a one-time ACH withdrawal without exceeding current Withdrawable Cash.

**Blocked by:** 03 — Enable whole-dollar deposits

**Status:** ready-for-agent

- [ ] The **Withdraw** action opens an accessible withdrawal dialog containing only the amount and fixed Funding Source.
- [ ] The withdrawal flow requires a separate review and explicit confirmation before submission.
- [ ] Withdrawal amounts must be positive USD amounts with no more than two decimal places; malformed values, zero, and negative values are rejected on both client and server.
- [ ] Unlike deposits, withdrawals permit cents.
- [ ] The Server Action authenticates independently and derives the Brokerage Account and ACH Relationship from trusted server state.
- [ ] Immediately before mutation, the backend fetches current Alpaca account details and rejects an amount above current Withdrawable Cash.
- [ ] The Server Action rechecks Funding Source approval and current Alpaca withdrawal/account restrictions immediately before mutation.
- [ ] Withdrawals are submitted to Alpaca as one-time outgoing ACH Transfers.
- [ ] Deposit and withdrawal restrictions operate independently, so a blocked direction does not disable the other direction.
- [ ] The submit control remains disabled while pending, and the UI does not optimistically adjust cash or add a Transfer.
- [ ] A successful submission refreshes current cash values and recent Transfers in the same interaction.
- [ ] Definitive Alpaca rejection is distinguished from an ambiguous outcome and presented accessibly.
- [ ] Authentication failures, timeouts, unreadable responses, and other ambiguous outcomes are never automatically replayed.
- [ ] An ambiguous result states that the outcome is unknown and refreshes recent Transfer history once so the User can verify before trying again.
- [ ] Transfer cancellation, reversal, editing, scheduling, and local persistence remain absent.
- [ ] Server-unit tests cover cent precision, malformed amounts, stale client values, current Withdrawable Cash enforcement, restrictions, authorization, success, definitive failures, ambiguous outcomes, and no replay.
- [ ] Browser-component tests cover withdrawal dialog focus, keyboard operation, cent validation, available-cash feedback, review content, confirmation, pending protection, success, and errors.
- [ ] A manual Alpaca sandbox acceptance pass verifies one decimal withdrawal within Withdrawable Cash and confirms the refreshed balance and recent Transfer.
