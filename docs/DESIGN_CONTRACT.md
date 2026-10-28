> **V0.0.54 candidate (28 Oct 2026, 23:30 Madrid):** Physical `.url`/`.md` captures and reviewed ordinary-file imports now use a shared same-origin Web Lock when available, serializing Sourcebook tabs through collision preflight, write and readback. Node regressions and a two-tab headless Chromium OPFS contention test were added. This **does not** prevent external/Syncthing/device races, guarantee atomic exclusive creation or establish physical Windows/Pixel 8 acceptance. Missing Web Locks retains preflight-only fallback. [Development log](../logs/development/261028-2330_cooperative-file-write-locks.md).

> **V0.0.53 M0 browser-engine boundary (28 Oct 2026):** Chromium CI now exercises native OPFS FileSystemDirectoryHandle file creation/readback, case-only collision refusal, IndexedDB handle restoration after reload and a journaled portable `.sb` fixture with a real `.url` file, Tags and a saved View. Synthetic `queryPermission` adapters only permit testing these functions against origin-private storage; they do not simulate or prove user-granted Folder permissions. OPFS is not an ordinary externally accessible Sourcebook Resource destination. Physical Windows Chrome, Pixel 8 and Syncthing acceptance remain open; no screenshots or source files are touched.

### V0.0.52 — Chromium-engine M0 smoke and no-picker honesty (28 Oct 2026)
- PR CI exercises a real headless Chromium engine (not only Node mocks): scoped PWA manifest and service-worker control, offline shell reload, multipart Share Target with ordinary File staged in IndexedDB, and explicit `.url` Download in a no-directory-picker environment. No screenshots, traces, video, visual fixture capture or user source-file mutation.
- When `showDirectoryPicker` is absent, landing does not offer unusable Open Folder/Open Catalog/New Catalog/Add ordinary files/Clipboard image import actions, and the capture dialog hides Create in Folder when no writable Folder can be selected. Incoming shares, review-first URL/text capture, unverified Download/Send fallbacks and M0 Device checks remain available; the provider gate stays Blocked. A browser Download never becomes a verified Resource.
- Browser smoke runs on Linux Chromium in CI, **not** physical Windows Chrome or Pixel 8 Android. M0 device verification and released/accepted remain open. GitHub Actions is the only publish path, PR CI precedes squash merge, and service-worker cache cleanup remains Sourcebook-prefix-only.

### V0.0.51 — Activation-safe incoming file handoff (28 Oct 2026)
- The Android staged-file Web Share fallback must **not** await IndexedDB retrieval or SHA-256 hashing between the final trusted user click and navigator.share(). First **Prepare to send** retrieves and verifies bounded files, then a separately clicked **Send prepared file(s)** calls the OS share API synchronously. Do not claim real-device support from Node simulations.
- Keep prepared File objects only in memory; clear on new action, cancel, rerender or handoff. Expire after two minutes; reject invalid/unsafe batches, missing preparation, unsupported sharing and repeated sends. Never fall back to URL/text-only sharing, clear the IndexedDB inbox, or treat a resolved Web Share promise as verified file persistence.
- Preserve existing .url/.md review-first capture, real-file-only Resource model, permission/collision guards, PWA cache isolation and M0 physical-device gate. No screenshots, unrelated PWA edits or background filesystem writes.

### V0.0.50 — Explicit OS file-share handoff (28 Oct 2026)
- A reviewed URL/text capture may be handed to the system as a **real File object** named .url/.md with exact Internet Shortcut/Markdown bytes. This is an outbound transfer request, not a verified source Folder write. Never silently downgrade to sharing a bare URL/text string if file sharing is unsupported.
- Temporary Android incoming file attachments may be sent individually or as a bounded batch through the OS file share sheet **only after integrity verification**. Keep IndexedDB staging until a verified Folder write or explicit user Discard; share success cannot establish persistence or remove staging.
- Use navigator.canShare({files}) before navigator.share({files}); errors/cancellation leave content intact. Browser Download remains an explicit alternative. Neither external handoff path satisfies the M0 physical filesystem-provider gate or creates Catalog metadata.
- The capability indicator is a synthetic API-only check, not proof of an installed Save-to-Files target, final filename, Syncthing delivery, or Android acceptance. Real-device tests are required.

