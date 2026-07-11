import { eq } from "drizzle-orm"
import { afterEach, describe, expect, it } from "vitest"

import { db } from "../../db"
import { profiles, users } from "../../db/schema"
import { createProfile } from "../fixtures/profile-route-handler"

const emailsToDelete: string[] = []

afterEach(async () => {
  for (const email of emailsToDelete.splice(0)) {
    await db.delete(users).where(eq(users.email, email))
  }
})

describe("profile route scaffold", () => {
  it("rejects malformed JSON without writing data", async () => {
    const response = await createProfile(
      new Request("http://test.local/profiles", {
        method: "POST",
        body: "{",
      }),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: "Malformed JSON" })
  })

  it("rejects invalid input", async () => {
    const response = await createProfile(
      new Request("http://test.local/profiles", {
        method: "POST",
        body: JSON.stringify({ email: "invalid", displayName: "" }),
      }),
    )

    expect(response.status).toBe(422)
  })

  it("returns the created profile and persists it", async () => {
    const email = `route-test-${crypto.randomUUID()}@example.com`
    emailsToDelete.push(email)

    const response = await createProfile(
      new Request("http://test.local/profiles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, displayName: "  Grace Hopper  " }),
      }),
    )
    const body = (await response.json()) as { profile: { id: number } }

    expect(response.status).toBe(201)

    const [persistedProfile] = await db
      .select({ displayName: profiles.displayName })
      .from(profiles)
      .where(eq(profiles.id, body.profile.id))

    expect(persistedProfile).toEqual({ displayName: "Grace Hopper" })
  })
})
