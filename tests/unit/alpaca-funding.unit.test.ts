import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  account: {
    alpacaAccountId: "account-123",
    provisioningStatus: "linked",
  } as { alpacaAccountId: string | null; provisioningStatus: string },
  request: vi.fn(),
  userId: vi.fn(async () => 42),
}))

vi.mock("../../lib/auth/session", () => ({ getCurrentUserId: mocks.userId }))
vi.mock("../../lib/alpaca/broker-client", () => ({
  alpacaBrokerRequest: mocks.request,
}))
vi.mock("../../db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({ limit: async () => [mocks.account] }),
      }),
    }),
  },
}))

import { getFundingSnapshot } from "../../lib/alpaca/funding"

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  })
}

function queueSnapshotResponses(
  account: unknown,
  relationships: unknown,
  transfers: unknown,
) {
  mocks.request
    .mockResolvedValueOnce(json(account))
    .mockResolvedValueOnce(json(relationships))
    .mockResolvedValueOnce(json(transfers))
}

beforeEach(() => {
  mocks.account = {
    alpacaAccountId: "account-123",
    provisioningStatus: "linked",
  }
})

describe("Funding snapshot", () => {
  it("maps Alpaca cash fields and derives signed pending Transfers", async () => {
    queueSnapshotResponses(
      {
        buying_power: "12840.00",
        cash_withdrawable: "9340.00",
        cash: "10340.00",
        transfers_blocked: false,
      },
      [{ id: "relationship-1", status: "APPROVED" }],
      [
        {
          id: "deposit",
          status: "PENDING",
          direction: "INCOMING",
          amount: "2500.00",
          created_at: "2026-07-02T12:00:00Z",
        },
        {
          id: "withdrawal",
          status: "APPROVED",
          direction: "OUTGOING",
          amount: "500.00",
          created_at: "2026-07-02T13:00:00Z",
        },
        {
          id: "complete",
          status: "COMPLETE",
          direction: "INCOMING",
          amount: "999.00",
          created_at: "2026-06-28T12:00:00Z",
        },
      ],
    )

    await expect(getFundingSnapshot()).resolves.toMatchObject({
      accountState: "linked",
      balances: {
        buyingPower: "12840.00",
        withdrawableCash: "9340.00",
        cash: "10340.00",
        netPending: "2000.00",
      },
      fundingSource: { state: "ready", name: "Chase Checking •••• 4242" },
      transfers: [
        { id: "withdrawal", signedAmount: "-500.00" },
        { id: "deposit", signedAmount: "2500.00" },
        { id: "complete", signedAmount: "999.00" },
      ],
    })
    expect(mocks.userId).toHaveBeenCalledOnce()
    expect(mocks.request).toHaveBeenCalledWith(
      "/v1/trading/accounts/account-123/account",
      expect.objectContaining({ cache: "no-store" }),
    )
  })

  it("accepts every documented status and includes only exact nonterminal statuses in pending net", async () => {
    queueSnapshotResponses(
      {},
      [],
      [
        "QUEUED",
        "APPROVAL_PENDING",
        "PENDING",
        "SENT_TO_CLEARING",
        "REJECTED",
        "CANCELED",
        "APPROVED",
        "COMPLETE",
        "RETURNED",
      ].map((status, index) => ({
        id: status,
        status,
        direction: index === 1 ? "OUTGOING" : "INCOMING",
        amount: "1.25",
        created_at: `2026-07-${String(index + 1).padStart(2, "0")}T12:00:00Z`,
      })),
    )

    const snapshot = await getFundingSnapshot()

    expect(snapshot).toMatchObject({
      accountState: "linked",
      balances: { netPending: "3.75" },
    })
    if (snapshot.accountState === "linked") {
      expect(snapshot.transfers.map(({ status }) => status)).toHaveLength(9)
    }
  })

  it("sorts Transfers locally and keeps only the latest 10", async () => {
    const transfers = Array.from({ length: 12 }, (_, index) => ({
      id: `transfer-${index + 1}`,
      status: "COMPLETE",
      direction: "INCOMING",
      amount: "10.00",
      created_at: `2026-06-${String(index + 1).padStart(2, "0")}T12:00:00Z`,
    })).reverse()
    queueSnapshotResponses({}, [], transfers)

    const snapshot = await getFundingSnapshot()

    if (snapshot.accountState !== "linked") throw new Error("Expected linked")
    expect(snapshot.transfers.map(({ id }) => id)).toEqual([
      "transfer-12",
      "transfer-11",
      "transfer-10",
      "transfer-9",
      "transfer-8",
      "transfer-7",
      "transfer-6",
      "transfer-5",
      "transfer-4",
      "transfer-3",
    ])
  })

  it("keeps optional Trading Account fields unavailable instead of inventing values", async () => {
    queueSnapshotResponses({}, [], [])

    await expect(getFundingSnapshot()).resolves.toMatchObject({
      accountState: "linked",
      balances: {
        buyingPower: null,
        withdrawableCash: null,
        cash: null,
        netPending: "0",
      },
      transfersBlocked: null,
    })
  })

  it.each([
    ["pending", "pending"],
    ["failed", "failed"],
    ["unknown", "unknown"],
  ])(
    "returns specific %s Provisioning state without calling Alpaca",
    async (state, expected) => {
      mocks.account = { alpacaAccountId: null, provisioningStatus: state }

      await expect(getFundingSnapshot()).resolves.toEqual({
        accountState: expected,
      })
      expect(mocks.request).not.toHaveBeenCalled()
    },
  )

  it.each([
    [[], "missing"],
    [[{ id: "source", status: "QUEUED" }], "preparing"],
    [[{ id: "source", status: "PENDING" }], "preparing"],
    [[{ id: "source", status: "REJECTED" }], "unavailable"],
    [[{ id: "source", status: "CANCEL_REQUESTED" }], "unavailable"],
  ])(
    "maps Funding Source readiness without hiding other sections",
    async (relationships, state) => {
      queueSnapshotResponses({ cash: "20.00" }, relationships, [])

      await expect(getFundingSnapshot()).resolves.toMatchObject({
        accountState: "linked",
        balances: { cash: "20.00" },
        fundingSource: { state },
        transfers: [],
      })
    },
  )

  it("selects the synthetic relationship instead of unrelated or older relationships", async () => {
    queueSnapshotResponses(
      {},
      [
        {
          id: "unrelated",
          status: "APPROVED",
          bank_account_number: "9999",
        },
        {
          id: "older-synthetic",
          status: "REJECTED",
          bank_account_number: "00004242",
        },
        {
          id: "current-synthetic",
          status: "QUEUED",
          bank_account_number: "••••4242",
        },
      ],
      [],
    )

    await expect(getFundingSnapshot()).resolves.toMatchObject({
      accountState: "linked",
      fundingSource: {
        state: "preparing",
        message: "Funding source is being prepared.",
      },
    })
  })

  it("isolates malformed or failed Alpaca sections behind useful feedback", async () => {
    queueSnapshotResponses(
      { cash: 10 },
      [{ id: "source", status: "NOT_A_STATUS" }],
      [{ id: "bad-transfer" }],
    )

    await expect(getFundingSnapshot()).resolves.toMatchObject({
      accountState: "linked",
      balances: {
        buyingPower: null,
        withdrawableCash: null,
        cash: null,
        netPending: null,
      },
      balancesError: "Cash availability could not be loaded from Alpaca.",
      fundingSource: {
        state: "unavailable",
        message: "The Funding Source could not be loaded from Alpaca.",
      },
      transfers: [],
      transfersError: "Recent Transfers could not be loaded from Alpaca.",
    })
  })

  it("does not expose raw Alpaca errors in snapshot feedback", async () => {
    mocks.request
      .mockResolvedValueOnce(json({ message: "secret internal detail" }, 500))
      .mockRejectedValueOnce(new Error("credential-shaped failure"))
      .mockResolvedValueOnce(json({ nope: true }))

    const snapshot = await getFundingSnapshot()
    const output = JSON.stringify(snapshot)

    expect(output).not.toContain("secret internal detail")
    expect(output).not.toContain("credential-shaped failure")
    expect(snapshot).toMatchObject({
      accountState: "linked",
      balancesError: "Cash availability could not be loaded from Alpaca.",
      fundingSource: { state: "unavailable" },
      transfersError: "Recent Transfers could not be loaded from Alpaca.",
    })
  })
})
