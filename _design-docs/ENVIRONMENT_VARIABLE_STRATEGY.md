# Environment Variable Strategy

## Objective

Use Next.js conventions wherever possible, with one narrow exception: local database tooling may explicitly select staging or production credential files. The system should be predictable, easy to audit, and safe against accidentally using a development, staging, or production database in tests.

## Principles

1. Application code reads configuration from `process.env`.
2. Next.js owns environment loading while the application is running.
3. Tools outside Next.js use `@next/env` so they follow the same conventions.
4. `APP_ENV` is a tooling selector, not an application runtime mode. `NODE_ENV` remains `development`, `test`, or `production`.
5. Only variables intentionally exposed to browsers use `NEXT_PUBLIC_`. Secrets never use `NEXT_PUBLIC_` or `VITE_`.
6. Existing process variables take precedence over files, allowing CI and hosting platforms to inject configuration explicitly.
7. Missing credentials must fail loudly; one environment must never silently fall back to another environment's credential file.

## Sources by environment

| Context                     | `NODE_ENV`                      | Credential source                                                        | Notes                                                                                                       |
| --------------------------- | ------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Local development           | `development`                   | `.env.local`                                                             | Loaded by Next.js and `@next/env`.                                                                          |
| Vitest unit/component       | `test`                          | Usually no secrets; `.env.test.local` only when required                 | Unit and component tests must not connect to a database.                                                    |
| Database/route integration  | `test`                          | `.env.test.local` or CI variables                                        | Must target the designated test Neon endpoint and pass a safety check before connecting or cleaning data.   |
| Playwright E2E              | App runs as `production`        | Explicit test/E2E variables passed to both `next build` and `next start` | Uses test-owned infrastructure while exercising a production Next.js build. Do not rely on `NODE_ENV=test`. |
| Deployed staging            | `production`                    | Vercel/platform variables                                                | The deployed app does not read local staging files.                                                         |
| Local staging DB tooling    | `production`, `APP_ENV=staging` | `.env.staging.local`                                                     | Narrow exception used for commands such as `pnpm db:migrate:staging`. No fallback to `.env.local`.          |
| Deployed production         | `production`                    | Vercel/platform variables                                                | Production secrets are managed by the platform.                                                             |
| Local production DB tooling | `production`                    | `.env.production.local`                                                  | Reserved for explicit production migration/check commands and treated as high risk.                         |

All real `*.local` files are ignored by Git. Matching `*.example` files document required keys without containing secrets.

## Tool behavior

### Next.js

Next.js loads its standard `.env*` files into `process.env`. Server-only variables remain private. Statically referenced `NEXT_PUBLIC_*` values are embedded during `next build`, so E2E and deployment builds must receive their intended public values at build time.

### Vitest

Vitest uses Vite internally, but this project must not treat Vite env loading as the application configuration system. Server-side test configuration should be loaded with `@next/env` before importing environment-dependent application modules. Separate test projects should require only the configuration needed by their layer.

### Playwright

Playwright does not load env files automatically. Its configuration should load or receive validated test credentials and pass them explicitly to the production-build web server. The same relevant values must be present for both `next build` and `next start`; changing `NEXT_PUBLIC_*` values after the build is ineffective.

### Drizzle

`drizzle.config.ts` loads environment variables before reading `DATABASE_URL_UNPOOLED` or `DATABASE_URL`. Standard development/test/production loading is handled with `@next/env`. `APP_ENV=staging` explicitly selects `.env.staging.local` for local staging commands. Staging must not fall back to `.env.local` if a key is missing.

## Database safety policy

Any test reset, migration setup, or destructive cleanup must validate the resolved database URL before importing `db/index.ts` or issuing SQL. Database names cannot identify the environment because Neon names each database `neondb`. Safety must instead be based on the Neon endpoint identity.

The shared helpers in `lib/databaseTarget.ts` resolve and enforce the expected target for development, test, staging, and production tooling. They:

- compares the parsed URL hostname against a small, explicit allowlist maintained in reviewed code;
- accepts only the pooled and direct forms of the expected environment's Neon endpoint;
- rejects endpoints belonging to another environment or any unknown host; and
- fails before Drizzle connects or a reset script imports the database pool.

The environment-agnostic `scripts/reset-db.ts` powers `db:reset`, `db:reset:test`, and `db:reset:staging`. It validates the selected endpoint before connecting and refuses production resets entirely. The database name and `NODE_ENV=test` are not sufficient proof that a database is safe to modify. Passwords and full connection URLs remain secret, but endpoint hostnames in the allowlist need not be.

### Shared test endpoint lifecycle

This project intentionally uses one Neon endpoint dedicated exclusively to automated tests. Local database-backed commands run one at a time and may recreate that endpoint's `public` and migration schemas before applying generated migrations. “Test-owned” refers to this dedicated endpoint; it does not require a new database or schema for every invocation.

Separate integration, route, and E2E commands must not be run concurrently against the shared endpoint. Tests within one prepared suite should use unique records and targeted cleanup rather than dropping schemas or broadly truncating tables. This is an operational constraint of the current local-only workflow, not a requirement to implement per-run or per-worker database provisioning.

If the project later introduces CI, sharding, overlapping database-backed commands, or multiple developers sharing the test endpoint, add cross-process locking or isolated database/schema targets before enabling that concurrency.

## Expected files

```text
.env.local.example
.env.test.local.example
.env.staging.local.example
.env.production.local.example
```

Local copies contain credentials and remain untracked. Environment-specific commands in `package.json` provide the auditable entry points; developers should not need to remember ad hoc combinations of flags.
