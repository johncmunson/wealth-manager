"use client"

import { useRef, useState } from "react"
import { CheckCircle2, CircleAlert, LoaderCircle } from "lucide-react"

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
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type {
  BuyAssetValidation,
  OrderQuote,
  OrderSnapshot,
} from "@/lib/alpaca/orders"
import {
  dollarAmountError,
  exceedsBuyingPower,
  normalizeOrderSymbol,
} from "@/lib/order-input"

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
})
const shares = new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 })
const quoteTime = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
})

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

type ValidationState = BuyAssetValidation | { readonly status: "pending" }

function Review({
  amount,
  validation,
  quote,
  onEdit,
}: {
  amount: string
  validation: Extract<BuyAssetValidation, { status: "valid" }>
  quote: OrderQuote
  onEdit: () => void
}) {
  const estimatedShares = Number(amount) / quote.askPrice

  return (
    <section aria-labelledby="review-heading" className="flex flex-col gap-5">
      <h2 id="review-heading" className="text-lg font-semibold">
        Review buy order
      </h2>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3">
        <dt className="text-muted-foreground">Side</dt>
        <dd>Buy</dd>
        <dt className="text-muted-foreground">Asset</dt>
        <dd>
          {validation.asset.symbol} — {validation.asset.name}
        </dd>
        <dt className="text-muted-foreground">Dollar amount</dt>
        <dd>{money.format(Number(amount))}</dd>
        <dt className="text-muted-foreground">Estimate</dt>
        <dd>Approximately {shares.format(estimatedShares)} shares</dd>
        <dt className="text-muted-foreground">Quote time</dt>
        <dd>{quoteTime.format(new Date(quote.timestamp))}</dd>
        <dt className="text-muted-foreground">Order type</dt>
        <dd>Market</dd>
        <dt className="text-muted-foreground">Duration</dt>
        <dd>Day</dd>
      </dl>
      <div className="flex flex-col gap-2 text-sm text-muted-foreground">
        <p>
          Regular market hours only. Outside regular hours, the Order waits for
          the next eligible session and may expire at that session&apos;s end.
        </p>
        <p>
          Execution price is not guaranteed. Applicable fees may affect the
          final value.
        </p>
      </div>
      <Button type="button" variant="outline" onClick={onEdit}>
        Edit order
      </Button>
    </section>
  )
}

