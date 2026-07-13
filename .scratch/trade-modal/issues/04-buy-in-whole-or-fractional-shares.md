# 04 — Buy in whole or fractional shares

**What to build:** Extend the working Buy flow so a User can choose shares as well as dollars, with Alpaca fractionability controlling valid quantities and the review estimate.

**Blocked by:** 03 — Place a dollar Buy Order safely

**Status:** ready-for-agent

- [ ] Buy exposes an obvious dollars/shares selector.
- [ ] A fractionable Asset accepts a positive share quantity with up to nine decimal places.
- [ ] A non-fractionable Asset accepts positive whole shares only and disables dollar mode.
- [ ] Malformed, zero, negative, and over-precision quantities are rejected before review.
- [ ] Share values remain decimal strings rather than authoritative floating-point values.
- [ ] Shares mode shows an estimated dollar value using the latest side-appropriate quote and displays its timestamp.
- [ ] Review clearly identifies a share-denominated Market/Day Buy Order and preserves all execution-price and outside-hours caveats.
- [ ] Server placement revalidates account restrictions, Asset eligibility, fractionability, quote usability, and current Buying Power.
- [ ] The Alpaca request sends `qty` only; it never sends both `qty` and `notional`.
- [ ] Accepted, definitively rejected, and unknown share Buy outcomes behave consistently with the dollar Buy flow.
- [ ] No Max Buy shortcut or local Buying Power formula is introduced.
- [ ] Server-unit and browser-component tests cover amount-mode switching, fractional precision, whole-share enforcement, estimates, request construction, and placement outcomes.
