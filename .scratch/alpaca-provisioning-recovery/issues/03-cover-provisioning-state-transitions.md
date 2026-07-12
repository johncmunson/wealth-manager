# 03 — Cover Provisioning state transitions

**What to build:** Lock down the observable Provisioning lifecycle so repeated signup hooks and partial failures preserve one Brokerage Account record and never hide an ambiguous external outcome.

**Blocked by:** 01 — Classify ambiguous Alpaca account-creation responses

**Status:** ready-for-agent

- [ ] Tests cover pending to linked, failed, and unknown outcomes through the Provisioning entry point.
- [ ] Tests cover a database-write failure after Alpaca may have created an account.
- [ ] Repeated Provisioning calls preserve the one-record-per-User invariant and do not issue another creation request.
- [ ] Tests assert outcomes and external interactions rather than private implementation details.