### V0.0.49 — M0 filesystem-provider triage (28 Oct 2026)
- Report a conservative provider gate: absent picker or unsupported operations → Blocked; denied/failed/unclean synthetic operations → Failed; incomplete evidence → Unverified; only verified disposable write/read/remove and reopened physical `.url`/`.md` checks → probe-ready. This is **never** device acceptance, restart or Syncthing proof.
- Exports contain coarse status only. Recompute the gate from original sanitized report fields during cross-device comparison, ignoring a claimed `providerGate`; older reports without capability data cannot clear the gate. Browser Download is not a verified Folder write. No Catalog-only Resources, ordinary source-file changes, screenshots or Mindmap modifications.

### V0.0.48 — Real-file capture provider acceptance gate (28 Oct 2026)
- M0 Device checks offers a separately confirmed test on an **empty disposable parent**. It creates a new UUID-named Folder containing exactly one ordinary `.url` and one `.md` using the production file-capture writer, verifies exact contents and leaves both files untouched for restart/transfer checks. It must never modify a real project Folder, delete a partial fixture automatically or treat a browser Download as a verified Folder save.
- A separate **read-only** verification selects the fixture Folder itself, checks its synthetic identity and both physical file contents, and reports a sanitized hash for optional cross-device evidence. Missing, modified or unexpected files fail closed. Failed/partial creation requires manual inspection; no automatic acceptance or Catalog-only Resource is introduced.
- API presence, synthetic providers and CI are **not** physical Windows/Pixel 8 acceptance. A missing Android directory picker is a documented Blocked capability, not a silently successful write. No screenshot generation or Mindmap changes.

### V0.0.47 — Share staging integrity and storage readiness (28 Oct 2026)
- For **new** Android Share Target file attachments, compute SHA-256 on each bounded File before inserting the descriptor and Blob together into temporary IndexedDB. Reject unreadable, changing or unhashable attachments; do not create a Resource from staging. On retrieval, rehash each Blob before presenting it for review or Download. Size/MIME-only checks are insufficient for same-size corruption. On mismatch, fail closed and retain the staged share for manual inspection.
- Preserve existing v2 inbox entries lacking checksums for backward compatibility. These entries are not cryptographically attested. Never rewrite, delete, convert or silently mark them as verified.
- M0 Device checks exposes **read-only**, coarse origin-wide storage availability/pressure and reported persisted status. A separate user-gesture action can request persistence. No startup prompt, background mutation, private paths, exact quota fingerprint or automatic acceptance. Persistence is not proof against eviction or that Chrome can write to a user Folder. The temporary inbox is never a saved/synced Resource.
- M0 Windows/Pixel 8, actual Android Web Share Target delivery, browser quota behavior and Syncthing remain Not tested. No screenshots or Mindmap changes.

### V0.0.46 — Android file shares as temporary intake (28 Oct 2026)
- Extend the scoped installed-PWA POST Share Target to receive **ordinary files** (up to 5, 25 MiB each, 50 MiB per share and 100 MiB inbox-wide) alongside title/text/URL. Reject unsafe filenames, case-insensitive duplicates, empty/oversized payloads and malformed metadata; an oversized multipart request is refused when Content-Length is available. Blob staging is device-local IndexedDB **temporary inbox only**, not a durable Resource or portable Catalog record.
- Store file descriptors and Blobs in one IndexedDB transaction; upgrade existing text-only inboxes without deleting them. Readback validates Blob size/type against descriptors. Never write to ordinary source folders on share receipt. Review selected files through the existing explicit destination/permission/collision/verification workflow; remove the staged share only after **all** copies are verified. Failed/cancelled copies remain staged. Discard is explicit and removes both metadata and Blob staging.
- Offer a per-file browser-managed Download fallback when writable Folder access is unsupported. Downloads are not verified for filename, destination, collision or persistence; they do not clear staging. Files are not silently renamed, overwritten, objectified or synced. Android Web Share Target file delivery and filesystem provider support require **physical device evidence**; service-worker POST and IndexedDB quotas can fail. No screenshot generation is authorized.

