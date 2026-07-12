# Wealth Manager

Wealth Manager is a long-term investing web app built on top of the Alpaca Broker API. The target users are intermediate-level investors who want a simple, streamlined, and no-nonsense place to manage their portfolio and stick to a strategy. The primary focus is on stocks, bonds, and ETFs.

The following things are explicitly out of scope and not supported...

- crypto
- options / futures
- real estate
- IPOs
- margin
- short selling

> At this time, hardened production topics like regulatory compliance, document submissions and approvals, or things of that nature are not a concern. It can be assumed that the app will remain in sandbox mode (using the fully-disclosed setup) for quite some time.

## Main Product UI Surfaces

- **Portfolio** - Current portfolio state, including value, value over time, strategy alignment, holdings, and recent activity.
- **Strategy** - Strategy acts as the north star for portfolio construction, trading, rebalancing, recurring investing, and future automations.
- **Activity** - Open orders, order history, unified account activity.
- **Funding** - Funding overview, pending transfers, cash details and availability

## Frontend Routes

These are the primary routes. Do not assume that all have been implemented though. Do not assume that this list is comprehensive. These are the primary ones, but more routes may be needed.

| Route                  | Description                                                        |
| ---------------------- | ------------------------------------------------------------------ |
| `/`                    | Landing page                                                       |
| `/sign-in`             | Sign-in page                                                       |
| `/app/onboarding`      | Optional onboarding flow                                           |
| `/app/portfolio`       | Portfolio overview                                                 |
| `/app/assets/:assetId` | Asset and position details                                         |
| `/app/strategy`        | Strategy and automation                                            |
| `/app/activity`        | Open orders and unified account activity                           |
| `/app/funding`         | Funding overview, pending transfers, cash details and availability |
| `/app/settings`        | User settings                                                      |

## App Sidebar

- App Name + Logo
- "Search Investments..." Affordance (pulls up a search modal) -> `/app/assets/:assetId`
- "Trade" Affordance (pulls up a Buy/Sell modal)
- Main Nav
  - Portfolio -> `/app/portfolio`
  - Strategy -> `/app/strategy`
  - Activity -> `/app/activity`
  - Funding -> `/app/funding`
- Nav Footer (Avatar + Display Name) -> `/app/settings`
