# Mockups

Mockups are grouped by stable product-surface or effort slug. They provide visual direction for work tracked under `.scratch/`; they are not requirements or proof of implementation.

Image mockups are created and revised by the user, not by agents. Agents may inspect them, link them to tracked work, and maintain their Markdown metadata, but must not generate or alter the image files.

## Structure

```text
.mockups/
├── README.md
└── <effort-slug>/
    ├── README.md        # relationship to tracked work and current lifecycle
    ├── overview.png     # complete page or flow
    └── detail-01.png    # optional focused views
```

Each effort `README.md` must record:

- **Related work** — exact spec or ticket links under `.scratch/`.
- **Work status** — `planned`, `in-progress`, or `finished`.
- **Mockup status** — `directional` or `superseded`.
- **Scope** — what the images depict.

## Lifecycle

- **Planned** — related work is specified but no implementation ticket is claimed.
- **In progress** — at least one related implementation ticket is claimed.
- **Finished** — related acceptance criteria are complete. Keep useful mockups as historical visual context.

The linked tracker files are authoritative. Update the local work-status summary when the related tracker state changes, but never move the effort directory to represent status; stable paths keep links from specs and tickets intact.

A directional mockup may differ from the final implementation. Mark it superseded and link its replacement rather than silently rewriting historical visual context.

## Current efforts

This table is the repository-wide index of the individual effort READMEs. Whenever an effort README's related work, work status, or mockup status changes, update its row here in the same change.

| Mockups                                 | Related work                                                                         | Work status | Mockup status |
| --------------------------------------- | ------------------------------------------------------------------------------------ | ----------- | ------------- |
| [Portfolio](./portfolio-page/README.md) | [Frontend routes and navigation](../.scratch/frontend-routes-and-navigation/spec.md) | planned     | directional   |
| [Strategy](./strategy-page/README.md)   | [Frontend routes and navigation](../.scratch/frontend-routes-and-navigation/spec.md) | planned     | directional   |
| [Funding](./funding-page/README.md)     | [Frontend routes and navigation](../.scratch/frontend-routes-and-navigation/spec.md) | planned     | directional   |