### V0.0.45 — Reviewed clipboard raster-image capture (28 Oct 2026)
- Image clipboard intake is **temporary memory only**. In a browser Folder, paste PNG/JPEG/WebP/GIF to open the same explicit ordinary-file import review; an explicit Clipboard image button invokes navigator.clipboard.read() when available. Neither path writes without a separate confirmation and granted destination Folder.
- Clipboard images receive generated timestamp+random names shown before the user confirms. Refuse unsupported/active image formats (including SVG), empty/oversized images, >10 images, >25 MiB per image or >50 MiB total. Do not store images as Catalog-only Resources or in device-local IndexedDB. Copy and independent readback use the existing file import path; no automatic overwrite/rename of existing files.
- Clipboard API availability, Android writable Folder access, permission persistence and Syncthing are unverified until actual device evidence. Provider errors and last-moment filename races remain possible. No screenshot/visual fixture capture is authorized by this feature.

### V0.0.44 — Review-first clipboard, paste and dropped URL/text intake (28 Oct 2026)
- Pasting/dropping text into a browser Folder opens the existing file-capture dialog **without writing**. The user can inspect/edit content and title, choose the active Folder or an explicit picker, and confirm a physical `.url` / `.md` file. The existing user-triggered Download remains an explicitly unverified fallback, not a verified Folder save or Catalog Resource. Cancel/permission denial leaves the draft visible until dismissed.
- A user-triggered **Read clipboard into draft** action uses `navigator.clipboard.readText()` when allowed; unavailable/denied access leaves manual paste available and never creates a file. Dragged `text/uri-list` is parsed with comment/blank-line support, maximum 20 HTTP(S) links, and fail-closed unsupported schemes. One URL becomes a shortcut draft; multiple URLs become Markdown lines. Physical file drops continue to the reviewed ordinary-file import.
- Do not create a Catalog-only Resource, silently overwrite/rename source files, claim Android Folder write support, or mark M0 device acceptance without actual Windows/Pixel 8 observations. Tests cover pure intake and app/SW integration; File System Access exclusive-create races remain unresolved.

### V0.0.43 — Bounded streaming ordinary-file import (28 Oct 2026)
- Extend the explicitly reviewed and user-confirmed physical-file import: 10 files, 512 MiB per file, 1 GiB per batch. Files **over 25 MiB** are copied in bounded 1 MiB chunks, then independently read back and compared byte-for-byte in chunks; they are **not** assigned an SHA-256 checksum. Smaller files keep the SHA-256 path. No Catalog-only Resource is created, and selected source files remain untouched.
- Report copy/verify progress and support explicit Abort. Abort during copy attempts FileSystemWritableFileStream.abort(); abort during readback leaves a completed but **unverified** destination. Partial/failed files are preserved for manual inspection; never auto-delete or overwrite. Collision checks and pre-create existence checks reduce but cannot eliminate provider races involving empty files. Browser providers may not support large writes; do not claim device acceptance from Node simulations.
- Preserve read-only browsing, user-granted writable destinations and separate Windows/Pixel 8 M0 verification. Streaming memory bounds apply to Sourcebook's own chunk allocations, not to browser/provider internal buffering.

### V0.0.42 — Explicit ordinary-file import and copy verification (28 Oct 2026)
- Existing Catalog-only **Add files** silently selected collision suffixes and wrote without readback. Replace with an explicit file-picker or drag/drop review, then user-confirmed destination Folder copy, preserving original names. Works in browser-only Folder Tabs as well as Catalog Folders. No Catalog metadata is created.
- Refuse unsafe/reserved names, duplicate selections, case-insensitive destination collisions, overlarge batches and destinations that cannot be enumerated. Maximum 10 files, 25 MiB per file, 50 MiB total. Verify each copy against its selected source bytes using SHA-256. Stop on first failure; report progress and preserve partial files for inspection rather than deleting or silently retrying.
- Android file input may select files, but without a writable destination Folder provider, copying remains unsupported. Use an external file manager and record the M0 limitation. The File System Access API cannot offer atomic exclusive creation; an empty-file race remains possible even after enumeration and preflight. Never claim physical acceptance from synthetic tests.

