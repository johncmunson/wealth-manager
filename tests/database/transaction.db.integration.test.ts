import { eq } from "drizzle-orm"
import { describe, expect, it } from "vitest"

import { db } from "../../db"
import { users } from "../../db/schema"

describe("transactions", () => {
  it("rolls back a failed transaction", async () => {
    const email = `rollback-${crypto.randomUUID()}@example.com`

    await expect(
      db.transaction(async (transaction) => {
        await transaction.insert(users).values({ name: "Rollback", email })
        throw new Error("cancel transaction")
      }),
    ).rejects.toThrow("cancel transaction")

    const persistedUsers = await db
      .select()
      .from(users)
      .where(eq(users.email, email))

    expect(persistedUsers).toHaveLength(0)
  })
})
