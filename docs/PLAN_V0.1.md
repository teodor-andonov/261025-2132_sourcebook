> **Historical initial plan (2026-10-26).** The master plan is now [ROADMAP_V1_ULTRA.md](ROADMAP_V1_ULTRA.md). Its [PWA-first architecture](PWA_ARCHITECTURE.md) and [ADR 0002](../logs/decisions/0002-pwa-first.md) **supersede the Tauri/native-shell proposals in this document**. Keep this file as the original detailed V0.1 thinking, not as current implementation authority.

# Sourcebook — MEGA Plan V0.1

**Status:** Working implementation plan · **Date:** 2026-10-26  
**Repository:** teodor-andonov/261025-2132_sourcebook  
**Product:** Sourcebook — a local-first, visual file manager and reference catalog  
**Target:** Windows desktop + Android from the same product/UI codebase  
**Guiding benchmark:** Eagle.cool (visual collecting), refern.app (in-place resources), File Pilot (speed and interaction quality)

> **Product north star:** Open any ordinary folder and immediately feel that its contents are a beautiful, fast, visual collection. Enrich only the files you choose. Keep originals where they are. Everything should feel lighter than the system file explorer, not heavier.

## 0. How to read this plan

This is an ambitious V0.1 specification, not a claim that every feature can be built simultaneously. Work in **vertical slices**: every milestone must end in a functional product. Features are classified:

- **P0 — V0.1 release-defining:** Without this, the core promise fails.
- **P1 — V0.1 stretch / next minor release:** Architect for it now; ship if stable.
- **P2 — future:** Important ideas, not a dependency for V0.1.

**Non-negotiable quality gates:** high perceived speed, clean typography, no stutter, no accidental file mutations, good keyboard + touch behaviour, stable persisted metadata, and no phone-only "companion" product.

## 1. Product definition and boundaries

### What Sourcebook is

A visual explorer of ordinary filesystem resources, enriched with optional metadata, previews and catalog-specific organization. The application can access **multiple source folders** and **multiple portable catalogs**; a source folder may be indexed by more than one catalog. URLs can be saved as first-class resources.

**Resource = source + derived preview + optional catalog properties.**

A resource exists for browsing even when it has **not** been objectified; objectification begins when Sourcebook explicitly persists a metadata record and, for compatible writable filesystem resources, appends a catalog-specific ID to the filename.

### What Sourcebook is not

- Not a replacement for the user's full filesystem hierarchy.
- Not a proprietary asset-import vault: no mandatory copying or moving.
- Not Notebook (freeform personal notes / pages).
- Not Objectbook (arbitrary authored objects / database workflows).
- Not a cloud platform or Syncthing replacement.
- Not a universal 3D editor, DAM enterprise suite, or infinite canvas in V0.1.

### Success criteria

A person should be able to:
1. Create or open a named **Catalog** stored anywhere as a normal *.sb folder.
2. Point it to multiple existing folders, with no physical file import.
3. Browse immediately, in a fast visual gallery or compact list.
4. Tag, rate, describe and group selected resources, persisting their records.
5. Search and construct smart folders / saved views quickly.
6. Add links, copy/move/drop files to a selected destination, and capture from Android share.
7. Open that same synced catalog on another device and remap its sources without corrupting data.
8. Open underlying files in other apps, rename, move, copy and trash them safely.

## 2. Inspirations — what to borrow, what not to copy

**Eagle.cool:** thumbnail density/quality, adjustable gallery, lightbox, keyboard-first browsing, rapid collection, tags + smart folders, visual discoverability. **Do not copy** forced managed-library semantics or overload V0.1 with AI.

**refern.app:** index existing folders in place, rich file previews, metadata and tags, smart searches, easy linking and clipping. **Do not copy** its entire workspace/canvas/graph scope.

**filepilot.tech:** extremely responsive file navigation, path discovery, tabs, inspector, keyboard affordances, command palette, contextual actions, restrained chrome. **Do not copy** complexity for its own sake.

**Our product distinction:** portable user-chosen *.sb catalogs; catalog-specific filename IDs; multiple catalogs can independently annotate the same physical file; a single desktop/Android application.

## 3. Terminology

| Term | Definition |
| --- | --- |
| **Catalog** | Named *.sb directory: persistent catalog identity, properties, tags, views, metadata and previews. |
| **Catalog code** | Human-chosen short lowercase prefix such as ab or c, unique among catalogs that may annotate overlapping files. |
| **Source** | Granted folder tree or external source included in a catalog. |
| **Resource** | Indexed file, folder or URL. Visible even without saved metadata. |
| **Objectify** | Persist catalog-specific metadata and, if safe/writable and opted in, append a catalog-specific filename ID. |
| **File ID token** | Filename suffix [catalog-code + decimal sequential number], before the extension. |
| **Tag** | Catalog-owned hierarchical label; nested tags e.g. Architecture / Facades / Timber. |
| **Collection** | Manual set of resource references, unrelated to physical file location. |
| **Smart folder** | Saved live resource query. |
| **View** | Presentation + filtering + sorting + grouping configuration, independently applicable to source, collection or smart folder. |
| **Preview** | Regenerable derivative image/cover, never the original file. |

