# 02 — Reconcile pending and unknown Provisioning

**What to build:** Give operators a safe way to reconcile Brokerage Account records left pending or unknown, checking Alpaca before any retry so recovery cannot create a duplicate account.

**Blocked by:** 01 — Classify ambiguous Alpaca account-creation responses

**Status:** ready-for-agent

- [ ] Reconciliation checks external state before retrying account creation.
- [ ] Confirmed external accounts become linked without creating another account.
- [ ] Confirmed non-creation can be retried explicitly and safely.
- [ ] Still-ambiguous outcomes remain unknown and expose enough information for later investigation.
- [ ] The recovery behavior has a runnable regression check at its highest practical seam.
