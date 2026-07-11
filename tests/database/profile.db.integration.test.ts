import { inArray } from "drizzle-orm"
import { afterEach, describe, expect, it } from "vitest"

import { db } from "../../db"
import { profiles, users } from "../../db/schema"

const createdUserIds: number[] = []

async function createUser(
  email = `db-test-${crypto.randomUUID()}@example.com`,
) {
  const [user] = await db
    .insert(users)
    .values({ name: "Database Test", email })
    .returning()

  createdUserIds.push(user.id)
  return user
}

afterEach(async () => {
  if (createdUserIds.length > 0) {
    await db.delete(users).where(inArray(users.id, createdUserIds.splice(0)))
  }
})

describe("profile persistence", () => {
  it("applies profile defaults and returns persisted data", async () => {
    const user = await createUser()

    const [profile] = await db
      .insert(profiles)
      .values({ userId: user.id, displayName: "Ada" })
      .returning()

    expect(profile).toMatchObject({
      userId: user.id,
      displayName: "Ada",
      baseCurrency: "USD",
      onboardingCompleted: false,
    })
  })

  it("enforces one profile per user", async () => {
    const user = await createUser()
    await db.insert(profiles).values({ userId: user.id })

    await expect(
      db.insert(profiles).values({ userId: user.id }),
    ).rejects.toBeDefined()
  })
})
