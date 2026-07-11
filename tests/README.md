# Test suites

| Layer                | Pattern                       | Command               |
| -------------------- | ----------------------------- | --------------------- |
| Server unit          | `*.unit.test.ts`              | `pnpm test:unit`      |
| jsdom component      | `*.component.test.tsx`        | `pnpm test:component` |
| Browser component    | `*.browser.test.tsx`          | `pnpm test:browser`   |
| Database integration | `*.db.integration.test.ts`    | `pnpm test:database`  |
| Route integration    | `*.route.integration.test.ts` | `pnpm test:route`     |
| E2E                  | `tests/e2e/*.spec.ts`         | `pnpm test:e2e`       |

`pnpm test` runs the fast unit and jsdom suites. `pnpm test:integration`
runs both PostgreSQL integration projects, and `pnpm test:all` runs every layer.

Database-backed commands recreate the dedicated test database and then apply the
generated migrations. Both database URLs are checked against the reviewed test
Neon endpoint before any destructive operation or connection. E2E builds and
runs Next.js with `NODE_ENV=production`, but explicitly passes those validated
test database URLs to both commands.

The files under `tests/fixtures/` are temporary testing scaffolds. Delete the
profile route scaffold or dialog component together with its matching tests once
a production route or browser-sensitive component replaces it.
