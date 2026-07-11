import "@/lib/envConfig"
import { defineConfig } from "drizzle-kit"
import { assertDatabaseTarget, getDatabaseTarget } from "@/lib/databaseTarget"

const databaseUrl =
  process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error(
    "drizzle.config.ts requires DATABASE_URL_UNPOOLED or DATABASE_URL to be set in the environment.",
  )
}

assertDatabaseTarget(databaseUrl, getDatabaseTarget())

export default defineConfig({
  schema: "./db/schema/index.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  casing: "snake_case",
  dbCredentials: {
    url: databaseUrl,
  },
})