## 4. Experience principles

1. **Browse first, index progressively.** Show entries before all previews exist; never block navigation for thumbnail completion.
2. **Invisible complexity.** No mandatory import dialogs; advanced settings stay discoverable, not foregrounded.
3. **Fast perceived interaction.** Hover, selection, scrolling, navigation and preview opening must respond without waiting for disk/network work.
4. **One action, one result.** Every operation has an immediate visible state; no silent renames, missing files, or ambiguous storage destinations.
5. **Progressive metadata.** Normal file browsing must work without writing tags or IDs.
6. **Physical and virtual organization coexist.** Folders = real paths; tags/collections/smart folders = catalog data. Never make users think a smart folder physically moves files.
7. **Same app on Android.** Same core commands, data model, catalog and navigation; touch affordances and layouts adapt minimally.
8. **Reversible by default.** Undo, trash, confirmation for destructive/bulk operations, path previews for move/rename.
9. **Local/offline first.** Network required only for user-triggered URL fetch or optional web preview generation.
10. **No decorative UI tax.** Every panel, badge, border, shadow, animation or label must earn its space.

## 5. Core workflows — interaction contracts

### F01 Create/open catalog [P0]
- Welcome screen is minimal: **Open catalog**, **New catalog**, recent catalogs.
- New asks for name, location, catalog code (suggested, editable). Result is a real folder: Name.sb/.
- Opening a catalog immediately restores last selected source/view and browsing state.
- Catalog ownership and source folder definitions are visible in settings; files are not silently copied into *.sb.
- App never scans parent of selected source without permission. Warn when catalog directory is nested inside its own scanned source and exclude the catalog from indexing by default.

### F02 Add sources [P0]
- Add any number of existing folders via picker; can include nested folders on request.
- Each source has stable logical source key, display name, inclusion/exclusion rules and local device mapping.
- Visible initial shell in <= 1 second target, with progressive count and thumbnail jobs.
- Users can toggle recursive browsing, show hidden files, file-type filters and preview policy.
- Multiple catalogs may index the same source; no automatic merge of metadata.

### F03 Browse and navigate [P0]
- Sidebar: Sources (folder tree), Collections, Tags, Smart folders; collapsible sections, responsive widths.
- Main toolbar: breadcrumb/path, search, view switch, sort/filter/group, density/thumbnail slider, add, more.
- Main surface: adaptive gallery (default), details/list view, optionally compact grid.
- Open folders by double click or Enter; back/forward, tab support; open folder in a new tab.
- Clicking one entry selects, Shift selects range, Ctrl/Cmd toggles selections; right click opens native-feeling contextual menu. Long press works on touch.
- Folder tiles have recognisable identity and optionally composite covers.
- Adjacent inspector is collapsible and resizable. Selection can remain while navigating within the current view.
- Empty, loading, missing-source and permission-denied states must be calm, informative and actionable.

### F04 Preview [P0]
- Image files show generated thumbnails; SVG renders safely, PDF renders first page; video uses a first-frame extraction when supported, otherwise icon/cover fallback.
- File extension and original type visible without opening inspector.
- Spacebar = quick-look (or explicit button on mobile); arrows navigate previous/next without closing preview.
- Inspector shows larger preview, original path, size, dates, dimensions/pages, tags and notes.
- Double click opens original file in default OS app (configurable) when not opening a folder.
- Preview cache failures never block normal browsing; allow regenerate preview.
- Do not execute content or load untrusted SVG scripts as part of thumbnailing.

### F05 Objectify [P0]
- Explicit Save properties / Add tag / Add to collection / Objectify command creates a catalog resource record when needed.
- For a compatible and writable file, propose filename suffix insertion; app setting controls automatic vs ask-first.
- Keep known catalog IDs at the end of basename, before extension. Preserve IDs belonging to other catalogs.
- File display name **hides recognized suffixes by default**; full physical name visible in inspector / rename dialog.
- If unsafe to rename, file is read-only or external software depends on the name, create a **path/fingerprint-bound local record without filename mutation**, clearly marked as weaker portability.
- Record retains link to source, file relative path, recognized token, properties and preview reference.

### F06 Tag and property editing [P0]
- Default fields: title override, description/notes, tags, rating, source URL, created/modified dates, type, dimensions, path, file size, objectified status.
- Custom typed properties in V0.1: text, number, boolean, date, single/multi-select, URL; optional color property if inexpensive.
- Inline inspector editing with keyboard support; multi-selection bulk tags/rating/property assignment.
- Nested tags can be created, renamed, reparented, merged; breadcrumbs disambiguate duplicate child names.
- Catalog property schema is versioned. Deleting a property requires confirmation and recovery.

### F07 Collections, smart folders and views [P0]
- Collections manually group any resources and do not move physical files.
- Smart folders are stored queries: type, tags (include descendants toggle), filename, path/source, property comparison, rating, date, size, has preview, objectified.
- AND/OR grouping for filters; one-click Save as Smart Folder.
- Saved views persist gallery/list mode, density, sort, group, visible fields and filter. A view does not own the data.
- Filters visibly indicate when active; clear-all is always accessible.
- Drag resources onto collections/tags to assign, with clear feedback; dragging onto physical folder defaults to an explicit file operation.

