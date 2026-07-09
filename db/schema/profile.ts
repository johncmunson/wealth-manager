import {
  boolean,
  integer,
  pgTable,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core"

import { users } from "./auth"
import { identityPrimaryKey, timestamps } from "./_helpers"

export const profiles = pgTable(
  "profiles",
  {
    id: identityPrimaryKey(),
    userId: integer()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    displayName: text(),
    baseCurrency: text().default("USD").notNull(),
    onboardingCompleted: boolean().default(false).notNull(),
    ...timestamps(),
  },
  (table) => [uniqueIndex("profiles_user_id_unique").on(table.userId)],
)
