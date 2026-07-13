"use client"

import { useActionState, useState, useTransition } from "react"
import {
  ArrowDownLeft,
  ArrowUpRight,
  DollarSign,
  Landmark,
  RefreshCw,
} from "lucide-react"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Separator } from "@/components/ui/separator"
import {
  depositFunding,
  prepareFunding,
  withdrawFunding,
  type TransferFundingActionState,
} from "@/app/app/funding/actions"
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
    <Card className="bg-muted/50">
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

const positiveWholeDollars = /^[1-9]\d*$/
const positiveUsd = /^(?:[1-9]\d*(?:\.\d{1,2})?|0\.(?:0[1-9]|[1-9]\d?))$/
const maxTransferAmountLength = 32

function formatUsd(value: string) {
  const [whole, fraction = ""] = value.split(".")
  return `$${BigInt(whole).toLocaleString("en-US")}.${fraction.padEnd(2, "0")}`
}

function compareDecimals(left: string, right: string) {
  const [leftWhole, leftFraction = ""] = left.split(".")
  const [rightWhole, rightFraction = ""] = right.split(".")
  const scale = Math.max(leftFraction.length, rightFraction.length)
  const leftUnits = BigInt(leftWhole + leftFraction.padEnd(scale, "0"))
  const rightUnits = BigInt(rightWhole + rightFraction.padEnd(scale, "0"))
  return leftUnits < rightUnits ? -1 : leftUnits > rightUnits ? 1 : 0
}

