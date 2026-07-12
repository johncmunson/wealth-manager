# Design Mockups

Visual product direction lives in [`.mockups/`](../../.mockups/), grouped by stable product-surface or effort slug. Follow the [mockup folder structure and lifecycle](../../.mockups/README.md). Mockups communicate layout, information hierarchy, and intended interactions; they are prototype evidence, not proof of implementation or authoritative requirements.

## Workflow

- Image mockups are user-authored. Agents may inspect and reference them but must not generate or alter the image files.
- During `/grill-with-docs`, use relevant mockups to resolve product questions.
- A `/prototype` may help answer a visual question, but only the user adds or revises the resulting image mockups under `.mockups/`.
- `/to-spec` records the decisions learned from mockups and links the exact effort README or images that informed them.
- `/to-tickets` derives acceptance criteria from the spec, not directly from screenshots.
- `/implement` may use linked mockups as visual guidance while following the spec and current domain language.
- When tracker status changes, update the effort README's `planned`, `in-progress`, or `finished` summary without moving the directory, then update the matching row in `.mockups/README.md` in the same change.

When a mockup conflicts with `CONTEXT.md`, an ADR, or a spec, the written artifact wins until the conflict is explicitly resolved. Do not infer that depicted routes, data, integrations, or behavior already exist.

Keep reusable visual direction in `.mockups/`. Keep throwaway code from a prototype with that prototype effort under `.scratch/`, then delete it after its decisions are captured.
