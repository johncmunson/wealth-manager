---
name: vitest-browser-mode
description: Guidance and best practices for Vitest Browser Mode. Use when setting up or writing tests that run in a real browser with Vitest, choosing between Node/jsdom/happy-dom and Browser Mode, authoring component or visual regression tests with `vitest/browser`, configuring Playwright/WebdriverIO/preview providers, or handling Browser Mode limitations around mocking, spying, and browser-native behavior.
---

# Vitest Browser Mode

Use Browser Mode when a test needs real browser behavior, not just a simulated DOM.

## Choose the Right Test Layer

Use Browser Mode when you need:

- Real DOM behavior, focus management, accessibility semantics, or browser APIs
- Component tests with actual rendering and interaction behavior
- Visual regression via `toMatchScreenshot`
- Confidence that `window`, `document`, events, and rendering behave like a real browser

Prefer Node, `jsdom`, or `happy-dom` when you need:

- Fast tests for pure logic, server code, or non-visual utilities
- Broad unit coverage that does not depend on real browser behavior
- Tight feedback loops where browser startup cost would dominate

Prefer a full browser automation runner like Playwright, Cypress, or WebdriverIO when you need:

- Whole-app flows across routes, auth, and backend integration
- Multi-page navigation, cross-tab behavior, uploads/downloads, or deployment checks
- End-to-end confidence outside an isolated component or page harness

Important constraints:

- Browser Mode is still early. Keep critical end-to-end coverage in a dedicated browser automation tool.
- Prefer the `playwright` provider for serious local work and CI. Use `preview` only for quick local previews.
- Keep browser tests isolated and explicit, usually via a separate Vitest project or a `*.browser.test.ts` naming convention.

## Set Up Browser Mode

Start with `pnpx vitest init browser` when possible. If configuring manually:

1. Add a provider such as `@vitest/browser-playwright`.
2. Enable `test.browser.enabled`.
3. Define at least one browser instance.
4. Keep your framework's Vite plugin enabled in the same config.

Use mixed projects when you want both fast Node tests and real-browser tests:

```ts
import { defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['tests/**/*.test.ts'],
          exclude: ['tests/**/*.browser.test.ts'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'browser',
          include: ['tests/**/*.browser.test.ts'],
          browser: {
            enabled: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
})
```

## Write Good Browser Mode Tests

- Use `page`, `userEvent`, and `expect.element` from `vitest/browser`.
- Query the UI the way users experience it: role, label, text, and accessible name first.
- Test behavior and contracts, not implementation details or internal state.
- Prefer framework adapters such as `vitest-browser-react` when available. For React, `await render(...)` from `vitest-browser-react` so the result stays locator-based and Browser Mode-native.
- For unsupported frameworks, render with Testing Library and bridge with `page.elementLocator(baseElement)`.
- Use `userEvent` from `vitest/browser`, not `@testing-library/user-event`.
- Mock external services and network boundaries, but keep as much real rendering behavior as possible.

Minimal example:

```tsx
import { render } from 'vitest-browser-react'
import { expect, test } from 'vitest'

import { SignupForm } from './signup-form'

test('shows validation feedback for an invalid email', async () => {
  const screen = await render(<SignupForm />)

  await screen.getByLabelText(/email/i).fill('not-an-email')
  await screen.getByRole('button', { name: /submit/i }).click()

  await expect.element(
    screen.getByText(/please enter a valid email/i),
  ).toBeInTheDocument()
})
```

## Reach for These References

- Read [references/setup.md](references/setup.md) for provider choice, config patterns, CLI flags, and multi-browser setups.
- Read [references/vitest-browser-react.md](references/vitest-browser-react.md) for React-specific setup, `render` and `page.render`, cleanup behavior, `renderHook`, Strict Mode config, and differences from `@testing-library/react`.
- Read [references/test-authoring.md](references/test-authoring.md) for component-testing patterns, `page` usage, async testing, and framework integration.
- Read [references/visual-regression.md](references/visual-regression.md) for `toMatchScreenshot`, baselines, thresholds, and CI guidance.
- Read [references/limitations-debugging.md](references/limitations-debugging.md) for Browser Mode limitations, mocking caveats, and debugging strategies.
