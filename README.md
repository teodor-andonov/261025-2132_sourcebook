# Sourcebook

> **Implementation underway — V0.0.28 targeted subfolder indexing (2026-10-27).** Browser-first read-only Folder Tabs, optional `.sb` Catalogs, registered-root Folders, nested stable-ID Tags, bulk tagging and saved Views remain prototype features. Views can explicitly refresh granted roots or an already-indexed subfolder into a device-local, IndexedDB-backed read-only index, preserving unaffected siblings. Only verified refreshed paths may assert missing/type drift; restored cache remains stale. A verified `.sourcebook-pending.json` journal supports explicit recovery of interrupted Catalog JSON writes. **New:** SHA-256 metadata backup inspection plus explicit, journaled restoration of selected *missing* resource JSON records (max 250 per batch), with reference/identity checks and stale-preview rejection. No overwrite of existing resource records, deletion or source-file restore; the Catalog ID counter can advance. **New:** read-only inspection and export of Syncthing-style Catalog conflict-copy reports; Catalog metadata writes, journal replay, backup export and selective restore now fail closed when conflict copies are present. No automatic merge, cleanup or source-file changes. No atomic filesystem snapshot or cross-device lock. **V0.0.27 PR CI passed 169/169 Node tests** and JavaScript syntax checks in [run 40579151371](https://github.com/teodor-andonov/261025-2132_sourcebook/actions/runs/40579151371); V0.0.28 initial PR CI passed 179/179 tests and syntax checks in [run 40586652803](https://github.com/teodor-andonov/261025-2132_sourcebook/actions/runs/40586652803); final follow-up verification remains pending; physical Windows/Android testing remains outstanding. Pages publishes automatically through Actions after squash merges to `main` (or manual dispatch); screenshots remain manual-only. See [implementation status](docs/IMPLEMENTATION_STATUS.md).

**A beautiful, fast, local-first file browser with optional portable reference catalogs for ordinary files, folders and URLs.**

Sourcebook lets you point a portable **Catalog** at existing folders, browse everything immediately, generate previews, and selectively enrich resources with metadata — without requiring a proprietary managed library.

**Platforms:** Windows + Android; same product and feature set, responsive layout only.  
**Status:** V0.0.28 scoped Folder refresh candidate (2026-10-27); automated tests run in GitHub Actions, and an earlier hosted release succeeded. Real-device verification remains outstanding. **Delivery:** Chrome-first installable PWA (Windows + Android), with direct user-granted folder access; no required native shell or local backend.

**Development and publishing:** Use `dev/YYMMDD-HHmm-topic` feature branches and pull requests, squash merge only after successful CI, then let [Publish Sourcebook](.github/workflows/pages.yml) deploy automatically from `main` (or run it manually via Actions). [Full release convention](docs/RELEASE_PROCESS.md). Screenshots remain manual-only.

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

- **Development:** substantial batches on dedicated `dev/YYMMDD-HHmm-topic` branches.
- **Integration:** pull request into `main`, successful PR CI, then squash merge; never direct development commits on `main`.
- **Publishing:** GitHub Actions automatically publishes changed PWA assets after merges to `main`; manual **Actions → Publish Sourcebook → Run workflow** remains available.
- **Screenshots:** manual-only artifact capture; never an automatic publish step or direct push to `main`.
- **Catalog conflicts:** Settings → Inspect conflicts shows recognized Syncthing metadata conflict copies; recheck and export a read-only report. All Catalog metadata edits remain blocked while copies exist. Preserve both versions and reconcile outside Sourcebook; no automatic deletion or merge.

See [Release and CI policy](docs/RELEASE_PROCESS.md). Physical Windows/Android validation is not implied by CI or publishing.

## Current design direction

**27 Oct 2026 product decision:** Browser-first: ordinary folder browsing without a catalog supports multiple **read-only physical Tabs**, independent history and device-local restoration. Catalog Folders now show registered physical roots and derived ancestor directories of cataloged resources. Catalog Tags support bulk Add/Remove and catalog-wide discovery. Saved Views store query, scope, nested-tag logic and presentation; the explicit Index/Refresh action discovers unobjectified files into a device-local cache without modifying them. Cached results are visibly stale until refreshed, and cannot claim missing files. Sidebar: physical folder **Tabs** and optional **Catalog** with linked root Folders, nested Tags and saved **Views**. Pin tags for manual collections. Defer image editing; preserve files.



**Minimal and utilitarian:** grayscale surfaces, compact spacing, subtle corners, one configurable blue highlight color, icon-first controls. **Tags first:** small hashtag pills and a nested tag taxonomy; no large custom-property system yet. See [Design contract](docs/DESIGN_CONTRACT.md).

## Device-local source indexing (V0.0.27 candidate)

Within an active saved View, **Index / Refresh** scans already-granted Catalog Folders. Choose **All Folders** or one registered Folder for a targeted refresh; unaffected cached roots are retained. **Clear** removes this device's cached index for the current Catalog. No scan requests write permission or changes a source file, and the index is not part of the portable `.sb` metadata.

Complete root snapshots persist in browser IndexedDB with the corresponding directory handle. On reopening the Catalog, cached entries are displayed **only if `isSameEntry` verifies the original root**; name or ID matching alone is insufficient. Restored entries are labelled **Cached · refresh**. Only a complete scan performed in the current session may mark catalog records **Missing** or **Type changed**. Partial scans never replace a previous complete snapshot. The refresh reports added/removed/type-changed counts relative to the previous cached root.

**Limitations:** This is root-granular incremental refresh, **not** a filesystem watcher, directory-delta crawler or cross-device index. A targeted root still needs full enumeration; maximum 50,000 cached entries per Catalog. Changes made outside Sourcebook are not discovered until explicit refresh. IndexedDB can be cleared by the browser, and handle permissions may require reconnection. Overlapping registered roots are not physically deduplicated. Physical Windows/Android acceptance remains outstanding.

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
