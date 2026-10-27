# Sourcebook implementation status

**Date:** 2026-10-27  
**Build:** V0.0 initial real PWA prototype  
**Repo:** https://github.com/teodor-andonov/261025-2132_sourcebook

## 2026-10-27 — Bulk nested Tags and safe catalog-only writes (V0.0.14 candidate)

- Added touch-friendly Select mode, Ctrl/Cmd-click, Shift range and Ctrl/Cmd+A (current filtered folder results). Shift selection excludes resources hidden by active filters; the Clear action tracks selection without redrawing the gallery. The multi-resource inspector now supports Add/Remove nested tags using hashtag pills and keyboard suggestions, with a limit of 250 selected resources per operation.
- Add preserves unrelated tags and notes; Remove matches exact paths rather than descendants. Legacy string tags migrate only on explicitly changed records. Stable IDs are reused; new resource identities are allocated without renaming or writing ordinary files.
- Catalog identity, taxonomy and selected records are preflight-checked; source entries are revalidated read-only. Catalog JSON writes are read back and verified, with stale checks during the batch. **Not atomic:** interrupted batches can partially save; errors report verified record count and the catalog refreshes afterward.
- Single-resource save now compares the entire previous record rather than only `updatedAt`; changing search/tag filters clears hidden selection.
- Added pure planner and simulated FileSystemHandle integration tests. **CI and Windows/Android testing are pending at commit authoring time.** No screenshots or Pages deployment were triggered.

## 2026-10-27 — Catalog Folder hierarchy for registered roots (V0.0.13 candidate)

- Catalog FOLDERS now lists registered real source roots and automatically derived ancestor folders of objectified resource paths. An objectified `images/gallery/img1.png` appears as `Images / gallery` when `Images` is the registered root; no drive-wide absolute path is displayed or stored.
- Clicking a catalog folder navigates the actual physical directory through the existing permissioned browser, so unobjectified files remain visible. New resource metadata automatically refreshes the derived sidebar tree on render; no directories are created or moved.
- Pure model tests cover deduplication, ancestor paths, explicitly objectified directories, corrupt/missing records, multiple roots and a future shortest-relative-path rule for deepest overlapping roots. That rule is **not yet wired into metadata saving**; existing catalog records retain their original source ID.
- No extra sidebar category or collection database. Sourcebook remains minimal grayscale with one accent. No user files are renamed or mutated by this feature.
- Bumped service-worker cache to `sourcebook-shell-0.0.13-ta-icons-1` and precached the model. CI and real-device validation are pending; screenshot/Pages publishing remain manual only and were not triggered.

## 2026-10-27 — PWA identity/cache isolation (V0.0.12 candidate)

- Compared the Mindmap and Sourcebook GitHub Pages manifest/service-worker source. Both previously used a relative manifest `id: "./"`; they are path-distinct when each is served from its own repo path, but explicit distinct IDs remove installation-identity ambiguity.
- Sourcebook manifest ID is now `/261025-2132_sourcebook/`; its worker only evicts caches starting `sourcebook-shell-`. Both workers previously deleted **every other Cache Storage cache on the same origin**, even those belonging to another PWA.
- Added a focused activation test verifying Mindmap and other cache namespaces survive worker upgrade. This change does not clear browser IndexedDB, rewrite catalogs or change any source files.
- The matching Mindmap patch lives on a separate review branch pending user-controlled merge; a browser with an older installed app may need to uninstall/reinstall **after manual publishing** to reconcile its previous install identity.
- Neither PWA deployment nor screenshot generation was triggered. Actual installed-PWA coexistence on Windows/Pixel awaits manual validation.

## 2026-10-27 — Big development cycle: independent physical Folder Tabs (V0.0.11 candidate)

- Browser-first read-only browsing now supports up to 32 independent physical folder Tabs, including opening folders through the directory picker or from a selected nested folder. Each Tab remembers its own root, current path, backward/forward history and active position.
- Added compact close controls, disabled Back/Forward controls and Alt+Left/Right navigation. Clicking another Tab restores its own path without silently resetting to root. Right-click/long-press, Ctrl+Enter or the inspector action opens a selected directory in a separate Tab.
- Tab sessions are saved to browser-local IndexedDB, preserving FileSystemDirectoryHandles and navigation history where permitted. Reload restores previously granted folders only; revoked permissions require explicit reconnect. A single-folder preference from V0.0.9 can be migrated. No catalog records or ordinary files are modified by these operations.
- New pure tab-model tests cover independent histories, branch truncation, stored session validation, closing tabs and no source mutations. New tab UI awaits manual screenshot capture; do **not** run screenshot or Pages workflows automatically.
- Service worker bumped to `sourcebook-shell-0.0.11-ta-icons-1`. **CI and physical Windows/Android verification remain pending at commit time**; catalog-wide root trees, catalog tabs/Views and advanced context menus are not yet delivered.
- The user has explicitly selected **large coherent development cycles**, and now controls both screenshot generation and live Pages publishing manually. Only commit CI remains automatic. Historical status sections below describe older automatic schedule policies and are retained as dated history, not current workflow policy.

## 2026-10-27 — Prevent stale inspector tag writes (V0.0.10 candidate)

