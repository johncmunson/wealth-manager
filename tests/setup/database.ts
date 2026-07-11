import "../../lib/envConfig"

import { afterAll } from "vitest"

import { assertDatabaseTarget } from "../../lib/databaseTarget"

if (process.env.NODE_ENV !== "test") {
  throw new Error("Database tests must run with NODE_ENV=test.")
}

for (const variableName of ["DATABASE_URL", "DATABASE_URL_UNPOOLED"] as const) {
  const databaseUrl = process.env[variableName]

  if (!databaseUrl) {
    throw new Error(`${variableName} is required for database tests.`)
  }

  assertDatabaseTarget(databaseUrl, "test")
}

afterAll(async () => {
  // Import lazily so target validation always occurs before a pool is created.
  // Setup hooks are file-scoped, so each isolated test file must own a Pool that
  // is not reused from a Vitest worker's globalThis after this hook ends it.
  const { pool } = await import("../../db")
  await pool.end()
})