### F08 Add files & URLs [P0]
- Drag/drop files or folders from OS and app; choose reference in place, copy or move, with default action remembered per catalog.
- When copy/move, user chooses a destination within an accessible source or a new destination; clear destination breadcrumb before commit.
- Paste image from clipboard, paste URL as bookmark, choose local file, import from device share sheet.
- URL is a catalog resource even without a corresponding physical file. Store original canonical URL, title, optional notes, page metadata and preview.
- V0.1 web cover: favicon/Open Graph image + title; screenshot generation is an asynchronous additional strategy where available. Never block saving a link on screenshot generation.
- Saving file from web can be different from bookmarking its URL; distinguish these actions.
- Android ACTION_SEND/ACTION_SEND_MULTIPLE: share URL/text/images/files -> Sourcebook chooser -> select catalog, location (for saved copy), tags -> Save; offer one-tap recent destination.

### F09 Ordinary file manager operations [P0]
- Copy, cut, paste, rename, create folder, move, duplicate, trash, reveal in system file manager, copy path, copy link, open with default application.
- Batch operations with progress, cancellation when safe, clear failures/retries.
- Never silently overwrite: rename/skip/replace prompt for collisions.
- Move/rename updates catalog records, source mappings and previews; preserve all bracketed IDs across catalogs.
- Deleting from a catalog/collection is distinct from moving physical files to trash.
- Prefer platform trash/recycle bin over permanent deletion. Permanent delete remains explicit and guarded.
- Undo for reversible rename/move/tag/property actions; transparent when external operations cannot be undone.

### F10 Keyboard, touch and command navigation [P0]
- Global search keyboard focus, command palette (Ctrl/Cmd+K); Esc closes overlays.
- Space quick look; Enter open; Backspace/Alt+Left go back; arrows navigate; Delete opens safe trash confirmation.
- Tab/Shift+Tab follows predictable focus order; no keyboard traps.
- Drag multi-selection, keyboard alternate to drag-to-tag, context actions all accessible on Android.
- Long press for multi-select/context; toolbar available without hover; large enough touch targets.
- Android back button navigates overlays -> folder history -> catalog landing predictably.

### F11 Catalog switching and source mapping [P0]
- Open/close/switch between *.sb catalogs; active catalog shown in discreet title/control.
- Catalog contains logical sources, not hard-coded PC-only paths. Each installation maintains local source mapping (storage path or SAF URI).
- When a source is missing after sync, user can reconnect a folder; metadata remains intact, no silent deletion.
- Windows and Android operate independently with same resource feature set; preview generation may use platform-specific implementations/fallbacks.

## 6. Information architecture / screen map

**Primary screen:** Catalog browser, not a marketing dashboard.

**Left sidebar** — catalog switcher / folder tree / collections / nested tags / smart folders; compact icon rail when collapsed; resize on desktop and drawer on narrow screens.

**Center** — breadcrumb and compact toolbar at top; content gallery/list fills all remaining space; adjustable responsive grid / thumbnail density; file names cleanly truncated and visible; subtle multi-select mode.

**Right inspector** — large preview then properties and actions; resize on desktop; full-height sheet or screen on Android; toggled by inspector icon or keyboard.

**Overlays** — quick-look/lightbox, global command palette, add destination chooser, rename sheet, inline tag picker, metadata schema editor, conflict resolution.

**Tabs** — multiple source folders or saved views in side/top compact tab area; opening folder in new tab is supported; avoid extra overlapping navigator panels by default.

**Device differences are presentation, not product tiers.** Desktop may show three columns, narrow Android usually one + drawers. Every meaningful action remains available.

## 7. Visual language: "Soft Precision"

### Appearance [P0]
- Minimal, calm, crisp: dense enough for serious file work, but not cluttered.
- Neutral grayscale surfaces with one restrained accent selected per theme/catalog (optional).
- Light and dark themes affect **all UI plus preview background**; system follow mode.
- Lucide icons, 24px general action size (or 16–20px in dense toolbars), 2px rounded outline stroke; consistent icon semantics.
- System-font stack with excellent Windows/Android rendering; ordinary labels ~12–14px, headings ~14–18px, generous line heights, limited weights.
- 4px design spacing foundation; card corners ~6–10px; subtle 1px dividers; avoid hard card borders everywhere.
- No gradients or blur-glass panels as default; shadows only for floating UI.
- Thumbnail cards prioritize image pixels over chrome. 1–2 useful text lines with hover/inspector for details.
- Precise active/hover/selected/focus states; soft gray / subtle accent, never jarring bright outlines except accessibility focus.
- Pane resizing smooth; window-safe layout at 1280x720 desktop and ~390px mobile widths.

