# 02 — Prepare the synthetic Funding Source

**What to build:** Make each linked Brokerage Account capable of receiving and sending sandbox ACH Transfers by preparing one synthetic Funding Source, automatically for newly created accounts and explicitly for existing accounts.

**Blocked by:** 01 — Deliver the read-only Funding overview

**Status:** ready-for-agent

- [ ] After Alpaca successfully creates a new Brokerage Account, Provisioning attempts to prepare its synthetic ACH Funding Source.
- [ ] Funding Source preparation uses fixed server-only sandbox details whose displayed account number ends in 4242.
- [ ] The backend lists existing ACH Relationships and reuses the Wealth Manager-managed synthetic relationship before considering creation.
- [ ] ACH Relationship creation is never performed as a side effect of rendering the Funding page.
- [ ] A User with a linked Brokerage Account but no synthetic Funding Source sees a one-time **Prepare funding** action.
- [ ] The Prepare funding action authenticates independently and derives the Brokerage Account from the current User.
- [ ] The action cannot create or select a Funding Source for another User's Brokerage Account.
- [ ] A successful preparation refreshes the overview and shows either the approved Funding Source or its queued preparation state.
- [ ] A queued Funding Source displays “Funding source is being prepared,” keeps Transfer actions unavailable, and can be checked with Refresh.
- [ ] Definitive preparation failures produce concise feedback and leave the existing Brokerage Account linked.
- [ ] Ambiguous ACH Relationship creation outcomes are not automatically replayed; the next attempt lists relationships before any new mutation.
- [ ] Funding Source preparation failure cannot fail authentication signup or change successful Brokerage Account Provisioning into a failed state.
- [ ] No Plaid token, user bank details, journaling, background job, render-time mutation, or database persistence is added.
- [ ] Server-unit tests cover relationship reuse, creation, queued status, definitive failure, ambiguous outcome handling, and no-replay behavior.
- [ ] Provisioning tests verify preparation occurs only after successful Brokerage Account creation and that preparation failure preserves the linked account outcome.
- [ ] Browser-component tests cover Prepare funding, pending feedback, disabled Transfer affordances, errors, keyboard operation, and accessible announcements.
