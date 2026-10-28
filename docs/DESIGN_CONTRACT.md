# Sourcebook — Minimal Utility Design Contract

**Accepted product direction, 27 October 2026.** Reference applications (Allusion, Fold, Eagle, File Pilot) inform interaction quality only; **our terminology and architecture remain authoritative**.

Sourcebook should be an unusually capable **visual file utility**, not a decorated dashboard.

## Visual rules

- Neutral surfaces only: light/dark gray, white and black; no tinted panels or colorful folder icons.
- Exactly **one interaction highlight color** at a time, applied to focused, selected and active states. Muted blue by default; adjustable in Settings, persisted per browser/device. Semantic file-type icon tint is permitted **inside the symbol only** (Fold reference); avoid coloring background panels, tags or View categories.
- Rounded corners stay, but restrained: approximately 6–8px standard.
- Compact spacing, toolbars, buttons and filenames. Show more resources per screen; maintain touch targets on mobile.
- Prefer familiar Lucide icons before or instead of labels where the meaning remains clear. Add accessible labels and tooltip titles for icon-only actions.
- No unnecessary badges, instructional annotations, marketing copy, gradients, large headers or permanent dashboard panels.
- Content is the hero. Resizable/collapsible navigation and inspector; do not cover mobile gallery by default.
- No surprise file mutations when browsing or saving metadata.

## Browser-first + optional catalog contract

- Sidebar: **Tabs** (physical folder workspaces) and **Catalog** (registered existing root Folders, nested Tags and saved Views).
- An ordinary folder is browsable without a catalog in the current read-only prototype. Standalone multi-folder Tabs now preserve independent paths/history and support device-local restoration. Registered-root Catalog Folder navigation, nested Tag discovery and saved Views now exist as source-level prototypes; physical-device acceptance and resilient multi-writer persistence remain pending.
- Catalog Folders reference registered disk roots; objectified items appear under their nearest registered root via derived relative ancestors. Registration must not copy/rename/import.
- Nested tags provide manual grouping; a pinned tag is only a shortcut to the same stable ID, not a separate manual Collection record.
- **Views** combines saved scope/filter/query with presentation (Gallery / List / Table; grouping by Source, Folder or Type; sort, density and selectable table columns). `views.json` keeps stable View IDs, up to 16 nested tag IDs with **All (AND)** / **Any (OR)**, file-type and catalog/scan-status filters, plus optional pinned shortcuts. Legacy records default to All statuses and five table columns in memory. There is no separate Smart Folder/Collection schema. Results cover cataloged resources; an explicit **Scan** action adds unobjectified entries from already-granted Catalog Folders into a temporary read-only index. Missing/type-changed statuses only derive from completed scans; tagged Views still depend on catalog metadata; scans never objectify files.
- Do not implement an image editor/annotation engine in V1. Preserve files and prioritize previews and tag integrity.

## Verified overlapping Folders

- Catalog Folder registrations are independent. A physical overlap can be used for **global View presentation only** after a live `isSameEntry` proof of the root or an indexed descendant directory; names and matching paths alone are not proof.
- Suppress only proven duplicate unobjectified results. A single existing Catalog record takes precedence over a duplicate unobjectified entry without changing its ID, tags, path or source binding. A Folder-scoped View still displays that Folder's own resources.
- If two Catalog records describe a proven shared path, **show both** with a clear overlap warning; never silently merge records, select a winner, or rewrite Catalog JSON. Likewise, retain results when source type/missing evidence conflicts.
- Permission denial, stale/missing root identity, ambiguous ancestry and exceeded comparison limits mean **no suppression**. Index entries are snapshots, not per-file identity proofs.

## Catalog metadata safety and recovery

