# Frontend routes and navigation

**Status:** ready-for-agent

## Problem Statement

A signed-in User needs a stable application shell and clear routes for understanding their Portfolio, managing their Strategy, reviewing Activity, and handling Funding. The shell exists, but its primary product pages are placeholders and several routes shown in planning documents or mockups do not exist yet.

## Solution

Build the product incrementally inside the existing authenticated shell. Keep Portfolio, Strategy, Activity, and Funding as the primary navigation; add detail and settings routes only when their product behavior is implemented. Treat the current mockups as visual direction rather than proof of implemented behavior or fixed acceptance criteria.

## User Stories

1. As a visitor, I want to reach the landing page, so that I can understand Wealth Manager before signing in.
2. As a visitor, I want to sign in with Google, so that I can access my workspace.
3. As a signed-in User, I want application routes protected from unauthenticated access, so that my financial information is private.
4. As a signed-in User, I want consistent sidebar navigation, so that I can move between primary product areas.
5. As a signed-in User, I want the current primary route highlighted and named in the header, so that I know where I am.
6. As a signed-in User, I want to view my Portfolio, so that I can understand its value, Holdings, recent changes, and Strategy Drift.
7. As a signed-in User, I want to inspect an Asset, so that I can understand an investment before acting on it.
8. As a signed-in User, I want to view and manage my Strategy, so that my Target Allocation remains explicit.
9. As a signed-in User, I want to review open Orders and account Activity, so that I understand changes affecting my Brokerage Account.
10. As a signed-in User, I want to understand Funding and cash availability, so that I know what money can be invested or withdrawn.
11. As a signed-in User, I want to review pending Transfers, so that I know when cash movement will complete.
12. As a signed-in User, I want search to lead me to an Asset, so that I can find investments without navigating manually.
13. As a signed-in User, I want a clear Trade action, so that I can begin buying or selling an Asset.
14. As a signed-in User, I want to access settings from my account menu, so that I can manage my Wealth Manager profile.
15. As a signed-in User, I want to sign out from the application shell, so that I can end my session safely.
16. As a User without a linked Brokerage Account, I want guided onboarding or recovery, so that I can finish setup without entering the main workspace in an unusable state.
17. As a mobile User, I want the same primary navigation through the responsive sidebar, so that the workspace remains usable on a small screen.

## Implementation Decisions

- The authenticated application lives under `/app`; unauthenticated access redirects to sign-in, and the application layout verifies the session again before rendering protected content.
- Portfolio, Strategy, Activity, and Funding are the primary navigation destinations.
- The primary application routes and responsive sidebar shell are implemented. Their page bodies remain placeholders.
- The shell includes route-aware headings, search and Trade affordances, an account menu, and sign-out. Search, Trade, settings navigation, and real User profile details are not implemented yet.
- Asset details, onboarding, and settings are planned routes and should be added only with their associated behavior.
- Order and Transfer detail routes are optional; add them only if the primary Activity and Funding experiences cannot present enough detail in place.
- Shared navigation metadata remains the source for sidebar items and route-aware headings.
- Product pages should be composed from the existing shadcn/ui foundations without modifying foundational components.
- The mockups under `.mockups/` are prototype evidence for layout and information hierarchy. They are not authoritative for data contracts, route names, or completed behavior.
- The Portfolio mockup's Automations destination is not part of the accepted primary navigation. Automation remains future Strategy behavior unless separately specified.
- Funding must not assume Plaid. Any linked-bank presentation in a mockup is illustrative until a non-Plaid funding flow is specified.

## Testing Decisions

- Test navigation matching and other deterministic route behavior at the server-unit layer.
- Test interactive shell behavior at the component layer, promoting only behavior that requires real browser semantics to browser-component tests.
- Verify authentication redirects and critical signed-in navigation through Playwright against a production build when those journeys become product acceptance criteria.
- Prefer accessible roles, names, and visible behavior over implementation details.
- Reuse the existing navigation tests and testing layers rather than creating a new test seam.

## Out of Scope

- Implementing the four placeholder product pages as part of this backfilled specification.
- Treating the mockups as pixel-perfect requirements.
- Production brokerage onboarding, KYC, compliance, or real-money operation.
- Plaid integration.
- Crypto, options, futures, real estate, IPOs, margin, or short selling.
- Committing to Order or Transfer detail routes before the primary pages demonstrate a need.
- A separate Automations navigation destination.

## Further Notes

The source planning document described several routes as finalized before implementation. This specification instead records the observable repository state: the authenticated shell and four primary routes exist, while major page behavior and secondary routes remain planned. Composite mockups exist for Portfolio, Strategy, and Funding and should inform future feature-specific specs.
