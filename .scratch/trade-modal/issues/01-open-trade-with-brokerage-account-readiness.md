# 01 — Open Trade with Brokerage Account readiness

**What to build:** Make the sidebar Trade action open an accessible Buy-first modal that either starts a fresh Order flow or explains why the current Brokerage Account cannot place Orders.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] Clicking the sidebar Trade button opens a modal with Buy selected by default.
- [ ] A User with a linked, order-capable Brokerage Account sees the initial Buy form rather than an unavailable state.
- [ ] Missing, pending, failed, and unknown Brokerage Account states each produce clear status-specific unavailable content with no actionable Order form.
- [ ] Alpaca account restrictions that prevent Orders produce an explanatory unavailable state with no actionable Order form.
- [ ] Account identity and restrictions are derived from the authenticated User; no Alpaca account identifier is accepted from the browser.
- [ ] Closing and reopening the modal starts a fresh Buy flow.
- [ ] The dialog has correct focus management, accessible naming, keyboard close behavior, and reasonable narrow-viewport scrolling.
- [ ] Server-unit and browser-component tests cover ready and unavailable states plus sidebar opening and reset behavior.