- A metadata Save changes **only** JSON inside the selected `.sb` Catalog. Never rename, move or write registered ordinary source files while tagging, registering a Folder, pinning a Tag or saving a View.
- Multi-file edits record exact before/after snapshots in a verified catalog-local recovery journal before touching catalog records. Every step checks its expected snapshot and verifies the written value.
- Opening a Catalog is read-only, including inspection of an unfinished journal. Never replay or discard it silently. Block further catalog edits and expose a compact **Resume** action with explicit permission and confirmation.
- If a journal contains malformed data or any record differs from both its before and after snapshot, stop without overwriting; direct the user to manual backup/reconciliation. Do not claim automatic conflict merging or crash-atomicity.
- A journal is **not** a lock against simultaneous offline editors or Syncthing races. Avoid concurrent editing of one synced Catalog until proper reconciliation and device acceptance exist.
- Before Catalog writes and journal replay, scan the Catalog metadata root and `resources/` for recognized Syncthing-style `.sync-conflict-` copies. **Fail closed even when a copy appears identical.** Expose a read-only comparison/report in Settings and a compact sidebar warning. Never auto-merge, delete or overwrite a conflict copy. Backup export and selective recovery must refuse unresolved copies; backup inspection may still compare canonical metadata read-only. This detection is not a cross-device lock or a complete conflict detector.
- A verified backup may explicitly recreate **missing** resource metadata records, in journaled batches of at most 250, after preview, stale-state revalidation and write permission. Never overwrite changed records or auto-restore core JSON, pending journals, previews or ordinary source files. This is selective recovery, **not** full restore or conflict merging.

## Tags first

The first polished editable property is a **tag**. Avoid constructing a generic custom-properties database until this interaction works brilliantly.

