> **V0.0.60 candidate (29 Oct 2026, 05:22 Madrid):** Browser-first Folder selection now supports a touch-friendly Select mode, All shown and Clear, stable Shift anchor, Ctrl/Cmd toggles and additive ranges, Ctrl/Cmd+A on displayed resources, Space toggle in gallery/list/table and Escape clear. Selection is transient, bounded to 250 and pruned by filters; dialogs and text inputs retain native keyboard behavior. No ordinary files or Catalog metadata are written. Node and Chromium OPFS regressions added; physical Windows/Pixel 8/Syncthing M0 remains open. No screenshots. [Development log](../logs/development/261029-0522_folder-selection-keyboard.md).

> **V0.0.59 candidate (29 Oct 2026, 04:24 Madrid):** Browser-first Folder Tabs add explicit, read-only extension-type discovery (including text/code, audio, archives, physical .url), literal filename search and dotfile visibility. Each Tab independently remembers its type/visibility preferences with existing search/sort/layout/density. Filter counts distinguish matches from entries actually read; 20k safety-limit and provider-failure states remain partial/incomplete. Node and native Chromium OPFS tests added. This is not recursive search, Catalog metadata or physical Windows/Pixel 8/Syncthing acceptance. No screenshots. [Development log](../logs/development/261029-0424_folder-discovery-filters.md).

> **V0.0.58 candidate (29 Oct 2026, 03:25 Madrid):** Read-only Folder browsing now enumerates entries cooperatively in 256-entry batches, yields to UI/navigation between batches, throttles partial renders, and discards stale results when a Folder Tab changes. A 20,000-entry safety ceiling is explicitly marked **partial**, including search/sort results; interrupted provider reads remain **incomplete**, never silently presented as complete. Native Chromium OPFS and Node regressions cover progress, cancellation, cap and source preservation. This is not external Folder/Pixel 8/Syncthing M0 acceptance. No screenshots. [Development log](../logs/development/261029-0325_progressive-folder-browsing.md).

> **V0.0.57 candidate (29 Oct 2026, 02:31 Madrid):** Browser-first Folder Tabs now keep **independent device-local search, sort, gallery/list/table layout and thumbnail density**, in addition to existing independent paths/back-forward history. Sidebar and compact previous/next Tab controls plus Alt+Shift+Left/Right switch Tabs without changing ordinary files. Read-only Folder sort supports name ascending/descending and type, folders first; bounded preferences restore from IndexedDB after restart, and malformed/legacy tab settings fall back safely. Node and real Chromium OPFS acceptance regressions added. This is **not** physical Windows/Pixel 8/Syncthing acceptance; M0 remains open. No screenshots. [Development log](../logs/development/261029-0231_folder-tab-workspaces.md).

> **V0.0.56 candidate (29 Oct 2026, 01:27 Madrid):** Ordinary physical `.url` files now have a validated read-only full preview with an explicit external Open link; both Folder Tabs and Catalog-backed file results use the same bounded shortcut reader as the side preview. Malformed, oversized, non-HTTP(S) and ambiguous shortcuts cannot become actionable links. Text/Markdown full previews use bounded 200 KB reads with truncation and stale-preview cancellation. Node tests and a real Chromium OPFS UI scenario were added. No ordinary source files or Catalog metadata are modified; OPFS is NOT external Folder/Pixel 8/Syncthing M0 acceptance. No screenshots. [Development log](../logs/development/261029-0127_file-backed-shortcut-preview.md).

> **V0.0.55 candidate (29 Oct 2026, 00:22 Madrid):** Catalog metadata transactions and explicit journal recovery now acquire a separate origin-wide exclusive Web Lock across cooperating Sourcebook tabs. Lock scope includes stale snapshot/conflict preflight, journal creation, each verified JSON write and journal clearance. A competing tab with stale metadata must fail before creating a new journal. Missing Web Locks retains the existing single-handle/snapshot safeguards; denied lock requests fail closed. This is **not** cross-browser/device/Syncthing locking or physical Windows/Pixel 8 acceptance. Node and native two-tab Chromium OPFS regressions were added; no screenshots. [Development log](../logs/development/261029-0022_catalog-write-serialization.md).

> **V0.0.54 candidate (28 Oct 2026, 23:30 Madrid):** Physical `.url`/`.md` captures and reviewed ordinary-file imports now use a shared same-origin Web Lock when available, serializing Sourcebook tabs through collision preflight, write and readback. Node regressions and a two-tab headless Chromium OPFS contention test were added. This **does not** prevent external/Syncthing/device races, guarantee atomic exclusive creation or establish physical Windows/Pixel 8 acceptance. Missing Web Locks retains preflight-only fallback. [Development log](../logs/development/261028-2330_cooperative-file-write-locks.md).

> **V0.0.53 candidate (28 Oct 2026, 22:31 Madrid):** PR Chromium M0 smoke now exercises **real origin-private FileSystemDirectoryHandle writes** for `.url`/`.md`, case-insensitive collision refusal, untouched sentinel files, an M0 capture fixture surviving browser reload with a native IndexedDB-persisted handle, and a journaled portable `.sb` fixture with Tags/View/real `.url` readback and corruption rejection. Synthetic OPFS permission shims are explicitly marked; OPFS is **NOT** a user-selected Folder, Android SAF, Syncthing storage or physical Windows/Pixel 8 acceptance. No screenshots or visual fixtures. [Development log](../logs/development/261028-2231_chromium-opfs-acceptance.md).

> **V0.0.52 candidate (28 Oct 2026, 21:22 Madrid):** PR CI now includes actual headless Chromium browser-engine smoke for service-worker control, offline reload, scoped PWA manifest, multipart Share Target file staging and no-directory-picker `.url` Download fallback. No screenshots or ordinary source writes. The no-picker landing hides unusable Folder/Catalog/import actions; capture review offers Download/Send but no impossible Folder-create button, while inbox and Device checks remain available. **Synthetic Linux Chromium is NOT Windows Chrome or Pixel 8 device verification.** [Development log](../logs/development/261028-2122_chromium-m0-smoke.md).

> **V0.0.51 — activation-safe prepared file share (28 Oct 2026):** Incoming Android staged files now require an explicit **Prepare to send → Send prepared file(s)** sequence. The first gesture loads and SHA-256-verifies the bounded IndexedDB attachments; the second invokes navigator.share synchronously within the trusted click (no asynchronous IndexedDB step). Prepared files are ephemeral, one-shot and expire after two minutes. External delivery and real-device compatibility remain **unverified**, and staging is never cleared by sharing. [Development log](../logs/development/261028-2024_activation-safe-share-handoff.md).

> **V0.0.50 candidate (28 Oct 2026, 19:27 Europe/Madrid):** When Chrome cannot grant a writable Folder, reviewed .url/.md captures and integrity-checked temporary Android file attachments can explicitly request a **file-bearing OS share sheet handoff**. No URL-only/text-only substitution, silent write, Catalog-only Resource, or automatic inbox clearing. The receiving app's choice, destination, final filename and disk persistence are **unverified** even if the Web Share promise resolves. Capability diagnostics are API-only; Pixel 8/Windows M0 remains open. [Development log](../logs/development/261028-1927_android-share-out-fallback.md).

> **V0.0.49 candidate (28 Oct 2026, 18:28 Europe/Madrid):** M0 Device checks now distinguishes blocked, failed, unverified and probe-ready filesystem-provider states using picker availability and disposable write/read/remove plus reopened physical `.url`/`.md` checks. Report comparison recomputes this gate rather than trusting imported claims; old reports remain readable but cannot clear it. `probe-ready` is not physical-device acceptance. [Development log](../logs/development/261028-1828_m0-provider-evidence-gate.md).

> **V0.0.48 candidate (28 Oct 2026, 17:29 Madrid):** M0 Device checks now provides an explicitly confirmed, disposable **physical `.url` + `.md` provider fixture**. It refuses nonempty parents, creates a new UUID-named Folder, uses the production capture writer to create and verify two ordinary files, and retains them for independent read-only reopening or actual Syncthing transfer. Exported reports include sanitized create/verify outcomes and a hashed synthetic fixture identity, not private paths or content. If Android Chrome lacks a writable Folder picker, record **Blocked**; browser Downloads do not pass this gate. No physical Windows/Pixel 8 test or M0 acceptance is claimed. [Development log](../logs/development/261028-1729_m0-capture-provider-gate.md).

> **V0.0.47 candidate (2026-10-28 16:26 Europe/Madrid):** Android Share Target attachments are SHA-256 fingerprinted before temporary IndexedDB staging and verified before review or Download; same-size tampering and swapped Blobs now fail closed. Existing unhashed inbox entries remain readable as legacy, not integrity-attested. Device checks adds read-only, coarse origin-wide storage diagnostics and an explicit persistence request. This does **not** prove Android file provider support, IndexedDB durability or physical Windows/Pixel 8 acceptance. [Development log](../logs/development/261028-1626_share-integrity-storage.md).

> **V0.0.46 candidate (28 Oct 2026, 15:26 Madrid):** Android installed-PWA Share Target now accepts up to five ordinary file attachments (25 MiB each / 50 MiB per share, 100 MiB inbox-wide), alongside URL/text. Validated file Blobs are temporarily staged with metadata in a single IndexedDB transaction, then explicitly reviewed through the existing physical-file import dialog. A successful verified Folder copy removes staging; cancellation/failure leaves it intact. Explicit per-file browser Download is an **unverified fallback**, not a saved Resource. Existing text-only inbox records survive the schema upgrade. Browser share delivery, Android Folder writes and actual Windows/Pixel 8 acceptance remain **Not tested**. See [development log](../logs/development/261028-1526_android-file-share-inbox.md).

