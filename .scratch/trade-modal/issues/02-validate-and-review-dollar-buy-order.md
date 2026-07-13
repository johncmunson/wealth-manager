# 02 — Validate and review a dollar Buy Order

**What to build:** Let a User enter a stock or ETF Symbol, validate it with Alpaca, choose a dollar amount, and review an estimated Market/Day Buy Order without placing it yet.

**Blocked by:** 01 — Open Trade with Brokerage Account readiness

**Status:** ready-for-agent

- [ ] Buy accepts a manually entered Symbol, trims whitespace, and normalizes letter case.
- [ ] Leaving the Symbol field starts asynchronous validation; stale responses cannot overwrite feedback for a newer value.
- [ ] Validation shows a discreet spinner while pending, a green checkmark and Asset name on success, and a red information icon on failure.
- [ ] Invalid feedback explains the reason through a tooltip available by hover and keyboard focus and through assistive technology.
- [ ] Only Alpaca Assets reported as active, tradable US equities are accepted; bonds and other Asset classes are rejected.
- [ ] Fractionability is returned with the validated Asset for later amount-mode decisions.
- [ ] The latest usable Alpaca stock quote is fetched through a sandbox-only, authenticated Market Data boundary without weakening the existing Broker API origin protection.
- [ ] The form shows current Buying Power, a side-appropriate latest price, quote time, and estimated shares for the entered dollars.
- [ ] Dollar input requires a positive amount of at least $1.00 with no more than two decimal places.
- [ ] Review is blocked for malformed amounts, missing or unusable quotes, invalid Assets, and estimates above displayed Buying Power.
- [ ] Review shows side, Asset, dollar amount, estimate, quote time, Market Order type, day duration, outside-hours behavior, and price/fee caveats.
- [ ] Entering review refreshes the quote once; no streaming or timed polling is introduced.
- [ ] Server-unit and browser-component tests cover validation, quote mapping, Buying Power, amount rules, accessible feedback, and review behavior.