### V0.0.41 explicit legacy URL file migration (28 Oct 2026)
A legacy fileless kind=url record may be converted only after individually selecting **Create .url + rebind**, choosing a registered source Folder and affirmatively confirming. The shortcut uses the existing stable Catalog ID as a filename token, is written only after both grants, and is read back before the existing metadata record is journal-replaced with kind=file/sourceId/path. Tags, Notes, title and ID survive; the old URL/title remain as historical audit metadata, not a second Resource. Fail closed on stale snapshots, pending journals, sync conflict copies and case-insensitive filename collisions. File creation plus Catalog rebinding cannot be atomic; on failure, never automatically delete the new file. Android writes and real-device acceptance are unverified.

### File-backed capture integration (V0.0.40 candidate, 28 October 2026)

- **One durable Resource = one real file/folder.** The device-local link tray and Android share inbox are temporary; their entries are not Catalog records. A staged link's **Create .url** action requests an explicit destination Folder; a shared single URL can create `.url`, and shared text (including ambiguous multi-URL text) can create `.md`. No automatic filesystem write occurs on receipt.
- **Browser Download** is a distinct user-triggered fallback for providers without writable directory pickers. It requests a `.url` or `.md` download but cannot verify destination, collision handling or final bytes. It never objectifies the file or marks device acceptance passed. The user must inspect Downloads and explicitly move/register files if needed.
- A verified write/readback to a granted Folder can clear the originating pending Android share; cancelled/failed saves retain it. Device-local staged links remain until explicit removal. No pending inbox entry is silently converted to a Catalog-only Resource.
- Physical `.url` files participate in the saved View **Links** type filter as ordinary `kind=file` records. Legacy `kind=url` JSON remains readable/editable but is not new-resource creation; no automatic metadata rebinding, ID reassignment or deletion.
- The M0 portable test fixture uses a real disposable `source-files/*.url` inside its throwaway `.sb` folder for repeatable readback, plus a file-bound Catalog record. This is a synthetic fixture, **not** a recommendation to store production source files inside Catalog folders or proof that external Folder handles survive Syncthing. Previous v1 fixture JSON is left untouched; the v2 verifier rejects it rather than silently rewriting it.

## Superseding resource model: filesystem-backed capture (28 October 2026)

**Every durable Sourcebook Resource is an actual ordinary filesystem file or folder.** The portable `.sb` Catalog stores optional metadata (identities, Tags, Notes, Views and derivative previews) referencing existing filesystem entries; Catalog JSON alone is not a second resource-content store. The device-local Capture links tray is **temporary staging**, not a saved Resource.

- Capture HTTP(S) URL → real portable plain-text **`.url` Internet Shortcut** in a user-granted Folder. Format: `[InternetShortcut]` then `URL=https://…`. Windows has native association; Android may only open this as text, so real-device validation is essential.
- Paste/drop ordinary text into the browser's active writable Folder → ordinary **`.md`** file containing that text. A single canonical HTTP(S) URL becomes `.url`; other text becomes Markdown. Dragging physical files should create/refer to real files, never phantom catalog entries.
- Explicit **Save URL/text as file** can use the active physical Folder or choose another. Writing requires user-granted Folder permission, unique non-overwriting names, validation and readback. No invisible move/rename/overwrite of original files, no page crawling and no silent Catalog objectification. Browser File System Access cannot guarantee atomic create-exclusive file creation; last-second races and partial new files must be reported.
- Several independent `.sb` Catalogs may annotate the same physical `.url`/`.md` file with their own metadata, but those files must remain usable without Sourcebook.
- **Legacy exception:** V0.0.35–V0.0.38 introduced `kind=url` Catalog JSON records without physical `sourceId/path`. Keep existing records readable/editable; block creation of new fileless URL resources. A future user-confirmed migration must create physical `.url` files, preserve IDs/Tags/Notes and explicitly rebind metadata without deleting original records until verified. No silent or automatic migration.
- Pending Android shares and device-local link capture records are **inboxes**, not durable Resources. Use language such as *stage for review*, not *save resource*. Existing M0 disposable test fixtures that create legacy `kind=url` must be revised to match this decision.

