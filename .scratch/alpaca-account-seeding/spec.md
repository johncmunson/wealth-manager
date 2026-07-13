# Alpaca sandbox Account Seeding

**Status:** resolved

## Problem Statement

Alpaca's sandbox ACH process is currently unavailable or unreliable, preventing the team from consistently adding cash to Brokerage Accounts. Without Buying Power, the team cannot reliably demonstrate or test stock and ETF purchases. The existing User-facing deposit and withdrawal experience should remain intact, but the team needs a separate, low-friction fallback for tomorrow's demo.

## Solution

Provide an operator-only command that performs Account Seeding by moving synthetic cash from the configured sandbox Sweep Account to the Brokerage Account linked to a User email. The command will create one idempotent Alpaca JNLC cash Journal, briefly poll for execution, and report whether Buying Power is usable.

Account Seeding remains visibly and conceptually separate from a User-initiated Transfer. It will not alter the Funding page, recent Transfers, or the existing synthetic ACH Funding Source.

## User Stories

1. As an operator, I want to seed a Brokerage Account without ACH, so that an Alpaca outage does not block the demo.
2. As an operator, I want to invoke Account Seeding through a `pnpm` command, so that no administrative UI must be built or secured.
3. As an operator, I want to identify the target User by email, so that I do not need to find an Alpaca account identifier manually.
4. As an operator, I want email matching to be case-insensitive, so that capitalization does not target-fail an otherwise valid User.
5. As an operator, I want the command to derive the User's linked Brokerage Account, so that cash cannot be directed using an arbitrary destination identifier.
6. As an operator, I want a clear error when no User matches the email, so that I can correct the target safely.
7. As an operator, I want a clear error when the User lacks a linked Brokerage Account, so that Account Seeding never targets an unresolved Provisioning state.
8. As an operator, I want the Sweep Account configured outside the command arguments, so that its environment-specific identifier is not repeatedly copied into shell history.
9. As an operator, I want a clear error when the Sweep Account is not configured, so that the command fails before contacting Alpaca.
10. As an operator, I want to provide a positive USD amount, so that I control how much synthetic cash is added.
11. As an operator, I want malformed, zero, and negative amounts rejected before contacting Alpaca, so that invalid Journals are never attempted.
12. As an operator, I want decimal money handled as a string, so that floating-point conversion cannot change the requested amount.
13. As an operator, I want amounts above $50 allowed, so that I can seed enough cash for the intended demonstration.
14. As an operator, I want a warning for amounts above Alpaca's documented default immediate-execution limit, so that I understand the Journal may remain pending until batch processing.
15. As an operator, I want exactly one Journal created per command invocation, so that the tool never silently splits a large amount into multiple movements.
16. As an operator, I want Journal creation protected by Alpaca's idempotency mechanism, so that an authenticated retry cannot duplicate Account Seeding.
17. As an operator, I want the command to wait briefly for Journal execution, so that I receive a useful readiness result rather than only an acceptance result.
18. As an operator, I want polling bounded to 10 seconds, so that a delayed Journal does not leave the command hanging.
19. As an operator, I want an executed Journal reported clearly, so that I know the Account Seeding movement completed.
20. As an operator, I want updated Buying Power reported after execution, so that I know whether the Brokerage Account is ready for Orders.
21. As an operator, I want a pending or queued status reported honestly after the timeout, so that I do not assume cash is usable.
22. As an operator, I want rejected, refused, or canceled Journal states reported clearly, so that I know Account Seeding did not complete.
23. As an operator, I want Alpaca request identifiers and bounded error details available for diagnosis, so that failures can be investigated without exposing credentials.
24. As an operator, I want ambiguous outcomes identified as unknown, so that I do not blindly rerun a money movement.
25. As a User, I do not want Account Seeding represented as a deposit, so that internal sandbox cash is not confused with a User-initiated Transfer.
26. As a User, I do not want a seeded Journal inserted into recent Transfers, so that the Funding page preserves the meaning of Transfer history.
27. As a User, I want Buying Power and cash to reflect Alpaca's resulting balances naturally, so that the application continues to use Alpaca as its source of truth.
28. As a developer, I want Account Seeding to reuse the existing Broker client and token service, so that authentication and sandbox-origin safeguards remain consistent.
29. As a developer, I want Account Seeding restricted to the existing sandbox integration, so that this fixture cannot be mistaken for production funding readiness.
30. As a developer, I want no new database state or migrations, so that this temporary operational fallback remains easy to remove.
31. As a developer, I want the existing ACH deposit and withdrawal implementation left unchanged, so that the fallback does not broaden the User-facing Funding feature.
32. As a developer, I want Account Seeding behavior covered without mutating Alpaca's shared sandbox during automated tests, so that tests remain deterministic and safe.
33. As a future maintainer, I want the command's output to call the operation Account Seeding and the source a Sweep Account, so that it follows the domain glossary rather than presenting a Journal as a deposit.
34. As a future maintainer, I want reversal omitted until cleanup is demonstrably needed, so that the first version contains no speculative cash-removal behavior.

