# 06 — Sell by dollars and finalize modal composition

**What to build:** Complete the Buy/Sell modal with notional Sell Orders, strict side-reset behavior, safe future preselection, and full-flow accessibility and responsive verification.

**Blocked by:** 05 — Sell available shares from Holdings

**Status:** ready-for-agent

- [ ] Sell exposes both dollars and shares modes for a fractionable Asset.
- [ ] Dollar Sell requires a positive amount of at least $1.00 with no more than two decimal places.
- [ ] Dollar Sell sends `notional` directly to Alpaca and never converts a changing quote into an authoritative share quantity.
- [ ] Alpaca remains authoritative for whether the current Holding supports the notional Sell; definitive rejection uses the established close-and-toast behavior.
- [ ] Sell all from dollars mode switches to shares and uses exact Available-to-Sell Quantity.
- [ ] Switching between Buy and Sell clears Asset, amount mode, amount, validation, quote, review, and submission state.
- [ ] The modal accepts an optional initial side and Symbol for future callers, validates preselected values through normal rules, and does not accept a prepopulated amount.
- [ ] Closing and reopening always starts a fresh sidebar Buy flow.
- [ ] All controls, selectors, tooltips, review states, errors, pending states, and confirmations are keyboard operable and announced accessibly without relying on color alone.
- [ ] The modal makes reasonable responsive use of width, scrolling, and action placement without creating a separate mobile experience or claiming mobile support.
- [ ] No Asset-search modal, Asset details, back-navigation between modal views, Order management, polling, or live quote streaming is introduced.
- [ ] Browser-component regression coverage exercises complete dollar/share Buy and Sell journeys, side resets, initial values, accessible interactions, and narrow-viewport usability.
- [ ] A documented manual sandbox acceptance pass verifies small Buy and Sell Orders, Activity navigation, and honest Alpaca status presentation without adding automated Alpaca mutations.