### Motion [P0]
- Motion conveys focus and continuity: ~100–160ms micro-transitions; never delays navigation.
- Respect reduced-motion preference; zero layout shifts while images arrive.
- Skeleton/placeholder only where it adds clarity; avoid shimmer noise.
- Context menus and sheets appear instantly; tooltips are sparse and delayed; no pop-up spam.
- Scroll never waits for expensive work; images decode asynchronously.

### Main UI quality bar
- Gallery works visually with 50 images **and** 50,000.
- Sidebar remembers expansion/width; views remember layout/density, without unpredictable resets.
- Properties are easy to edit without opening a giant modal.
- Interaction should require fewer clicks than the Windows file explorer for common reference tasks.

## 8. Catalog filesystem specification (draft schema v1)

Example:

~~~text
Architecture Research.sb/
  catalog.json             # catalog settings + catalog code + format version
  sources.json             # logical source IDs and rules (portable)
  schema.json              # custom property definitions
  tags.json                # hierarchical taxonomy
  collections.json         # manual group records
  smart-folders.json       # saved queries
  views.json               # view definitions
  resources/
    ab1.json               # small, individually syncable resource records
    ab2.json
  urls/
    ab3.json               # optional if URLs also use resources/; prefer one model
  previews/
    ab1.webp
    ab2.webp
  _local/                  # NEVER sync: fast database/index, device mappings, temp/cache
~~~