This section supersedes contradictory historical Catalog-only URL resource decisions below; historical descriptions remain as an implementation record only.

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

## Portable Catalog URL Tag editing

- Catalog URL resources have stable Catalog-local identities and share the same nested stable-ID Tag taxonomy as files. Bulk Add/Remove operates on explicitly selected URLs only (maximum 250) and uses one recoverable Catalog-only metadata transaction.
- Filtering or selecting links never objectifies or changes physical files. Bulk Remove matches exact Tag paths, does not delete taxonomy nodes, and never invents new Tag IDs. Bulk Add may create nested taxonomy paths; unchanged URL records are not rewritten.
- Device-local captured links are staging, not synced Catalog resources until explicitly imported. Physical Windows/Pixel 8 and Syncthing acceptance remain open.

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

## Portable Catalog URL resources (V0.0.35 candidate)

- A URL is a **Resource** with kind=url, a canonical HTTP(S) URL, optional title/notes, stable tagIds and a Catalog-local sequential ID in resources/<id>.json. It has **no** physical sourceId or path; it never appears inside a registered Folder or acquires a filesystem handle.
- Adding URLs is explicit, in batches of at most 20. Duplicate canonical URLs are skipped, malformed existing URL metadata fails closed, and IDs are allocated from the Catalog sequence without changing filenames. The existing recoverable Catalog journal guards metadata writes; it is **not** an atomic cross-device lock.
- **Capture links** remains device-local staging. Import selected staged links into an open Catalog only after explicit user action and Catalog write permission; never silently remove staged copies. Incoming Android shares remain review-first and never auto-import.
- Catalog-wide Tags and saved Views can discover URLs by title/domain, filter Links, and show them without a registered source. Source/folder-scoped Views exclude URLs. File scans, missing-file warnings, physical overlap detection and file operations must never treat URLs as filesystem entries.
- Opening a URL is an explicit user gesture to an external browser tab with noopener,noreferrer; no page crawling, screenshot capture, remote metadata fetch or automatic navigation occurs. Editing title, notes and Tags preserves URL and stable ID.
- Selective backup restoration must support missing URL records without requiring a registered Folder, and refuse duplicate canonical URL identities. Actual Windows/Pixel 8 persistence and Syncthing roundtrip remain **Not tested**.

## M0 acceptance fixture boundary (V0.0.37 candidate)

- Device checks may create a **new** uniquely named `.sb` fixture only in an explicitly selected **empty disposable parent** after consent. It uses the ordinary recoverable Catalog transaction journal for Tags, a URL resource, saved View and sequence allocator. It does not write registered source Folders, reuse existing Catalogs, or silently delete test data.
- The fixture remains available for restart/Syncthing verification. A read-only verifier checks identity and metadata coherence without requesting write permission; missing or changed metadata must fail closed. Partial fixtures and pending journals require manual inspection.
- Offline Cache Storage inspection is diagnostic only. Cached shell/module plus active controller cannot mark M0-06 passed. Exported reports exclude synthetic fixture names and private paths. M0 statuses remain manually entered and physical-device acceptance remains open.

## M0 cross-device evidence review

- Imported device-report JSON is read-only and memory-only; never write it to a Catalog, persist it as a resource or upload it automatically.
- Synthetic disposable fixture proof is SHA-256 of a random fixture UUID, not a source filename or path. Matching hashes support *identity consistency* only; they cannot prove Syncthing transfer, live permissions or that a person tested the devices.
- Review Windows and Android reports separately, require manual scenario outcomes and external M0-05 evidence, and never auto-accept M0 even if both reports say Pass. Physical-device testing remains a hard gate.
