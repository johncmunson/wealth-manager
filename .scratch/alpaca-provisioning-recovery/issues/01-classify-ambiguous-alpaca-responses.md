# 01 — Classify ambiguous Alpaca account-creation responses

**What to build:** Establish an evidence-backed classification of Alpaca account-creation outcomes so Provisioning is marked failed only when non-creation is confirmed and unknown whenever external creation cannot safely be ruled out.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] The official Alpaca contract or support guidance for relevant HTTP and transport failures is cited.
- [ ] Each response category used by Provisioning is classified as confirmed non-creation or potentially created.
- [ ] Account creation no longer treats an ambiguous response, including an undocumented server failure, as safely retryable.
- [ ] Focused tests lock down the resulting classification.
