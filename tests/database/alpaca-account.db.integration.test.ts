import { inArray } from "drizzle-orm"
import { afterEach, describe, expect, it } from "vitest"

import { db } from "../../db"
import { alpacaAccounts, users } from "../../db/schema"

const createdUserIds: number[] = []

async function createUser() {
  const [user] = await db
    .insert(users)
    .values({
      name: "Brokerage Test",
      email: `brokerage-${crypto.randomUUID()}@example.com`,
    })
    .returning()

  createdUserIds.push(user.id)
  return user
}

afterEach(async () => {
  if (createdUserIds.length > 0) {
    await db.delete(users).where(inArray(users.id, createdUserIds.splice(0)))
  }
})

describe("Alpaca account linkage", () => {
  it("defaults to pending and enforces one account per user", async () => {
    const user = await createUser()
    const [account] = await db
      .insert(alpacaAccounts)
      .values({ userId: user.id })
      .returning()

    expect(account).toMatchObject({
      userId: user.id,
      provisioningStatus: "pending",
      alpacaAccountId: null,
    })

    await expect(
      db.insert(alpacaAccounts).values({ userId: user.id }),
    ).rejects.toBeDefined()
  })
})
