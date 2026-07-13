# 01 — Open Trade with Brokerage Account readiness

**What to build:** Make the sidebar Trade action open an accessible Buy-first modal that either starts a fresh Order flow or explains why the current Brokerage Account cannot place Orders.

**Blocked by:** None — can start immediately

**Status:** resolved

- [x] Clicking the sidebar Trade button opens a modal with Buy selected by default.
- [x] A User with a linked, order-capable Brokerage Account sees the initial Buy form rather than an unavailable state.
- [x] Missing, pending, failed, and unknown Brokerage Account states each produce clear status-specific unavailable content with no actionable Order form.
- [x] Alpaca account restrictions that prevent Orders produce an explanatory unavailable state with no actionable Order form.
- [x] Account identity and restrictions are derived from the authenticated User; no Alpaca account identifier is accepted from the browser.
- [x] Closing and reopening the modal starts a fresh Buy flow.
- [x] The dialog has correct focus management, accessible naming, keyboard close behavior, and reasonable narrow-viewport scrolling.
- [x] Server-unit and browser-component tests cover ready and unavailable states plus sidebar opening and reset behavior.

## Answer

Implemented the sidebar Order dialog, authenticated Brokerage Account readiness read, status-specific unavailable states, fresh Buy flow behavior, and focused server/browser coverage.
