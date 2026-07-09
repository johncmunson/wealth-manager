<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

## Preferred Package Manager

Use `pnpm` and/or `pnpx` as opposed to `npm` or `yarn`.

## Web Access Policy

Use web access only via `curl` in the `bash` tool, and only for exact, direct URLs that are already known. In general, avoid fetching URLs unless you are specifically on a research mission or a URL seems highly relevant to the task at hand and the additional context is necessary to move forward.

Rules:

- Do **not** browse the open web.
- Do **not** use search engines, search-result pages, web search tools, or pi-web-access tools.
- Do **not** fetch anything other than URLs that appear to be HTML, markdown, or plaintext.
- Do **not** discover URLs by querying Google/Bing/DuckDuckGo/etc.
- Only fetch a URL when it is:
  - explicitly provided by the user,
  - present in the repository/config/docs being inspected, or
  - an exact official URL already known without searching.
- If a task requires unknown web research, ask the user for the exact URL instead.

When fetching HTTP content, prefer markdown/text:

```bash
curl -fsS --max-time 10 --max-filesize 40000 \
  -H 'Accept: text/markdown, text/plain, text/html' \
  'https://example.com/path' | head -c 40000
```

> Minor caveat: when head stops early, curl may notice the pipe closed and print a harmless “failure writing output” error.

## Misc. Notes

- The better-auth agent skills might mention URLs like this, `https://better-auth.com/docs/concepts/hooks`. However, `https://better-auth.com/docs` is not an LLM-friendly base URL. Use `https://better-auth.com/llms.txt/docs` as the base URL instead, e.g. `https://better-auth.com/llms.txt/docs/concepts/hooks`.
- When building frontend UI components and pages, **always** seek to leverage shadcn/ui components as the foundation
- **Never** mutate any of the foundational shadcn/ui components inside of `components/ui`
- If you ever need to run or execute Python, the command is `python3` and not `python`
- **Never** write db migrations manually. Instead, modify the db schema in `db/schema/` and then run `pnpm db:generate`. Sometimes it's okay to apply db migrations yourself using `pnpm db:migrate` and sometimes it's not. You'll need to use your best judgement and assess the risk. When in doubt, leave this to the user.

:)
