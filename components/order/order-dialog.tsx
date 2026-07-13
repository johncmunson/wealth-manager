"use client"

import { useRef, useState } from "react"
import { CircleAlert, LoaderCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import type { OrderSnapshot } from "@/lib/alpaca/orders"

const unavailableContent = {
  missing: {
    title: "Brokerage Account required",
    description:
      "A Brokerage Account must be linked before you can place Orders.",
  },
  pending: {
    title: "Brokerage Account is being prepared",
    description:
      "Provisioning is still in progress. Try again after the account is linked.",
  },
  failed: {
    title: "Brokerage Account unavailable",
    description:
      "Provisioning did not complete, so Orders cannot be placed right now.",
  },
  unknown: {
    title: "Brokerage Account status unavailable",
    description:
      "Account readiness could not be verified. Try again later before placing an Order.",
  },
  inactive: {
    title: "Brokerage Account is not active",
    description:
      "Alpaca has not marked this Brokerage Account active for Orders.",
  },
  "account-blocked": {
    title: "Brokerage Account is blocked",
    description:
      "Alpaca has blocked this Brokerage Account, so Orders cannot be placed.",
  },
  "trading-blocked": {
    title: "Orders are blocked",
    description:
      "Alpaca has restricted this Brokerage Account from placing Orders.",
  },
  suspended: {
    title: "Orders are suspended",
    description: "Order activity is suspended for this Brokerage Account.",
  },
} as const

function BuyForm() {
  return (
    <form aria-label="Buy order" className="flex flex-col gap-5">
      <FieldSet>
        <FieldLegend>Buy</FieldLegend>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="order-symbol">Symbol</FieldLabel>
            <Input
              autoFocus
              id="order-symbol"
              name="symbol"
              autoComplete="off"
              placeholder="e.g. VTI"
            />
          </Field>
        </FieldGroup>
      </FieldSet>
      <Button disabled type="submit">
        Continue
      </Button>
    </form>
  )
}

function UnavailableState({
  accountState,
}: {
  accountState: Exclude<OrderSnapshot["accountState"], "ready">
}) {
  const content = unavailableContent[accountState]

  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CircleAlert />
        </EmptyMedia>
        <EmptyTitle>
          <h2>{content.title}</h2>
        </EmptyTitle>
        <EmptyDescription>{content.description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

export function OrderDialog({
  readOrderSnapshotAction,
}: {
  readOrderSnapshotAction: () => Promise<OrderSnapshot>
}) {
  const requestId = useRef(0)
  const [open, setOpen] = useState(false)
  const [snapshot, setSnapshot] = useState<OrderSnapshot>()

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    setSnapshot(undefined)
    const currentRequest = ++requestId.current

    if (!nextOpen) return

    void readOrderSnapshotAction()
      .catch((): OrderSnapshot => ({ accountState: "unknown" }))
      .then((nextSnapshot) => {
        if (currentRequest === requestId.current) setSnapshot(nextSnapshot)
      })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button className="h-12 w-full" />}>
        Trade
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Place an order</DialogTitle>
          <DialogDescription>
            Buy an Asset through your Brokerage Account.
          </DialogDescription>
        </DialogHeader>
        {!snapshot ? (
          <div className="flex items-center gap-2 py-8" role="status">
            <LoaderCircle className="animate-spin" />
            Checking Brokerage Account…
          </div>
        ) : snapshot.accountState === "ready" ? (
          <BuyForm />
        ) : (
          <UnavailableState accountState={snapshot.accountState} />
        )}
      </DialogContent>
    </Dialog>
  )
}
