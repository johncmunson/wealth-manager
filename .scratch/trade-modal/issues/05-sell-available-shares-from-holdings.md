# 05 — Sell available shares from Holdings

**What to build:** Add a complete share-denominated Sell flow in which the User chooses an owned Tradable Asset and cannot sell more than Alpaca currently reports as available.

**Blocked by:** 04 — Buy in whole or fractional shares

**Status:** ready-for-agent

- [ ] Sell lists only long, Tradable Assets with positive Available-to-Sell Quantity from the User's Brokerage Account.
- [ ] Each selectable Holding shows Symbol, Asset name, and Available-to-Sell Quantity.
- [ ] The selector is searchable by Symbol or Asset name.
- [ ] A User with no selectable Holdings sees “Nothing available to sell” and an action to switch to Buy instead of an empty selector.
- [ ] The form accepts a positive share quantity up to Available-to-Sell Quantity, using whole or fractional precision according to Alpaca's Asset eligibility.
- [ ] Sell all switches to shares and populates the exact current Available-to-Sell Quantity.
- [ ] The estimate uses the latest side-appropriate Sell quote and clearly remains non-authoritative.
- [ ] Review identifies the Asset, available quantity, entered shares, estimate, Market/Day behavior, and applicable caveats.
- [ ] Immediately before placement, the server refreshes the Holding and enforces current `qty_available`, account restrictions, Asset eligibility, and quote usability.
- [ ] Placement sends a long `qty` Sell Market/Day Order and cannot initiate or increase a short position.
- [ ] Accepted, definitively rejected, and unknown Sell outcomes follow the established safe placement behavior.
- [ ] Non-tradable Holdings are omitted rather than presented as disabled edge cases.
- [ ] Server-unit and browser-component tests cover option mapping/search, empty state, open-Order quantity reservations, oversell prevention, Sell all, review, and placement outcomes.
