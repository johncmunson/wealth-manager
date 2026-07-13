# Buy/Sell Trade modal

**Status:** ready-for-agent

## Problem Statement

A signed-in User can see a Trade button in the application sidebar, but it does nothing. The User cannot place an Order through Wealth Manager, validate whether an Asset is supported, understand the estimated result of a Market Order, or safely buy and sell the stocks and ETFs associated with their Brokerage Account.

## Solution

Connect the sidebar Trade button to an accessible Buy/Sell modal backed by Alpaca's sandbox Broker and Market Data APIs. The modal defaults to Buy, accepts Orders in either dollars or shares, validates Tradable Assets and current account constraints, presents an explicit review step, and places Market/Day Orders without optimistic completion claims or unsafe mutation replay.

Buy accepts a manually entered Symbol. Sell presents the User's owned Tradable Assets and limits Orders to Available-to-Sell Quantity. Alpaca remains authoritative for Assets, quotes, Buying Power, Holdings, Order acceptance, and Order status.

## User Stories

1. As a signed-in User, I want the sidebar Trade button to open a modal, so that I can place an Order without leaving my current page.
2. As a User opening Trade from the sidebar, I want Buy selected by default, so that the most common path is immediately available.
3. As a User, I want an obvious Buy/Sell selector, so that the Order side is unambiguous.
4. As a User switching between Buy and Sell, I want all entered values cleared, so that stale values cannot become an accidental opposite-side Order.
5. As a User closing the modal, I want the unfinished Order discarded, so that reopening Trade starts cleanly.
6. As a User, I want the Trade modal to support stocks and ETFs, so that I can manage the currently supported Asset types.
7. As a User, I want bonds rejected as unsupported, so that I cannot attempt an out-of-scope Order.
8. As a User buying an Asset, I want to enter its Symbol manually, so that I can act directly when I know what I want to buy.
9. As a User entering a Symbol, I want whitespace removed and letter case normalized, so that harmless formatting does not invalidate the Asset.
10. As a User leaving the Buy Symbol field, I want validation to begin asynchronously, so that I receive feedback before continuing.
11. As a User waiting for Symbol validation, I want a discreet spinner beside the field, so that I know validation is in progress.
12. As a User who entered a valid Symbol, I want a green checkmark and the resolved Asset name, so that I can confirm the intended Asset.
13. As a User who entered an invalid or unsupported Symbol, I want a red information icon, so that I can see that correction is required.
14. As a User investigating an invalid Symbol, I want accessible tooltip text explaining the reason, so that I know whether the Asset is missing, inactive, non-tradable, or unsupported.
15. As a keyboard or assistive-technology User, I want validation feedback available without hover or color alone, so that the form remains understandable.
16. As a User, I want only an active, tradable US equity accepted for Buy, so that the Order is limited to supported Alpaca stocks and ETFs.
17. As a User, I want Asset eligibility checked again on the server before placement, so that stale browser validation cannot authorize an invalid Order.
18. As a User selling an Asset, I want to choose from the Tradable Assets I currently own, so that I cannot initiate a short sale.
19. As a User opening the Sell selector, I want each option to show Symbol, Asset name, and Available-to-Sell Quantity, so that I can identify the correct Holding.
20. As a User with many Holdings, I want to search Sell options by Symbol or Asset name, so that I can find a Holding quickly.
21. As a User, I want Holdings with no Available-to-Sell Quantity omitted from selection, so that open Orders cannot cause me to oversell.
22. As a User with no selectable Holdings, I want a “Nothing available to sell” state and an action to switch to Buy, so that an empty selector is not confusing.
23. As a User, I want Sell Orders limited to Available-to-Sell Quantity rather than total Holding quantity, so that shares reserved by open Orders are respected.
24. As a User, I want a Sell all action, so that I can liquidate the currently available portion of a Holding exactly.
25. As a User choosing Sell all from dollars mode, I want the form switched to shares and populated with Available-to-Sell Quantity, so that “all” is exact rather than estimated.
26. As a User, I want to specify either dollars or shares for both Buy and Sell, so that the Order can match my intent.
27. As a User entering a dollar Order, I want a minimum of $1.00 and at most two decimal places, so that the amount follows supported product precision.
28. As a User entering a share Order for a fractionable Asset, I want to enter a positive quantity with up to nine decimal places, so that fractional shares are supported.
29. As a User entering an Order for a non-fractionable Asset, I want dollars disabled and shares restricted to whole quantities, so that Alpaca will not reject an unsupported fractional Order.
30. As a User, I want malformed, zero, negative, and over-precision amounts rejected before review, so that I can correct them early.
31. As a User entering a dollar-denominated Sell Order, I want Alpaca to receive the notional amount directly, so that Wealth Manager does not convert a changing quote into an authoritative share quantity.
32. As a User, I want the latest available market price and quote time displayed, so that I understand the basis of the estimate.
33. As a User entering shares, I want an estimated dollar value, so that I understand the approximate size of the Order.
34. As a User entering dollars, I want an estimated share quantity, so that I understand the approximate result of the Order.
35. As a User moving to review, I want the quote refreshed, so that the estimate is not needlessly stale.
36. As a User, I want the estimate clearly distinguished from execution, so that I understand a Market Order's price is not guaranteed.
37. As a User without a usable quote, I want placement blocked with helpful feedback, so that I am not asked to place an unpriced Market Order.
38. As a User buying an Asset, I want current Buying Power displayed, so that I can choose an affordable amount.
39. As a User whose estimated Buy exceeds Buying Power, I want the form to block review, so that an obviously unaffordable Order is not submitted.
40. As a User, I want Buying Power refreshed and checked immediately before placement, so that stale displayed funds do not authorize the Order.
41. As a User, I want Alpaca's final Buying Power decision treated as authoritative, so that changing prices and brokerage rules are handled honestly.
42. As a User, I do not want a Max Buy shortcut, so that price movement does not produce a predictably fragile all-Buying-Power Order.
43. As a User, I want only Market Orders, so that the first Trade experience remains focused.
44. As a User, I want every Order submitted with day duration, so that fractional and whole-share Orders follow one supported policy.
45. As a User placing an Order outside regular market hours, I want to know it is queued for the next eligible regular session and may expire at that session's end, so that I do not expect immediate execution.
46. As a User, I do not want extended-hours execution enabled, so that the Order follows the stated regular-session behavior.
47. As a User, I want a review step before placement, so that I can catch side, Asset, or amount mistakes.
48. As a User reviewing an Order, I want to see side, Asset, dollars or shares, estimate, quote time, Market Order type, day duration, and price/fee caveats, so that I understand what I am submitting.
49. As a User, I want the final control labeled “Place buy order” or “Place sell order,” so that the financial action is explicit.
50. As a User submitting an Order, I want placement controls disabled while the request is pending, so that a double-click cannot place duplicates.
51. As a User with a definitively accepted Order, I want to see “Order placed,” the current Alpaca status, and actions for Done and View activity, so that acceptance is not misrepresented as execution.
52. As a User, I do not want the Trade modal to wait or poll until fill, so that placement is not coupled to the later Order lifecycle.
53. As a User, I want Activity to own later partial-fill, fill, cancellation, rejection, and expiry status, so that Order lifecycle has one destination.
54. As a User whose placement is definitively rejected by Alpaca, I want the modal closed and an error or warning toast in the bottom-right corner, so that the failure is prominent without leaving a stale Order form open.
55. As a User correcting local input or quote errors, I want the modal to remain open with inline feedback, so that I can fix the form.
56. As a User whose placement outcome cannot be determined, I want the modal to remain open and say “Order status unknown,” so that I do not assume the Order failed.
57. As a User with an unknown outcome, I want Wealth Manager to check Alpaca by a unique client Order ID before reporting uncertainty, so that accepted Orders are recognized when possible.
58. As a User with an unresolved outcome, I want guidance to check Activity before trying again, so that I avoid a duplicate Order.
59. As a User, I do not want Wealth Manager to replay an Order mutation automatically, so that an authentication or network failure cannot create a duplicate Order.
60. As a User without a linked Brokerage Account, I want a status-specific unavailable state, so that I understand why Trade cannot proceed.
61. As a User whose Brokerage Account Provisioning is pending, failed, or unknown, I want an explanatory unavailable state and no actionable form, so that unsafe account assumptions are avoided.
62. As a User whose Brokerage Account is restricted from Orders, I want an explanatory unavailable state, so that I understand why Trade cannot proceed.
63. As a User, I want the Trade button to open unavailable states rather than silently remain disabled, so that account problems are discoverable.
64. As a future Asset-search caller, I want the Trade modal to accept an initial side and Symbol, so that search can open a preselected Buy flow later.
65. As a future Asset-specific caller, I want the Trade modal to validate preselected values through the same rules, so that preselection does not bypass safety.
66. As a User, I do not want financial amounts prepopulated by callers, so that opening Trade cannot create an accidental ready-to-place amount.
67. As a keyboard User, I want dialog focus, controls, tooltips, errors, review, and confirmation to be fully operable and announced, so that I can place an Order without a pointer.
68. As a User on a narrower viewport, I want reasonable responsive layout and scroll behavior, so that the modal does not unnecessarily break even though mobile is not a supported product target.

