# Issue tracker: Local Markdown

Issues and specs live as Markdown files in `.scratch/`.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`
- Spec: `.scratch/<feature-slug>/spec.md`
- Tickets: `.scratch/<feature-slug>/issues/<NN>-<slug>.md`
- Triage state: a `Status:` line near the top
- Comments: appended under `## Comments`

## Publishing and fetching

- Publish by creating a file under `.scratch/<feature-slug>/`.
- Fetch by reading the referenced path.

## Wayfinding

- Map: `.scratch/<effort>/map.md`
- Child ticket: `.scratch/<effort>/issues/NN-<slug>.md`
- Record `Type: research|prototype|grilling|task`
- Record `Status: claimed|resolved`
- Record dependencies as `Blocked by: NN, NN`
- The first open, unblocked, unclaimed ticket by number is the frontier.
- Claim before working; resolve with an `## Answer` and update the map.
