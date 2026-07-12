import "server-only"

import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { nextCookies } from "better-auth/next-js"

import { db } from "@/db"
import * as schema from "@/db/schema"
import { ensureAlpacaAccount } from "@/lib/alpaca/account-provisioning"
import { getAdditionalTrustedOrigins } from "@/lib/auth/origins"

const googleClientId = process.env.GOOGLE_CLIENT_ID
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET

if (!googleClientId || !googleClientSecret) {
  throw new Error(
    "Missing required environment variables: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET",
  )
}

export const auth = betterAuth({
  appName: "Wealth Manager",
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: getAdditionalTrustedOrigins(process.env.BETTER_AUTH_URL),
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
    usePlural: true,
    transaction: true,
  }),
  advanced: {
    database: {
      generateId: "serial",
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  account: {
    encryptOAuthTokens: true,
    updateAccountOnSignIn: true,
  },
  socialProviders: {
    google: {
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const userId = Number(user.id)
          if (!Number.isSafeInteger(userId)) {
            console.error(
              "Could not provision Alpaca account: invalid user id.",
            )
            return
          }

          try {
            await ensureAlpacaAccount({ id: userId, email: user.email })
          } catch {
            // Authentication must succeed even when provisioning infrastructure fails.
            console.error(
              "Could not persist Alpaca account provisioning state.",
              {
                userId,
              },
            )
          }
        },
      },
    },
  },
  plugins: [nextCookies()],
})

export type AuthSession = typeof auth.$Infer.Session
