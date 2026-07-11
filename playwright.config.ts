import { defineConfig, devices } from "@playwright/test"

import { loadE2EEnvironment } from "./tests/config/e2e-environment"

const port = 3100
const baseURL = `http://127.0.0.1:${port}`
const e2eEnvironment = loadE2EEnvironment()

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: true,
  reporter: "line",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `pnpm build && pnpm start --port ${port}`,
    url: baseURL,
    env: e2eEnvironment,
    reuseExistingServer: false,
    timeout: 180_000,
  },
})