## Implementation Decisions

- Add one operator-only `pnpm` command whose required positional inputs are User email and amount.
- The command is non-interactive so it can be run quickly and predictably during demo preparation.
- Account Seeding is available only against the existing Alpaca sandbox integration and must reject a production database target.
- The source Sweep Account ID comes from the required `ALPACA_SANDBOX_SWEEP_ACCOUNT_ID` environment variable and is documented with the local sandbox environment configuration.
- The destination Brokerage Account is resolved through a case-insensitive User email lookup and the existing one-to-one User-to-Brokerage Account relationship.
- Only a Brokerage Account in the linked Provisioning state with an Alpaca account ID may be seeded.
- Amount input must be a positive plain-decimal USD string with no exponent notation or sign. It may contain no more than two fractional digits and is never converted through a JavaScript floating-point number.
- Amounts above $50 are accepted, but the command warns before submission that Alpaca's default JNLC Transaction Limit may delay execution. The limit is configurable by Alpaca, so $50 is a warning threshold rather than a local maximum.
- The command submits exactly one `POST /v1/journals` request with entry type `JNLC`, the configured Sweep Account as `from_account`, the linked Brokerage Account as `to_account`, the requested amount, and USD currency.
- Journal creation includes a fresh `Idempotency-Key` UUID. This proves that an authentication replay of the same request is safe and complies with the existing Alpaca mutation-replay ADR.
- The operation does not split amounts, create multiple Journals, or retry with a new idempotency key after an ambiguous outcome.
- A successful create response supplies the Journal identifier and status. While the Journal is not yet usable or terminal, the command polls the single-Journal read endpoint at a modest interval for no longer than 10 seconds.
- `executed` and the subsequent informational `activity_created` state are treated as Account Seeding execution states. After either state, the command reads the Brokerage Account and reports current Buying Power.
- If the timeout expires first, the command reports the latest Journal status and warns that the cash is not yet confirmed usable. It does not continue in the background.
- Rejected, refused, canceled, deleted, and other definitive non-execution states produce a failure result with bounded Alpaca diagnostics.
- Transport failure or an unreadable response after submission produces an unknown result that tells the operator not to rerun blindly.
- The command must not log Alpaca credentials, bearer tokens, full unexpected response bodies, or other Users' data.
- The existing Broker client, token service, environment loading, database connection, and Brokerage Account relationship are reused rather than duplicated.
- The CLI is a thin adapter over one public Account Seeding operation. Validation, User and Brokerage Account resolution, Journal submission, polling, and result classification live at that operation seam.
- No UI, Server Action, Route Handler, database table, local Journal ledger, scheduler, SSE consumer, or background worker is introduced.
- Account Seeding does not modify the Funding snapshot or map Journals into recent Transfers. Alpaca balance reads naturally reflect any executed movement.
- The existing synthetic ACH Funding Source and User-facing deposit and withdrawal paths remain unchanged.
- Reversal, customer-to-Sweep movement, and negative amounts are not supported.
- No ADR is added: this is a sandbox-only, operator-only mechanism that is easy to remove and does not establish a hard-to-reverse architecture.

