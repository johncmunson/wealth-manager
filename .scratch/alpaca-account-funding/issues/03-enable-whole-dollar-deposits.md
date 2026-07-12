# 03 — Enable whole-dollar deposits

**What to build:** Allow a User with an approved Funding Source and deposit-enabled Brokerage Account to review, confirm, and submit a one-time whole-dollar ACH deposit safely.

**Blocked by:** 02 — Prepare the synthetic Funding Source

**Status:** ready-for-agent

- [ ] The **Add funds** action opens an accessible deposit dialog containing only the amount and fixed Funding Source.
- [ ] The deposit flow requires a separate review and explicit confirmation before submission.
- [ ] Deposit amounts must be positive whole USD amounts; decimals, malformed values, zero, and negative values are rejected on both client and server.
- [ ] Amount validation and submission preserve decimal-string money semantics without floating-point calculations.
- [ ] The Server Action authenticates independently and derives the Brokerage Account and ACH Relationship from trusted server state.
- [ ] The Server Action rechecks Funding Source approval and current Alpaca deposit/account restrictions immediately before mutation.
- [ ] Deposits are submitted to Alpaca as one-time incoming ACH Transfers.
- [ ] The submit control remains disabled while pending so a double-click cannot dispatch twice.
- [ ] The UI does not optimistically change balances or add a Transfer before Alpaca accepts it.
- [ ] A successful submission closes or completes the dialog and refreshes balances and recent Transfers in the same interaction.
- [ ] Definitive Alpaca validation or restriction failures are shown as concise, actionable errors.
- [ ] Authentication failures, timeouts, unreadable responses, and other ambiguous outcomes are never automatically replayed.
- [ ] An ambiguous result states that the outcome is unknown and refreshes recent Transfer history once so the User can verify before trying again.
- [ ] No recurrence, scheduling, notes, bank selection, Transfer intent persistence, or local Transfer ledger is introduced.
- [ ] Server-unit tests cover all amount boundaries, authorization, restrictions, approved-source enforcement, accepted deposits, definitive failures, ambiguous outcomes, and no replay.
- [ ] Browser-component tests cover dialog focus, keyboard operation, whole-dollar validation, review content, confirmation, pending protection, success, errors, and unknown outcomes.
- [ ] A manual Alpaca sandbox acceptance pass verifies one whole-dollar deposit and confirms the refreshed balance and recent Transfer.
