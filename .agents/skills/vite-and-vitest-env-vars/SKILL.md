---
name: vite-and-vitest-env-vars
description: A guide to environment variables and modes in Vite and Vitest, covering `.env` file loading, `VITE_` prefixes, built-in `import.meta.env` constants, security considerations, TypeScript IntelliSense, HTML replacements, loading priorities, and the differences between Vite modes and `NODE_ENV`.
---

# Environment Variables

Vitest exclusively autoloads environment variables prefixed with `VITE_` from `.env` files to maintain compatibility with frontend-related tests, adhering to Vite's established convention.

To load every environmental variable from `.env` files anyway, you can use the `loadEnv` method imported from `vite`:

**`vitest.config.ts`**

```ts
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

export default defineConfig(({ mode }) => ({
  test: {
    // mode defines what ".env.{mode}" file to choose if it exists
    env: loadEnv(mode, process.cwd(), ''),
  },
}))
```

# Env Variables and Modes

Vite exposes certain constants under the special `import.meta.env` object. These constants are defined as global variables during development and statically replaced at build time to make tree-shaking effective.

*Watch an interactive lesson on Scrimba.*

## Built-in Constants

Some built-in constants are available in all cases:

* `import.meta.env.MODE`: `{string}` — The mode the app is running in.
* `import.meta.env.BASE_URL`: `{string}` — The base URL the app is being served from. This is determined by the `base` config option.
* `import.meta.env.PROD`: `{boolean}` — Whether the app is running in production, either by running the development server with `NODE_ENV='production'` or running an app built with `NODE_ENV='production'`.
* `import.meta.env.DEV`: `{boolean}` — Whether the app is running in development. This is always the opposite of `import.meta.env.PROD`.
* `import.meta.env.SSR`: `{boolean}` — Whether the app is running on the server.

## Env Variables

Vite automatically exposes environment variables as strings under the `import.meta.env` object.

Variables prefixed with `VITE_` will be exposed in client-side source code after Vite bundling. To prevent accidentally leaking environment variables to the client, avoid using this prefix for sensitive values.

For example:

**`.env`**

```env
VITE_SOME_KEY=123
DB_PASSWORD=foobar
```

The parsed value of `VITE_SOME_KEY`—`"123"`—will be exposed on the client, but the value of `DB_PASSWORD` will not.

You can test this by adding the following to your code:

```js
console.log(import.meta.env.VITE_SOME_KEY) // "123"
console.log(import.meta.env.DB_PASSWORD) // undefined
```

To customize the environment-variable prefix, see the `envPrefix` option.

### Env Parsing

As shown above, `VITE_SOME_KEY` is a number but returns a string when parsed. The same behavior applies to Boolean environment variables.

Make sure to convert values to the desired type when using them in your code.

### Protecting Secrets

`VITE_*` variables should not contain sensitive information such as API keys. The values of these variables are bundled into your source code at build time.

For production deployments, consider using a backend server or serverless/edge functions to secure secrets properly.

## `.env` Files

Vite uses `dotenv` to load additional environment variables from the following files in your environment directory:

```text
.env                # Loaded in all cases
.env.local          # Loaded in all cases, ignored by Git
.env.[mode]         # Loaded only in the specified mode
.env.[mode].local   # Loaded only in the specified mode, ignored by Git
```

### Env Loading Priorities

An environment file for a specific mode, such as `.env.production`, has a higher priority than a generic file such as `.env`.

Vite always loads `.env` and `.env.local` in addition to the mode-specific `.env.[mode]` file. Variables declared in mode-specific files take precedence over those in generic files, but variables defined only in `.env` or `.env.local` remain available in the environment.

Environment variables that already exist when Vite is executed have the highest priority and will not be overwritten by `.env` files.

For example:

```bash
VITE_SOME_KEY=123 vite build
```

`.env` files are loaded when Vite starts. Restart the server after making changes.

### Bun Users

When using Bun, be aware that Bun automatically loads `.env` files before your script runs. This built-in behavior loads environment variables directly into `process.env` and can interfere with Vite's behavior because Vite respects existing `process.env` values.

See `oven-sh/bun#5515` for workarounds.

Vite also uses `dotenv-expand` to expand variables written in environment files. To learn more about the syntax, consult the `dotenv-expand` documentation.

