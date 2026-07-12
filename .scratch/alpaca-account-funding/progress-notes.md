## Notes from implementing `01 — Deliver the read-only Funding overview`

The following notes may be helpful to the agent working on the next ticket, `02 — Prepare the synthetic Funding Source`

- `lib/alpaca/funding.ts` currently identifies the synthetic relationship by account-number suffix `4242`, with a sole-relationship fallback because Alpaca may omit `bank_account_number`. Move this matching into the new shared Funding Source helper so read and preparation paths cannot diverge.
- The read path recognizes ACH schema statuses: `QUEUED`, `APPROVED`, `REJECTED`, `PENDING`, and `CANCEL_REQUESTED`. Issue 02’s “all documented statuses” may require reconciling additional event statuses such as `CANCEL_SENT`, `CANCEL_FAILED`, `SENT_TO_CLEARING`, and `CANCELED`.
- Rendering performs only GETs. Keep relationship creation exclusively in Provisioning and the authenticated **Prepare funding** Server Action.
- Do not expose or accept account/relationship IDs client-side. `getFundingSnapshot()` derives ownership from the session and database.
- `FundingOverview` already supports `ready`, `preparing`, `missing`, and `unavailable`; issue 02 mainly needs the Prepare action and pending/error interaction.
- Code review found synthetic relationship selection and source-error announcements initially weak; both were fixed and covered by tests.

## Notes from implementing `02 — Prepare the synthetic Funding Source`

The following notes may be helpful to the agent working on the next ticket, `03 — Enable whole-dollar deposits`:

- `lib/alpaca/funding.ts` now owns the shared synthetic-source selection rules. It prefers an approved relationship, then queued/pending, recognizes the `4242` suffix, and only falls back to a sole relationship when Alpaca omits its account number. Reuse this server-side logic rather than accepting a relationship ID from the client.
- `prepareCurrentUserFundingSource()` is the prior-art ownership boundary: authenticate, query the User's linked Brokerage Account, then call Alpaca. The deposit operation should follow the same shape and re-list relationships immediately before creating a Transfer.
- Alpaca mutations must use `authenticationReplay: "never"`. The Broker client logs every response status and `x-request-id`; UI errors should stay concise, while thrown/time-out/unreadable-success outcomes remain ambiguous.
- `app/app/funding/actions.ts` and `FundingOverview` establish the local `useActionState` + `next/cache` `refresh()` pattern. `tests/unit/funding-action.unit.test.ts` shows how to mock and verify the same-interaction refresh.
- The only Transfer controls added by issue 02 are disabled **Deposit**/**Withdraw** placeholders shown while the Funding Source is preparing. A ready source intentionally has no active action yet. Issue 03 should add the specified **Add funds** action without making the preparing-state affordance active.
- `getFundingSnapshot()` already exposes `transfersBlocked` and approved-source readiness, but the deposit Server Action must fetch and recheck both from Alpaca immediately before POSTing; render-time snapshot values are not authorization or mutation guards.
- No real Alpaca mutation was performed while implementing issue 02; all ACH Relationship responses were mocked. The manual sandbox deposit remains entirely for issue 03.
- Repository workflow requires Funding mockup metadata to stay synchronized with tracker lifecycle. `.mockups/funding-page/README.md` and `.mockups/README.md` are currently `in-progress` and already link the Alpaca funding spec.
