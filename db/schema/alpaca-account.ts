import { sql } from "drizzle-orm"
import { check, integer, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core"

import { identityPrimaryKey, timestamps } from "./_helpers"
import { users } from "./auth"

export const alpacaProvisioningStatuses = [
  "pending",
  "linked",
  "failed",
  "unknown",
] as const

export type AlpacaProvisioningStatus =
  (typeof alpacaProvisioningStatuses)[number]

export const alpacaAccounts = pgTable(
  "alpaca_accounts",
  {
    id: identityPrimaryKey(),
    userId: integer()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    alpacaAccountId: text(),
    accountNumber: text(),
    provisioningStatus: text()
      .$type<AlpacaProvisioningStatus>()
      .default("pending")
      .notNull(),
    alpacaStatus: text(),
    failureReason: text(),
    requestId: text(),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("alpaca_accounts_user_id_unique").on(table.userId),
    uniqueIndex("alpaca_accounts_alpaca_account_id_unique").on(
      table.alpacaAccountId,
    ),
    check(
      "alpaca_accounts_provisioning_status_check",
      sql`${table.provisioningStatus} in ('pending', 'linked', 'failed', 'unknown')`,
    ),
  ],
)