> **V0.0.45 candidate (28 Oct 2026, 14:31 Madrid):** Clipboard raster images can be pasted into a Folder or read through an explicit user gesture, then reviewed as ordinary physical file imports. Supported PNG/JPEG/WebP/GIF only; 10 images, 25 MiB each, 50 MiB total; generated filenames are visible before a write. Existing verified copy, collision refusal, explicit Folder permission and Android unsupported-provider behavior apply. No Catalog-only Resource or IndexedDB image store. Physical-device acceptance remains **Not tested**. See [development log](../logs/development/261028-1431_clipboard-image-capture.md).

> **V0.0.44 candidate (28 Oct 2026, 13:30 Madrid):** Text pasted or dropped into a browser Folder now opens a review dialog instead of immediately writing a file. HTTP(S) URL drops, multi-URL URI lists, clipboard-read and Markdown drafts share explicit destination confirmation, safe `.url`/`.md` creation, and the unverified browser Download fallback. Clipboard access is user-triggered; denied permissions retain the draft. File drops continue through reviewed ordinary-file import. No Catalog-only Resource is created; physical Windows/Pixel 8 testing remains open. See [development log](../logs/development/261028-1330_reviewed-text-intake.md).

> **V0.0.43 candidate (28 Oct 2026, 12:30 Madrid):** Explicit ordinary-file imports now use bounded 1 MiB chunks for files over 25 MiB (up to 512 MiB each / 1 GiB per 10-file batch). Each large copy is reread and compared byte-for-byte against its selected source; small copies retain SHA-256 verification. Import review now exposes progress and a user-controlled abort. Aborted/provider-failed operations may leave partial files and never delete them automatically. Source files are unchanged; no Catalog-only resources. Windows Chrome/Pixel 8 provider compatibility and Syncthing roundtrip remain **Not tested**. See [development log](../logs/development/261028-1230_streamed-file-import.md).

> **V0.0.42 candidate (28 Oct 2026, 11:26 Madrid):** Ordinary file imports now use explicit review/confirmation from the file picker or drag/drop (browser-first, Catalog optional). File names are preserved; case-insensitive collisions block the batch; every written copy is SHA-256 read back. Android input picker can select files, but a writable destination Folder remains required; no silent renaming, Catalog annotation or unsupported Android write claim. See [development log](../logs/development/261028-1126_safe-file-import.md). M0 remains open.

> **V0.0.41 candidate (28 Oct 2026, 10:25 Madrid):** Legacy fileless URL records can be explicitly migrated one at a time into real .url files in a registered writable Folder. A confirmation, two permissions, case-insensitive collision scan, readback and journaled metadata rebinding are required. Stable IDs, Tags and Notes are preserved. Failed operations may leave an orphan shortcut; no automatic deletion or physical-device acceptance. [Development log](../logs/development/261028-1025_legacy-url-file-migration.md).

> **V0.0.40 candidate — real-file inbox integration (28 Oct 2026, 09:29 Madrid):** Staged links can explicitly create ordinary `.url` files in a selected writable Folder, and Android incoming shares can explicitly create `.url` or `.md` files. A browser-managed Download is a separate fallback when directory picking is unsupported; it is **not** a verified write or a Catalog resource. Staging remains until explicit removal; a verified share-to-Folder save can clear its pending inbox item. Saved Views now classify physical `.url` files as Links. The disposable M0 fixture now writes and verifies a physical `.url` in `source-files/` with a file-bound metadata record; old version-1 legacy fixtures are preserved but are not accepted by the new verifier. No physical device tests or automatic migration have occurred. See [development log](../logs/development/261028-0929_file-backed-capture-inbox.md).

# SOURCEBOOK — ULTRA MEGA ROADMAP TO V1

> **A local-first, installable, absurdly smooth, beautifully minimal visual file explorer and reference manager.**  
> **Status:** Strategic implementation roadmap (not a shipped feature claim)  
> **Created:** 2026-10-26  
> **Scope:** V0.1 → V1.0 · Windows Chrome + Android Chrome · PWA-first, no required backend/native shell  
> **Reference DNA:** Allusion × Eagle.cool × refern.app × File Pilot × Fold — inspiration only, not naming/architecture  
> **Fold UX carryover (V0.0.23):** Extension-first semantic file symbols with restrained per-type color (including CAD/BIM), compact sidebar and View controls, resizable desktop panes and read-only side preview. Do not merge Fold's destructive file operations or add extra metadata concepts. Device acceptance pending.
> **Short form:** Existing files. Beautiful previews. Portable catalogs. Delightful organization.
>
> **SUPERSEDING DECISION (28 Oct 2026): FILE-BACKED RESOURCES ONLY.** Each durable resource is a real ordinary file or folder. URL captures become `.url` Internet Shortcut files; text pasted/dropped into a writable Folder becomes `.md`. The optional `.sb` Catalog stores metadata/references only. Device-local link inbox is staging, not a Resource. Earlier V0.0.35–0.0.38 Catalog-only `kind=url` records are *legacy* and retained for compatibility but new fileless creation is retired pending confirmed migration. Historical URL-only roadmap text below is superseded. Device acceptance remains unverified.
>
> **M0 feasibility update (28 Oct 2026, V0.0.32 candidate):** Device checks now offer explicitly confirmed disposable Folder write/read/remove verification and opt-in IndexedDB handle retention with a no-prompt permission/enumeration recheck after restart. Neither is automatic, neither uses ordinary source files or Catalog data, and neither constitutes Windows/Pixel 8 acceptance. A failed write can leave a named synthetic probe file requiring manual cleanup; see M0 test instructions.

