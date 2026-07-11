export type DatabaseTarget = "development" | "test" | "staging" | "production"

type DatabaseEnvironment = {
  APP_ENV?: string
  NODE_ENV?: string
}

const databaseHosts: Record<DatabaseTarget, ReadonlySet<string>> = {
  development: new Set([
    "ep-young-hill-adjj74g1-pooler.c-2.us-east-1.aws.neon.tech",
    "ep-young-hill-adjj74g1.c-2.us-east-1.aws.neon.tech",
  ]),
  test: new Set([
    "ep-billowing-sea-adp5dsdb-pooler.c-2.us-east-1.aws.neon.tech",
    "ep-billowing-sea-adp5dsdb.c-2.us-east-1.aws.neon.tech",
  ]),
  staging: new Set([
    "ep-misty-bird-adbvidy6-pooler.c-2.us-east-1.aws.neon.tech",
    "ep-misty-bird-adbvidy6.c-2.us-east-1.aws.neon.tech",
  ]),
  production: new Set([
    "ep-green-snow-ad0k7vqp-pooler.c-2.us-east-1.aws.neon.tech",
    "ep-green-snow-ad0k7vqp.c-2.us-east-1.aws.neon.tech",
  ]),
}

export function getDatabaseTarget(
  environment: DatabaseEnvironment = process.env,
): DatabaseTarget {
  if (environment.APP_ENV === "staging") {
    return "staging"
  }

  switch (environment.NODE_ENV) {
    case "development":
    case "test":
    case "production":
      return environment.NODE_ENV
    default:
      throw new Error(
        "A database command requires NODE_ENV to be development, test, or production.",
      )
  }
}

export function assertDatabaseTarget(
  databaseUrl: string,
  target: DatabaseTarget,
): void {
  let hostname: string

  try {
    hostname = new URL(databaseUrl).hostname
  } catch {
    throw new Error(`The ${target} database URL is invalid.`)
  }

  if (!databaseHosts[target].has(hostname)) {
    throw new Error(
      `Refusing database operation: expected the ${target} database endpoint, but received ${hostname || "an empty hostname"}.`,
    )
  }
}
