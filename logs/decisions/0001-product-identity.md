# ADR 0001 — Product identity and naming

**Date:** 2026-10-26  
**Status:** Accepted product direction / proposed implementation details marked explicitly

## Accepted product decisions

- **Name:** Sourcebook. Separate product from Notebook (freeform personal pages) and Objectbook (portable structured-object workbooks). No shared code or integrations required.
- **Core:** A resource is a file/folder/URL plus derived preview and optional metadata.
- **Browsing:** Opening a source folder shows all ordinary entries; no mandatory import or objectification.
- **Catalog:** Portable directory named [Name].sb stored anywhere, indexing any number of source folders.
- **Overlap:** Multiple independent catalogs can reference the same physical file/folder.
- **Object IDs:** Catalog-specific immutable code plus sequential decimal number in brackets before file extension: Image[ab967][c5].png. Keep IDs of other catalogs; do not rename files until intentionally objectified.
- **Organization:** Physical folders, hierarchical tags, manual collections, smart folders, custom properties and saved views.
- **Capture:** File drops with chosen destination, URL capture, desktop and Android shares.
- **Platforms:** Same fully functional app for Windows and Android with minimal responsive adaptation.
- **Experience:** Smooth, fast, easy, beautiful, restrained. Performance is a prerequisite, not polishing after functional completeness.
- **Sync:** External folder synchronization (e.g. Syncthing), not built into Sourcebook.

## Engineering proposals pending validation

- React + TypeScript/Vite frontend; Tauri2 native shell with Android SAF bridge, subject to M0 feasibility.
- Syncable JSON records with local rebuildable SQLite index.
- Cache outside *.sb by default; previews may optionally travel.
- Metadata-only mode for filename-sensitive/read-only files.
- Collision detection + reconciliation for offline device allocation.
- Suggested term **Catalog** instead of Workspace or Library.

## Critical implementation constraints

1. Offline multiple writers cannot safely share one naive nextSequence counter.
2. Renaming imported files may break external references; must be opt-in or configurable.
3. Android direct folder permissions require user grants and native handling.
4. A synced SQLite file should not be the source of truth.
5. Syncthing propagates conflicting copies; data must be recoverable.

Refer to [MEGA Plan](../../docs/PLAN_V0.1.md) for the full proposed behaviour, tests and milestone sequence.
