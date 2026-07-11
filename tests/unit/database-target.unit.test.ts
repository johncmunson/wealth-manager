import { describe, expect, it } from "vitest"

import {
  assertDatabaseTarget,
  getDatabaseTarget,
} from "../../lib/databaseTarget"

describe("database target safety", () => {
  it("selects test from NODE_ENV", () => {
    expect(getDatabaseTarget({ NODE_ENV: "test" })).toBe("test")
  })

  it("selects staging only with the production tooling environment", () => {
    expect(
      getDatabaseTarget({ NODE_ENV: "production", APP_ENV: "staging" }),
    ).toBe("staging")
  })

  it.each([undefined, "development", "test"])(
    "rejects staging with NODE_ENV=%s",
    (nodeEnvironment) => {
      expect(() =>
        getDatabaseTarget({
          NODE_ENV: nodeEnvironment,
          APP_ENV: "staging",
        }),
      ).toThrow("APP_ENV=staging requires NODE_ENV=production")
    },
  )

  it("rejects a development endpoint for test operations", () => {
    expect(() =>
      assertDatabaseTarget(
        "postgres://user:secret@ep-young-hill-adjj74g1-pooler.c-2.us-east-1.aws.neon.tech/neondb",
        "test",
      ),
    ).toThrow("expected the test database endpoint")
  })
})
