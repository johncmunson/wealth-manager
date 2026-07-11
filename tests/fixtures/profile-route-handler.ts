import { db } from "../../db"
import { profiles, users } from "../../db/schema"

/**
 * Test-only route composition scaffold. It keeps the route integration layer
 * executable until a production domain route replaces it, then this file and
 * its matching test can be removed together.
 */
export async function createProfile(request: Request): Promise<Response> {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Malformed JSON" }, { status: 400 })
  }

  if (
    !body ||
    typeof body !== "object" ||
    !("email" in body) ||
    typeof body.email !== "string" ||
    !("displayName" in body) ||
    typeof body.displayName !== "string" ||
    !body.email.includes("@") ||
    body.displayName.trim().length === 0
  ) {
    return Response.json({ error: "Invalid profile" }, { status: 422 })
  }

  const input = body as { displayName: string; email: string }
  const displayName = input.displayName.trim()

  const profile = await db.transaction(async (transaction) => {
    const [user] = await transaction
      .insert(users)
      .values({ name: displayName, email: input.email })
      .returning()
    const [createdProfile] = await transaction
      .insert(profiles)
      .values({ userId: user.id, displayName })
      .returning()

    return createdProfile
  })

  return Response.json({ profile }, { status: 201 })
}
