export function normalizeOrderSymbol(symbol: unknown) {
  return typeof symbol === "string" ? symbol.trim().toUpperCase() : ""
}

export function isOrderSymbol(symbol: string) {
  return /^[A-Z0-9.-]{1,32}$/.test(symbol)
}

export function dollarAmountError(amount: string) {
  if (!amount) return "Enter a dollar amount."
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(amount)) {
    return "Enter a positive dollar amount with no more than two decimal places."
  }
  if (amount.startsWith("0")) return "Enter at least $1.00."
  return null
}

export function exceedsBuyingPower(amount: string, buyingPower: string) {
  const [amountWhole, amountFraction = ""] = amount.split(".")
  const [powerWhole, powerFraction = ""] = buyingPower.split(".")
  if (
    !/^\d+$/.test(amountWhole + amountFraction + powerWhole + powerFraction)
  ) {
    return true
  }
  const scale = Math.max(amountFraction.length, powerFraction.length)
  const scaled = (whole: string, fraction: string) =>
    BigInt(whole + fraction.padEnd(scale, "0"))
  return scaled(amountWhole, amountFraction) > scaled(powerWhole, powerFraction)
}