function TransferDialog({
  kind,
  disabled,
  withdrawableCash,
}: {
  kind: "deposit" | "withdrawal"
  disabled: boolean
  withdrawableCash?: string | null
}) {
  const withdrawal = kind === "withdrawal"
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState("")
  const [reviewing, setReviewing] = useState(false)
  const [error, setError] = useState<string>()
  const [result, setResult] = useState<TransferFundingActionState>()
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function setDialogOpen(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) {
      setAmount("")
      setReviewing(false)
      setError(undefined)
      setResult(undefined)
    }
  }

  function review(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (
      (withdrawal && amount.length > maxTransferAmountLength) ||
      !(withdrawal ? positiveUsd : positiveWholeDollars).test(amount)
    ) {
      setError(
        withdrawal
          ? "Enter a positive amount with no more than two decimal places."
          : "Enter a positive whole-dollar amount.",
      )
      return
    }
    if (
      withdrawal &&
      withdrawableCash !== undefined &&
      withdrawableCash !== null &&
      compareDecimals(amount, withdrawableCash) > 0
    ) {
      setError("Amount exceeds current Withdrawable Cash.")
      return
    }
    setError(undefined)
    setReviewing(true)
  }

  function confirm() {
    const formData = new FormData()
    formData.set("amount", amount)
    startTransition(async () => {
      const unknownResult = {
        status: "unknown" as const,
        message: `${withdrawal ? "Withdrawal" : "Deposit"} outcome is unknown. Check recent Transfers before trying again.`,
      }
      try {
        const nextResult = await (
          withdrawal ? withdrawFunding : depositFunding
        )(undefined, formData)
        setResult(nextResult ?? unknownResult)
        if (!nextResult) router.refresh()
      } catch {
        setResult(unknownResult)
        router.refresh()
      }
    })
  }

  const noun = withdrawal ? "withdrawal" : "deposit"
  const finished = result?.status === "success" || result?.status === "unknown"
  const formId = `${noun}-entry`

  return (
    <Dialog open={open} onOpenChange={setDialogOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant={withdrawal ? "outline" : "default"}
            disabled={disabled}
          />
        }
      >
        {withdrawal ? "Withdraw" : "Add funds"}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {result?.status === "success"
              ? withdrawal
                ? "Withdrawal submitted"
                : "Deposit submitted"
              : result?.status === "unknown"
                ? `${withdrawal ? "Withdrawal" : "Deposit"} status unknown`
                : reviewing
                  ? `Review ${noun}`
                  : withdrawal
                    ? "Withdraw funds"
                    : "Add funds"}
          </DialogTitle>
          <DialogDescription
            role={result?.status === "success" ? "status" : undefined}
          >
            {result?.status === "success"
              ? result.message
              : result?.status === "unknown"
                ? "The request may have reached Alpaca."
                : reviewing
                  ? `Confirm this one-time simulated ACH ${noun}.`
                  : withdrawal
                    ? "Enter a positive amount with no more than two decimal places."
                    : "Enter a positive whole-dollar amount."}
          </DialogDescription>
        </DialogHeader>

        {finished ? null : reviewing ? (
          <dl className="flex flex-col gap-3">
            <div>
              <dt className="text-muted-foreground">Amount</dt>
              <dd className="text-xl font-semibold tabular-nums">
                {formatUsd(amount)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Funding Source</dt>
              <dd>Chase Checking •••• 4242</dd>
            </div>
          </dl>
        ) : (
          <form id={formId} onSubmit={review}>
            <FieldGroup>
              <Field data-invalid={Boolean(error)}>
                <FieldLabel htmlFor={`${noun}-amount`}>Amount</FieldLabel>
                <InputGroup>
                  <InputGroupAddon>
                    <DollarSign aria-hidden="true" />
                  </InputGroupAddon>
                  <InputGroupInput
                    id={`${noun}-amount`}
                    name="amount"
                    type="text"
                    inputMode={withdrawal ? "decimal" : "numeric"}
                    autoComplete="off"
                    autoFocus
                    value={amount}
                    aria-invalid={Boolean(error)}
                    aria-describedby={`${noun}-help`}
                    onChange={(event) => setAmount(event.target.value)}
                  />
                </InputGroup>
                <FieldDescription id={`${noun}-help`} className="text-xs">
                  {withdrawal && withdrawableCash !== undefined ? (
                    <>
                      Available to withdraw: <Money value={withdrawableCash} />
                      <br />
                    </>
                  ) : null}
                  Funds are transferring {withdrawal ? "to" : "from"}:
                  <br />
                  Chase Checking •••• 4242
                </FieldDescription>
                <FieldError>{error}</FieldError>
              </Field>
            </FieldGroup>
          </form>
        )}

        {result && result.status !== "success" ? (
          <p role="alert" className="text-destructive">
            {result.message}
          </p>
        ) : null}

        <DialogFooter>
          {finished ? (
            <Button type="button" onClick={() => setDialogOpen(false)}>
              Close
            </Button>
          ) : reviewing ? (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => {
                  setReviewing(false)
                  setResult(undefined)
                }}
              >
                Back
              </Button>
              <Button type="button" disabled={pending} onClick={confirm}>
                {pending
                  ? `Submitting ${noun}…`
                  : `Confirm ${noun}`}
              </Button>
            </>
          ) : (
            <Button type="submit" form={formId}>
              Review {noun}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
      <div className="flex justify-end">
        <RefreshButton />
      </div>

      <Card className="bg-muted/50">
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

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle>
            <h2>Funding Source</h2>
          </CardTitle>
          {snapshot.fundingSource.state === "missing" ? null : (
            <CardDescription>{snapshot.fundingSource.name}</CardDescription>
          )}
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
            {prepareState?.status === "success" &&
            snapshot.fundingSource.state === "missing" ? (
              <p>{prepareState.message}</p>
            ) : null}
          </div>
          {prepareState?.status === "error" ? (
            <p role="alert" className="text-destructive">
              {prepareState.message}
            </p>
          ) : null}
          {snapshot.fundingSource.state === "ready" ? (
            <div className="flex gap-2">
              <TransferDialog
                kind="deposit"
                disabled={snapshot.transfersBlocked !== false}
              />
              <TransferDialog
                kind="withdrawal"
                disabled={
                  snapshot.transfersBlocked !== false ||
                  snapshot.balances.withdrawableCash === null
                }
                withdrawableCash={snapshot.balances.withdrawableCash}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="bg-muted/50">
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
