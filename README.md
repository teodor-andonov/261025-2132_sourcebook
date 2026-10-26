# Sourcebook

**A beautiful, fast, local-first visual explorer and reference catalog for ordinary files, folders and URLs.**

Sourcebook lets you point a portable **Catalog** at existing folders, browse everything immediately, generate previews, and selectively enrich resources with metadata — without requiring a proprietary managed library.

**Platforms:** Windows + Android; same product and feature set, responsive layout only.  
**Status:** Planning for V0.1. No executable prototype has been implemented yet.

## Start here

- [Sourcebook V0.1 MEGA Plan](docs/PLAN_V0.1.md) — authoritative working product specification, UX principles, architecture proposal, milestones, acceptance tests.
- [Core decisions](logs/decisions/0001-product-identity.md) — user-confirmed direction vs engineering proposals.

## Product principles

1. Browse existing folders without importing or renaming files.
2. Create/open any portable *.sb catalog directory, stored wherever the user chooses.
3. Multiple catalogs can independently point to the same sources.
4. Objectified files receive catalog-specific bracket IDs before the extension, e.g. Facade[ab967][c5].pdf.
5. Nested tags, custom properties, collections, smart folders, saved views, previews and choice of copy/move destination are essential.
6. Capture references from desktop, browser and Android share.
7. No required cloud account, sync backend or proprietary file storage; user handles folder synchronization separately.
8. UX smoothness, visual restraint and responsive file navigation are release criteria.

## Implementation plan

Begin at [M0: feasibility spike](docs/PLAN_V0.1.md#16-roadmap--incremental-milestones): prove a real desktop/Android folder-access build **before** building elaborate UI. Then ship vertical slices with tests.

- M0 — native platform + filesystem feasibility
- M1 — polished gallery/browser
- M2 — catalog, IDs and metadata
- M3 — tags, smart queries and saved views
- M4 — capture, drop and file management
- M5 — optimization, accessibility and release
- M6 — stretch only after M0–M5 are stable

## Inspirations

- [Eagle](https://eagle.cool/) — collection and visual preview quality
- [refern](https://www.refern.app/) — in-place indexing
- [File Pilot](https://filepilot.tech/) — performance and interaction detail

## Repository workflow

Keep decisions in logs/decisions/, implementation notes in logs/development/ and deferred ideas in logs/ideas/. Mark changes in plan when a decision is validated by real tests. Preserve ordinary user files; prefer reversible operations.

*Current repository state: specification only.*
