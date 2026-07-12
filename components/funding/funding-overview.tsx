"use client"

import { useActionState, useTransition } from "react"
import { ArrowDownLeft, ArrowUpRight, Landmark, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Separator } from "@/components/ui/separator"
import { prepareFunding } from "@/app/app/funding/actions"
import type { FundingSnapshot, FundingTransfer } from "@/lib/alpaca/funding"

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
})
const signedMoney = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  signDisplay: "exceptZero",
})
const date = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "UTC",
})

function Money({
  value,
  signed = false,
}: {
  value: string | null
  signed?: boolean
}) {
  if (value === null) return <span aria-label="Unavailable">—</span>
  return <>{(signed ? signedMoney : money).format(Number(value))}</>
}

function RefreshButton() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
    >
      <RefreshCw data-icon="inline-start" />
      {pending ? "Refreshing…" : "Refresh"}
    </Button>
  )
}

const unavailableCopy = {
  missing: [
    "Brokerage Account unavailable",
    "No Brokerage Account is linked to this User yet.",
  ],
  pending: [
    "Funding is being prepared",
    "Brokerage Account Provisioning is still pending. Transfer controls are unavailable.",
  ],
  failed: [
    "Funding unavailable",
    "Brokerage Account Provisioning failed. Transfer controls are unavailable.",
  ],
  unknown: [
    "Funding status needs verification",
    "The Brokerage Account Provisioning outcome is unknown. Transfer controls are unavailable.",
  ],
} as const

function UnavailableOverview({
  state,
}: {
  state: keyof typeof unavailableCopy
}) {
  const [title, description] = unavailableCopy[state]
  return (
    <Card>
      <CardContent>
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Landmark />
            </EmptyMedia>
            <EmptyTitle>{title}</EmptyTitle>
            <EmptyDescription>{description}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </CardContent>
    </Card>
  )
}

function TransferRow({ transfer }: { transfer: FundingTransfer }) {
  const incoming = transfer.direction === "INCOMING"
  const badgeVariant = ["REJECTED", "CANCELED", "RETURNED"].includes(
    transfer.status,
  )
    ? "destructive"
    : transfer.status === "COMPLETE"
      ? "secondary"
      : "outline"

  return (
    <dl className="grid grid-cols-2 items-center gap-3 py-4 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
      <div className="flex items-center gap-2">
        {incoming ? (
          <ArrowDownLeft aria-hidden="true" />
        ) : (
          <ArrowUpRight aria-hidden="true" />
        )}
        <div>
          <dt className="text-muted-foreground md:sr-only">Direction</dt>
          <dd>{incoming ? "Deposit" : "Withdrawal"}</dd>
        </div>
      </div>
      <div>
        <dt className="text-muted-foreground md:sr-only">Created</dt>
        <dd>{date.format(new Date(transfer.createdAt))}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground md:sr-only">Status</dt>
        <dd>
          <Badge variant={badgeVariant}>{transfer.statusLabel}</Badge>
        </dd>
      </div>
      <div className="text-right">
        <dt className="text-muted-foreground md:sr-only">Amount</dt>
        <dd className="font-medium tabular-nums">
          <Money value={transfer.signedAmount} signed />
        </dd>
      </div>
    </dl>
  )
}

export function FundingOverview({ snapshot }: { snapshot: FundingSnapshot }) {
  const [prepareState, prepareAction, preparing] = useActionState(
    prepareFunding,
    undefined,
  )

  if (snapshot.accountState !== "linked") {
    return <UnavailableOverview state={snapshot.accountState} />
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Funding</h1>
          <p className="text-muted-foreground">
            Review cash availability and simulated sandbox Transfers.
          </p>
        </div>
        <RefreshButton />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Cash availability</h2>
          </CardTitle>
          <CardDescription>
            Values are provided directly by Alpaca.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {snapshot.balancesError ? (
            <p role="alert" className="text-destructive">
              {snapshot.balancesError}
            </p>
          ) : null}
          <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">Buying Power</dt>
              <dd className="text-xl font-semibold tabular-nums">
                <Money value={snapshot.balances.buyingPower} />
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Withdrawable Cash</dt>
              <dd className="text-xl font-semibold tabular-nums">
                <Money value={snapshot.balances.withdrawableCash} />
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Cash</dt>
              <dd className="text-xl font-semibold tabular-nums">
                <Money value={snapshot.balances.cash} />
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Net pending</dt>
              <dd className="text-xl font-semibold tabular-nums">
                <Money value={snapshot.balances.netPending} signed />
              </dd>
            </div>
          </dl>
          {snapshot.transfersBlocked ? (
            <p role="status">
              Transfers are blocked for this Brokerage Account.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Funding Source</h2>
          </CardTitle>
          <CardDescription>{snapshot.fundingSource.name}</CardDescription>
          <CardAction className="flex items-center gap-2">
            {snapshot.fundingSource.state === "missing" ? (
              <form action={prepareAction}>
                <Button type="submit" disabled={preparing}>
                  {preparing ? "Preparing funding…" : "Prepare funding"}
                </Button>
              </form>
            ) : null}
            <Badge
              variant={
                snapshot.fundingSource.state === "ready"
                  ? "secondary"
                  : "outline"
              }
            >
              {snapshot.fundingSource.state === "ready"
                ? "Ready"
                : snapshot.fundingSource.state === "preparing"
                  ? "Preparing"
                  : snapshot.fundingSource.state === "missing"
                    ? "Not prepared"
                    : "Unavailable"}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div
            role={
              snapshot.fundingSource.error
                ? "alert"
                : snapshot.fundingSource.state === "ready"
                  ? undefined
                  : "status"
            }
          >
            <p>{snapshot.fundingSource.message}</p>
            {prepareState?.status === "success" ? (
              <p>{prepareState.message}</p>
            ) : null}
          </div>
          {prepareState?.status === "error" ? (
            <p role="alert" className="text-destructive">
              {prepareState.message}
            </p>
          ) : null}
          {snapshot.fundingSource.state === "preparing" ? (
            <div className="flex gap-2">
              <Button type="button" disabled>
                Deposit
              </Button>
              <Button type="button" variant="outline" disabled>
                Withdraw
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Recent Transfers</h2>
          </CardTitle>
          <CardDescription>Latest 10 Transfers, newest first.</CardDescription>
        </CardHeader>
        <CardContent>
          {snapshot.transfersError ? (
            <p role="alert" className="text-destructive">
              {snapshot.transfersError}
            </p>
          ) : snapshot.transfers.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>No Transfers yet</EmptyTitle>
                <EmptyDescription>
                  Recent deposits and withdrawals will appear here.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div>
              <div
                aria-hidden="true"
                className="hidden grid-cols-[1.3fr_1fr_1fr_1fr] gap-3 pb-2 text-sm text-muted-foreground md:grid"
              >
                <span>Direction</span>
                <span>Created</span>
                <span>Status</span>
                <span className="text-right">Amount</span>
              </div>
              {snapshot.transfers.map((transfer, index) => (
                <div key={transfer.id}>
                  {index === 0 ? null : <Separator />}
                  <TransferRow transfer={transfer} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
