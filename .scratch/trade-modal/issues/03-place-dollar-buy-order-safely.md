# 03 — Place a dollar Buy Order safely

**What to build:** Complete the reviewed dollar Buy flow by placing an Alpaca sandbox Market/Day Order and reporting accepted, rejected, and indeterminate outcomes without duplicate mutation risk.

**Blocked by:** 02 — Validate and review a dollar Buy Order

**Status:** ready-for-agent

- [ ] The final action is explicitly labeled “Place buy order” and is disabled while placement is pending.
- [ ] Placement independently authenticates the User and derives the Brokerage Account server-side.
- [ ] Immediately before placement, the server rechecks account restrictions, Asset eligibility, a usable quote, and current Buying Power.
- [ ] The Alpaca request sends `notional` only, uses Market/Day behavior, and does not enable extended-hours execution.
- [ ] Every placement intent receives a unique server-generated client Order ID.
- [ ] Order creation uses the existing no-replay mutation policy and is never automatically submitted twice after authentication or network failure.
- [ ] An ambiguous creation outcome is reconciled through a safe Alpaca lookup by client Order ID.
- [ ] A definitively accepted Order shows “Order placed,” Alpaca's current status, Done, and View activity without claiming the Order is Filled.
- [ ] View activity closes the modal and navigates to the existing Activity destination; the modal does not poll for later lifecycle changes.
- [ ] A definitive Alpaca rejection closes the modal and shows concise user-safe error or warning feedback in a bottom-right toast.
- [ ] Correctable validation or quote errors remain inline with the modal open.
- [ ] An unresolved outcome keeps the modal open, says “Order status unknown,” and directs the User to Activity before trying again.
- [ ] Raw Alpaca payloads, credentials, account identifiers, and internal diagnostics are not exposed to the User.
- [ ] Server-unit and browser-component tests cover acceptance, revalidation failures, pending protection, no replay, reconciliation, definitive rejection, toast behavior, and unknown outcomes.
