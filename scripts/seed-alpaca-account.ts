import "../lib/envConfig"

function printDiagnostics(result: {
  requestId?: string
  code?: string | number
  detail?: string
}) {
  if (result.requestId) console.error(`Alpaca request ID: ${result.requestId}`)
  if (result.code !== undefined)
    console.error(`Alpaca error code: ${result.code}`)
  if (result.detail) console.error(`Alpaca detail: ${result.detail}`)
}

async function run() {
  const [email, amount, ...extra] = process.argv.slice(2)
  if (!email || !amount || extra.length > 0) {
    console.error("Usage: pnpm account:seed <user-email> <usd-amount>")
    process.exitCode = 1
    return
  }

  try {
    const { seedBrokerageAccount } =
      await import("../lib/alpaca/account-seeding")
    const result = await seedBrokerageAccount(email, amount)

    if (result.state === "executed") {
      console.log(
        `Account Seeding executed (${result.journalStatus}). Journal: ${result.journalId}. Buying Power: ${result.buyingPower ?? "unavailable"}.`,
      )
      printDiagnostics(result)
      return
    }

    const report = `Account Seeding ${result.state}: ${result.message}`
    if (result.state === "pending") console.warn(`Warning: ${report}`)
    else console.error(report)
    if (result.journalId) console.error(`Journal: ${result.journalId}`)
    if ("journalStatus" in result && result.journalStatus) {
      console.error(`Journal status: ${result.journalStatus}`)
    }
    printDiagnostics(result)
    process.exitCode = 1
  } catch {
    console.error(
      "Account Seeding could not start. Check the local environment and database configuration.",
    )
    process.exitCode = 1
  } finally {
    const { pool } = await import("../db")
    await pool.end()
  }
}

void run()
