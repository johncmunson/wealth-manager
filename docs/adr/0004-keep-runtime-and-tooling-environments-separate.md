# Keep runtime and tooling environments separate

`NODE_ENV` retains its standard development, test, and production meanings, while `APP_ENV=staging` is only a selector for explicit local database tooling; deployed staging still runs as production. Application code relies on Next.js environment loading, non-Next tools use `@next/env`, and database commands fail rather than falling back across environments, keeping framework behavior conventional while making privileged local staging operations auditable.
