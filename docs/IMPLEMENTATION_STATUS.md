# Sourcebook implementation status

**Date:** 2026-10-27  
**Build:** V0.0 initial real PWA prototype  
**Repo:** https://github.com/teodor-andonov/261025-2132_sourcebook

## 2026-10-27 — Current-folder tag-aware search (V0.0.6)

- Search matches filenames or nested tag paths resolved from stable catalog `tagIds`; a leading `#` searches tags only, and `#` alone finds tagged entries.
- Case-insensitive matching supports slash paths with or without spaces. Legacy string tags remain searchable without migration. Search combines with the selected sidebar tag filter and remains scoped to the current folder.
- Build a record lookup once per filtered render, avoiding a full catalog scan for every visible file.
- Added pure tests for stable-ID paths, legacy tags, name search and tag-only exclusions. The 1440×900 real-Chromium **fixture** now checks persisted tag search, slash paths, missing tags and filename search; next nightly/manual screenshot run will exercise it.
- No new filesystem mutations, automatic renames, catalog-wide search index or device validation.

## 2026-10-27 — Compact hashtag pill editor (V0.0.5)

- Inspector tags now use compact neutral hashtag pills: Enter/comma adds, Backspace removes the last, × removes a pill, and Save commits pending input.
- Slash-delimited labels such as `#Architecture/Facades` are provisional nested names; input is trimmed, deduplicated case-insensitively and validated. Existing `tags: string[]` records remain compatible.
- Neutral grayscale light/dark surfaces and file icons with one default blue focus/selection accent; inspector spacing reduced. Configurable accent settings are deferred.
- Pure tag tests (including a corrected unique-ID taxonomy fixture) and actual headless Chromium **1440×900** screenshot harness updated to exercise pill add/remove/persistence. **Screenshot images pending** next successful nightly/manual run; existing gallery still depicts prior UI.
- Prevented overwrite when another writer creates a resource record after selection. No source file rename/write added.
- Stable-ID taxonomy helpers and unit tests exist, but are not yet wired to tag persistence or the UI; descendant filtering, bulk tagging and custom properties remain pending. No Windows/Pixel device validation.

## 2026-10-27 — Minimal tag-first design slice

- Committed [minimal utility design contract](DESIGN_CONTRACT.md): compact neutral UI, rounded corners, one selectable accent color, icon-first commands, no unnecessary annotations.
- Default highlight is muted blue; Settings exposes a color picker and stores the selection in browser local settings. Neutral surfaces and folder tiles do not use category colors.
- Added portable `tags.json` hierarchy with stable catalog-local tag IDs and `parentId` links. Resources now save `tagIds`; old plain-string `tags` records remain readable and migrate when saved.
- Inspector uses compact `#` pills, slash-separated nested paths, existing-tag suggestions and removal. Raw filename/ID are in a collapsible File information section.
- Sidebar shows nested tag hierarchy; selecting a parent filters the **current folder**, including descendant tags. Full catalog-wide tag search comes later.
- Tightened desktop spacing, toolbars and sidebar without changing overall desktop/mobile information architecture.
- Screenshot fixture updated to expect stable ID tags and to validate `tags.json`, not legacy strings. Screenshot workflow remains nightly/manual; no refreshed screenshot has yet been verified for this code.
- **Outstanding:** no device-level validation, tag rename/reparent UI, tag bulk editing or multi-writer concurrency protection.

## 2026-10-27 — CI and live deployment split

- Code commits trigger lightweight **Sourcebook CI** tests, not Pages publishing.
- Desktop screenshot workflow runs **nightly at 02:41 UTC** or manually, instead of every UI commit.
- Live PWA publishes **nightly at 03:17 UTC only when source assets changed since last successful publishing workflow**, or immediately via manual Actions → Publish Sourcebook. Release still runs its own tests.
- Pages publishes only static PWA assets, excluding development logs, tests and screenshots. Full policy: [RELEASE_PROCESS.md](RELEASE_PROCESS.md).
- GitHub Pages is **still not verified live**. Initial configuration requires Settings → Pages → Source: GitHub Actions.

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
- Metadata: save notes and stable tag IDs in resources/<code><sequence>.json; taxonomy in tags.json; legacy string tags remain readable.
- Catalog-aware terminal filename tokens [ab967][c5]; **no implicit source rename** during metadata saving (explicit, verified rename remains a future feature).
- Basic current-folder filename search, file picker import with collision-resistant copy, new folder action.
- Light/dark using operating system preferences; keyboard Space quick look, Backspace parent, Ctrl/Cmd+K search.
- Automated Node syntax/ID-navigation tests: **passed** on 2026-10-27; screenshot capture workflow **passed**.

## Release and device verification

- GitHub Pages was enabled; **Publish Sourcebook** succeeded on 2026-10-27 (Actions run `40485889974`). This V0.0.6 development commit is **not** automatically deployed: live publishing remains nightly-on-change or manual.
- Previous **Sourcebook CI** run `40481999049` passed. CI for this change needs checking after commit.
- Last **Sourcebook Desktop Screenshots** run `40474583662` passed, but predates the latest tag UI; refreshed fixture screenshots await the nightly/manual workflow.
- Actual Windows Chrome and Pixel 8 filesystem/permission acceptance tests remain outstanding. Do not claim the hosted app is live until deployment succeeds.

## Not done / do not overclaim

- Hosted Pages deployment succeeded; actual Windows/Android device acceptance tests are still outstanding.
- Nested stable-ID taxonomy and current-folder tag search exist; catalog-wide search, rename/reparent and bulk tagging are not implemented.
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

1. Verify hosted installability, offline shell and folder picker on physical devices (Pages publishing is configured).
2. Test user-granted Syncthing directory on Pixel 8 and desktop Chrome; record versions and results.
3. Fix actual device/runtime regressions; do not assume Chrome's FileSystemHandle.move works on arbitrary external files.
4. Make reference tags first-class entities and add collection persistence.
5. Improve progressive gallery rendering and safe metadata handling.

The current master plan is [ROADMAP_V1_ULTRA.md](ROADMAP_V1_ULTRA.md); technical details are in [PWA_ARCHITECTURE.md](PWA_ARCHITECTURE.md).
