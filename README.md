# Sourcebook

> **Implementation underway — V0.0.11 folder-tab cycle (2026-10-27).** Local-folder gallery, portable `.sb` catalogs, stable-ID nested tags and current-folder tag-aware search are implemented. GitHub Pages publishing succeeded on 2026-10-27; subsequent app changes are published **manually only**, by explicit request. Physical Windows/Pixel 8 verification remains outstanding. See [implementation status](docs/IMPLEMENTATION_STATUS.md).


**A beautiful, fast, local-first file browser with optional portable reference catalogs for ordinary files, folders and URLs.**

Sourcebook lets you point a portable **Catalog** at existing folders, browse everything immediately, generate previews, and selectively enrich resources with metadata — without requiring a proprietary managed library.

**Platforms:** Windows + Android; same product and feature set, responsive layout only.  
**Status:** V0.0.11 folder-tabs implementation candidate (2026-10-27); automated tests run in GitHub Actions, and an earlier hosted release succeeded. Real-device verification remains outstanding. **Delivery:** Chrome-first installable PWA (Windows + Android), with direct user-granted folder access; no required native shell or local backend.

## Start here

- [**Sourcebook ULTRA Roadmap to V1.0**](docs/ROADMAP_V1_ULTRA.md) — current master roadmap, release train V0.0–V1.0, acceptance criteria.
- [PWA architecture & feasibility](docs/PWA_ARCHITECTURE.md) — Chrome directory access, mobile share/copy limits, storage design and M0 tests.
- [UX / quality standard](docs/UX_QUALITY_STANDARD.md) — Soft Precision design language, polish rubric and interaction contracts.
- [Original V0.1 MEGA Plan](docs/PLAN_V0.1.md) — preserved historical initial plan; native-wrapper proposals superseded by PWA-first decision.
- [Core product decisions](logs/decisions/0001-product-identity.md) and [PWA-first decision](logs/decisions/0002-pwa-first.md).

## Visual snapshots

- [Desktop launcher (1440×900)](screenshots/desktop-launcher.png)
- [Desktop gallery and inspector (1440×900)](screenshots/desktop-gallery.png)
- [Screenshot workflow and fixture disclosure](screenshots/README.md)

These are **real Chromium browser captures** of Sourcebook with synthetic local reference files. Screenshots are now generated **only when manually requested**; tracked images may lag recent UI commits. They do not prove physical Android/Windows filesystem compatibility.

## Development and release automation

- **Hourly development:** commits stay on `main` without automatically updating the live PWA.
- **Every code commit:** lightweight CI tests.
- **Manual only:** 1440×900 desktop browser screenshot capture, when explicitly requested.
- **Manual only:** Pages publication, when explicitly requested.
- **Anytime:** trigger **Actions → Publish Sourcebook → Run workflow** to publish immediately.

Full details: [Release and CI policy](docs/RELEASE_PROCESS.md). Pages is configured for GitHub Actions; publishing is intentionally separate from development CI.

## Current design direction

**27 Oct 2026 product decision:** Browser-first: ordinary folder browsing without a catalog now supports multiple **read-only physical Tabs**, independent history and device-local restoration (commit pending CI verification). Catalog root-tree navigation remains planned. Sidebar: physical folder **Tabs** and optional **Catalog** with linked root Folders, nested Tags and saved **Views**. Pin tags for manual collections. Defer image editing; preserve files.



**Minimal and utilitarian:** grayscale surfaces, compact spacing, subtle corners, one configurable blue highlight color, icon-first controls. **Tags first:** small hashtag pills and a nested tag taxonomy; no large custom-property system yet. See [Design contract](docs/DESIGN_CONTRACT.md).

## Product principles

1. Browse existing folders without importing or renaming files.
2. Create/open any portable *.sb catalog directory, stored wherever the user chooses.
3. Multiple catalogs can independently point to the same sources.
4. Objectified files receive catalog-specific bracket IDs before the extension, e.g. Facade[ab967][c5].pdf.
5. Stable-ID nested tags offer manual grouping, with pin shortcuts; **Views** save query/scope and display settings. No separate manual Collections or Smart Folders. Custom fields later.
6. Capture references from desktop, browser and Android share.
7. No required cloud account, sync backend or proprietary file storage; user handles folder synchronization separately.
8. UX smoothness, visual restraint and responsive file navigation are release criteria.

## Implementation plan

Begin at [V0.0: PWA feasibility](docs/ROADMAP_V1_ULTRA.md#27--v00-pwa--filesystem-technical-spike): prove Chrome folder-access and *.sb persistence on desktop and Android **before** building elaborate UI. Then ship vertical slices with tests.

- V0.0 — PWA filesystem proof (Chrome Windows + Android)
- V0.1 — beautiful visual explorer
- V0.2 — portable catalogs and IDs
- V0.3 — nested tags, pin shortcuts, bulk tagging; custom properties deferred
- V0.4 — catalog-wide search and Views (saved query + presentation)
- V0.5 — imports, URL/clipboard/mobile capture
- V0.6 — safe file operations
- V0.7 — rich media previews
- V0.8 — power and interaction refinement
- V0.9 — resilience, QA and performance
- V1.0 — polished daily-driver release

## Inspirations

- [Allusion](https://allusion-app.github.io/) — existing folder/tag/search ideas only, not its terminology
- [Eagle](https://eagle.cool/) — visual preview quality
- [Fold](https://github.com/teodor-andonov/261013-1633_pwa-file-explorer) — folder navigation and reliability patterns
- [refern](https://www.refern.app/) — in-place indexing
- [File Pilot](https://filepilot.tech/) — performance and interaction detail

## Repository workflow

Keep decisions in logs/decisions/, implementation notes in logs/development/ and deferred ideas in logs/ideas/. Mark changes in plan when a decision is validated by real tests. Preserve ordinary user files; prefer reversible operations.

*Current repository state: working source-code prototype, not yet verified as an installed daily-driver PWA. Source files are not renamed when saving metadata.*