> **Portable URL resource implementation update (28 Oct 2026, V0.0.35 published):** Catalog URLs now use stable sequential IDs in portable resources/*.json with nested Tags, title/notes, global saved View search and explicit link-only results. Manual and selected device-staged import use the Catalog recovery journal; staging is retained and no page content is fetched. No device acceptance, URL thumbnails or Android file shares yet. See [development log](../logs/development/261028-0531_portable-catalog-links.md).

> **Catalog URL bulk Tags update (28 Oct 2026, V0.0.36 candidate):** Catalog URLs can be filtered by title, URL or nested Tag paths, selected up to 250 at once and explicitly bulk tagged with 1–16 paths. Writes are Catalog-only and journaled; Remove never creates Tags. M0 device acceptance and Syncthing URL/Tag roundtrip remain open. See [development log](../logs/development/261028-0630_catalog-url-bulk-tags.md).\n\n> **Android incoming share implementation update (28 Oct 2026, V0.0.34 candidate):** A scoped POST Web Share Target now queues bounded incoming text/URL in device-local IndexedDB for explicit review. No private content is included in the redirect URL. Review can prefill Capture links, but only Save persists the URL; no Catalog URL resource, file share, or verified Pixel 8 acceptance yet. See [development log](../logs/development/261028-0425_android-share-inbox.md).

> **Link capture implementation update (28 Oct 2026, V0.0.33 candidate):** An optional device-local Capture links tray now supports explicit HTTP(S) multiline paste, clipboard read fallback, normalized deduplication, title editing, open/copy/remove and manual JSON export. It is not a portable Catalog URL resource or Android incoming share target, and M0 physical-device acceptance remains open. See [development log](../logs/development/261028-0332_device-link-capture.md).

> **Progress truth:** See [current milestone/acceptance status](ROADMAP_STATUS.md) for three independently tracked states (**Implemented in code / Verified on devices / Released & accepted**). The broad release checklist below is a requirement list, **not** a completed-feature percentage. M0 real Windows + Pixel 8 tests remain open as of 2026-10-28.

> **Superseding product decision (27 Oct 2026):** Sourcebook is a general file browser first, with optional portable catalogs. Two main sidebar areas: physical folder **Tabs** and **Catalog** (registered-root Folders, nested Tags, saved **Views**). Manual Collections are just tags, optionally pinned; dynamic Smart Folders are **Views**, which save scope/filter *and* display settings. Don't build separate manual Collection or Smart Folder databases. Image editing and annotations are outside V1. **Current prototype:** catalog-free read-only folder browsing with independent persistent Tabs; Catalog Folder projection for registered roots; nested Tags with current-folder search/filter, pinning and explicit bulk Add/Remove. **Current source implementation:** catalog-wide tag discovery and first saved Views (cataloged-resource query + presentation) are implemented; see implementation status for CI evidence. **Now implemented as an opt-in first slice:** saved Views can explicitly scan already-granted Catalog Folders into a temporary read-only index, showing unobjectified resources alongside cataloged ones, with partial-scan and stale-path indications. **Still pending:** filesystem watching, directory-delta detection without explicit user refresh, hardened multi-writer transactions, reliable overlap deduplication and physical device acceptance. Historical backlog wording below is subordinate to this decision.

> **Verified overlap implementation update (27 Oct 2026, V0.0.29 candidate):** Global saved Views suppress unobjectified duplicate paths only when registered Folder roots are physically linked by live `isSameEntry` proof (including a verified nested directory). A cataloged record is never silently reassigned. Conflicting cataloged records or stale/missing bindings remain visible with an overlap warning; source-scoped Views remain independent. Unproven or ambiguous overlaps remain separate. This is read-only, bounded path-level deduplication, not per-file identity proof or cross-device reconciliation. See [implementation status](IMPLEMENTATION_STATUS.md).

> **Subfolder indexing implementation update (27 Oct 2026, V0.0.28 candidate):** An indexed Catalog Folder can refresh one explicitly chosen relative subfolder without traversing its siblings. A verified root handle and complete subtree scan are required before replacing cached entries; cancelled/failed scans preserve the previous snapshot. Only a complete refresh in the current session may assert missing/type changes inside that subtree. This is **user-directed** subtree refresh, not automatic directory change detection or a filesystem watcher. See [implementation status](IMPLEMENTATION_STATUS.md).

> **Device indexing implementation update (27 Oct 2026, V0.0.27 candidate):** Saved Views can persist complete read-only Catalog Folder scans in this device's IndexedDB. A root's cached handle must pass `isSameEntry` before displaying entries, and cached entries are explicitly stale until refreshed. Users can refresh one root while retaining others, inspect added/removed/type-changed path counts and clear the device cache. Incomplete scans cannot replace complete root snapshots or mark catalog records missing. This is *per-root* incremental refresh, not filesystem watching, directory-delta crawling, source-file mutation, cross-device index sync or real-device acceptance. See [implementation status](IMPLEMENTATION_STATUS.md).

> **Sync conflict implementation update (27 Oct 2026, V0.0.26 candidate):** Sourcebook now inventories recognizable Syncthing .sync-conflict- copies inside Catalog metadata directories, classifies them read-only and exports diagnostic reports. Metadata writes, journal replay, backup export and selective restore fail closed while copies exist. There is **no automatic merge or deletion**, and independent canonical edits can still race without producing a conflict copy. Device acceptance and true multi-writer reconciliation remain outstanding.

> **Recovery implementation update (27 Oct 2026, V0.0.25 candidate):** The backup inspector now offers explicitly confirmed, journaled recovery of selected *missing* resource metadata records (up to 250 at once). It validates backup digests, current snapshots, stable identity, Folder/Tag references and duplicate locations, and advances the allocator when necessary. Existing metadata is never overwritten; original files, previews, core metadata restoration, Syncthing conflict merging and device acceptance remain outstanding.

> **Backup implementation update (27 Oct 2026, V0.0.24 candidate):** Catalog metadata can be exported with per-file SHA-256 checksums and inspected read-only against an open Catalog. Backups include raw recovery journals but exclude ordinary source files, previews and device-local folder permissions. Snapshot consistency is checked twice, not filesystem-atomic. No restore or cross-device conflict resolution exists. See [implementation status](IMPLEMENTATION_STATUS.md).

> **Safety implementation update (27 Oct 2026, V0.0.22 candidate):** Catalog-only metadata writes now use a verified, recoverable `.sourcebook-pending.json` journal. Catalog opening detects an interrupted save without replaying it; the user must explicitly resume. Divergent snapshots block recovery. This is **not** cross-device locking, atomic multi-file replacement, Syncthing conflict merging, backup/restore or physical-device acceptance. See [implementation status](IMPLEMENTATION_STATUS.md) and [development log](../logs/development/2026-10-27-catalog-recovery.md).

> **Overlap review implementation update (28 Oct 2026, V0.0.30 candidate):** Catalog metadata with competing records under live-verified overlapping registered Folders can be compared read-only from Settings or a conflicted saved View result. Individual descendant file handles are rechecked with `isSameEntry` and reported as same/different/missing/unverified; differences in Tags, notes, kinds and other fields are exposed, with explicit JSON export and Show in folder. **No automatic reconciliation, deletion or record reassignment.** See implementation status for verification and limits.

> **M0 portable acceptance aids (28 Oct 2026, V0.0.37 candidate):** Device checks can explicitly create a disposable, UUID-named .sb Catalog with journaled nested Tags, URL and saved View, then verify it read-only after restart or Syncthing transfer. Cache inspection is not an offline run. Fixture remains on disk; M0 physical acceptance still open. See [development log](../logs/development/261028-0724_m0-portable-acceptance.md).

> **M0 evidence review update (28 Oct 2026, V0.0.38 candidate):** Device checks can compare two manually exported Windows/Android M0 reports, checking scenario outcomes, same published commit and a hashed UUID fingerprint of the same disposable .sb fixture. This does not prove Syncthing transport or device acceptance. Physical tests remain open; see [development log](../logs/development/261028-0831_m0-cross-device-evidence.md).

## 00 — Executive product promise

**Sourcebook makes ordinary folders feel like a beautifully curated, searchable, visual library — without taking the files hostage.**

Open any granted folder and browse immediately. Optionally attach a portable catalog to enrich selected resources with stable nested tags, notes and previews. Keep originals in place. Store each independent catalog wherever you wish as a portable *.sb directory; access that catalog on desktop or Android using the same installed PWA.

**At V1 a typical person can:** install in Chrome; create a catalog; grant one or more source folders; browse 10,000+ mixed files as effortlessly as a photo library; preview images, PDF, SVG, video and web references; tag in bulk; filter, search and save Views; pin curated tag groups; drop/import/copy/move resources; capture URLs and shared files; switch between catalogs; take data offline; recover safely from sync/permission conflicts.

**Qualitative V1 bar:** it should be a *joy* to use, not merely a feature checklist. Discoverable without tutorials, powerful without persistent UI clutter, fast without flashy animation, and trustworthy when operating on irreplaceable user files.

### 00.1 Inspiration mapping

| Reference | Steal the good idea | Avoid |
|---|---|---|
| [Allusion](https://allusion-app.github.io/) | Existing-folder visual library, hierarchical tags and combined metadata filtering | Image-focused scope, desktop watchers/database assumptions, its terminology |
| Eagle.cool | Immediate visual satisfaction, beautifully legible gallery, quick look, rich previews and efficient tagging | Proprietary mandatory import/copy flow; feature bloat |
| refern.app | Existing-folder indexing, rich metadata, powerful reference organisation, smart queries | Trying to replicate every specialized mode and canvas upfront |
| File Pilot | Fast navigation, tabs, compact breadcrumbs, keyboard interaction, high-quality contextual menus | UI overengineering and desktop-only interaction assumptions |
| [Fold](https://github.com/teodor-andonov/261013-1633_pwa-file-explorer) | Folder-tab navigation, keyboard interactions, previews, safe transfer concepts | Blind code/UI transplant; desktop-only assumptions |

Do not copy layouts, brand assets or proprietary implementation. Use them as *quality benchmarks*.

### 00.2 The four product pillars

1. **Browse** — native-feeling folders + visually excellent files.
2. **Collect** — instant references from files, links, drops, clipboard and Android share.
3. **Enrich** — catalog-aware identity, hierarchical tags, notes and previews; custom fields later.
4. **Rediscover** — search, pinned tags and saved Views.

A fifth cross-cutting pillar underpins all four: **reliability and polished speed.**

## 01 — Product boundary

### Sourcebook IS
- A file explorer for granted source folders.
- A visual catalog for local resources and URLs.
- A metadata layer that does not assume ownership of external files.
- A portable document-like catalog **folder** located anywhere.
- A full-featured Chrome PWA on Windows and Android.
- Offline-capable once the app shell and files are available locally.

### Sourcebook IS NOT
- A cloud service, Syncthing replacement, subscription or mandatory account.
- Notebook (thinking/journaling/freeform pages).
- Objectbook (general authored-object database).
- An all-purpose operating-system file manager with access outside user-granted folders.
- A server-based web crawler or universal webpage screenshot service.
- A 3D CAD application or full editor in V1.

## 02 — Non-negotiable product decisions

**Accepted in conversation:**
- One app on Windows and Android, same main features and near-identical interaction system.
- PWA-first; Chrome is the primary browser target. No mandatory native wrapper, local server or cloud backend.
- Catalog = any folder named Name.sb containing data and previews; can live anywhere.
- Catalog points at any number of user-granted source folders, including overlapping sources.
- Different catalogs can annotate the *same* physical file independently.
- Objectified file naming convention: Name[ab967][c5].pdf = catalog ab, sequence 967; catalog c, sequence 5. New catalog appends its own trailing token; keep others.
- Catalog prefix is user-set and persisted. Resource numbering is sequential *within the catalog*.
- Nonobjectified filesystem entries still appear in browsing, and opening a folder never auto-renames files.
- Folder-first browsing, catalog root links, nested Tags and saved Views are essential; custom fields follow polished tagging.
- Experience is minimal, beautiful, exceptionally smooth.

**Engineering proposals, subject to M0 validation:**
- Vite + TypeScript + React.
- File System Access API on supported Chrome; indexed browser handles saved in IndexedDB; cached local search index in IndexedDB/OPFS.
- Syncable JSON records in *.sb as source of truth; cached thumbnails shareable in previews/ as desired.
- Service worker + web manifest + Web Share Target; fallback clipboard/file picker because Android incoming file shares currently show regression risk.
- No special OS filesystem watch/trash promises; use polling/revalidation, app-managed recovery path when possible, and explicit destructive warnings.

## 03 — The vibe: “Soft Precision”

Design for a feeling: opening Sourcebook should feel like entering a beautifully curated **work surface**, not a dashboard.

- Almost no chrome; the thumbnails and files are the hero.
- Neutral gray surfaces, refined dark and light modes, subtle accent only for focus/selection.
- Lucide outlines, stable stroke weight, no competing icon libraries.
- Spacious when possible, denser when required; adjustable with a single slider.
- Typography over borders; use whitespace, alignment, subtle contrast to create hierarchy.
- Motion has purpose, is short (roughly 100–180 ms), and never blocks interaction.
- Every clickable control has immediate feedback, clear focus and understandable affordance.
- Fixed cards/aspect-ratio placeholders avoid gallery jumping during thumbnail arrivals.
- Hover-only actions always have an accessible touch and keyboard equivalent.
- Sidebars and inspectors are optional; content gets maximum room.
- No decorative badges, gradients, heavy glow, perpetual skeleton shimmer or enormous title headers.
- Dark mode must style viewer canvases, scrollbar, dialogs and image surround — not just chrome.

**Anti-goal:** 40 floating toolbars, seven competing navigation models, or a settings page as complex as Blender.

## 04 — Core mental model

**Browser workspace** — ordinary user-granted physical folders can be opened without a catalog. Folder Tabs hold independent locations and histories. Initial Tabs are folders only; selecting a tag or View changes the main browsing results without spawning tabs.

**Catalog** — optional portable Name.sb directory with registered physical source roots, catalog-specific resource IDs, tags, Views, metadata and previews.

**Catalog Folder** — manually registering an existing directory establishes a source root, with no copy, move, rename or automatic objectification. Objectified resources create a *derived catalog tree* of their ancestor folders down to the nearest/deepest registered root. Example: `C:/tedi/docs/images/gallery/img1.jpg` registered under `images/` appears as `images/gallery/img1.jpg`, never a full Windows drive path. Overlapping registered roots require deterministic deepest-root choice and duplicate protection. Device-specific root grants remain local.

**Resource** — ordinary filesystem file or directory, including saved `.url` links and `.md` notes. Historical Catalog-only URL records remain readable as legacy data pending safe migration.
**Objectification** — catalog metadata identity assignment. Physical filename changes are explicit optional operations, never a side effect of tagging.
**Tag** — stable-ID nested classification and manual grouping; pinning is a shortcut to the *same tag ID*, not new membership.
**View** — one saved scope/filter/query with gallery/list/table settings such as sort, group and density. Results are dynamic.
**Preview** — regenerable derivative, not a new master file.

**Invariant:** No silent source-file changes when opening folders, registering roots, tagging, pinning or navigating catalog results.

## 05 — First 60 seconds (onboarding test)

1. User visits HTTPS app, chooses Install, opens standalone PWA.
2. Landing (planned): **Open Folder** / **Open Catalog** / **New Catalog** / recent workspaces.
3. User creates Research.sb in a selected writable parent folder; chooses suggested catalog code e.g. ab.
4. User adds a source folder via Chrome directory picker, grants read (and write only when needed).
5. File names appear *before* thumbnails complete, with calm layout and progressive preview loading.
6. User resizes gallery thumbnails; opens a preview; adds a tag to a reference.
7. Metadata writes to Research.sb and, if user permits rename-on-objectify, file becomes Figure[ab1].jpg.
8. A saved View can dynamically display the tagged resource.

**UX target:** novice obtains value without learning the words “objectification,” “schema” or “query language.”

## 06 — Three everyday stories

### The researcher
Open a folder with papers, images and simulation outputs. Preview quickly. Tag selected items by theme, compare metadata in list/table, save smart view “high-value PDFs.” Use underlying files without moving them.

### The reference collector
Share URL or image from Android, choose catalog, optionally choose physical destination for a copy. Later open same catalog on Windows, find it via cover/tag/source, collect into a gallery.

### The file organizer
Open ordinary folders as Tabs, navigate and use safe file operations, optionally linking existing roots into catalogs for non-destructive tagging and Views.

## 07 — Product screens and hierarchy

1. **Catalog launcher:** Open/New/Recent. No account, feed or marketing.
2. **Browser:** one app shell with sidebar, top path/command bar, gallery/list/table surface, optional inspector.
3. **Quick Look:** large immediate media/document view, navigation between selection, minimal floating actions.
4. **Properties inspector:** resource preview + inline property editor, tags, notes, file details, operations.
5. **Search/command palette:** fast jump to resources, commands, locations and saved searches.
6. **View management:** save and pin dynamic filters together with presentation settings; use tags for manual groups.
7. **Settings:** catalogs, sources, storage, theme, preview/cache, objectification, shortcuts, privacy, recovery.
8. **Import chooser:** link vs copy vs move, exact target folder, tags, single quick-save default.
9. **Problems/recovery panel:** missing folder, denied permission, duplicates, sync conflicts, corrupted preview, failed operation.
10. **File metadata/schema editor:** compact, discoverable custom property definitions.

Avoid “home dashboards” at V1 unless they actually save the user work.

## 08 — Interaction specification: browser

### 08.1 Sidebar
- Catalog picker at top; compact current name.
- Two main areas: folder Tabs, and optional Catalog with root-linked Folders, nested Tags and saved Views. Pinned tags appear as shortcuts.
- Section collapse, reorder and optional favorites.
- Desktop resizable; narrow-screen sheet/drawer; same information architecture.
- Drag onto physical folder = confirmed file operation; onto tag = catalog-only metadata operation.
- A single compact sidebar with folder Tabs and catalog organisation; no extra permanent rail.

### 08.2 Main toolbar
Breadcrumbs with click-to-jump, back/forward; title/path; global search; sort/filter/group; view switch; density slider; add/import; inspector toggle. Trim into overflow on small widths, retaining same commands.

### 08.3 Items
- Gallery: adaptive cards, variable density, fixed aspect ratio or masonry (user choice), ellipsis filename, quiet file-type treatment, subtle selection.
- List: small thumbnail/icon, name, type, size, date, tags.
- Table: configurable columns and widths, typed properties, sorting, keyboard arrows, optional spreadsheet-like bulk edit.
- Folder: icon/collage cover, name, count optionally lazy.
- URL file: domain preview for an actual `.url` shortcut saved in a Folder, optionally annotated by `.sb` Catalog metadata.
- Search results show source/path context and missing/offline status.

### 08.4 Navigation
- Single click/tap select. Double click/Enter opens folder or quick look depending user preference; Space always Quick Look on keyboard.
- Shift range, Ctrl/Cmd toggle, select-all, drag multi-selection; mobile long press then tap multi-select.
- Forward/back restores scroll, selection and sort in previous location.
- Folder Tabs first, including “Open in new tab.” Tag and View results reuse the main browser without creating tabs.
- Scroll position persists when opening/closing quick look or inspector.
- Explorer-like path handling but no desktop-only affordance essential to basic use.

### 08.5 Menus & keyboard
- Right-click/long-press contextual menu with concise sections; menu has no inaccessible actions.
- Command palette Ctrl/Cmd+K; Escape closes topmost layer; / focuses search (configurable).
- Rename F2, select all Ctrl/Cmd+A, copy/cut/paste, Delete safe delete action, Enter open, Space Quick Look, arrows focus/select, Back/Alt+Left navigate back.
- User can customize shortcuts after initial stability.

## 09 — Selection and bulk actions

- Selections survive sorting/filtering only when coherent; show selection count and scope.
- Contextual multi-selection actions: Tag, Copy/Move, Objectify, Preview/More; no parallel manual Collection membership control.
- One inspector can display common/mixed values across selection.
- Assign same tag to 250 images without 250 modal prompts.
- Progress, cancellation and recovery visible for physical operations; optimistic immediate UI only when rollback is possible.
- Bulk rename has preview + conflict handling, never accidental loss of catalog tokens.

## 10 — Objectification and filename identity

### Canonical examples
~~~text
Facade Study.pdf                 # visible, not yet objectified
Facade Study[ab967].pdf          # catalog ab object ID 967
Facade Study[ab967][c5].pdf      # also catalog c object ID 5
Timber[ab968]/                  # folder identity when allowed
~~~

**Parsing**
- Split name and extension carefully; dotfiles and multi-dot filenames tested.
- Recognize only catalog codes known to this installation or files matching validated terminal token grammar. Do not strip arbitrary bracket text.
- Append token at final basename position, preserving any existing tokens of other catalogs.
- If own token already exists, reuse identity. Multiple own tokens = error, not silently choose one.
- Display clean filename in app by default; full raw name exposed in inspector and rename.
- Catalog code immutable; verify collision when another catalog shares sources.
- Original files untouched unless explicit metadata/objectification action uses configured safe policy.

**Allocation**
- Each catalog stores next-sequence advisory value; commit allocation with write verification.
- Two devices offline may select the same integer. Because Syncthing is not an allocator, detect duplicates on later scan and protect both records/files.
- V1 must offer deterministic collision repair with preview, choice of retained ID and safe filename/metadata remapping. Never silently merge two distinct objects.
- No user-facing global UUID in filenames; internal sync record identity/version markers are permitted for integrity.
- No forced renaming of filename-sensitive resources (CAD linked assets, HTML dependencies, video project media). Provide metadata-only binding and warn about move portability.
- File duplicate handling: moving preserves identity; copying into same catalog prompts whether to treat as new resource / preserve external catalog tokens.
- Safe rename/move workflows must preserve all catalog suffixes, and log before/after paths for possible recovery.

**PWA operation constraint**
Chrome's File System Access API does not promise a universal atomic rename/move for arbitrary external files/folders. Probe runtime capability; otherwise a copy-verify-delete sequence can be destructive and should not be advertised as atomic. Support staging, digest/size verification, abort/rollback where practicable, and flag unsupported cases. Refuse unsafe large/directory moves rather than risk data.

## 11 — Catalog directory format (versioned)

Illustrative **proposed** Name.sb directory:

~~~text
Research.sb/
  catalog.json                 # schema version, stable catalog identity/code, settings
  sources.json                 # logical sources and relative roots, no global device paths
  properties.json              # typed property definitions
  tags.json                    # hierarchy; stable tag IDs
  views.json                   # named query/scope + display settings (not yet implemented)
  resources/
    ab1.json                   # per-resource records: sync-friendly, versioned
    ab2.json
    ...
  previews/
    ab1-sm.webp
    ab1-lg.webp
    ...
~~~

**Device-private data** lives in IndexedDB/OPFS within the PWA origin, not inside synced Name.sb: granted FileSystemDirectoryHandles (where serializable), source-ID-to-handle map, search index, pending operations, local preview caches, recently-opened locations, UI panel sizes. Installed PWA + website of different origins have *different* browser storage; deployment origin is stable.

**Catalog source of truth** is the portable Name.sb JSON files; IndexedDB index is disposable. The *.sb directory must remain ordinary Syncthing-friendly files. Never require sync of an open SQLite DB. Every metadata write must be recoverable after a crash, partial write or Syncthing conflict.

### Example record
~~~json
{
  "formatVersion": 1,
  "catalogCode": "ab",
  "resourceId": "ab967",
  "kind": "file",
  "sourceId": "src-research",
  "relativePath": "facades/Facade Study[ab967].pdf",
  "fingerprint": {"size": 2713451, "mtime": 1793056000000},
  "title": "Facade Study",
  "tags": ["tag-timber", "tag-envelope"],
  "properties": {"rating": 4, "year": 2024},
  "notes": "",
  "revision": 3
}
~~~

URLs use same resource store and catalog-assigned record IDs, but without embedded filesystem filename tokens. URL record has source URL, metadata/cover, optional cached screenshot. For readability, catalog uses resources/ab967.json; avoid separate unrelated URL subsystem.

### Recovery rules
- Versioned schemas with migration + backup.
- Atomic-ish writes: write temporary record, verify and replace only when supported; never trust OS rename atomicity from browser for external files.
- Preserve Syncthing conflict copies and surface reconciliation.
- Local index rebuild from records and source scan.
- Catalog file backups/export before schema migrations.
- Safe state when catalog becomes read-only; browse and present non-destructive actions.

## 12 — Local handles and cross-device portability

- No absolute Windows paths in synced records.
- Store logical source ID and relative location, then resolve using a **per-device folder grant**.
- Save handles in IndexedDB as allowed; prompt to re-grant when permission has expired.
- On Android, picker capabilities, provider latency and available folders depend on Chrome + Android file provider. Test *actual Syncthing output folder* on Pixel 8.
- A catalog may point to a source not synchronized to current device: show metadata and cached previews, mark source offline/disconnected.
- Reconnect maps logical source to a new local directory. Never delete metadata because source is temporarily unavailable.
- Browser storage may be evicted; *.sb retains truth. Re-granting selected directory must restore catalog.

## 13 — File operations policy (PWA-compatible)

| Operation | V1 promise | PWA-specific considerations |
|---|---|---|
| Browse/read | Required | User-granted directory handle; permission may need regrant |
| Create file/folder | Required where writable | Handle APIs + validation |
| Import/copy | Required | Stream/chunk when possible, verify destination before completion |
| Rename | Best-effort with safe fallback | External move() not universally available; copy-verify-remove not blindly atomic |
| Move | Same as rename, with explicit target | Directory moves/high-risk structures need feasibility gate |
| Delete | Controlled deletion only | OS Recycle Bin/Trash not guaranteed from PWA; present exact irreversible action |
| Open/reveal externally | Feature-detect | Native “open with default app” and reveal path may be unavailable; use browser preview/download |
| Watch changes | Incremental refresh/poll | No guaranteed universally available filesystem observer |
| File association | Desktop supported scenario | Android may need share/menu flow; no universal file handler claim |
| URL fetch/screenshots | Limited by browser web security | CORS prevents arbitrary metadata requests; extension or opt-in service later |

**Trust rule:** It is better to honestly disable a risky operation than to expose a seemingly functional button that can destroy a source file.

## 14 — Import and capture: a single coherent model

### Input channels
- Drag physical files, folders or images into app.
- Paste plain text to create a real `.md` file; a single HTTP(S) URL becomes `.url`; file/image imports also need a physical target.
- “Add existing folder” to scan in place.
- “Choose files” button from device picker.
- Installed PWA Android share target for shared text/URLs and files when reliable.
- Optional Chrome extension for one-click webpage/image selection in later milestone.
- Save a URL as a real `.url` file in a user-granted Folder, then optionally attach Catalog Tags/Notes.

### One capture flow
1. Input arrives; quick preview/chip appears.
2. Choose Catalog (recent default).
3. Choose **Reference in place / Copy into / Move into / Bookmark URL** depending type and permission.
4. When physical file is written, choose exact destination folder; remembered last choice for speed.
5. Optionally tag in the catalog; persist with verification and provide Undo only where truly supported.

**Quick capture**: one-tap/one-click after defaults set; extended drawer when choices matter.

**Android note:** Chrome Web Share Target is the intended path for links and files. A documented Chrome 153 regression in September 2026 loses shared file payloads in some installed PWAs. Release testing must verify device/browser; provide robust fallback via clipboard paste / file picker until fixed. Never promise unsupported Android system share reliability. For text/URL, test separately.

### Web metadata
- Saving URL succeeds instantly using original URL/domain/title placeholder.
- Optional favicon, OG image, document title where safe/available.
- Arbitrary cross-origin HTML metadata cannot be fetched reliably from the PWA due to CORS. Browser extension can capture metadata of current tab; optional server only if explicitly added with privacy policy later.
- Full-page screenshots require browser extension, user-supplied image or an explicitly optional backend; not a core PWA-only guarantee.

## 15 — Preview pipeline

**Never gate navigation on thumbnail completion.** A background queue generates and caches progressive small/large previews.

| Type | Essential viewer/thumbnail | Enrichment |
|---|---|---|
| JPG/PNG/WebP/GIF/AVIF | decode, orientation-aware thumbnail, zoom | EXIF and color palette where accessible |
| SVG | safe image rendering, scalable quick-look | dimensions, background controls |
| PDF | first page cover and page navigation (PDF.js or equivalent) | page count/text extract if performant |
| MP4/WebM | video element, frame extraction when supported | duration |
| TXT/MD/code | text excerpt / file icon, basic reading | syntax, line count optional |
| URL | domain card + available metadata image | extension-captured title/favicon/cover |
| Folders | icon/collage, item count computed lazily | curated cover option |
| Unsupported | clean extension icon and file metadata | custom cover attach option |

Controls: fit/fill, viewer background light/dark/checker, rotate/zoom/pan for images, fullscreen, next/previous, open raw/download. Preview worker concurrency limited to keep scrolling fluid; visibility-based priority; last-viewed/next-neighbour prefetch; cache invalidation on file change.

Failures have fallback cover and a non-intrusive retry, never infinite spinner or app crash.

## 16 — Registered roots, Tags, Views and deferred properties

### Root-linked catalog Folders
- Register existing physical directories manually without importing, moving or objectifying their contents.
- Auto-expose only ancestors between an objectified resource and its nearest registered root. Never include drive-wide absolute paths in portable records.
- Where roots overlap, choose deepest safely resolving root; reject ambiguous identity collisions and keep per-device handle mappings separate.

### Nested Tags (manual grouping)
- Stable IDs and parent links in tags.json; resources store tagIds.
- Compact hashtag pills, existing-tag suggestions and keyboard selection, tag search/descendant filtering, safe bulk edit and eventual rename/reparent/merge.
- Pinning a tag adds an optional persisted shortcut by the same ID, preserving full hierarchy and resource membership. `#Collections/Temp-01` is a perfectly adequate manual collection.
- Later: catalog-wide tag browsing, safe sync-conflict reconciliation. No independent manual Collection memberships.

### Views (dynamic query + display)
- A named View saves scope/filter conditions **and** gallery/list/table settings (sort, group, density, optional columns).
- Predicates progressively cover filename/type/source/path, tag and descendants, dates/size, offline/objectified status and later optional properties.
- Rename, edit, pin, delete Views without copying underlying files. Do not implement separate Smart Folder data.

### Deferred custom fields
- Use derived basic file metadata automatically; notes remain optional.
- Full custom-property schemas and ratings come only after nested tagging, browsing and persistence work reliably. Image editing/annotation is deferred.

## 17 — Search / command layer

**Two scopes that must not be confused:**
- Search resources by name/path/tags/notes/URL/properties.
- Command palette for navigation and actions.

Fast search with suggestions, fuzzy basename matches, keyboard selection, filters and saved searches. Results across catalog with source context; optionally scope to current folder/tree. Search offline missing-source records too, marking originals unavailable.

Initial index in memory/IndexedDB; don't reread 50k files on each keystroke. Update incrementally when source refreshes, records change or a sync conflict is resolved.

V1 “spotlight” overlay: type a few letters to jump to folder, file, View, tag or command.

## 18 — Android is a full first-class client

**Do not build a separate mobile capture-only product.** Same catalog model, gallery, list/table, inspector, tag editor, query builder and operations.

Adaptive rules:
- At wide viewport: sidebar + main content + optional inspector.
- At narrow viewport: main gallery fills screen, collapsible navigation drawer, inspector as sheet/fullscreen, toolbar with visible critical actions.
- Long press = context/multi-select; pinch zoom density optional; swipe back respects navigation history and PWA gestures.
- Tap targets ~44px or larger where appropriate; keep dense cards without tiny controls.
- Use pointer/keyboard detection, not device-type assumptions (Pixel 8 may connect to external monitor/mouse).
- All desktop actions have accessible touch paths and vice versa.
- No hover-only features.
- Screen rotation, small widths, virtual keyboard, soft navigation, Android sharing must be tested.
- Direct user-granted folders may be slower on some Android providers; progressive UI and cancellation necessary.

## 19 — Responsiveness, performance and memory budgets

These are **targets subject to benchmark on reference devices**, not guaranteed capabilities.

| Measure | Initial target |
|---|---|
| Installed app warm startup | first interactive shell <= 1s desktop / <= 2s Pixel 8 |
| Open indexed directory | responsive frame within ~100ms; item fill progressive |
| Cached preview quick look | usually <= 150ms |
| Tag click / selection | immediate next frame, optimistic save |
| Search in 20k resource index | typical <= 100ms |
| Scroll | aim 60fps in 10k+ item galleries |
| Large catalog | 50k resource stress scenario, virtualized, no DOM explosion |
| Indexing | incremental, progress visible, does not monopolize main thread |
| Background preview | cancellable, bounded, never stalls user input |
| Offline startup | usable local shell + connected local source if permission available |

Measure p50/p95, long tasks, frame drops, input latency, memory pressure, thumbnail decode time, cache footprint, cold/warm visits. Write benchmark fixtures and record real test hardware/browser versions.

**Techniques:** virtual list/grid, IntersectionObserver prioritization, offscreen bitmap where supported, decode worker, progressive scanning, batched state writes, IndexedDB indexes, dedicated thumbnail worker(s), LRU cache, cancellation tokens, stable DOM keys, ResizeObserver only where useful, skeleton slots that preserve dimensions, no re-render of every visible card on one selection change.

## 20 — UI micro-interactions / polish backlog

- Preview cards fade in once, gently, without shifting position.
- On selection: subtle edge/tint, count display, toolbar becomes available with no jank.
- On rename: filename edit focuses basename but never accidentally selects token/extension unless explicitly requested.
- Tags add/remove via fast autocomplete chip editor without modal.
- Breadcrumbs respond immediately; right click context menu at cursor, within viewport, dismiss naturally.
- Slider zoom of gallery density should smoothly reflow while preserving approximate scroll anchor.
- Inspector edits save automatically with unobtrusive saved/failed state.
- Scroll and keyboard position preserved between preview, inspector and browser.
- Drop targets show exact outcome (“Copy 3 files to Materials/”), not a generic highlighted box.
- Persistent sidebar width, view mode and theme; no sudden reset after PWA update.
- Tooltips appear only after short delay; accessibility labels even when icon-only.
- Notification toast is quiet, actionable, dismissible, never blocks content.
- Animations respect reduced motion. No overlay traps when Android Back pressed.
- Offline/missing source badges are precise but visually restrained.
- No giant modal for common action with one obvious default.
- Always use exact destructive vocabulary: “Delete permanently” rather than “Move to trash” if Recycle Bin is unavailable.
- Use hidden/raw ID suffix presentation consistently in list, gallery, quick look, inspector and renaming.

## 21 — Information architecture and persistence

### Catalog-level
Name/code, registered source roots, resource records, stable-ID tags with pin flags, saved Views and optional later custom properties.

### Device-level
Handles to chosen catalog and source folders, granted permissions, local mapping, transient operation log, local index and cache, recent catalogs, panel sizes and UI settings. Stored in IndexedDB/OPFS.

### Resource-level
ID, source identifier, relative path/URL, optional fingerprint, preview revision, notes, stable tag IDs, optional metadata and timestamps.

### Privacy
No mandatory telemetry, upload, external indexing, account or tracking. URL metadata fetching obeys origin/CORS limits; no covert proxy. Opening remote URLs may make network requests as expected; mark optional external services clearly if ever introduced.

## 22 — Sync, offline, concurrency

The PWA is **not** a sync engine. Syncthing may replicate the chosen *.sb folder and selected source folders separately.

- Catalog JSON source of truth can be re-read after external file changes.
- Filesystem refresh on focus, folder reopen, explicit refresh, and optional interval (power-conscious).
- Do not rely on live cross-device file watchers in the browser.
- Any partial write or sync conflict is recoverable. Keep conflicted copies until explicitly reconciled.
- Per-resource JSON limits blast radius of concurrent edits but does not magically merge them.
- Catalog counter conflicts are possible offline. Reconcile IDs without losing external file or metadata; users see a Problems panel with clear repair guidance.
- Metadata updates have revision markers; reject unverified overwrite if an external edit has occurred.
- Imported files and catalog metadata may sync at different times; show waiting/offline until file arrives.
- Previews are disposable; catalog records are not.
- On source-remapping failure, preserve records and cached previews rather than deleting metadata.

**Release standard:** A realistic offline Windows+Android conflict test must demonstrate no silent data loss.

## 23 — Safety, reliability and security

- Never scan outside explicitly granted root. Respect sensitive directory restrictions.
- Treat SVG/PDF/HTML, untrusted URIs, large images and malformed media as potentially hostile. Sanitized rendering or controlled trusted decoder.
- Reject path traversal, URL schemes that execute code, invalid file names; avoid infinite symlink traversal.
- Confirm irreversible changes; file deletes are not silently sent to an OS trash that PWA cannot access.
- Safe imports write to new destination or temp where feasible, verify byte size/digest and avoid silent overwrite.
- Preview failures cannot crash whole app.
- Backup/export and restore validated before V1.
- Catalog migration includes recovery copy and version gate.
- Service worker upgrades cannot interrupt an open data write.
- Sensitive file content never automatically uploaded to any service.
- IndexedDB/OPFS eviction yields graceful regrant/rebuild, not loss of portable catalog truth.

## 24 — PWA technical architecture

### Proposed stack
- **Vite** build/tooling.
- **TypeScript** for all core operations and view model.
- **React** for UI (or similarly small framework if a spike proves superior).
- **PWA manifest + service worker** for install/offline/app shell and share target.
- **File System Access API** for user-granted file/folder handles.
- **IndexedDB** for handles, local per-device index, operation journal, recent state.
- **OPFS** for high-volume local cache only where it helps.
- **Dedicated Web Workers** for indexing, searchable metadata, preview jobs.
- **PDF.js** or suitable PDF renderer. No platform native shell required.
- **Lucide** icons; custom CSS tokens for Soft Precision, no heavy opinionated UI kit.

### Separation of responsibilities (not different applications)
~~~text
src/
  app/             # lifecycle, navigation, PWA startup
  browser/         # main gallery/list/table, tabs, inspector
  catalog/         # format, metadata, migration, save/reload
  identity/        # token parser, sequence allocator, dedupe
  filesystem/      # handle picker, permissions, read, copy/move/trash policy
  organization/    # registered roots, tags and Views; optional later properties
  capture/         # drag/drop, clipboard, share-target, URL
  preview/         # adapters by MIME/type, cache, quick-look
  search/          # local index, query execution, command search
  platform/        # capability detection (not native wrapper)
  ui/              # design tokens, primitive components, motion
  workers/         # expensive background tasks
  tests/           # e2e, fixtures, perf, conflicts
public/
  manifest.webmanifest
  icons/
  service-worker/
docs/
  ROADMAP_V1_ULTRA.md
  PLAN_V0.1.md
  PWA_ARCHITECTURE.md
  UX_QUALITY_STANDARD.md
logs/
  decisions/
  development/
  ideas/
~~~

This is a *modular PWA*, not multiple separately integrated products. Do not prematurely split repositories/services.

## 25 — Web capability feasibility matrix (Chrome-first)

| Capability | Expected strategy | Status until tested |
|---|---|---|
| Select folder Windows Chrome | showDirectoryPicker | API documented; exercise in real build |
| Select folder Android Chrome | showDirectoryPicker (Chrome 132+) | API documented; Pixel 8 + Syncthing folder test |
| Save files into granted folders | createWritable via file handle | Permission and provider behavior test |
| Persist catalog/source handles | IndexedDB handles + permission recheck | Session/reboot test |
| Install app standalone | manifest + service worker | HTTPS GitHub Pages or another secure origin |
| Offline app shell | service worker caching | Test version/update and reload |
| URL share into installed Android PWA | Web Share Target | Test Chrome version + data variations |
| File share into installed Android PWA | Web Share Target | Known Chrome 153-era regression; must provide fallback |
| Open file from OS into PWA | manifest file_handlers | Desktop Chrome scenario, not core mobile path |
| Arbitrary folder move/rename | capability detection, staged fallback | Not universally atomic; don't promise until proven |
| Recycle Bin / OS Trash | No universal web API | Controlled delete + backups/recovery |
| Real-time directory watching | feature detect FileSystemObserver; fallback refresh | Not a universal guaranteed API |
| Arbitrary page fetch/OG/screenshot | Web security/CORS limited | Browser extension or user-provided data |
| Background filesystem access | No permanent unrestricted background access | Foreground revalidation/index strategy |

### Deployment
- Initially GitHub Pages under stable HTTPS origin with correct base path, offline caching and manifest URLs; custom domain later only with origin migration plan.
- When moving origin, previously granted handles/IndexedDB do not transfer automatically. Choose stable origin early.
- Build/test service worker upgrades; cache bust and schema upgrades carefully. The app should update on launch/idle without wiping catalog references.
- Browser-only fixture/demo mode without disk permissions for UI iteration; real catalog mode is explicit.
- Chrome Windows desktop and Chrome Android are supported targets. Other browsers can receive read-only/demo fallback, but V1 feature parity is not promised outside the chosen scope.

## 26 — Release train at a glance

| Release | Product milestone | What becomes real |
|---|---|---|
| **V0.0** | Technical proof | PWA installs; folder picker; real browse/read/write on Windows + Android |
| **V0.1** | Beautiful explorer | Gallery, navigation, previews, inspector, list, tabs, dark/light, offline shell |
| **V0.2** | Portable catalog | *.sb persistence, source mappings, objectify/filename IDs, reconnection |
| **V0.3** | Tag-first organization | Nested stable tags, pin shortcuts and safe bulk tagging |
| **V0.4** | Discovery | Catalog-wide search, saved Views (query + presentation), grouping |
| **V0.5** | Collect anything | Drag/drop, import destination, clipboard, URL bookmarks, Android share fallback |
| **V0.6** | File-manager quality | Safe copy/move/rename/create/delete semantics, tabs, history, keyboard commands |
| **V0.7** | Rich media | PDF multipage, image zoom, better videos/text/SVG, cache refinements |
| **V0.8** | Power & delight | Quick batch actions, customizable gallery, command palette, thoughtful polish |
| **V0.9** | Hardening beta | Large-library benchmark, conflicts, backup/restore, permission recovery |
| **V1.0** | Daily-driver release | Reliable, fast, feature-complete Chrome PWA on Windows + Android, polished and documented |

**Important:** early releases may combine features based on technical dependencies. Version labels mean meaningful working vertical slices, not arbitrary date promises.

## 27 — V0.0: PWA / filesystem technical spike

**Goal:** No native wrapper assumptions. Test the exact architecture on both platforms first.

- [ ] Initialize Vite/React/TypeScript, lint/typecheck/test, Chrome PWA manifest + service worker.
- [ ] Set GitHub Pages deploy workflow with HTTPS and stable scope.
- [ ] Install standalone on Windows and Pixel 8.
- [ ] Open user-selected *.sb directory with read/write and save a JSON file.
- [ ] Pick actual Syncthing-synchronized folder on Android and enumerate/write a test file.
- [ ] Persist handles in IndexedDB, close app/restart/reopen, reauthorize gracefully.
- [ ] Prove listing 500 real entries without blocking first paint.
- [ ] Create thumbnail for image, SVG and first PDF page in browser.
- [ ] Test copy / create file / rename capability detection on chosen roots.
- [ ] Test receiving Android shared text/URL and file; document exact Chrome build / regression.
- [ ] Test app offline after initial installation, and service worker upgrade path.
- [ ] Write ADR for PWA capabilities and known limitations.

**Release gate:** An installable PWA can open the same concept of catalog and real chosen folder on Windows/Android, with clearly understood permissions. Do not skip this gate.

## 28 — V0.1: “I love browsing in it”

**Goal:** Before clever catalog metadata, Sourcebook should be a superior visual browser.

- [x] Initial read-only Open Folder without catalog (V0.0.9 code; CI/device validation still pending). Open/New Catalog remains available; multi-folder Tabs/recent workspaces are incomplete.
- [x] Standalone physical folder Tabs, nested-folder opening, independent back/forward histories and device-local restore (V0.0.11; CI/device verification pending). Complete Catalog Folders/Tags/Views integration remains open.
- [ ] Gallery uniform adjustable grid + list; optional compact tile mode.
- [ ] Resizable desktop panes; collapsible inspector/drawer on Android.
- [ ] Image/SVG/PDF-first-page thumbnails, safe fallbacks for others.
- [ ] Quick look overlay with keyboard/touch next/previous.
- [ ] Basic file details in inspector, native raw filename/path accessible.
- [ ] Multi-select, shift selection, long press, context menu, keyboard controls.
- [ ] Light/dark/system themes including viewer.
- [ ] Responsive layout at phone widths without alternate product design.
- [ ] Virtualized item lists and measured 10k fixture gallery.
- [ ] Focus/scroll restoration and accessible controls.
- [ ] Empty/loading/error/permission states.

**Gate:** Real files, no objectification, already delightful on both devices.

## 29 — V0.2: Portable identity

- [ ] Portable *.sb schema v1 and migrations.
- [ ] Catalog switcher and recent catalogs.
- [x] Catalog Folder sidebar shows registered roots and derived ancestor paths from objectified resources (V0.0.13; CI/device validation pending). Overlap resolution at save time and source exclusions remain open.
- [ ] Device-private source mapping; sync folder reconnect.
- [ ] Sequential catalog resource allocation, token parser and display clean name.
- [ ] Safe objectify flow with ask-first/auto/never rename preferences.
- [ ] Per-resource JSON write and restore; preview key mapping.
- [ ] Multiple independent catalogs referencing same physical file.
- [ ] Rename/move token re-discovery; missing/offline states.
- [ ] Detect duplicate/colliding tokens and recover safely.
- [ ] Catalog metadata backup/export.

**Gate:** File[ab1][c1].pdf can be annotated in two catalogs; both identities persist through ordinary browsing and source regrant.

## 30 — V0.3: Tags as the only manual grouping
- [x] Early V0.0 previews: stable nested taxonomy, hashtag pills, keyboard suggestions and current-folder tag search (CI passed; device validation pending).
- [x] Pin/unpin shortcuts using stable tag IDs (V0.0.8 implementation; independent device validation pending).
- [ ] Bulk assign/remove tags with safe writes and conflict checks.
- [ ] Tag rename/reparent/merge by ID. Catalog-wide nested-tag browsing and pinned discovery implemented in V0.0.15 (CI/device validation pending).
- [ ] Keep original files untouched; no manual Collections database or early custom-property framework.

**Gate:** Curate, pin, reopen and search a nested tag without changing ordinary source files.

## 31 — V0.4: Saved Views
- [ ] Full catalog-wide metadata search and multi-criteria filtering; read-only catalog-wide tag-result browser added in V0.0.15 with metadata-only offline results.
- [ ] Scope/query builder for names, types, dates, sources and tag descendants, with lightweight filter chips.
- [ ] Extend saved Views beyond current scope, search, compound tags, file type, scanned-file status and Gallery/List/Table with grouping. **Column visibility presets** and status filters are implemented in V0.0.21 (CI/device validation pending); custom widths, drag reordering, richer query composition and export remain pending.
- [x] Rename, edit, pin and delete Views, with an optional file-type filter (V0.0.17; validation pending). No separate Smart Folder records.
- [ ] Clicking Views changes the content area, not the physical folder Tabs; jump to source folder available.
- [ ] Keyboard navigation and reuse of the same preview/inspector.

**Gate:** Reopening a synced catalog reproduces a View and its current live results.

## 32 — V0.5: Capture / import

- [ ] File/folder drop onto browser and folder.
- [ ] Reference/copy/move choice with remembered default.
- [ ] Explicit destination picker with path preview and conflict policy.
- [ ] Clipboard paste image/text/URL.
- [ ] File-backed URL `.url` capture, folder-backed Catalog identity and domain/cover preview. New writer implemented as V0.0.39 candidate; safe migration of old Catalog-only URL rows, device acceptance and native Android opening remain pending.
- [ ] Android PWA share-target handling of URL/text.
- [ ] File-share capability test + fallback import path for Chrome regression.
- [ ] Batch file ingest with progress and safe cancellation.
- [ ] Optional tags during capture.
- [ ] One-click quick capture with recent destination after initial setup.

**Gate:** Save a reference from phone or laptop in moments without opening a big workflow.

## 33 — V0.6: Serious file management

- [ ] New folder, rename (safe fallback), copy, duplicate, move, delete policy.
- [ ] Copy/cut/paste and drag onto source folder; path preview.
- [ ] No silent overwrite; skip/replace/rename resolution.
- [ ] Batch operation queue with visible status and failure recovery.
- [ ] Operation journal and undo where technically safe.
- [ ] Refresh and incremental rescan on focus/navigation.
- [ ] Folder exclusion/hidden files toggle and sort by source properties.
- [ ] Right-click 'Open in new tab' and further recently visited/session refinements; folder-tab inspector action and Ctrl+Enter already implemented in V0.0.11.
- [ ] Shortcut map / command palette and mobile equivalents.
- [ ] Refuse unsupported destructive moves rather than fall back silently.

**Gate:** Daily ordinary file-management tasks work within granted roots, with explicit limits and no data-loss surprises.

## 34 — V0.7: Rich media

- [ ] Image viewer: fit/fill/zoom/pan, checker and dark surround.
- [ ] PDF.js page navigation, thumbnail strip optional, selection/copy if practical.
- [ ] SVG sanitized high-quality viewing.
- [ ] Video player + cover extraction where supported; metadata duration.
- [ ] Text/Markdown preview with code fallback and safe no-script HTML text mode.
- [ ] Folder collage/custom covers (optional).
- [ ] URL visual cards, user-selected cover.
- [ ] Cache limits/invalidation; preview regeneration.
- [ ] Fullscreen/keyboard/mobile gestures refined.

**Gate:** Browse mixed research folders without launching other apps for every quick inspection.

## 35 — V0.8: Power features with restraint

- [ ] Command palette commands and global quick navigation.
- [ ] Multi-select bulk tags and safe physical operations; custom properties deferred.
- [ ] Quick filter combinations and saved presets.
- [ ] Gallery aspect-ratio options, variable card metadata, density controls.
- [ ] Pin registered source folders, stable-ID tags and Views.
- [ ] Thumbnail cover picker and file/folder custom cover metadata.
- [ ] URL capture improvements (extension-assisted metadata **if** needed).
- [ ] Keyboard shortcut overlay and contextual command hints.
- [ ] Smoothness audits, motion refinement, keyboard accessibility.
- [ ] Optional viewer side-by-side comparison if performance remains excellent.

**Gate:** More power does not mean more permanent interface clutter.

## 36 — V0.9: “You can trust it”

- [ ] Sync-concurrency tests, including two offline devices colliding on resource IDs.
- [ ] Syncthing simultaneous edits and conflict-file recovery UI.
- [ ] Crash/forced-reload during metadata write.
- [ ] Catalog migration/restore and missing-source remap.
- [ ] Android permission revocation, Chrome update and service worker update.
- [ ] Browse 50k fixture entries, sustained scroll and heavy thumbnail work.
- [ ] Large files, corrupt PDFs/SVG, weird names, deeply nested paths, symlink loops.
- [ ] Cold/warm startup measurement, FPS/long tasks memory profile.
- [ ] Touch, mouse, stylus, keyboard, external-monitor checks.
- [ ] Accessibility checks (contrast, focus order, screen reader basics).
- [ ] Privacy/security audit; no surprise network calls.
- [ ] Zero critical data-loss bugs and zero unexplained app crashes in beta.

**Gate:** Personal daily use for real work without needing to trust the app blindly.

## 37 — V1.0: Daily driver

V1 is not “we implemented every possible file type.” It is a complete, consistent, tested **daily reference workflow** that feels substantially better than browsing a folder tree in a normal file explorer.

### V1 must ship
- [ ] Installable HTTPS Chrome PWA with reliable offline app shell.
- [ ] Windows and Android feature-parity core experience.
- [ ] *.sb catalogs stored anywhere user grants; source folder remapping.
- [ ] First-rate gallery/list/table; navigation/tabs/preview/inspector.
- [ ] Images/SVG/PDF/video/text/URLs with graceful fallbacks.
- [ ] Catalog-specific bracket IDs and safe identity reconciliation.
- [ ] Nested stable-ID tags with pin shortcuts; registered catalog roots; saved Views; optional restrained custom fields after tagging.
- [ ] Fast full-catalog metadata search + command palette.
- [ ] Drag/drop + file picker + clipboard + Android URL share/capture.
- [ ] Destination-selectable import, safe file operations and clear supported-limit disclosure.
- [ ] Theme and visual polish across every main state.
- [ ] Backup/restore + migration + conflict detection/recovery.
- [ ] Performance validated on real mid-range Windows computer and Pixel 8.
- [ ] Clear README, install instructions, troubleshooting and limitations.

### Explicitly not required for V1
AI/semantic embeddings, cloud sync, user accounts, collaborative sharing, 3D/CAD viewport, image editing studio, full website screenshot server, graph/board editor, semantic cross-app relations, iOS feature parity, exhaustive OS file explorer replacement.

Those can become V1.x products only once the everyday workflow is proven.

## 38 — End-to-end acceptance scenarios (must pass)

A. Open 3 existing folders with mixed files, zero source mutations, gallery starts immediately.  
B. Objectify one file in catalog ab, then in catalog c; verify tokens [ab1][c1], separate metadata and no accidental overwrite.  
C. Move/rename objectified file within granted roots; catalog finds it via token or produces clear manual reconnect when operation is unsupported.  
D. Tag 120 files “Facades/Timber,” bulk rate, store custom year number; relaunch and verify.  
E. Pin #Collections/Daylight-Study and save a View “Recent Timber PDFs” with a tag/type/date query plus gallery settings.  
F. Save a URL, see an immediate useful bookmark card even if no web metadata image can be fetched.  
G. Import photo/URL from Pixel 8 with share target where available, or file-picker/clipboard fallback; catalog/source mapping survives reinstall/grant.  
H. Syncthing transfers catalog to Windows with different file paths; regrant source, same metadata works.  
I. Copy file carrying [ab1], detect duplicate token rather than silently binding both to same record.  
J. Offline desktop and Android objectify simultaneously and collide; both original files + records remain recoverable.  
K. Revoke a directory permission and resume; no metadata loss or endless spinner.  
L. Attempt unsupported native trash/rename; UI describes limits before destructive side effects.  
M. Scroll 10k-gallery on Pixel 8, open images and PDFs, switch theme, multi-select, filter—no intolerable stutter.  
N. Interrupt PWA update in mid-write; active catalog remains consistent or recoverable.  
O. Export *.sb, clear browser site data, reconnect folder, rebuild local index and browse metadata again.  
P. Empty catalog, missing files, malformed SVG, huge PDF, bad URL and unavailable permissions all show useful states.  
Q. 60-second first-run flow succeeds without reading documentation.

## 39 — Performance and polish release rubric

Rate every release on 0–5 for each dimension. **V1 requires no score below 4**, and average >=4.5:

1. Navigation / time-to-first-use.
2. Scroll / selection fluidity.
3. Preview quality and visual consistency.
4. Organization speed / bulk actions.
5. Predictable storage + file safety.
6. Desktop + Android feature parity.
7. Keyboard / touch discoverability.
8. Reliability / crash and conflict handling.
9. Offline / reconnect / permission recovery.
10. Visual restraint / simplicity.

Hold weekly short usability sessions with 5 real tasks:
- Find a reference from a 5k-file folder.
- Tag 20 files by material.
- Save a web reference from Android.
- Move/duplicate an objectified resource.
- Create a filtered view and reopen next day.

Count actions, time, hesitation, errors and “I don't know what happened” moments. Fix the worst friction before adding the next feature.

## 40 — Automated tests and fixtures

**Unit**
- Filename parser, suffix append and preservation, sequence allocation and collision.
- JSON schema validation/migration; nested tag edit; query logic; view serialization.
- Permission/capability behavior, URL validation, preview cache invalidation.

**Integration**
- Multiple catalogs on same file/folder, browser record writes, rescan/reconnect.
- Selection→objectify→rename→metadata persistence.
- File copy/move policy + rollback behaviour under simulated errors.
- Browser update/reload during indexing and metadata save.
- Restore from saved catalog with browser local storage cleared.

**E2E (Playwright Chromium desktop, plus manual Android test matrix)**
- Install/use hosted origin and service worker states.
- Empty/fresh/large catalog interactions and a11y semantics.
- Search/tag/view/quick-look keyboard route.
- Android manual share-to-PWA, long press, slow provider, offline and permission prompts.

**Fixtures**
- 100 files, 10k files and 50k synthetic entries; mixed JPG, PNG, WebP, SVG, PDF, video, text.
- Spaces, emojis, Unicode/diacritics, right-to-left names, dots, brackets, extensionless, case-only renames.
- Two same-named files in different folders; copied IDs; multi-token filename; collision.
- Corrupt PDF, malicious SVG, huge photo/video, zero-byte file, read-only root and disappearing drive.
- Symlink loop, deeply nested folder, catalog located inside scanned source, syncing conflict copies.
- URL without title, OG image or remote CORS approval.

## 41 — Development practices

- Ship vertical slices: demonstrable real user flows, not months of skeletal architecture.
- A new release must not regress startup, FPS, keyboard or data safety.
- Use issue labels: epic / feature / UX / performance / bug / safety / blocked.
- Every substantial decision gets an ADR in logs/decisions with reason and rejected alternatives.
- Logs/development records real work and benchmark results. Logs/ideas captures uncommitted ideas.
- No major visual changes without screenshots at 390px Android, 768px tablet and 1280px desktop.
- No new feature unless it has empty/error/loading/permission/touch states.
- Keep releases small and updateable; avoid adding dependencies simply to save a few lines.
- Use real sample files and Android hardware throughout, not only fake cards in desktop devtools.

## 42 — Critical path: order of operations

1. **Prove PWA filesystem access on Pixel 8 and Windows Chrome** using the real desired synced directory.
2. **Ship visual browsing**, real fast gallery, nothing fake.
3. **Commit catalog data format** with independent source mappings.
4. **Implement objectification/ID invariants** with collision and fallback behavior.
5. **Add catalog organization and search** without sacrificing browse performance.
6. **Implement capture/import** with destination choice and Android share fallback.
7. **Harden file operations** before claiming comprehensive file management.
8. **Polish everything**: real-life usability and performance audits, recovery, documentation.
9. Ship V1 only after the release acceptance matrix passes.

## 43 — Decision register

### Confirmed
- Sourcebook, separate from Notebook and Objectbook.
- Chrome PWA-first, full desktop and Android functionality.
- User-chosen portable *.sb catalog directory + sources outside it.
- Catalog-specific terminal bracket IDs and sequential numbers.
- Folder-first browsing, optional registered catalog roots, stable nested tags and pins, Views, previews and flexible capture/import.
- Smooth, minimal, beautiful, high-functionality application.

### Provisional engineering
- React/TypeScript/Vite, service worker, File System Access API, IndexedDB/OPFS, web workers.
- JSON-per-resource plus syncable catalogs and unsynced browser local index.
- Filename rename fallback for sensitive files and browser safety limitations.
- Catalog term (rather than Workspace) remains working terminology.
- Gallery as default, light/dark neutral Soft Precision visual system.

### Known blockers to validate
- Android Chrome directory permission and Syncthing folder access under exact installed PWA origin.
- External rename/move feasibility and safe behavior for large and linked files.
- Web Share Target file payload regression in 2026 Chrome 153 builds.
- Simultaneous offline sequential ID allocation / sync conflict merging.
- CORS restrictions for webpage cover extraction without extension/service.
- PWA origin stability/permission persistence and service worker update safety.

## 44 — Beyond V1 (do not pollute V1)

Potential future areas:
- AI-assisted tagging / image similarity and natural-language search, opt-in.
- Browser extension with one-click clip page/image/PDF, full-page screenshot, tab metadata.
- Reference comparison/contact sheets/boards.
- Image/file annotations remain deferred beyond V1.
- Auto generated folder previews and semantic color search.
- Powerful rules/automation engine.
- Optional app packaging if web capability limits prove chronic, while preserving PWA as source.
- Any integrations with Notebook/Objectbook only if actual workflows demand them.

---

## Final criterion

**Sourcebook V1 succeeds when users forget they are using a database or an exotic PWA.** It should simply feel like the natural, visual way to navigate and organize their real files — on computer and phone — without ever compromising control of them.

> Make what users do 100 times per day astonishingly good. Hide what they do once a month. Never pretend a dangerous filesystem operation is safe.
