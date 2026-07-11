## Table of Contents

- [When to Use `vitest-browser-react`](#when-to-use-vitest-browser-react)
- [Prerequisites](#prerequisites)
- [Render Components](#render-components)
- [Use `page.render`](#use-pagerender)
- [Cleanup Model](#cleanup-model)
- [Test Hooks with `renderHook`](#test-hooks-with-renderhook)
- [Configure React Strict Mode](#configure-react-strict-mode)
- [Differences from `@testing-library/react`](#differences-from-testing-libraryreact)
- [Recommended Patterns](#recommended-patterns)
- [Common Pitfalls](#common-pitfalls)

## When to Use `vitest-browser-react`

Use `vitest-browser-react` for React component and hook tests in Vitest Browser Mode.

Prefer it over bridging through `@testing-library/react` when:

- The project already runs React in Browser Mode
- You want query results that are Browser Mode locators, not DOM nodes
- You want retryable assertions with `expect.element(...)`
- You want CDP-backed interactions without mixing in `@testing-library/user-event`
- You want a React-native `renderHook` helper in Browser Mode

This package is a lightweight wrapper around Vitest Browser Mode. It follows Testing Library principles, but its render result is built around locators and retryability instead of `findBy*` patterns.

Requires `vitest` 4.0.0 or higher.

## Prerequisites

- Enable Browser Mode in `vitest.config.ts`
- Keep React's Vite integration enabled, usually via `@vitejs/plugin-react`
- Import `render` or `renderHook` from `vitest-browser-react`
- Use `expect.element(...)` for DOM assertions
- Use interactions from locators or `userEvent` in `vitest/browser`

Minimal config:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    browser: {
      enabled: true,
      // add your provider config here
    },
  },
})
```

If React transforms seem broken, first verify the React Vite plugin is still enabled in the same config file as Browser Mode.

## Render Components

`render` is async. `await` it before interacting with the result.

```tsx
import { render } from 'vitest-browser-react'
import { expect, test } from 'vitest'

test('counter button increments the count', async () => {
  const screen = await render(<Counter count={1} />)

  await screen.getByRole('button', { name: 'Increment' }).click()

  await expect.element(screen.getByText('Count is 2')).toBeVisible()
})
```

Guidelines:

- Query by role, label, text, and accessible name first
- Interact through locators like `screen.getByRole(...).click()`
- Use `expect.element(locator)` instead of asserting on raw elements
- Prefer retryable assertions over manual waiting or sleeps

You usually do not need React's `act` in component tests. The library handles initial render and unmount flushing, while Browser Mode assertions keep retrying until the UI settles.

## Use `page.render`

`vitest-browser-react` can inject a `render` method onto `page`. This is useful when a codebase already centers test helpers around `page`, or when you want a single familiar entrypoint for locating and rendering.

Configure it with a setup file:

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    setupFiles: ['./setup-file.ts'],
    browser: {
      // ... your config
    },
  },
})
```

```ts
// setup-file.ts
import 'vitest-browser-react'
```

Then render through `page`:

```tsx
import { page } from 'vitest/browser'
import { test } from 'vitest'

test('renders through page', async () => {
  const screen = await page.render(<Counter count={1} />)

  await screen.cleanup()
})
```

Use this pattern when shared helpers already accept `page`, or when you want to make the React adapter available globally without repeating imports.

## Cleanup Model

Unlike `@testing-library/react`, the default `vitest-browser-react` entrypoint cleans up before a test starts, not after it ends. This makes the final rendered UI visible in the Browser Mode UI for debugging.

Practical implications:

- Most tests can just call `await render(...)` and let the default cleanup behavior work
- Call `await screen.cleanup()` when you want to unmount early inside a test
- Import from `vitest-browser-react/pure` if you need to disable the default auto-cleanup behavior and manage it yourself

Reach for the `pure` entrypoint when:

- A helper renders more than once and wants explicit lifetime control
- A test harness manages setup and teardown centrally
- You need `configure(...)` from the same entrypoint

## Test Hooks with `renderHook`

Use `renderHook` for isolated hook behavior that still needs real browser semantics or React runtime behavior.

```tsx
import { renderHook } from 'vitest-browser-react'
import { expect, test } from 'vitest'

test('increments the counter', async () => {
  const { result, act } = await renderHook(() => useCounter())

  await act(() => {
    result.current.increment()
  })

  expect(result.current.count).toBe(1)
})
```

Guidelines:

- `renderHook` is async; await it
- Use the returned `act` helper when a hook update must be wrapped
- Prefer component tests when the real contract is UI behavior rather than hook internals

## Configure React Strict Mode

Use the `pure` entrypoint to configure React-specific behavior:

```ts
import { configure } from 'vitest-browser-react/pure'

configure({
  reactStrictMode: true,
})
```

Enable Strict Mode when the app runs that way in production or development and you want tests to surface double-invocation issues earlier. Leave it off when the suite depends on single-render semantics and Strict Mode would create noise.

## Differences from `@testing-library/react`

Key differences:

- `render` returns Browser Mode locators and utilities, not Testing Library DOM handles
- Assertions should use `expect.element(locator)` instead of `findBy*` plus raw DOM assertions
- Interactions should use locator methods or `userEvent` from `vitest/browser`
- Cleanup happens before the next test by default, not after the current one

Testing Library style:

```ts
const button = await screen.findByRole('button')
expect(button).toBeVisible()
```

Browser Mode locator style:

```ts
await expect.element(page.getByRole('button')).toBeVisible()
```

The locator style is less flaky because Vitest can keep checking the element during the assertion, not only before it.

## Recommended Patterns

- Prefer `await render(...)` for React component tests in Browser Mode
- Name the result `screen` if that matches the team's Testing Library habits, but remember it is a locator-based wrapper
- Use `page.render(...)` only when the shared test setup benefits from a page-centric API
- Keep network mocking at the boundary with tools like MSW
- Assert visible outcomes, focus movement, disabled state, dialog semantics, and validation messages
- Move pure logic back to Node or `jsdom` tests when no real browser behavior is involved

## Common Pitfalls

- Forgetting to `await render(...)` or `await renderHook(...)`
- Importing `userEvent` from `@testing-library/user-event` instead of `vitest/browser`
- Treating locator results like DOM nodes
- Using `findBy*` habits when `expect.element(...)` is the better fit
- Missing `import 'vitest-browser-react'` in the setup file when relying on `page.render(...)`
- Assuming cleanup timing matches `@testing-library/react`
