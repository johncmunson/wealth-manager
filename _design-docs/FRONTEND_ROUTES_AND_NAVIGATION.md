## Frontend Routes

### Finalized

These are the primary routes. They are finalized and locked-in.

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

### Optional / Not-Finalized

These are optional detail routes. We may discover that they aren't needed.

| Route                        | Description                            |
| ---------------------------- | -------------------------------------- |
| `/app/orders/:orderId`       | Order execution and settlement details |
| `/app/transfers/:transferId` | Optional transfer details              |

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