function BuyForm({
  snapshot,
  validateBuyAssetAction,
  refreshBuyQuoteAction,
}: {
  snapshot: Extract<OrderSnapshot, { accountState: "ready" }>
  validateBuyAssetAction: (symbol: string) => Promise<BuyAssetValidation>
  refreshBuyQuoteAction: (symbol: string) => Promise<OrderQuote | null>
}) {
  const validationRequest = useRef(0)
  const [symbol, setSymbol] = useState("")
  const [validation, setValidation] = useState<ValidationState>()
  const [amount, setAmount] = useState("")
  const [reviewPending, setReviewPending] = useState(false)
  const [review, setReview] = useState(false)

  const validValidation = validation?.status === "valid" ? validation : null
  const quote = validValidation?.quote ?? null
  const amountError = amount ? dollarAmountError(amount) : null
  const buyingPowerError =
    amount && !amountError
      ? snapshot.buyingPower === null
        ? "Buying Power is unavailable."
        : exceedsBuyingPower(amount, snapshot.buyingPower)
          ? `This order exceeds your ${money.format(Number(snapshot.buyingPower))} Buying Power.`
          : null
      : null
  const quoteError =
    validValidation && !quote ? "A current ask quote is unavailable." : null
  const estimatedShares =
    amount && !amountError && quote ? Number(amount) / quote.askPrice : null
  const reviewBlocked =
    !validValidation ||
    !amount ||
    Boolean(amountError || buyingPowerError || quoteError || reviewPending)

  function handleSymbolChange(value: string) {
    validationRequest.current += 1
    setSymbol(value)
    setValidation(undefined)
  }

  function handleSymbolBlur() {
    const normalizedSymbol = normalizeOrderSymbol(symbol)
    setSymbol(normalizedSymbol)
    const request = ++validationRequest.current
    if (!normalizedSymbol) {
      setValidation({
        status: "invalid",
        symbol: "",
        reason: "Enter a Symbol.",
      })
      return
    }

    setValidation({ status: "pending" })
    void validateBuyAssetAction(normalizedSymbol)
      .catch((): BuyAssetValidation => ({
        status: "invalid",
        symbol: normalizedSymbol,
        reason: "This Symbol could not be validated right now.",
      }))
      .then((result) => {
        if (request === validationRequest.current) setValidation(result)
      })
  }

  async function handleReview() {
    if (reviewBlocked || !validValidation) return
    setReviewPending(true)
    const refreshedQuote = await refreshBuyQuoteAction(
      validValidation.asset.symbol,
    ).catch(() => null)
    setReviewPending(false)
    setValidation({ ...validValidation, quote: refreshedQuote })
    if (refreshedQuote) setReview(true)
  }

  if (review && validValidation && quote) {
    return (
      <Review
        amount={amount}
        validation={validValidation}
        quote={quote}
        onEdit={() => setReview(false)}
      />
    )
  }

  const invalidValidation = validation?.status === "invalid" ? validation : null
  const descriptionId = invalidValidation ? "order-symbol-error" : undefined

  return (
    <form
      aria-label="Buy order"
      className="flex flex-col gap-5"
      onSubmit={(event) => event.preventDefault()}
    >
      <FieldSet>
        <FieldLegend>Buy</FieldLegend>
        <FieldGroup>
          <Field data-invalid={Boolean(invalidValidation)}>
            <FieldLabel htmlFor="order-symbol">Symbol</FieldLabel>
            <InputGroup>
              <InputGroupInput
                autoFocus
                id="order-symbol"
                name="symbol"
                autoComplete="off"
                placeholder="e.g. VTI"
                value={symbol}
                disabled={reviewPending}
                aria-describedby={descriptionId}
                aria-invalid={Boolean(invalidValidation)}
                onChange={(event) => handleSymbolChange(event.target.value)}
                onBlur={handleSymbolBlur}
              />
              {validation?.status === "pending" ? (
                <InputGroupAddon align="inline-end">
                  <InputGroupText role="status" aria-label="Validating Symbol">
                    <LoaderCircle className="animate-spin" />
                  </InputGroupText>
                </InputGroupAddon>
              ) : validValidation ? (
                <InputGroupAddon align="inline-end">
                  <CheckCircle2
                    aria-label="Symbol valid"
                    className="text-success"
                  />
                </InputGroupAddon>
              ) : invalidValidation ? (
                <InputGroupAddon align="inline-end">
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <InputGroupButton
                          aria-label="Symbol is invalid"
                          className="text-destructive"
                          size="icon-xs"
                        />
                      }
                    >
                      <CircleAlert />
                    </TooltipTrigger>
                    <TooltipContent>
                      Why invalid: {invalidValidation.reason}
                    </TooltipContent>
                  </Tooltip>
                </InputGroupAddon>
              ) : null}
            </InputGroup>
            {invalidValidation ? (
              <span className="sr-only" id={descriptionId}>
                {invalidValidation.reason}
              </span>
            ) : null}
            {validValidation ? (
              <FieldDescription>{validValidation.asset.name}</FieldDescription>
            ) : null}
          </Field>

          {validValidation ? (
            <>
              <Field data-invalid={Boolean(amountError || buyingPowerError)}>
                <FieldLabel htmlFor="order-dollars">Dollar amount</FieldLabel>
                <InputGroup>
                  <InputGroupAddon>$</InputGroupAddon>
                  <InputGroupInput
                    id="order-dollars"
                    name="amount"
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="0.00"
                    value={amount}
                    disabled={reviewPending}
                    aria-describedby={
                      amountError || buyingPowerError
                        ? "order-amount-error"
                        : undefined
                    }
                    aria-invalid={Boolean(amountError || buyingPowerError)}
                    onChange={(event) => setAmount(event.target.value)}
                  />
                </InputGroup>
                <FieldError id="order-amount-error">
                  {amountError || buyingPowerError}
                </FieldError>
              </Field>

              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Buying Power</dt>
                <dd>
                  {snapshot.buyingPower === null
                    ? "Unavailable"
                    : money.format(Number(snapshot.buyingPower))}
                </dd>
                <dt className="text-muted-foreground">Latest ask</dt>
                <dd>{quote ? money.format(quote.askPrice) : "Unavailable"}</dd>
                <dt className="text-muted-foreground">Quote time</dt>
                <dd>
                  {quote
                    ? quoteTime.format(new Date(quote.timestamp))
                    : "Unavailable"}
                </dd>
                <dt className="text-muted-foreground">Estimated shares</dt>
                <dd>
                  {estimatedShares === null
                    ? "—"
                    : `${shares.format(estimatedShares)} shares`}
                </dd>
              </dl>
              {quoteError ? <FieldError>{quoteError}</FieldError> : null}
            </>
          ) : null}
        </FieldGroup>
      </FieldSet>
      <Button disabled={reviewBlocked} type="button" onClick={handleReview}>
        {reviewPending ? (
          <LoaderCircle data-icon="inline-start" className="animate-spin" />
        ) : null}
        {reviewPending ? "Refreshing quote…" : "Review buy order"}
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
  validateBuyAssetAction,
  refreshBuyQuoteAction,
}: {
  readOrderSnapshotAction: () => Promise<OrderSnapshot>
  validateBuyAssetAction: (symbol: string) => Promise<BuyAssetValidation>
  refreshBuyQuoteAction: (symbol: string) => Promise<OrderQuote | null>
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
          <BuyForm
            snapshot={snapshot}
            validateBuyAssetAction={validateBuyAssetAction}
            refreshBuyQuoteAction={refreshBuyQuoteAction}
          />
        ) : (
          <UnavailableState accountState={snapshot.accountState} />
        )}
      </DialogContent>
    </Dialog>
  )
}
