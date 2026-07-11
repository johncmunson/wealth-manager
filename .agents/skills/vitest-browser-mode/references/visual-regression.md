## Use Visual Regression Selectively

Visual tests catch layout, styling, and rendering regressions that functional assertions miss. They are most valuable for:

- Shared design-system components
- Pages or sections with dense layout rules
- Regressions around responsive breakpoints
- UI that frequently breaks without throwing runtime errors

Do not turn every component test into a screenshot test. Keep the suite small and intentional.

## Basic Pattern

```ts
import { expect, test } from 'vitest'
import { page } from 'vitest/browser'

test('hero section looks correct', async () => {
  await expect(page.getByTestId('hero')).toMatchScreenshot('hero-section')
})
```

On first run, Vitest creates a baseline screenshot and fails the test so the baseline can be reviewed. Commit approved baselines.

## Prefer Element-Level Screenshots

Prefer:

```ts
await expect(page.getByTestId('product-card')).toMatchScreenshot()
```

Avoid full-page screenshots unless the whole page is the contract:

```ts
await expect(page).toMatchScreenshot()
```

Element-level screenshots reduce noise and unrelated failures.

## Stabilize the Environment

Visual tests are only trustworthy in a stable environment. Main causes of flakiness:

- Font rendering differences across OSes
- Varying browser versions
- Different viewport sizes
- Animations and transitions
- Dynamic content such as timestamps or random values

Recommended controls:

1. Use the same provider and browser version in CI
2. Set an explicit viewport
3. Disable animations
4. Mock or mask dynamic content
5. Keep visual tests in a consistent environment, preferably CI or a containerized/cloud browser setup

Viewport example:

```ts
await page.viewport(1280, 720)
```

Config example:

```ts
import { defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'

export default defineConfig({
  test: {
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [
        {
          browser: 'chromium',
          viewport: { width: 1280, height: 720 },
        },
      ],
    },
  },
})
```

## Tune Thresholds Carefully

Use `allowedMismatchedPixelRatio` rather than a hard pixel count when possible:

```ts
await expect(page.getByTestId('article-summary')).toMatchScreenshot({
  comparatorName: 'pixelmatch',
  comparatorOptions: {
    allowedMismatchedPixelRatio: 0.01,
  },
})
```

Increase thresholds only when you understand why the diff is noisy. Do not paper over unstable tests with large tolerances.

## Handle Dynamic Regions

When content is intentionally variable, either mock the source or mask the region:

```ts
await expect(page.getByTestId('profile')).toMatchScreenshot({
  screenshotOptions: {
    mask: [page.getByTestId('last-seen')],
  },
})
```

## Update Baselines Intentionally

Use:

```bash
pnpm test -- --update
```

Only update baselines when the UI change is intentional and reviewed.

## CI Guidance

Keep visual tests separate from fast unit tests. Good patterns:

- A dedicated `visual` Vitest project
- Separate scripts such as `test:unit` and `test:visual`
- Browser installation in CI before running visual tests

Example package scripts:

```json
{
  "scripts": {
    "test:unit": "vitest --project unit",
    "test:visual": "vitest --project visual"
  }
}
```

For large screenshot suites, consider Git LFS for baselines.
