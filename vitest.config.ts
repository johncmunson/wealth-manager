import { fileURLToPath } from "node:url"
import react from "@vitejs/plugin-react"
import { playwright } from "@vitest/browser-playwright"
import { defineConfig } from "vitest/config"

import "./lib/envConfig"

if (process.env.NODE_ENV !== "test") {
  throw new Error("Vitest must run with NODE_ENV=test.")
}

const sharedTestOptions = {
  clearMocks: true,
  restoreMocks: true,
  unstubEnvs: true,
  unstubGlobals: true,
} as const

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    projects: [
      {
        resolve: {
          alias: {
            "server-only": fileURLToPath(
              new URL("./tests/setup/server-only.ts", import.meta.url),
            ),
          },
        },
        test: {
          ...sharedTestOptions,
          name: "unit-server",
          environment: "node",
          include: ["**/*.unit.test.ts"],
        },
      },
      {
        plugins: [react()],
        resolve: {
          alias: {
            "@": fileURLToPath(new URL(".", import.meta.url)),
          },
        },
        test: {
          ...sharedTestOptions,
          name: "component",
          environment: "jsdom",
          include: ["**/*.component.test.tsx"],
          setupFiles: ["./tests/setup/component.ts"],
        },
      },
      {
        plugins: [react()],
        resolve: {
          alias: {
            "@": fileURLToPath(new URL(".", import.meta.url)),
          },
        },
        test: {
          ...sharedTestOptions,
          name: "browser-component",
          include: ["**/*.browser.test.tsx"],
          browser: {
            enabled: true,
            headless: true,
            screenshotFailures: false,
            provider: playwright(),
            instances: [{ browser: "chromium" }],
          },
        },
      },
      {
        test: {
          ...sharedTestOptions,
          name: "database",
          environment: "node",
          include: ["**/*.db.integration.test.ts"],
          setupFiles: ["./tests/setup/database.ts"],
          testTimeout: 15_000,
        },
      },
      {
        test: {
          ...sharedTestOptions,
          name: "route",
          environment: "node",
          include: ["**/*.route.integration.test.ts"],
          setupFiles: ["./tests/setup/database.ts"],
          testTimeout: 15_000,
        },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text"],
      exclude: ["components/ui/**", "tests/**"],
    },
  },
})