## Testing Decisions

- Use one primary automated seam: the public Account Seeding operation. This is the highest practical seam while allowing the database lookup, Broker API, clock, and polling delay to be controlled without invoking real Alpaca mutations.
- Tests assert observable results and outbound Broker API contracts, not private helper structure, polling implementation details, or console formatting internals.
- Server-unit coverage verifies successful case-insensitive User resolution, linked Brokerage Account resolution, exact JNLC request shape, UUID idempotency header, and Buying Power reporting after execution.
- Server-unit coverage verifies rejection before Alpaca access for a missing User, an unlinked Brokerage Account, missing Sweep Account configuration, malformed amount, zero, and negative amount.
- Server-unit coverage verifies that an amount above $50 is still submitted once and returns a warning rather than being blocked or split.
- Server-unit coverage verifies immediate execution, execution reached during polling, timeout with the latest nonterminal status, definitive rejection, malformed Alpaca responses, and unknown mutation outcomes.
- Server-unit coverage verifies that Journal creation opts into safe authentication replay only because the idempotency header proves the mutation idempotent.
- Server-unit coverage verifies that timeout and failure paths never submit a second Journal.
- Existing Alpaca Funding operation tests are prior art for mocking the database and Broker client boundary, validating money strings, parsing external responses, and classifying definitive versus unknown mutation outcomes.
- Existing Broker client tests are prior art for authentication replay and credential-safe error behavior.
- The package-command adapter remains intentionally thin; a manual acceptance check covers its environment loading and argument wiring rather than adding a second automated seam.
- The manual sandbox acceptance check configures the real Sweep Account ID, seeds a linked Brokerage Account, confirms an executed Journal for an amount at or below $50, and verifies Buying Power through both command output and the existing application.
- A second optional manual check may use an amount above $50 to confirm the warning and observe the environment's configured Journal behavior; immediate execution is not an acceptance requirement for that case.
- Automated tests never create, reverse, or poll real Alpaca Journals.

## Out of Scope

- Repairing or replacing Alpaca's ACH service.
- Changing the User-facing deposit or withdrawal experience.
- Presenting Account Seeding as a Transfer or Funding Source interaction.
- Adding Journals to recent Transfers or the Funding page.
- A hidden admin page, public endpoint, Server Action, or User-accessible Account Seeding control.
- Automatic Account Seeding during signup or Brokerage Account Provisioning.
- Automatic request splitting to avoid JNLC transaction limits.
- Automatic recurring seeding, schedules, queues, workers, or SSE subscriptions.
- Journal reversal, cash removal, negative amounts, or demo-account cleanup.
- Funding Wallets, wire deposits, Instant Funding, Plaid, or real bank integration.
- Production use, real money, cash pooling, Travel Rule support, compliance controls, or settlement reconciliation.
- Discovering the Sweep Account automatically.
- Persisting Journals, idempotency keys, Account Seeding intents, or balance snapshots locally.
- Database schema changes or migrations.
- Automated tests against Alpaca's shared sandbox.

## Further Notes

- Supporting research is recorded in `docs/research/alpaca-sandbox-funding-alternatives.md`. It recommends JNLC cash Journals as the lowest-friction fallback because sandbox teams receive a pre-funded firm account and Journals can update Buying Power without an ACH Relationship.
- Alpaca documents a default $50 JNLC Transaction Limit for near-instant execution and a configurable default $1,000 daily limit. Above-limit Journals may wait for batch processing, so the command must report observed state rather than promise timing.
- Alpaca's Journal create endpoint supports an `Idempotency-Key` header, unlike the existing ACH Transfer create endpoint. This permits the proven safe replay required by the repository's Alpaca mutation ADR.
- This specification intentionally narrows the earlier Funding specification's exclusion of Journals: Journals remain excluded from User-facing Funding but are now permitted solely as operator-only Account Seeding.
- The domain glossary defines Account Seeding and Sweep Account and distinguishes them from User-initiated Transfers and the synthetic Funding Source.