- The inspector now compares its catalog-local `tags.json` snapshot with the current disk taxonomy **before any resource or taxonomy write**. If another editor changed tag names, hierarchy, pinning or membership taxonomy, Save refuses the stale edit and asks to reopen the catalog.
- Pin/unpin uses the same snapshot guard; existing resource-record `updatedAt` conflict checks remain unchanged. The guard protects against **already-visible concurrent edits**, not writes racing after the check, power loss, or multi-file atomicity.
- Added Node regression tests for unchanged, renamed, pinned, added and malformed taxonomy snapshots. Extended the 1440×900 real-Chromium **fixture** with a simulated external tag edit followed by a rejected stale inspector save, verifying both catalog resource JSON and source filenames remain unchanged.
- No UI layout changes; existing screenshots remain valid until the next scheduled/manual capture. Service-worker cache bumped to `sourcebook-shell-0.0.10`. **CI and browser fixture results pending; no physical Windows/Android validation claimed.**
- Documentation reflects the catalog-free folder slice already committed in V0.0.9; the multi-tab and full catalog-root sidebar remain future work.

## 2026-10-27 — Catalog-free read-only folder browsing (V0.0.9 candidate)

- Landing now offers **Open folder** without creating/opening a catalog. The chosen folder can be navigated with gallery/list, breadcrumbs, current-folder search, quick look and file information.
- This first standalone browsing mode requests **read** access only; there is no tag editor, import or write action. Browser-only folders are not silently objectified or renamed; existing portable catalog workflow remains separate.
- The last plain folder handle and mode may be stored locally in IndexedDB; restart restores only if permission is already granted, otherwise the launcher appears without an unsolicited permission prompt.
- Added pure tests for validating ordinary directory handles and extended the existing **1440×900 genuine Chromium fixture** to check read-only standalone browsing and unchanged synthetic files. A new `desktop-folder.png` snapshot is configured for the nightly/manual workflow; **the updated capture has not yet run**.
- Service-worker cache bumped to `sourcebook-shell-0.0.9`; no auto-deployment was triggered. Multi-folder tabs/history, registered root hierarchy, cross-root catalog-wide Views and actual Windows/Pixel 8 verification remain pending.

## 2026-10-27 — Consistent active specifications

- Cleaned the roadmap, UX quality standard, README and design contract around **Tabs, Folders, Tags, Views, Catalog**.
- Allusion is an external inspiration for visual filesystem indexing, hierarchical tags and search composition, not a vocabulary or architecture source.
- Previous Collection/Smart Folder proposals are superseded by nested tag grouping and saved Views. Preserved dated implementation history.
- Browser-first Open Folder is the next vertical slice; physical multi-tabs, root-derived Catalog Folders and catalog-wide Views remain later work.

## 2026-10-27 — Folder-first plan and tag-pin shortcut (V0.0.8 candidate)

- Master plan and design contract now specify physical folder Tabs plus optional Catalog containing registered-root Folders, nested Tags and **Views**. No independent manual Collections/Smart Folders; defer image editing and custom properties.
- Existing stable-ID tags can be pinned/unpinned from the sidebar. Pin flags persist in `tags.json`, pinned shortcuts are compact, and the original full hierarchy remains. Tags and resource records retain the same IDs.
- Catalog write permission is requested; on-disk taxonomy divergence prevents overwrite, and the result is read back. These are not crash-atomic/multi-writer transactions; no ordinary source files are modified.
- Node unit tests and the actual 1440×900 Chromium fixture have been extended (fixture files only). **CI and screenshot workflow results pending as this commit is authored**; no physical Windows or Pixel 8 validation.
- Folder browsing without a catalog, persisted folder Tabs, catalog root tree, catalog-wide tag Views and bulk tagging are still future work.

## 2026-10-27 — Keyboard-first nested hashtag discovery (V0.0.7)

- Existing catalog tags are suggested while typing `#` or a nested path, with case-insensitive and slash-normalized matching. Already-assigned paths are excluded; choosing a suggestion reuses its stable tag ID on save rather than creating another taxonomy node.
- The inspector tag picker now supports ArrowDown/ArrowUp to highlight suggestions and Enter to select one. Enter without an active suggestion still creates the explicitly typed tag; comma retains the existing entry behavior. Combobox/listbox ARIA state reflects the highlighted option.
- Added pure suggestion/navigation tests and extended the **real 1440×900 Chromium fixture** to exercise keyboard selection and verify stable-ID persistence with unchanged source filenames. A `desktop-tag-picker.png` fixture snapshot is configured for the next nightly/manual screenshot run; **no new screenshot capture or physical-device validation is claimed yet**.
- Only catalog metadata is written when the user explicitly saves. No image editor, source renaming, collection system or custom-property schema added.
- **Verified:** Sourcebook CI run `40496013373` succeeded for implementation commit `ccdc700a4d7d45dc5854721ea39a8c26572d61b1` (Node unit tests and JavaScript syntax checks). Browser fixture execution and refreshed screenshot images are still pending the separate nightly/manual workflow.

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
- **Sourcebook CI** run `40489034418` passed for V0.0.6 commit `99a1d380` (unit tests and JavaScript syntax checks).
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
4. Prioritize pinned/bulk nested tags, folder-first browsing and registered root trees rather than manual Collection persistence.
5. Improve progressive gallery rendering and safe metadata handling.

The current master plan is [ROADMAP_V1_ULTRA.md](ROADMAP_V1_ULTRA.md); technical details are in [PWA_ARCHITECTURE.md](PWA_ARCHITECTURE.md).
