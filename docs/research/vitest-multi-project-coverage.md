# Vitest multi-project coverage

## Recommendation

The smallest reliable command for this repository is:

```bash
pnpm db:prepare:test && NODE_ENV=test pnpm exec vitest run --coverage
```

As a `package.json` script, the equivalent is:

```json
"test:coverage:all": "pnpm db:prepare:test && NODE_ENV=test vitest run --coverage"
```

This needs no Vitest config change. `vitest run` with no `--project` filter runs the configured projects; `--coverage` enables the root coverage configuration. The result is one process-wide report covering all selected projects, currently printed by the configured `text` reporter.

## Findings

- `vitest.config.ts` defines five projects: `unit-server`, `component`, `browser-component`, `database`, and `route` ([repo config](../../vitest.config.ts#L26-L103)). The current `test:coverage` script explicitly selects only `unit-server` and `component` ([package.json](../../package.json#L19-L27)), so it is not an all-project coverage command.
- Vitest's official Projects guide says `--project` is for running only a project and may be repeated to filter several projects; therefore omitting it is the reliable all-project invocation ([Projects: Running Tests](https://vitest.dev/guide/projects.html#running-tests)). The local `NODE_ENV=test pnpm exec vitest list --config vitest.config.ts` also listed tests under all five configured project names, including the Chromium browser project.
- Vitest explicitly documents that `coverage` is done for the whole process and is not a project-level option ([Projects: unsupported options](https://vitest.dev/guide/projects.html#configuration)). That is the relevant multi-project behavior for one combined report: do not run five separate commands and try to merge their outputs.
- The repository already selects V8 coverage and the `text` reporter at the root ([repo config](../../vitest.config.ts#L99-L102)). `--coverage` enables collection; the official CLI/config docs state coverage is disabled by default and that `coverage.reporter` controls the reporters ([CLI coverage options](https://vitest.dev/guide/cli.html#coverage-enabled), [coverage config](https://vitest.dev/config/coverage.html)).
- The browser project uses Playwright Chromium, headless mode, and one Chromium instance ([repo config](../../vitest.config.ts#L58-L75)). Vitest's official coverage guide says V8 coverage supports Node and Chromium-based browsers, collecting browser coverage through the Chrome DevTools Protocol ([V8 provider](https://vitest.dev/guide/coverage.html#v8-provider)). Thus this project's browser mode is compatible with the existing V8 provider; it would not be safe to generalize that to non-V8 browsers/environments.
- Database and route projects each load `tests/setup/database.ts` ([repo config](../../vitest.config.ts#L78-L96)). That setup requires `NODE_ENV=test`, both database URLs, and a test-target database ([database setup](../../tests/setup/database.ts#L1-L26)). The repository's ADR says database-backed commands recreate schemas at command startup and should not overlap ([ADR 0003](../adr/0003-share-one-dedicated-test-database.md)). Therefore the preparation prefix is part of reliability, not optional decoration; it also means this command is a destructive local test-database workflow and should not be run concurrently with another database-backed command.
- `vitest.config.ts` itself rejects any `NODE_ENV` other than `test` ([repo config](../../vitest.config.ts#L6-L10)), so the explicit environment assignment must remain in the script. The database setup independently enforces the same invariant.

## Scope and limitation

The command collects coverage for every Vitest project in this config, not Playwright's separate `test:e2e` suite. The existing root reporter is terminal-only (`text`). Add a file reporter or HTML reporter only if a persisted artifact is required; that is a reporting choice, not a multi-project selection workaround.

## Primary sources

- [Vitest Projects guide](https://vitest.dev/guide/projects.html)
- [Vitest Coverage guide](https://vitest.dev/guide/coverage.html)
- [Vitest coverage configuration reference](https://vitest.dev/config/coverage.html)
- [Vitest CLI reference](https://vitest.dev/guide/cli.html)
- Repository sources cited inline: [`package.json`](../../package.json), [`vitest.config.ts`](../../vitest.config.ts), [`tests/setup/database.ts`](../../tests/setup/database.ts), and [ADR 0003](../adr/0003-share-one-dedicated-test-database.md)
