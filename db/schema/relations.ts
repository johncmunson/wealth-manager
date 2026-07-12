import { relations } from "drizzle-orm"

import { alpacaAccounts } from "./alpaca-account"
import { accounts, sessions, users } from "./auth"

export const usersRelations = relations(users, ({ many, one }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  alpacaAccount: one(alpacaAccounts),
}))

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}))

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}))

export const alpacaAccountsRelations = relations(alpacaAccounts, ({ one }) => ({
  user: one(users, {
    fields: [alpacaAccounts.userId],
    references: [users.id],
  }),
}))