## Implementation Decisions

- The existing sidebar Trade button opens the modal. The sidebar entry defaults to Buy and supplies no initial Symbol.
- The modal supports optional initial side and initial Symbol inputs for future callers. It does not accept an initial financial amount.
- Closing the modal resets its draft. Changing side also clears the Asset, amount mode, amount, validation, quote, review, and submission state.
- The current Trade modal is independent of the future sidebar Asset-search modal. Search, “View asset,” back-navigation between modal views, and Asset details are not introduced here.
- The UI is composed from existing shadcn/ui foundations without modifying foundational components. Add only the minimal app-level toast support needed for definitive placement failures.
- Buy uses a manual Symbol input rather than an Asset search picker. The browser trims and uppercases the Symbol.
- Buy validation starts on field blur. The latest request wins if the Symbol changes while validation is in flight; stale asynchronous responses must not overwrite current feedback.
- Buy feedback uses an in-field spinner while pending, a green checkmark on success, and a red information icon on failure. Failure detail is available on hover and keyboard focus and is also exposed to assistive technology.
- A Tradable Asset must be reported by Alpaca as `class=us_equity`, `status=active`, and `tradable=true`. This admits supported stocks and ETFs while excluding bonds and other Asset classes.
- The server repeats Asset validation before placement. Client validation is usability feedback, not authorization.
- Sell reads current Alpaca positions for the User's Brokerage Account and exposes only long, Tradable Assets with positive `qty_available` as options. Non-tradable Holding presentation is not addressed in this scope.
- Sell option labels include Symbol, Asset name, and Available-to-Sell Quantity, and options are searchable by Symbol or name.
- Available-to-Sell Quantity uses Alpaca's `qty_available`, which accounts for shares committed to open Orders. The server refreshes and enforces it immediately before a share-denominated Sell mutation.
- Sell all always becomes a share-denominated Order for the full current Available-to-Sell Quantity.
- Both sides support an explicit dollars/shares mode. Dollar mode maps to Alpaca `notional`; share mode maps to `qty`. The request never sends both.
- Dollar input is a positive decimal string, minimum `1.00`, with at most two decimal places. Share input is a positive decimal string with at most nine decimal places for a fractionable Asset and a positive integer otherwise.
- Dollar and share values remain decimal strings through validation and request construction. Financial inputs and constraints do not use floating-point values as authoritative amounts.
- Alpaca's Asset `fractionable` value controls dollar-mode and fractional-share availability. The application does not maintain a local fractionability list.
- The initial read path returns a modal-oriented snapshot containing Brokerage Account availability, account Order restrictions, Buying Power, and Sell options. Buy Asset validation returns resolved Asset identity, fractionability, and a quote or a user-safe validation reason.
- The application adds a narrow read-only Alpaca Market Data client for sandbox stock quotes. It reuses the existing token service and enforces the sandbox Market Data origin rather than weakening the Broker client's origin guard.
- Estimates use Alpaca's latest side-appropriate quote: ask for Buy and bid for Sell. The UI shows the quote timestamp. A missing, malformed, or non-positive usable quote blocks review.
- Quotes are fetched after successful Buy validation or Sell selection and refreshed once when entering review. There is no streaming, timed polling, or background quote subscription.
- The displayed estimate is calculated from the current quote for presentation only. It never becomes an execution price or an authoritative dollar-to-share conversion.
- Buy blocks an estimate above displayed Buying Power. Immediately before placement, the server re-fetches Brokerage Account state, Order restrictions, Buying Power, Asset eligibility, and a usable quote and rejects an obviously insufficient Buy. Alpaca's Order endpoint remains authoritative.
- Dollar-denominated Sell Orders are sent directly as `notional`; Wealth Manager does not convert them to shares. Alpaca remains authoritative for whether the current Holding supports the requested notional sale.
- Every Order is submitted as `type=market`, `time_in_force=day`, and without extended-hours execution.
- Review states that execution price is not guaranteed, that outside-hours Orders wait for the next eligible regular session, and that final value may differ due to execution and applicable fees.
- Wealth Manager does not calculate commissions or regulatory fees. It may display an estimate only if Alpaca explicitly provides one in the chosen response; otherwise it uses the general caveat.
- Placement uses a Server Action as the only application mutation interface. No public Route Handler is introduced.
- Every server operation authenticates independently and derives the User and Brokerage Account from the session and database relationship. Client input never supplies an Alpaca account identifier.
- The placement Server Action accepts only side, Symbol, amount mode, and decimal amount. Server code derives all Alpaca-specific account and eligibility data.
- Each placement intent receives a unique server-generated `client_order_id`. The Order POST uses the existing `authenticationReplay: "never"` policy.
- After an ambiguous Order POST outcome, the server performs a safe read by `client_order_id`. A found Order becomes a placed result; a missing or inconclusive read remains unknown. The POST is never replayed.
- Placement results distinguish `placed`, `rejected`, and `unknown`. A placed result includes Alpaca's current Order identifier and status; it does not imply a Filled Order.
- A placed result remains in the modal and offers Done and View activity. View activity closes the modal and navigates to the existing Activity route.
- A definitive Alpaca placement rejection closes the modal and produces a concise bottom-right error or warning toast. Raw Alpaca payloads, credentials, and internal identifiers are not exposed.
- Input validation, Asset validation, quote, and review errors remain inline and keep the modal open. An unknown placement outcome also keeps the modal open and warns against immediate resubmission.
- Closing is disabled only while Order placement is in flight. It is allowed during reads and ordinary editing.
- Brokerage Accounts that are missing, pending, failed, unknown, blocked, suspended, or otherwise not order-capable receive a status-specific unavailable modal state and no Order form.
- The Trade experience makes reasonable use of responsive width, vertical scrolling, and stable action placement but does not introduce a separate mobile design or claim mobile support.
- Accessibility includes dialog focus management, keyboard-operable selectors and tooltips, visible focus, accessible names, pending-state announcements, errors associated with fields, status text in addition to color/icons, and explicit final-action labels.
- No database schema changes are required. Wealth Manager does not persist Assets, quotes, Holdings, Buying Power, Order drafts, Order intents, or Order lifecycle locally.
- Alpaca remains the source of truth for Brokerage Account restrictions, Tradable Assets, fractionability, quotes, Buying Power, Holdings, Available-to-Sell Quantity, Order acceptance, and Order status.
- Existing ADRs remain in force: the product stays sandbox-only, and Alpaca mutations are not replayed without proof of idempotency. The modal does not add a sandbox badge because Funding already establishes the product environment.