- A selected file displays tags as small neutral hashtag pills, e.g. \`#Timber\`.
- A full hierarchical path such as \`Architecture / Facades / Timber\` is available through the pill tooltip and tag picker.
- Typing slash-separated paths creates nested tags; existing tags appear as selectable suggestions.
- Tags have stable catalog-local IDs and parent links, stored in \`tags.json\`.
- Resource metadata stores \`tagIds\` in \`resources/*.json\`, so future tag renames/reparenting won't require rewriting every resource record.
- Sidebar preserves the nested hierarchy while optional pinned shortcuts appear above it. Selecting a tag opens a **catalog-wide read-only result view**, including descendant matches across registered roots; folder-scoped hashtag search remains available within a physical folder.
- Older resource records containing plain string \`tags\` remain readable. Their tags convert to stable IDs on explicit save.
- Tags aren't metadata colors: use the active accent only to indicate UI selection/focus, not permanent different colors for every tag.
- Keep "Save" explicit while the prototype lacks robust write queue / undo. Later aim for low-friction auto-save after safe transactional catalog writes.

## Minimal automatic information

Name, file extension/type, path, size, file timestamps and dimensions are *derived from files* and need no custom property system. Show essential bits contextually; keep raw filename and catalog ID in a collapsed "File information" area.

Optional notes can remain. Dates can be displayed when efficiently derived, without becoming editable user-defined fields.

## Non-goals in this stage

Typed custom schemas, manual ratings, tag colors, elaborate forms, kanban, AI-tagging, relationships, arbitrary ontology editors. These remain candidates after nested tag creation, discovery, saving and filtering are stable.

## Acceptance examples

- Tag \`Image.jpg\` with \`Architecture / Facades / Timber\` in the inspector; card shows \`#Timber\` pill.
- Add a sibling \`Architecture / Roofs\` without duplicating the root.
- Tag two files with different descendants; filter on \`Architecture\` and both appear; filter on \`Facades\` shows only its branch.
- Reload catalog and recover hierarchy / resource IDs from \`tags.json\` and \`resources/\`.
- Open older catalog records with plain \`tags\` and retain all labels during migration.
- Set accent to a custom hex color in Settings; navigation and selection adopt it without recoloring the neutral surfaces.
- Use one 1440×900 screenshot viewport for desktop visual review; real browser captures with fixture data, not mockups.

## Indexed View freshness contract

- Indexing is explicit, read-only and device-local. An Index/Refresh control in saved Views may target all registered Folders or one selected Folder. It must not silently request write access or alter Catalog metadata.
- Persisted Folder snapshots must be identity-bound to the original directory handle and revalidated with `isSameEntry` before use. Display restored results as **Cached · refresh**, never as live filesystem truth.
- Missing/type-drift labels require a completed scan in the current session. Partial, disconnected, cancelled or quota-failed refreshes must not silently replace a known complete snapshot or imply that files are absent.
- A **Clear** action removes only the device's cached index after confirmation. Neither it nor refresh may touch source files, Tag IDs or Views JSON. Root-granular refresh is not a filesystem watcher.
- An already-indexed subfolder may be explicitly refreshed by relative path without traversing siblings. Recheck physical root identity before replacing any cached entries. A complete subtree scan is authoritative only within its own path; never promote sibling/root freshness or infer missing/type-changed records outside that path. A cancelled, denied or partial subtree refresh must preserve the previous cache. After restart, all cached subtree entries are stale until refreshed again.

## Cross-references

[ULTRA Roadmap](ROADMAP_V1_ULTRA.md) · [Implementation status](IMPLEMENTATION_STATUS.md) · [1440×900 screenshots](../screenshots/README.md)

## Overlapping Catalog record review

- Verified registered-root ancestry nominates possible duplicate resource
  paths; it is **not** proof that descendant file handles are still identical.
  Before labeling competing Catalog records as the same physical entry, recheck
  the actual file/directory handles with read permission and `isSameEntry`.
- The review is explicitly invoked and compares all Catalog metadata records,
  independently of a saved View's current filters. Show differences in stable
  Tag IDs/paths, notes, resource kinds and other fields without picking a winner.
- Different, missing, permission-denied and unverified file handles remain
  visible and cannot be silently reconciled. Provide a bounded read-only
  diagnostic export and Show in folder; do not write Catalog JSON, rename
  ordinary files, or automatically remove competing records.
- This review is not Syncthing conflict merging, cross-device locking or a
  guarantee of permanent physical identity. Refresh before making any manual
  decision; a report is a timestamped snapshot.


## M0 disposable probes (28 October 2026)

Device checks remain an optional dialog available without a Catalog. A write probe is permitted **only after explicit user confirmation** and a fresh user-chosen disposable Folder; it must never touch a registered source, existing file or portable `.sb` data by default. Use unpredictable synthetic names, exact readback, identity checks and verified cleanup; if deletion cannot be proven safe, preserve the file and warn. A separate opt-in IndexedDB handle can be rechecked after restart without requesting permission or auto-marking acceptance. No device probes run on launch, and all outcomes remain manual evidence, not device acceptance.

## Device-local link staging (V0.0.33 candidate)

- **Capture links** is a lightweight, optional browser-local tray available without a Catalog or directory picker. Manual URL paste and explicitly requested clipboard read must never trigger source-file or Catalog writes. Save is separate from clipboard reading.
- Only canonical HTTP(S) URLs without embedded credentials are accepted. Validate all pasted lines before saving, deduplicate by canonical URL, bound record count and reject malformed saved data. Do not fetch URL contents or treat arbitrary pasted HTML as trusted markup.
- The tray is **not** a Collection, a View or a portable `.sb` URL record. It is explicitly device-only until a separately reviewed Catalog URL schema exists. Do not imply Android incoming share-target or cross-device sync support.
- Export may disclose private URLs and requires explicit confirmation. IndexedDB persistence is subject to eviction and cross-tab races; verification is not atomic locking.

## Incoming Android shares (V0.0.34 candidate)

- The PWA's manifest Share Target is a **POST** endpoint handled only by Sourcebook's scoped service worker. The redirect contains no shared content. Reject file uploads and unsupported/oversized forms; preserve incoming text in a bounded, device-local review inbox.
- Never auto-save a shared URL into Capture links or a portable Catalog. An explicit Review action pre-fills Capture; **Save links** is a second action. Clear a pending item only after a verified Save or explicit Discard. Ambiguous/malformed URLs must not be silently chosen or converted into file operations.
- Keep the unique Sourcebook manifest ID and app-prefixed cache cleanup. Device-local inbox data can be evicted; installed Chrome and offline POST interception must be tested on real Pixel 8 hardware before acceptance.
