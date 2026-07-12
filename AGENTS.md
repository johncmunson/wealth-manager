<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

<general-planning-workflow>

## Agent skills

### Issue tracker

Issues are tracked as local Markdown files under `.scratch/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Triage uses the five default canonical labels. See `docs/agents/triage-labels.md`.

### Domain docs

Domain documentation uses a single-context layout. See `docs/agents/domain.md`.

### Design mockups

Visual product direction lives in `.mockups/`. See `docs/agents/mockups.md`.

</general-planning-workflow>

## Additional Notes

- Use `pnpm` and/or `pnpx` as opposed to `npm` or `yarn`.
- A dev server will always be running for you at `http://localhost:3000`
- When launching `agent-browser` for this app, reuse the authenticated profile with `--profile ~/.agent-browser/profiles/wealth-manager`. **Alert the user** if you discover that the profile is no longer authenticated and coach them through restoring it:
  1. Have them sign in through their normal browser, then copy the `better-auth.session_token` value from DevTools → Application → Cookies → `http://localhost:3000`.
  2. Have them save only the value to `/tmp/wealth-manager-session-cookie` by running the following command: `bash -c 'umask 077; IFS= read -rsp "Paste session cookie value: " cookie && printf "%s" "$cookie" > /tmp/wealth-manager-session-cookie && printf "\nSaved.\n"'`
  3. Import it with `agent-browser cookies set` for `http://localhost:3000`, verify an authenticated page, and immediately delete the temporary file.
- The better-auth agent skills might mention URLs like this, `https://better-auth.com/docs/concepts/hooks`. However, `https://better-auth.com/docs` is not an LLM-friendly base URL. Use `https://better-auth.com/llms.txt/docs` as the base URL instead, e.g. `https://better-auth.com/llms.txt/docs/concepts/hooks`.
- When building frontend UI components and pages, **always** seek to leverage shadcn/ui components as the foundation
- **Never** mutate any of the foundational shadcn/ui components inside of `components/ui`
- If you ever need to run or execute Python, the command is `python3` and not `python`
- **Never** write db migrations manually. Instead, modify the db schema in `db/schema/` and then run `pnpm db:generate`. Sometimes it's okay to apply db migrations yourself using `pnpm db:migrate` and sometimes it's not. You'll need to use your best judgement and assess the risk. When in doubt, leave this to the user.
- At this time, we do not intend to use Plaid. It should be simple enough to fund sandbox Alpaca Brokerage accounts without using Plaid.
- Never use `--watch` when running tests. That is for the user to run only.
- This project does not use CI. All testing, linting, and other checks are performed locally.
- Be very careful when reading potentially massive files such as OpenAPI yaml specs. The risk is that you would blow out your context window if read in full. Prefer targeted `rg` and/or line ranges. Often, it can be advantagous to utilize a scout or researcher subagent (or a parallel fleet of them) for extracting out information from files like this. Alternatively, if the file is structured text such as JSON or YAML, sometimes a Python script could be helpful for filtering out information. These recommendations apply in general to any massive files that contain important context.
