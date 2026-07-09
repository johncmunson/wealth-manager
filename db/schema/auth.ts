import { sql } from "drizzle-orm"
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core"

import { identityPrimaryKey, timestamps } from "./_helpers"

/**
 * Core Better Auth tables only.
 *
 * App-specific tables that reference Better Auth users, such as `profiles`,
 * live in their own schema files so the Better Auth surface area stays clear.
 */
export const users = pgTable(
  "users",
  {
    id: identityPrimaryKey(),
    name: text().notNull(),
    email: text().notNull(),
    emailVerified: boolean().default(false).notNull(),
    image: text(),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("users_email_unique_idx").on(sql`LOWER(${table.email})`),
  ],
)

export const sessions = pgTable(
  "sessions",
  {
    id: identityPrimaryKey(),
    userId: integer()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    ipAddress: text(),
    userAgent: text(),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("sessions_token_unique").on(table.token),
    index("sessions_user_id_idx").on(table.userId),
  ],
)

export const accounts = pgTable(
  "accounts",
  {
    id: identityPrimaryKey(),
    userId: integer()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: text().notNull(),
    providerId: text().notNull(),
    accessToken: text(),
    refreshToken: text(),
    accessTokenExpiresAt: timestamp({ withTimezone: true }),
    refreshTokenExpiresAt: timestamp({ withTimezone: true }),
    scope: text(),
    idToken: text(),
    password: text(),
    ...timestamps(),
  },
  (table) => [
    index("accounts_user_id_idx").on(table.userId),
    uniqueIndex("accounts_provider_account_unique").on(
      table.providerId,
      table.accountId,
    ),
  ],
)

export const verifications = pgTable(
  "verifications",
  {
    id: identityPrimaryKey(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    ...timestamps(),
  },
  (table) => [index("verifications_identifier_idx").on(table.identifier)],
)
