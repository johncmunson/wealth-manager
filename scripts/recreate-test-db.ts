import "../lib/envConfig"

import { Pool } from "pg"

import { assertDatabaseTarget } from "../lib/databaseTarget"

if (process.env.NODE_ENV !== "test") {
  throw new Error("The test database can only be recreated with NODE_ENV=test.")
}

const databaseUrl =
  process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error("DATABASE_URL_UNPOOLED or DATABASE_URL is required.")
}

assertDatabaseTarget(databaseUrl, "test")

async function recreateTestDatabase() {
  const pool = new Pool({ connectionString: databaseUrl, max: 1 })

  try {
    // The endpoint allowlist above proves this is the dedicated test database
    // before either schema can be removed. Generated migrations recreate all
    // application objects after this script exits.
    await pool.query("DROP SCHEMA IF EXISTS drizzle CASCADE")
    await pool.query("DROP SCHEMA IF EXISTS public CASCADE")
    await pool.query("CREATE SCHEMA public")
  } finally {
    await pool.end()
  }
}

void recreateTestDatabase()
