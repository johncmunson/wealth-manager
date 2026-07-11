import { loadEnvConfig } from "@next/env"

import { assertDatabaseTarget } from "../../lib/databaseTarget"

export function loadE2EEnvironment() {
  const environment = process.env as Record<string, string | undefined>
  const originalNodeEnvironment = environment.NODE_ENV
  environment.NODE_ENV = "test"
  loadEnvConfig(process.cwd())

  if (originalNodeEnvironment) {
    environment.NODE_ENV = originalNodeEnvironment
  } else {
    delete environment.NODE_ENV
  }

  const databaseUrl = process.env.DATABASE_URL
  const unpooledDatabaseUrl = process.env.DATABASE_URL_UNPOOLED

  if (!databaseUrl || !unpooledDatabaseUrl) {
    throw new Error(
      "E2E requires DATABASE_URL and DATABASE_URL_UNPOOLED from .env.test.local or CI.",
    )
  }

  // This guard runs before Playwright is allowed to build or start Next.js.
  assertDatabaseTarget(databaseUrl, "test")
  assertDatabaseTarget(unpooledDatabaseUrl, "test")

  return {
    NODE_ENV: "production",
    DATABASE_URL: databaseUrl,
    DATABASE_URL_UNPOOLED: unpooledDatabaseUrl,
    BETTER_AUTH_URL: "http://127.0.0.1:3100",
    BETTER_AUTH_SECRET: "e2e-only-secret-at-least-thirty-two-characters",
    GOOGLE_CLIENT_ID: "e2e-google-client-id",
    GOOGLE_CLIENT_SECRET: "e2e-google-client-secret",
  }
}