To use `$` literally inside an environment value, escape it with `\`.

**`.env`**

```env
KEY=123
NEW_KEY1=test$foo   # test
NEW_KEY2=test\$foo  # test$foo
NEW_KEY3=test$KEY   # test123
```

### Ignoring Local `.env` Files

`.env.*.local` files are local-only and can contain sensitive variables. Add `*.local` to your `.gitignore` file to prevent them from being checked into Git.

## IntelliSense for TypeScript

By default, Vite provides type definitions for `import.meta.env` in `vite/client.d.ts`.

Although you can define custom environment variables in `.env.[mode]` files, you may want TypeScript IntelliSense for user-defined environment variables prefixed with `VITE_`.

To enable it, create a `vite-env.d.ts` file in the `src` directory and augment `ImportMetaEnv` as follows:

**`vite-env.d.ts`**

```ts
interface ViteTypeOptions {
  // By adding this line, you can make the type of ImportMetaEnv strict
  // to disallow unknown keys.
  // strictImportMetaEnv: unknown
}

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  // More environment variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

When your code relies on types from browser environments such as DOM and Web Workers, update the `lib` field in `tsconfig.json`.

**`tsconfig.json`**

```json
{
  "lib": ["WebWorker"]
}
```

### Imports Will Break Type Augmentation

If the `ImportMetaEnv` augmentation does not work, make sure that `vite-env.d.ts` does not contain any import statements.

See the TypeScript documentation for more information.

## HTML Constant Replacement

Vite also supports replacing constants in HTML files. Any property in `import.meta.env` can be used in HTML files with the special `%CONST_NAME%` syntax:

```html
<h1>Vite is running in %MODE%</h1>
<p>Using data from %VITE_API_URL%</p>
```

When an environment variable does not exist in `import.meta.env`, such as `%NON_EXISTENT%`, it is ignored and not replaced. This differs from `import.meta.env.NON_EXISTENT` in JavaScript, where it is replaced with `undefined`.

Because Vite is used by many frameworks, it is intentionally unopinionated about complex replacements such as conditionals.

Vite can be extended using an existing userland plugin or a custom plugin that implements the `transformIndexHtml` hook.

# Modes

By default:

* The development server—the `dev` command—runs in `development` mode.
* The `build` command runs in `production` mode.

When running `vite build`, Vite loads environment variables from `.env.production` when that file exists.

**`.env.production`**

```env
VITE_APP_TITLE=My App
```

In your app, you can render the title using:

```js
import.meta.env.VITE_APP_TITLE
```

In some cases, you may want to run `vite build` with a different mode to render a different title. Override the default mode by passing the `--mode` option.

For example, to build your app in staging mode:

```bash
vite build --mode staging
```

Then create a `.env.staging` file:

**`.env.staging`**

```env
VITE_APP_TITLE=My App (staging)
```

Because `vite build` runs a production build by default, you can also run a development build by using a different mode and `.env` configuration.

**`.env.testing`**

```env
NODE_ENV=development
```

## `NODE_ENV` and Modes

It is important to note that `NODE_ENV`—`process.env.NODE_ENV`—and modes are two different concepts.

The following commands affect `NODE_ENV` and the mode differently:

| Command                                              | `NODE_ENV`      | Mode            |
| ---------------------------------------------------- | --------------- | --------------- |
| `vite build`                                         | `"production"`  | `"production"`  |
| `vite build --mode development`                      | `"production"`  | `"development"` |
| `NODE_ENV=development vite build`                    | `"development"` | `"production"`  |
| `NODE_ENV=development vite build --mode development` | `"development"` | `"development"` |

The different values of `NODE_ENV` and mode are also reflected in the corresponding `import.meta.env` properties:

| Command                | `import.meta.env.PROD` | `import.meta.env.DEV` |
| ---------------------- | ---------------------: | --------------------: |
| `NODE_ENV=production`  |                 `true` |               `false` |
| `NODE_ENV=development` |                `false` |                `true` |
| `NODE_ENV=other`       |                `false` |                `true` |

| Command              | `import.meta.env.MODE` |
| -------------------- | ---------------------- |
| `--mode production`  | `"production"`         |
| `--mode development` | `"development"`        |
| `--mode staging`     | `"staging"`            |

### `NODE_ENV` in `.env` Files

`NODE_ENV=...` can be set in a command or in an `.env` file.

When `NODE_ENV` is specified in an `.env.[mode]` file, the mode can be used to control its value. However, `NODE_ENV` and modes remain separate concepts.

The primary benefit of setting `NODE_ENV=...` in the command is that it allows Vite to detect the value early. It also lets you read `process.env.NODE_ENV` in your Vite configuration because Vite can load environment files only after the configuration has been evaluated.