**Recommended final simplification:** Keep URLs in resources/ (same record schema); use a single resources/ namespace. Keep *_local/* out of Syncthing by documented ignore rule or preferably put local cache OUTSIDE the shared *.sb directory, keyed by catalog identity; if the latter, the portable catalog holds only data and optional shareable previews. Decide experimentally at M0 before writing a persistent cache. Do **not** put absolute Windows/Android paths into syncable records. Use device-private mapping in local app settings.

**The catalog *.sb is a directory, not one compressed file**. It can live in a chosen parent folder and be synchronized as ordinary files. A catalog is portable independently from sources but may show disconnected resources until remapped. Do not depend on OS registry, daemon or SaaS.

**Recommended implementation:** JSON per object / small config JSON for synced truth, atomically written with temp+rename where supported, backups/recovery; local SQLite (or equivalent) as a rebuildable index for search and performance, never synchronize live SQLite.

**Schema must include:** formatVersion, catalogCode, catalogDisplayName, stable catalogUUID (internal for catalog matching, not per-file suffix), nextSequence, source IDs, resource record IDs, timestamps, revision/modifiedBy, path binding, optional fingerprint, tag IDs, property values, previews and URL source metadata.

**Open questions before code locks schema:** Is nextSequence shared across devices? How are simultaneous edits merged? Does a portable *.sb store previews or only preview recipes? M0 explicitly evaluates these.

## 9. Catalog-specific filename identity: accepted contract

Examples:

~~~text
Facade Study.pdf
Facade Study[ab967].pdf
Facade Study[ab967][c5].pdf
~~~

- Catalog code is a short user-selected **lowercase letter prefix** (e.g. ab or c); sequential number is **decimal**. Token syntax: [ab967].
- Catalog ab treats the file as its resource 967. Catalog c treats it as its resource 5. These are **independent**.
- Add each catalog's token at the **end of basename, before the file extension**, after existing recognized tokens. Preserve all other catalog tokens.
- A catalog is free to point at files with another catalog's token; never strip or rewrite other owners' suffixes.
- Catalog IDs are immutable after creation; when two codes overlap over the same source, warn before using either code on new files.
- Existing file names are unchanged for unobjectified resources. Avoid renaming simply by opening a source.
- Internally show human-friendly base filename by default, preserving fully literal physical filename in inspector and rename details.
- Folder objectification can use the same token at the **end of directory name**; validate use across nested path bindings and linked files before shipping.
- For readonly, sensitive, system-managed or filename-dependent resources, allow metadata only, without suffix, with a clear portability tradeoff.
- Duplicates, copies and external renames: locate by owned token first, then source-relative path, then optional fingerprint. Distinguish relocation from genuinely duplicated data.
- A physical copy containing the same catalog ID cannot silently become a second object. Surface conflict; assign fresh number to the copy only after deciding which retains the original ID.
- Path tokens match bracket sequences at the **end** of basename, not arbitrary bracketed words. Avoid swallowing unrelated tokens when catalog code isn't known.
- File renaming is filesystem mutation. Before first automatic use, explain the option, preview changes and offer an ask-first or never-rename setting.

### Offline sequential allocation caveat (must not be hand-waved)

A single shared increasing counter is unsafe when two devices operate offline simultaneously. The outward filename format stays [abN], but V0.1 must implement:
1. Atomic local allocation and immediate scan for collision within available indexed sources.
2. Detect colliding IDs after Syncthing updates, even if they exist in separate folders.
3. Resolve collision via explicit reassignment to one resource, safe filename rename and metadata-update transaction, with a user-visible conflict report.
4. Prevent silently overwriting different per-resource records when a filename ID collides.
5. Prefer single-editor allocation or device-specific reserved number blocks **only if** independent simultaneous objectification becomes a common case; reserved blocks leave gaps, but preserve syntax.
6. Ensure synced resource edits merge nonoverlapping changes or present two versions for resolution rather than last-write-wins corruption.

**V0.1 release gate:** Both devices can create resources offline and sync later without loss. If safe automatic merging is unfinished, ship with safe conflict detection and manual resolution rather than claiming transparent multiwriter sync.

## 10. Storage and content safety

- Files are owned by their existing directories; Sourcebook manages **references**, not their lifecycle by default.
- Exclude the *.sb catalog directory, local cache and hidden system metadata from source scanning where appropriate.
- Treat user-granted source roots as capability boundaries; reject unsafe path traversal and symbolic-link loops.
- Every move, rename, delete, copy, bulk tag change and overwrite has documented behavior.
- Support OS trash/recycle bin where accessible; if unavailable, disable unsafe delete or require explicit permanent-delete confirmation.
- URL capture sanitizes unsafe protocols; never execute downloaded file content to generate a preview.
- Preview generation is isolated, resource-limited, cancellable; corrupted media or malformed PDFs cannot freeze the gallery.
- Zero network telemetry, signup, analytics or auto-upload required by V0.1.
- On sync conflict, preserve both copies until reconciled; never automatically delete one.
- Maintain a simple backup/export operation for catalog metadata; test restore.

## 11. Platform / implementation strategy (proposed, test at M0)

**Recommended direction:** Vite + TypeScript + React shared UI; native shell for filesystem operations. **Tauri 2** is a strong candidate for Windows + Android packaging, but its standard Android filesystem plugin scope is limited: user-granted Android Storage Access Framework folders will require a small native Kotlin/Android document-provider bridge. Validate before committing to the stack. A Capacitor Android wrapper + desktop backend is the fallback if the Tauri bridge proves cumbersome.

**Keep interfaces explicit:**
- **Frontend/UI:** gallery virtualisation, panels, tagging, search, preview, keyboard/mouse/touch commands, visual state.
- **Catalog service:** metadata CRUD, tags/collections/views, ID parsing/allocation, sync reconciliation.
- **Filesystem adapter:** browse roots, stat, watch, move/copy/trash, atomic rename, OS open/reveal, Android content URIs/SAF.
- **Preview service:** file-type inspection, worker queues, thumbnail extraction, caching, URL covers.
- **Index/search service:** local disposable index, incremental updates, property/tag queries, full text of file names and metadata.
- **Capture adapter:** OS drag/drop, clipboard, Android share intents, URL pasting; optional browser extension later.

**No assumption that Android grants blanket filesystem access.** Access to user-selected directories through SAF persists only with granted permissions; Android restricts certain root/system directory choices. On mobile, preview APIs may differ; normal browsing must still work.

**Desktop support priority:** Windows first, Android phone equal release target, other desktop platforms optional after abstraction is stable.

**Build/dev mode:** Browser-renderable UI with fixture catalog for rapid visual iteration; real operations run through native adapters. No requirement that a pure PWA alone provides unrestricted file management.

## 12. Performance: measurable budgets, not vague promises

The following are **targets to measure**, not guarantees:

| Scenario | V0.1 target |
| --- | --- |
| Cold opening app, recent catalog | visibly interactive <= 2s on reference desktop; <= 3s on reference Android |
| Browse already-indexed folder | first entries rendered <= 200ms after command |
| Navigation between cached folders | perceived instant; target <= 100ms to update shell |
| Gallery smooth scroll | ~60 fps on Pixel 8 / mid-range Windows test hardware |
| Search local indexed metadata | <= 150ms typical for 10k items; debounce only expensive queries |
| Selection, tag toggles, inspector | local optimistic feedback within one frame |
| Quick-look cached image | <= 200ms typical |
| Thumbnail generation | bounded background queue; never blocks scrolling or typing |
| 10,000 mixed entries | UI memory and frame-time benchmark with virtualised list/grid |
| 50,000 entries | stress test progressive browsing; acceptable performance without loading all DOM nodes |
| Startup offline / broken link | no hanging spinner; render immediately with state explanation |

**Required techniques:** virtualized layout, lazy thumbnails, worker/thread offload, thumbnail dimensions tuned to card display, LRU cache, bounded decode concurrency, incremental scans, cancellation, batched state updates, memoized visible item components, path/metadata indexing, indexed queries, performance traces and crash/error logs (local only).

Measure P50/P95 latency and missed frames on actual Pixel 8 and Windows machine. Make release gates hardware-specific and record hardware details.

## 13. Preview strategy

| Format | V0.1 contract | Fallback |
| --- | --- | --- |
| JPEG/PNG/WebP/GIF | thumbnail + inspector; animation on quick look | type icon |
| SVG | sanitized vector render + zoom | static safe fallback |
| PDF | first page thumbnail; paginated viewer or external open | PDF icon + system open |
| MP4/WebM | first frame if platform allows | media icon |
| TXT/MD/HTML | text excerpt cover if trivial | extension icon |
| URL/webpage | metadata/OG image/favicon, optional screenshot | domain card |
| Folders | folder icon + optional representative children | folder icon |
| Other CAD/3D/office | icon and system open in V0.1 | type-specific generic cover |

**Later:** RAW, PSD, 3D model viewers/renderers, complex office previews, palette extraction, visual similarity, universal screenshot server. Each renderer is a plugin-like adapter, not hardcoded into core resource logic.

Preview types should be decoupled from object metadata and have cache version + fingerprint/modified time invalidation. An absent preview is a normal state.

## 14. Search semantics and smart query model

- Search file names, clean display names, paths, tags, free-text notes and URL titles.
- Tokenized search and simple filter chips first; fuzzy search/command palette.
- Structured expressions: equals / not equal, contains, includes descendant tags, dates before/after, numeric comparison, file type, rating, missing/exists.
- Smart folder can be applied anywhere within catalog; never duplicates objects.
- Multi-view configuration can choose sorting by name, type, date, rating, dimensions, tag count, manual collection order.
- Don't invent separate semantics for "saved view" vs "smart folder": smart folder = query; view = presentation.
- Search index must include unmapped/offline records and indicate missing originals without hiding metadata.

## 15. MVP testing catalog / fixtures

Create deterministic fixtures of:
- nested folders with 100 small images + 10 PDFs + 4 videos + SVGs + text + unsupported files;
- 10k mixed files with meaningful duplicates and same names in different directories;
- Unicode names, spaces, many dots, leading dots, case variants and filenames already containing brackets;
- a file with [ab967] and [c5], and copy with duplicate ID;
- unreadable/missing source, permission revoked, symlink loop, corrupted PDF, very large image;
- two catalogs sharing a source and using different codes;
- two Windows/Android mappings for a logical source;
- two devices assigning the same sequential number offline;
- URL without OG image, URL behind authentication, invalid link, image URL;
- Syncthing conflict filenames and catalogs accidentally put inside a scanned source.

No test suite should assume filenames are ASCII or Windows-only.

## 16. Roadmap — incremental milestones

### M0 · Feasibility spike / architecture lock [P0]
**Deliverable:** tiny running desktop + Android shell with one browser UI; proof of opening/granting a user-selected folder and listing real files; catalog *.sb create/open; Android sharing inbound proof; preview sample for image and PDF.

Tasks:
- [ ] Initialize repo: TypeScript, UI framework, formatter, lint, typecheck, CI.
- [ ] Compare Tauri2/SAF bridge versus Capacitor/desktop adapter against concrete tests.
- [ ] Create native desktop build and installable Android build.
- [ ] Implement root folder picker and persistent permission mapping on Android.
- [ ] Implement basic Windows folder selection and read.
- [ ] Generate fixture files and synthetic catalog.
- [ ] Decide synced metadata layout vs local cache location.
- [ ] Define schema versions and migration strategy.
- [ ] Confirm exact file suffix parser and ID collision handling with test examples.
- [ ] Write ADRs for stack, catalog storage and identity model.

**Gate:** Files can be listed from a real chosen folder on both targets. Don't start full UI before this works.

### M1 · Beautiful browsing shell [P0]
**Deliverable:** app anyone can use as a visual folder browser.

Tasks:
- [ ] Minimal launch / recent catalog screen.
- [ ] Catalog switcher, add source, sidebar folders, breadcrumbs.
- [ ] Adjustable gallery and compact list; responsive layout.
- [ ] Real thumbnail loading (image first), hover/selection/keyboard/touch.
- [ ] Quick-look / Space navigation; native file open.
- [ ] Resizable inspector/sidebar and persisted layout.
- [ ] Tabs and back/forward history.
- [ ] Empty/error/loading states; light/dark/system themes.
- [ ] Virtualized gallery and performance baseline on 10k files.

**Gate:** Day-to-day folder browsing is delightful even with zero objectified resources.

### M2 · Portable catalog + objectification [P0]
**Deliverable:** meaningful persistent metadata, stable catalog identity, multiple catalogs/source overlap.

Tasks:
- [ ] *.sb catalog format, open/close validation and versioning.
- [ ] Objectify action, filename suffix generation, safe-rename settings.
- [ ] Catalog-code namespace check and sequential ID allocation.
- [ ] Multi-ID suffix parser that preserves other catalog suffixes.
- [ ] Resource record CRUD, atomic save, restore.
- [ ] Re-link moved files by token; missing file/offline source state.
- [ ] Duplicate ID/copy detection and safe conflict UI.
- [ ] Catalog local index creation and rebuild.
- [ ] Android source mappings persisted device-locally.
- [ ] Two catalogs referencing the same folder integration tests.

**Gate:** Rename/move an objectified file and Sourcebook finds it again; catalog B metadata is unaffected.

### M3 · Organization and discovery [P0]
**Deliverable:** reference manager, not just prettier File Explorer.

Tasks:
- [ ] Inspector inline tags, rating, description, source URL.
- [ ] Hierarchical tag tree CRUD, merge/reparent.
- [ ] Custom property schema + editing and bulk editing.
- [ ] Collections and drag-to-collection.
- [ ] Search index and fast query results.
- [ ] Smart-folder query builder and saved smart folders.
- [ ] Saved views (layout, filters, grouping, sorting).
- [ ] Keyboard command palette and context action search.
- [ ] Optional card property badges without crowding.
- [ ] Mobile feature parity review for every operation.

**Gate:** Save a 20-file research collection in minutes; rediscover it by tags/filters without navigating its physical paths.

### M4 · Frictionless capture & file operations [P0]
**Deliverable:** collect resources from anywhere and decide where they live.

Tasks:
- [ ] Drag/drop reference, copy, move actions with remembered defaults.
- [ ] Destination chooser and collision policies.
- [ ] Copy/cut/paste, rename, create folder, trash/reveal/open.
- [ ] Undo safe mutations and operation progress/cancel.
- [ ] Clipboard image import and URL paste.
- [ ] URL resource records + preview cover extraction.
- [ ] Android ACTION_SEND and ACTION_SEND_MULTIPLE capture flow.
- [ ] Save destination + tags at capture time; recent targets.
- [ ] Source-aware dropped file placement and bulk import.
- [ ] Error handling for read-only and no-permission folders.

**Gate:** Save a web link from Android in a few taps; on Windows drag an image, assign a destination and browse it immediately.

### M5 · Smoothness and visual refinement [P0]
**Deliverable:** release-grade V0.1 beta.

Tasks:
- [ ] Profile startup/render/search/thumb/scroll on Pixel 8 and Windows.
- [ ] Fix worst 20 frame drops and slow commands (measured).
- [ ] Restore state, avoid visual shifts, reduce layout thrash.
- [ ] Refine typography, icon consistency, spacing, colors, selected states.
- [ ] Hover, keyboard focus and Android touch interaction audit.
- [ ] Reduced-motion and high-contrast accessibility pass.
- [ ] Recover corrupted/partially written metadata.
- [ ] Syncthing conflict handling tests + offline ID conflict test.
- [ ] Safe upgrade and catalog schema migration test.
- [ ] Ship Windows build + Android APK with release notes and known limitations.

**Gate:** Personal daily use on both devices, with real resources, without surprising destructive behaviour.

### M6 · Stretch if M0–M5 are stable [P1]
- [ ] Browser extension (save page, image, selected media, optional screenshot).
- [ ] Full webpage screenshots / mobile capture fallback.
- [ ] Color filtering/extraction and similar-image discovery.
- [ ] Richer PDF pages / text search.
- [ ] Smart cover selection for folders.
- [ ] Batch renamer, EXIF ingestion, rating and tag interoperability.
- [ ] In-app multi-window and pinned preview.
- [ ] Optional import of selected Eagle/refern metadata formats.
- [ ] File operation queue history and sophisticated undo.
- [ ] Image annotations.
- [ ] Mac/Linux packaging once tested.

### P2 explicitly deferred
AI tagging/semantic search, public cloud accounts, collaboration/multi-user editing, graph relations, fully featured reference canvases, 3D/CAD rendering, advanced media editing, complex automation, Obsidian/Notion integration, sharing permissions, end-to-end sync engine.

## 17. Implementation backlog by subsystem

**Core data:** [ ] catalog migration [ ] schema validator [ ] object record CRUD [ ] path remap [ ] suffix token parser [ ] allocation [ ] duplicate conflict [ ] index rebuild [ ] backup [ ] selective read-only.

**Filesystem:** [ ] user grants [ ] directory scan [ ] progressive events [ ] file watcher [ ] stat [ ] safe rename [ ] move [ ] copy [ ] trash [ ] open [ ] reveal [ ] import/drop [ ] Android SAF [ ] permission recovery.

**Previews:** [ ] image [ ] SVG [ ] PDF [ ] video fallback [ ] URL covers [ ] caches [ ] invalidation [ ] queue [ ] cancellation [ ] failure placeholder [ ] viewer.

**Discovery:** [ ] name/text search [ ] tags [ ] properties [ ] smart query [ ] collections [ ] saved views [ ] grouping [ ] sort [ ] filter chips [ ] command palette.

**UX polish:** [ ] three-pane layout [ ] sidebar tabs [ ] adjustable thumbnails [ ] hover/selected states [ ] light/dark [ ] responsive phone [ ] context menu [ ] keyboard [ ] touch selection [ ] scroll restoration [ ] feedback/undo [ ] onboarding.

**Delivery:** [ ] CI [ ] Android signing/build docs [ ] Windows packaging [ ] performance benchmark runner [ ] fixture generator [ ] test report [ ] known limitations [ ] release changelog.

## 18. Definition of done: V0.1 acceptance scenarios

All of these must pass before calling a build "V0.1":

1. Create Research.sb outside source folders, add 3 sources, browse 200 files without changing names.
2. Gallery loads visibly before all thumbnails finish; scroll remains fluid with 10k items.
3. Select 5 files; assign hierarchical tag and property in bulk. Relaunch; all metadata persists.
4. Objectify File.pdf in catalog ab -> File[ab1].pdf; objectify same file in catalog c -> File[ab1][c1].pdf. Both catalogs find and edit **their own** records.
5. Rename and move the file within indexed sources; tags and preview association survive.
6. Copy the file; app detects duplicate token and offers explicit new identity for the copy.
7. Create a smart folder showing tagged PDFs in one source, save two views with different layouts, reopen.
8. Drop a file into Sourcebook and select reference/copy/move with exact target folder; confirm resulting physical path.
9. On Android, open same synced catalog, grant matching source folder via SAF, browse/gallery/tag/search and save a shared URL.
10. Disconnect a source; app marks it missing without erasing its resource records. Reconnect and recover.
11. Offline desktop + Android independently objectify, sync, collide; detect conflict and preserve both originals + metadata.
12. Open a malformed PDF, an SVG with script content and a huge image; none executes untrusted code or freezes UI.
13. Switch dark/light theme; theme applies to preview surround and the whole app.
14. Keyboard navigation, right click, long press, inspector and quick look are predictable.
15. If trash API unavailable on Android source, no misleading "moved to trash" success; show supported behaviour.
16. Export/backup catalog metadata and restore into a clean installation without needing a cloud account.

## 19. Proposed repository layout

~~~text
/
  README.md
  docs/
    PLAN_V0.1.md              # this document
    PRODUCT.md                # distilled product contract
    DATA_FORMAT.md            # schema, sample catalog, migrations
    UX_SPEC.md                # interaction matrix / visual tokens
    TEST_PLAN.md              # fixture scenarios + acceptance
  logs/
    decisions/                # ADR-0001 stack, ADR-0002 identity, ...
    development/              # engineering and progress logs
    ideas/                    # deferred features
  src/
    app/                      # shell, routing, state
    components/               # browser, gallery, sidebar, inspector
    features/                 # capture, tags, metadata, search
    core/                     # ID parser, schemas, catalog logic
    adapters/                 # fs, preview, platform abstractions
    styles/
  src-tauri/                  # if Tauri wins M0
  tests/
    fixtures/
    integration/
    performance/
~~~

The root may change after M0 stack selection; documentation structure remains stable. Keep GitHub issues small and testable. Commit working vertical slices instead of days of unfinished scaffolding.

## 20. Decision log

**Accepted / user direction**
- Product = Sourcebook, independent of Notebook and Objectbook.
- Fully functional desktop/Android app, near-identical UI with minimal adaptation.
- Catalog stored anywhere as a portable named *.sb directory.
- Multiple catalogs may independently point to the same source directories.
- Browsing should not require import or automatic filename changes.
- Catalog-specific bracket IDs in filenames: File[ab967][c5].pdf.
- Catalog code is configurable per catalog; number sequential within catalog.
- Nested tags, smart folders, saved views, previews, ordinary folders and desktop/mobile/browser capture are essential.
- Ability to choose where dropped/saved physical files go.
- A smooth, beautiful, minimal product is a release criterion, not late polish.

**Proposed / validate**
- Name for *.sb data holder: **Catalog**.
- Frontend: React + TypeScript + Vite, Tauri2 desktop/mobile shell with native Android SAF adapter.
- Syncable records: small JSON files; local rebuildable SQLite index.
- For non-renamable files: metadata-only path/fingerprint fallback.
- UI hides owned/recognized filename tokens by default.
- URL records share resource namespace; screenshot loading asynchronous.
- Long-term source roots are mapped per device, not syncable absolute paths.
- Explicit conflict detection for offline concurrent sequential ID creation.

**Open questions requiring test, not speculative debate**
- How to reserve/reconcile sequence allocations across offline devices with minimum disruption.
- Whether preview cache is stored inside *.sb or only local, with optional shareable covers.
- How to reliably match moved unobjectified files across removable drives / mobile providers.
- Whether Android's document-provider performance meets 10k-item goals.
- Browser extension native IPC vs small local receiving endpoint.
- Whether a file manager should open file by double-click versus enter quick-look; measure workflow and make configurable.

## 21. First execution order — no skipping

1. Build the real Windows + Android folder-access spike.
2. Prove *.sb open/close and source remapping across devices.
3. Implement the extremely fast gallery shell with proper virtualization.
4. Add file identity + metadata operations and their conflict tests.
5. Layer tags, collections, smart folders and saved views.
6. Add capture, copy/move and Android share integrations.
7. Refine interaction design with **real files and real hardware** until it feels substantially smoother than a typical file manager.

**Core engineering rule:** never let a large feature land if it degrades startup, scrolling, selection, resource integrity or cross-platform operation.

## 22. External references (design research; not dependencies)

- https://eagle.cool/ — gallery, fast preview and browser collecting
- https://www.refern.app/features — in-place multi-root indexing and resource organisation
- https://filepilot.tech/ — fast file navigation, contextual actions and panel ergonomics
- https://developer.android.com/training/data-storage/shared/documents-files — Android SAF folder permissions and limitations
- https://v2.tauri.app/plugin/file-system/ — Tauri filesystem plugin, including Android restrictions
- https://docs.syncthing.net/users/syncing — sync semantics and conflict filenames

---

**V0.1 is successful when it is boringly dependable underneath and unusually delightful on the surface.** A portable catalog, ordinary files, beautiful previews, fast exploration, effortless metadata and zero surprises.
