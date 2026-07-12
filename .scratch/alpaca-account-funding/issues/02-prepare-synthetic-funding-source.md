# 02 — Prepare the synthetic Funding Source

**What to build:** Make each linked Brokerage Account capable of receiving and sending sandbox ACH Transfers by preparing one synthetic Funding Source, automatically for newly created accounts and explicitly for existing accounts.

**Blocked by:** 01 — Deliver the read-only Funding overview

**Status:** resolved

- [x] After Alpaca successfully creates a new Brokerage Account, Provisioning attempts to prepare its synthetic ACH Funding Source.
- [x] Funding Source preparation uses fixed server-only sandbox details whose displayed account number ends in 4242.
- [x] The backend lists existing ACH Relationships and reuses the active synthetic relationship before considering creation.
- [x] If creation returns Alpaca's `409` active-relationship response, the backend lists relationships again rather than replaying creation.
- [x] ACH Relationship creation is never performed as a side effect of rendering the Funding page.
- [x] A User with a linked Brokerage Account but no synthetic Funding Source sees a one-time **Prepare funding** action.
- [x] The Prepare funding action authenticates independently and derives the Brokerage Account from the current User.
- [x] The action cannot create or select a Funding Source for another User's Brokerage Account.
- [x] A successful preparation refreshes the overview and shows either the approved Funding Source or its queued preparation state.
- [x] A queued Funding Source displays “Funding source is being prepared,” keeps Transfer actions unavailable, and can be checked with Refresh.
- [x] Definitive preparation failures produce concise feedback and leave the existing Brokerage Account linked.
- [x] Ambiguous ACH Relationship creation outcomes are not automatically replayed; the next attempt lists relationships before any new mutation.
- [x] Funding Source preparation failure cannot fail authentication signup or change successful Brokerage Account Provisioning into a failed state.
- [x] No Plaid token, user bank details, journaling, background job, render-time mutation, or database persistence is added.
- [x] Server-unit tests cover relationship reuse, creation, `409` recovery, all documented relationship statuses, definitive failure, ambiguous outcome handling, and no-replay behavior.
- [x] Provisioning tests verify preparation occurs only after successful Brokerage Account creation and that preparation failure preserves the linked account outcome.
- [x] Browser-component tests cover Prepare funding, pending feedback, disabled Transfer affordances, errors, keyboard operation, and accessible announcements.

## Answer

Implemented synthetic ACH Funding Source preparation with list-before-create reuse, no-replay mutation handling, `409` recovery, authenticated self-service preparation, and post-Provisioning best-effort setup. Added queued/error UI states, disabled Transfer affordances, immediate overview refresh, and server, Provisioning, action, and browser-component coverage.
