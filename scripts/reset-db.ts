import "../lib/envConfig"
import { Pool } from "pg"
import { assertDatabaseTarget, getDatabaseTarget } from "../lib/databaseTarget"

const databaseTarget = getDatabaseTarget()

if (databaseTarget === "production") {
  throw new Error("Production database resets are not supported.")
}

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not configured.")
}

assertDatabaseTarget(databaseUrl, databaseTarget)

// Keep database tooling independent from the application's runtime pool lifecycle.
const pool = new Pool({ connectionString: databaseUrl, max: 1 })

try {
  const result = await pool.query<{ tableName: string }>(`
       SELECT format('%I.%I', schemaname, tablename) AS "tableName"
       FROM pg_tables
       WHERE schemaname = 'public'
     `)

  if (result.rows.length > 0) {
    const tables = result.rows.map(({ tableName }) => tableName).join(", ")

    await pool.query(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`)
  }
} finally {
  await pool.end()
}
