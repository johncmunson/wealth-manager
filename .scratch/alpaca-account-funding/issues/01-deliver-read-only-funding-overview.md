# 01 — Deliver the read-only Funding overview

**What to build:** Replace the Funding placeholder with a responsive, authenticated overview of the User's Brokerage Account cash availability, Funding Source readiness, and recent Transfers, using Alpaca as the source of truth.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] A User with a linked Brokerage Account sees Alpaca-provided Buying Power, Withdrawable Cash, and Cash without custom financial calculations.
- [ ] Net pending value is derived from signed Transfers in Alpaca's exact nonterminal statuses rather than the undocumented `pending_transfer_in` example field.
- [ ] The page labels Alpaca's cash value as “Cash,” not “Settled cash.”
- [ ] An existing synthetic Funding Source is displayed as “Chase Checking •••• 4242” with copy explaining that sandbox deposits and withdrawals are simulated.
- [ ] A missing, queued, or unavailable Funding Source is represented clearly without hiding available balances or Transfer history.
- [ ] Transfers are sorted locally by `created_at`, and the newest 10 appear with direction, creation date, human-readable Alpaca status, and signed amount.
- [ ] All documented Transfer statuses are accepted: `QUEUED`, `APPROVAL_PENDING`, `PENDING`, `SENT_TO_CLEARING`, `REJECTED`, `CANCELED`, `APPROVED`, `COMPLETE`, and `RETURNED`.
- [ ] Search, filters, expected dates, pending Transfer counts, pagination, cancellation, and “View all” are absent.
- [ ] A Refresh control retrieves a fresh Alpaca snapshot without polling or SSE.
- [ ] Pending, failed, and unknown Brokerage Account Provisioning states receive specific unavailable content and no Transfer controls.
- [ ] Every server read derives the User and Brokerage Account from the authenticated session rather than client-supplied ownership data.
- [ ] Alpaca read failures produce useful page-level or section-level feedback without exposing credentials or raw internal errors.
- [ ] The layout remains usable on narrow screens and exposes labels, statuses, and errors without relying on color alone.
- [ ] Server-unit tests cover snapshot field mapping, exact-status pending-net derivation, local latest-10 ordering, optional account fields, account states, Funding Source states, and malformed Alpaca responses.
- [ ] Browser-component tests cover the visible overview, recent Transfer rows, unavailable states, responsive information access, and Refresh interaction through accessible roles and names.
- [ ] No database schema, local Transfer ledger, balance snapshot, or SSE cursor is introduced.