## Testing Decisions

- Tests assert observable behavior and public operation contracts rather than component structure, internal helper calls, CSS classes, or implementation-specific state transitions.
- The primary server-unit seam is the public Order operation layer with Alpaca responses mocked at the existing Broker and new Market Data client boundaries.
- Server-unit coverage includes Brokerage Account states and restrictions; Symbol normalization; active/tradable/US-equity eligibility; bond and unsupported Asset rejection; fractionability; latest quote mapping; missing or malformed quotes; Buying Power; long Holdings; `qty_available`; empty Sell options; dollars/shares precision; whole-share enforcement; Sell all inputs; server-side revalidation; Market/Day request construction; mutually exclusive `notional` and `qty`; no extended hours; and no client-supplied account identity.
- Server-unit placement coverage includes accepted Orders, definitive Alpaca rejection, current Buying Power failure, changed Asset eligibility, changed Available-to-Sell Quantity, unique client Order IDs, pending-request no-replay policy, reconciliation by client Order ID, a found Order after ambiguity, and unresolved unknown outcomes.
- Broker-client mutation replay tests remain prior art for proving that Order POSTs use `authenticationReplay: "never"`. Funding server-unit tests remain prior art for page-oriented reads, server-derived Brokerage Accounts, decimal-string validation, account restrictions, and honest ambiguous outcomes.
- The browser-component seam renders the Trade modal with stubbed read, validation, quote, and Server Action results.
- Browser-component coverage includes sidebar opening; default Buy; side-switch clearing; close/reopen clearing; optional initial side/Symbol; no amount prepopulation; blur-triggered validation; pending spinner; valid checkmark and Asset name; invalid information icon; hover/focus tooltip; stale validation response protection; dollars/shares modes; precision feedback; non-fractionable controls; Buy estimates and Buying Power; Sell option content and search; empty Sell state; Available-to-Sell enforcement; Sell all switching to shares; quote refresh on review; review content; outside-hours copy; pending-submit protection; placed confirmation; Done; View activity; definitive rejection toast; inline correctable errors; unknown-outcome warning; and unavailable Brokerage Account states.
- Real-browser component tests verify modal focus, Escape/close behavior, keyboard operation, tooltip access, selectors, error announcements, and narrow-viewport usability. Existing Funding browser-component tests and dialog tests are prior art.
- No database integration test is required because this feature introduces no schema or local persistence behavior.
- Automated tests never place an Alpaca sandbox Order. External reads and mutations are mocked to avoid shared sandbox state and nondeterministic market conditions.
- One manual authenticated sandbox acceptance pass verifies a valid Buy, a valid Sell against an owned Tradable Asset, dollar and share modes, an outside-hours queued result when practical, Activity navigation, and current Alpaca status presentation.
- Manual acceptance must use the existing authenticated browser profile and a deliberately small sandbox amount. It must not be represented as production brokerage validation.

