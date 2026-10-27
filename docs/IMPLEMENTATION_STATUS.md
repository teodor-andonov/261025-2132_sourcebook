# Sourcebook implementation status

**Date:** 2026-10-27  
**Build:** V0.0 initial real PWA prototype  
**Repo:** https://github.com/teodor-andonov/261025-2132_sourcebook

## 2026-10-27 — UI snapshots and keyboard navigation (V0.0.4)

- Added `screenshots/` with a repeatable **1440×900** desktop screenshot workflow. A headless Chromium run exercises the actual app using synthetic files, produces launcher and gallery screenshots, and commits them to the repository automatically.
- Verified screenshot GitHub Actions job **succeeded** and both PNGs are now in the repository. The fixture also checks that tagging persists notes/metadata and does not rename the original source file.
- Added gallery keyboard navigation: arrow keys across rows/columns, Home/End, Enter for opening folders/files, visible selected/focused resource. Pure index-navigation tests added and passing.
- Snapshot gallery: [launcher](../screenshots/desktop-launcher.png) · [gallery](../screenshots/desktop-gallery.png). Details in [screenshots/README.md](../screenshots/README.md).
- **Limit:** these are headless Chromium/Linux browser renders with test fixtures, not Windows or Pixel 8 device validation.

## 2026-10-27 — Read-only browsing and safe catalog-only objectification

- Opening existing catalogs and sources now requests **read** access; no automatic directory creation when merely opening a catalog.
- On startup, recent-catalog restore checks existing permission **without prompting outside a user gesture**.
- Saving notes/tags now writes catalog records **without automatically renaming source files**. The previous implicit FileSystemHandle.move attempt has been removed.
- Pure ID planner checks current records and filename tokens, adopts an existing own-catalog suffix, and refuses collisions/duplicate tokens; tests cover these cases.
- Metadata save refreshes disk records, rejects a stale edit, and only asks for catalog write permission when saving.
- New folder/import operations request source write permission explicitly. Browser storage failures leave the current session usable with a warning.
- Offline service worker cache bumped to 0.0.2 and includes the new catalog module.
- **Not yet validated on a physical Android or Windows device.** Multi-writer catalog allocation remains unsafe without a locking/reconciliation design.

## 2026-10-27 — Smooth gallery interaction fixes

- Selecting resources now updates selection state in-place rather than rebuilding the entire gallery and rereading every thumbnail.
- Thumbnail object URLs are reused during current-folder filtering and selection; old URLs and observers are released on navigation.
- Mobile inspector defaults closed, preventing it from covering the initial gallery.
- Expired source permission now displays the reconnect state instead of a misleading empty folder.
- Service worker cache bumped to 0.0.3. These are code-level changes; runtime performance/device verification is still pending.

## Delivered

- Browser-based static PWA: HTML/CSS/JavaScript ES modules, manifest, service worker cache; no backend/build dependency.
- Native Chrome directory picker for creating and opening portable Name.sb/ catalogs anywhere the user grants write access.
- Catalog configuration persisted to catalog.json and source list to sources.json.
- Device-specific directory handles persisted in IndexedDB (reconnect when permission expires).
- Real source folder enumeration and nested-folder navigation, breadcrumbs and source switching.
- Responsive gallery/list UI, image lazy previews, adjustable thumbnail density, selection and optional inspector.
- Quick look: image, browser-embedded PDF, video and plain text/Markdown/code; file-type fallback.
- Metadata: save notes + comma-separated tags in resources/<code><sequence>.json; sequence recorded in catalog.json.
- Catalog-aware terminal filename tokens [ab967][c5]; **no implicit source rename** during metadata saving (explicit, verified rename remains a future feature).
- Basic current-folder filename search, file picker import with collision-resistant copy, new folder action.
- Light/dark using operating system preferences; keyboard Space quick look, Backspace parent, Ctrl/Cmd+K search.
- Automated Node syntax/ID-navigation tests: **passed** on 2026-10-27; screenshot capture workflow **passed**.

## Blocker

GitHub Actions **verify** job is passing. **Deploy** job failed in actions/configure-pages@v5; GitHub Pages likely needs enabling for this newly created repository.

**User action:** Repository → Settings → Pages → Build and deployment → Source = **GitHub Actions**. Re-run the latest workflow or push a subsequent commit. Do not claim the hosted app is live until deployment succeeds.

## Not done / do not overclaim

- No successful hosted PWA deployment or actual Windows/Android device acceptance test yet.
- Current metadata editor uses free-text tags only; nested tag taxonomy is not implemented.
- No catalog-wide index/search, smart folders, collections, custom typed properties, saved views or keyboard command palette.
- No PDF first-page *gallery thumbnails*: PDF opens in browser quick look instead.
- No native Android incoming share-target or browser extension.
- No reliable browser-general move, trash/recycle bin or watchers. PWA file-manager limitations remain.
- No simultaneous-offline-editor ID conflict reconciliation; **avoid editing the same synced catalog concurrently for now**. A catalog write is not an atomic multi-file transaction.
- Gallery has an initial 150-resource render cap + Show more, not proper virtualization yet.
- File import copies into the current granted folder only; an advanced destination selector is not built.
- Browser IndexedDB handle persistence may be lost after site storage reset; remap folders through Open Catalog.
- UI interaction/accessibility/performance remains initial prototype, not V1 quality.

## Next engineering milestone

1. Enable GitHub Pages and verify hosted installability, offline shell and file picker.
2. Test user-granted Syncthing directory on Pixel 8 and desktop Chrome; record versions and results.
3. Fix actual device/runtime regressions; do not assume Chrome's FileSystemHandle.move works on arbitrary external files.
4. Make reference tags first-class entities and add collection persistence.
5. Improve progressive gallery rendering and safe metadata handling.

The current master plan is [ROADMAP_V1_ULTRA.md](ROADMAP_V1_ULTRA.md); technical details are in [PWA_ARCHITECTURE.md](PWA_ARCHITECTURE.md).
