import { integer, timestamp } from "drizzle-orm/pg-core"

export function identityPrimaryKey() {
  return integer().primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 })
}

export function timestamps() {
  return {
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ withTimezone: true })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  }
}
