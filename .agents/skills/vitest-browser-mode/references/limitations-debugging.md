## Know the Important Limitations

Browser Mode runs through the browser's native ESM implementation, which changes what Vitest can intercept compared to Node-based runners.

### Blocking Dialogs

Native blocking dialogs such as `alert()` and `confirm()` can hang browser execution, so Vitest provides default mocks for them.

Best practice:

- Avoid relying on native blocking dialogs in tests
- Mock them explicitly when behavior matters

## Spying on Module Exports

Do not use `vi.spyOn()` on imported ESM namespace objects in Browser Mode:

```ts
import * as module from './module'
import { vi } from 'vitest'

vi.spyOn(module, 'method')
```

This fails because the module namespace object is sealed in native ESM.

Use `vi.mock(..., { spy: true })` instead:

```ts
import * as module from './module'
import { vi } from 'vitest'

vi.mock('./module', { spy: true })

vi.mocked(module.method).mockImplementation(() => {
  return 'mocked'
})
```

If you need to influence exported variables, expose a mutator function instead of trying to patch the variable directly.

## Mock at the Right Boundary

In Browser Mode, prefer mocking:

- Network requests with MSW
- External services or adapters
- Child components only when isolation matters

Avoid mocking the browser itself unless the API is genuinely unavailable in the test environment.

## Debug in Headful Mode

When a test is hard to diagnose:

1. Temporarily run headful instead of headless
2. Open browser devtools
3. Inspect the rendered DOM and console output
4. Re-run the failing test in isolation

Temporary config:

```ts
browser: {
  enabled: true,
  headless: false,
}
```

## Lean on `expect.element`

Most async UI failures come from timing issues. Prefer retrying assertions over sleeps:

```ts
await expect.element(page.getByText('John Doe')).toBeInTheDocument()
```

Use fixed delays only as a last resort.

## Debug Selectors Systematically

When a query fails:

1. Try a stronger semantic query such as `getByRole`
2. Check whether the element is actually rendered but hidden
3. Check accessible name and label wiring
4. Fall back to `getByTestId` only if semantics are not practical

Example:

```ts
await expect.element(
  page.getByRole('button', { name: /submit/i }),
).toBeVisible()
```

## Common Causes of Flaky Browser Mode Tests

- Using Browser Mode for tests that should stay pure unit tests
- Depending on animations or layout that never settles
- Not isolating dynamic network data
- Mixing Testing Library interaction helpers with `vitest/browser`
- Letting visual tests run in inconsistent local environments

When the failure is about real user flow across pages or environments, move the test to Playwright or another dedicated end-to-end runner instead of forcing Browser Mode to cover everything.
