## Provider Choice

Choose the provider based on the job:

- `playwright`: Best default for most teams. Good local ergonomics, headless support, parallel execution, and strong CI fit.
- `webdriverio`: Use when the project already standardizes on WebDriver-based infrastructure or browser coverage.
- `preview`: Use only for quick local previews. Do not rely on it for CI or high-confidence interaction testing because it simulates events instead of using the browser automation channel.

If the project is starting from scratch, prefer Playwright.

## Installation

Use the built-in initializer when possible:

```bash
pnpx vitest init browser
```

Manual install example with Playwright:

```bash
pnpm add -D vitest @vitest/browser-playwright
```

For CI or headless browser execution, ensure the browser runtime is installed:

```bash
pnpm exec playwright install --with-deps --only-shell
```

## Minimal Configuration

```ts
import { defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'

export default defineConfig({
  test: {
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
    },
  },
})
```

Keep the framework's Vite plugin in the same config. Browser Mode runs through Vite, so missing framework plugins often show up as "the test renders nothing" or transform errors.

## Separate Browser Tests from Node Tests

Use `test.projects` when only some tests need a real browser. This keeps fast unit tests fast while making Browser Mode usage obvious.

Recommended conventions:

- Put browser tests under `tests/browser/`
- Or use `*.browser.test.ts` / `*.browser.spec.ts`
- Keep Node-only tests under `tests/unit/` or `*.unit.test.ts`

Example mixed config:

```ts
import { defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['tests/**/*.unit.test.ts'],
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

## Use Instances for Repeated Browser Coverage

Use `browser.instances` when the same browser tests should run against multiple browsers or slightly different injected setups. This usually gives better caching than duplicating whole projects.

```ts
import { defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'

export default defineConfig({
  test: {
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      instances: [
        { browser: 'chromium' },
        { browser: 'firefox' },
        { browser: 'webkit' },
      ],
    },
  },
})
```

If two instances use the same browser, assign a `name` so project filtering stays unambiguous.

## Headless and CLI

Useful commands:

```bash
pnpm test -- --browser=chromium
pnpm test -- --browser.headless
pnpm test -- --project browser
```

Notes:

- Headless mode requires Playwright or WebdriverIO, not `preview`.
- Vitest will not infer Browser Mode from `--browser` alone. Keep a `browser` config block in the config file.
- In watch mode, Vitest can open a browser UI for local debugging.

## Recommended Defaults

Start simple:

1. One `chromium` instance
2. `headless: true` in CI
3. Separate browser and non-browser test projects
4. Expand to Firefox/WebKit only when there is a compatibility risk worth the extra cost

This keeps Browser Mode targeted and fast enough to stay useful.
