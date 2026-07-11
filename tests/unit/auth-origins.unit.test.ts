import { describe, expect, it } from "vitest"

import { getAdditionalTrustedOrigins } from "../../lib/auth/origins"

describe("additional auth origins", () => {
  it("allows sibling loopback hosts on the same port", () => {
    expect(getAdditionalTrustedOrigins("http://localhost:3000")).toEqual([
      "http://127.0.0.1:3000",
      "http://[::1]:3000",
    ])
  })

  it("does not broaden trust for a deployed origin", () => {
    expect(getAdditionalTrustedOrigins("https://wealth.example.com")).toEqual(
      [],
    )
  })

  it("handles malformed configuration safely", () => {
    expect(getAdditionalTrustedOrigins("not a URL")).toEqual([])
  })
})
