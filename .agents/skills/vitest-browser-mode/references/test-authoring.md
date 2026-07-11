## Core APIs

Use Browser Mode's native APIs rather than mixing in simulated interaction layers:

- `page` from `vitest/browser` for locating and interacting with elements
- `userEvent` from `vitest/browser` for keyboard and pointer interactions
- `expect.element(...)` for DOM assertions with built-in retry behavior

Avoid `@testing-library/user-event` in Browser Mode. It simulates events instead of driving the browser provider.

## Prefer User-Facing Queries

Reach for these in order:

1. `getByRole`
2. `getByLabelText`
3. `getByText`
4. `getByPlaceholder`
5. `getByTestId` as a fallback when semantics are not practical

This keeps tests closer to actual accessibility and user behavior.

## Test Behavior, Not Internals

Good Browser Mode tests:

- Assert what a user sees
- Trigger real interactions like click, fill, select, and keyboard input
- Cover loading, success, empty, and error states
- Check focus movement, accessibility attributes, and disabled/enabled state

Avoid:

- Reaching into component instance state
- Asserting implementation-specific CSS classes unless the class itself is part of the contract
- Mocking so much that the test no longer exercises real browser behavior

## Example: Generic DOM Test

```ts
import { expect, test } from 'vitest'
import { page } from 'vitest/browser'

import { renderProfileForm } from './render-profile-form'

test('updates the greeting after entering a name', async () => {
  renderProfileForm()

  await expect.element(
    page.getByText('Hi, my name is Alice'),
  ).toBeInTheDocument()

  await page.getByLabelText(/username/i).fill('Bob')

  await expect.element(
    page.getByText('Hi, my name is Bob'),
  ).toBeInTheDocument()
})
```

## Example: Framework Adapter

Prefer an official adapter when one exists:

- `vitest-browser-react`
- `vitest-browser-vue`
- `vitest-browser-svelte`
- `vitest-browser-angular`

React example:

```tsx
import { render } from 'vitest-browser-react'
import { expect, test } from 'vitest'

import { FetchButton } from './fetch-button'

test('loads the greeting and disables the button', async () => {
  const screen = await render(<FetchButton url="/greeting" />)

  await screen.getByRole('button', { name: /load greeting/i }).click()

  await expect.element(
    screen.getByRole('heading'),
  ).toHaveTextContent('hello there')
  await expect.element(
    screen.getByRole('button'),
  ).toBeDisabled()
})
```

`vitest-browser-react` returns locator-based utilities, so prefer `expect.element(...)` and locator interactions over `findBy*` plus raw DOM assertions. Read [vitest-browser-react.md](vitest-browser-react.md) for React-specific setup, cleanup behavior, `page.render(...)`, and `renderHook`.

## Unsupported Frameworks: Bridge Through Testing Library

When an official adapter does not exist, render with Testing Library and bridge back into Browser Mode:

```tsx
import { render } from '@testing-library/solid'
import { expect, test } from 'vitest'
import { page } from 'vitest/browser'

test('increments the counter', async () => {
  const { baseElement } = render(() => <Counter initialValue={0} />)
  const screen = page.elementLocator(baseElement)

  await expect.element(screen.getByText('Count: 0')).toBeInTheDocument()
  await screen.getByRole('button', { name: /increment/i }).click()
  await expect.element(screen.getByText('Count: 1')).toBeInTheDocument()
})
```

## Async Data and Network Boundaries

Prefer MSW for request mocking. It keeps the browser-side behavior realistic while isolating the network boundary.

```ts
import { http, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  http.get('/api/users/:id', ({ params }) => {
    return HttpResponse.json({ id: params.id, name: 'John Doe' })
  }),
)
```

Patterns:

- Use `expect.element` instead of manual sleeps for most async DOM assertions
- Override handlers per test to cover success and failure states
- Mock external requests, but keep the component rendering and interaction path real

## Accessibility Coverage

Browser Mode is especially valuable for:

- Focus management
- Keyboard navigation
- Dialog and modal behavior
- ARIA attributes that affect real browser accessibility behavior

Example:

```tsx
await userEvent.keyboard('{Tab}')
await expect.element(page.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
```

## Recommended Test Scope

Write Browser Mode tests for:

- Components with meaningful interactions
- Forms and validation flows
- Focus-sensitive UI such as popovers, dialogs, menus, and comboboxes
- Regressions that previously slipped through `jsdom` or `happy-dom`
- Visual checks where behavior and rendering both matter

Keep pure computation, schema logic, and server-only behavior in non-browser tests.