## Out of Scope

- Bonds and fixed-income Orders.
- Crypto, options, futures, real estate, IPOs, margin Orders, and short selling.
- Limit, stop, stop-limit, trailing-stop, bracket, OCO, OTO, market-on-open, and market-on-close Orders.
- Extended-hours, overnight, or 24/5 execution.
- Order cancellation, replacement, editing, bulk liquidation, or open-Order management.
- Polling, SSE, WebSocket streaming, webhooks, background workers, or real-time Order lifecycle updates.
- Persisting Order intents, drafts, Orders, Assets, quotes, Holdings, or reconciliation state locally.
- A Max Buy action.
- Locally maintained Asset eligibility, fractionability, Buying Power, margin, settlement, quote, commission, or fee formulas.
- Showing unavailable or non-tradable Holdings as disabled Sell options.
- The sidebar Asset-search modal, Asset search results, “View asset,” Asset detail pages, and back-navigation from a preselected Buy flow.
- Prepopulated dollar or share amounts.
- Activity-page implementation beyond navigating to its existing route.
- Production brokerage operations, real money, KYC, compliance, production disclosures, or production safeguards.
- A sandbox badge or repeated sandbox disclaimer in the Trade modal.
- A separate mobile experience or a claim of mobile support.
- Automated tests that place real Alpaca sandbox Orders.

## Further Notes

- The UI button remains labeled Trade as an affordance, but the canonical domain concept is an Order; UI and implementation copy should avoid calling a placed Order a completed “trade.”
- A Placed Order is not necessarily a Filled Order. Immediate confirmation must preserve Alpaca's actual status and leave later lifecycle reporting to Activity.
- Alpaca's checked-in Broker OpenAPI documents `POST /v1/trading/accounts/{account_id}/orders`, `GET /v1/trading/accounts/{account_id}/orders:by_client_order_id`, positions with `qty_available`, and mutually exclusive `notional`/`qty` Order inputs. The checked-in Market Data OpenAPI documents the single-stock latest quote endpoint.
- Checked-in Alpaca documentation states that fractional Order quantities can use up to nine decimal places, while the Broker Order contract accepts notional values to two decimal places. Product dollar input remains cents-based with a $1.00 minimum.
- The Broker API also documents an Order estimation endpoint, but the agreed experience uses a side-appropriate latest quote for both dollar and share estimates. The application does not add asymmetric estimation behavior for notional Orders in this scope.
- No new ADR is required. The feature applies the existing sandbox-only and no-unsafe-replay decisions rather than introducing a hard-to-reverse architectural choice.
