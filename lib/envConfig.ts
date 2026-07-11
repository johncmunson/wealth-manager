import { readFileSync, statSync } from "node:fs"
import path from "node:path"
import { loadEnvConfig, processEnv, type LoadedEnvFiles } from "@next/env"

// If you need to load environment variables outside of the Next.js runtime,
// such as in a root config file for an ORM or test runner...
// https://nextjs.org/docs/app/guides/environment-variables#loading-environment-variables-with-nextenv

const projectDir = process.cwd()

function loadCustomEnv(files: string[]) {
  const loadedEnvFiles: LoadedEnvFiles = []

  for (const file of files) {
    const fullPath = path.join(projectDir, file)

    try {
      const stat = statSync(fullPath)
      if (stat.isFile() || stat.isFIFO()) {
        loadedEnvFiles.push({
          path: file,
          contents: readFileSync(fullPath, "utf8"),
          env: {},
        })
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error
      }
    }
  }

  processEnv(loadedEnvFiles, projectDir)
}

if (process.env.APP_ENV === "staging") {
  // Enables running db migrations against the staging database from a local machine, e.g. `pnpm db:migrate:staging`
  loadCustomEnv([".env.staging.local", ".env.staging"])
} else {
  loadEnvConfig(projectDir, process.env.NODE_ENV === "development")
}
