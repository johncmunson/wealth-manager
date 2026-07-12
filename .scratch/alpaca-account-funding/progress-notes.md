## Notes from implementing `01 — Deliver the read-only Funding overview`

The following notes may be helpful to the agent working on the next ticket, `02 — Prepare the synthetic Funding Source`

- `lib/alpaca/funding.ts` currently identifies the synthetic relationship by account-number suffix `4242`, with a sole-relationship fallback because Alpaca may omit `bank_account_number`. Move this matching into the new shared Funding Source helper so read and preparation paths cannot diverge.
- The read path recognizes ACH schema statuses: `QUEUED`, `APPROVED`, `REJECTED`, `PENDING`, and `CANCEL_REQUESTED`. Issue 02’s “all documented statuses” may require reconciling additional event statuses such as `CANCEL_SENT`, `CANCEL_FAILED`, `SENT_TO_CLEARING`, and `CANCELED`.
- Rendering performs only GETs. Keep relationship creation exclusively in Provisioning and the authenticated **Prepare funding** Server Action.
- Do not expose or accept account/relationship IDs client-side. `getFundingSnapshot()` derives ownership from the session and database.
- `FundingOverview` already supports `ready`, `preparing`, `missing`, and `unavailable`; issue 02 mainly needs the Prepare action and pending/error interaction.
- Code review found synthetic relationship selection and source-error announcements initially weak; both were fixed and covered by tests.
