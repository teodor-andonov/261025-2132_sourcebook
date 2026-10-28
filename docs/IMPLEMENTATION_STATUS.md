## 2026-10-28 15:26 Europe/Madrid — V0.0.46 candidate: Android file share inbox
- **Code:** Manifest POST Share Target accepts file attachments with title/text/URL. Scoped service worker validates at most 5 files / 25 MiB each / 50 MiB total, rejects unsafe/colliding names and stages Blobs plus descriptors in a single upgraded IndexedDB transaction. Existing text-only inbox records remain readable. Explicit Review files invokes the existing verified physical import dialog; only a successful full Folder copy removes staging. Per-file browser Download is a separately labeled, unverified fallback and retains staging.
- **Safety:** No automatic ordinary-file writes, renames, Catalog-only Resource records or background sync. Failed/cancelled imports retain the staged originals. IndexedDB quota/eviction, malformed multipart payloads, Android share-target MIME matching and Folder provider support remain risks. Browser Download cannot prove physical persistence; filesystem exclusive-create races remain.
- **Evidence at authoring:** Node unit and integration tests added. PR CI, main CI, Pages deployment and branch cleanup must be verified separately; Windows Chrome, Pixel 8 and Syncthing **Not tested**. No screenshots or Mindmap changes.
- **Log:** [Android file shares](../logs/development/261028-1526_android-file-share-inbox.md).

## 2026-10-28 14:31 Europe/Madrid — V0.0.45 candidate: reviewed clipboard raster images
- **Code:** Clipboard paste in a Folder (including ClipboardEvent item fallback) and explicit navigator.clipboard.read() action produce PNG/JPEG/WebP/GIF File objects with generated visible names. Both open the existing user-confirmed physical file import dialog. No source-file write, Catalog metadata or IndexedDB staging occurs on intake.
- **Safety:** Reject unsupported SVG/HEIC, empty and oversized images, >10 files or >50 MiB total. Existing collision checks, writable Folder permission, SHA-256 readback and partial-file reporting apply to the eventual explicit copy. No automatic overwrite or Catalog-only Resource.
- **Evidence at authoring:** Automated Node tests added for validation, bytes, read denial, paste fallback and app/SW integration. PR CI, main CI, Pages and branch cleanup must be verified independently. Actual Windows Chrome/Pixel 8 clipboard/provider and Syncthing acceptance remain **Not tested**. No screenshots or Mindmap changes.
- **Log:** [clipboard image capture](../logs/development/261028-1431_clipboard-image-capture.md).

## 2026-10-28 13:30 Europe/Madrid — V0.0.44 candidate: reviewed clipboard/paste/drop intake
- **Code:** Pasting or dropping text/links into the browser now opens explicit review, preview of intended `.url` vs `.md`, title/destination selection, and user-confirmed Folder save or unverified browser Download. A user-initiated clipboard read fills the draft only. URI-list comments/blank lines, single/multiple URLs, unsupported schemes and size limits are handled without automatic filesystem writes.
- **Safety:** No Catalog-only Resource or silent ordinary-file mutation. Permission denial, unsupported Android writable picker and cancelled saves retain the review dialog; physical file drops retain existing reviewed/verified import. The File System Access API has no atomic create-exclusive guarantee.
- **Evidence at authoring:** Node tests added for intake and integration wiring; PR CI, main CI, Pages deployment and branch cleanup must be independently verified. Windows Chrome, Pixel 8 and real Syncthing portability remain **Not tested**. No screenshots or Mindmap changes.
- **Log:** [reviewed text intake](../logs/development/261028-1330_reviewed-text-intake.md).

## 2026-10-28 12:30 Europe/Madrid — V0.0.43 candidate: large-file streaming and abortable import
- **Implemented in code on development branch:** Explicit reviewed ordinary-file import now accepts up to 512 MiB/file and 1 GiB/10-file batch. Files above 25 MiB use 1 MiB copy chunks and independent chunk-by-chunk byte comparison; smaller files retain SHA-256 verification. The dialog exposes phase/file progress and Abort. Ordinary sources are never renamed or modified; Catalog metadata is untouched.
- **Failure safety:** Source short reads, provider errors, readback corruption and cancellation stop the batch; completed copies are reported, and questionable destination files are retained for inspection. Abort during verification may leave a fully written but unverified file. No exclusive-create primitive or cross-device lock is available. Large files have **bytewise** rather than cryptographic digest verification.
- **Evidence at authoring:** Automated tests added for streaming, failure/cancel paths and integration; PR CI, squash merge and Pages publication must be independently checked. Windows Chrome, Pixel 8 Android Chrome and Syncthing physical acceptance remain **Not tested**. No screenshots or Mindmap changes. [Development log](../logs/development/261028-1230_streamed-file-import.md).

## 2026-10-28 11:26 Europe/Madrid — V0.0.42 candidate: explicit ordinary-file import
- **Code:** Browser-first file input (including Android selection fallback) and drag/drop review for ordinary files; explicit destination and confirmation, 10-file/50 MiB limits, collision refusal, SHA-256 readback per copy. Existing Catalog Add files' silent filename suffixing and unverified writes are retired. No Catalog metadata writes.
- **Safety:** Unsafe filenames, duplicate names, case-insensitive existing collisions, unreadable destination and unsupported crypto fail closed. Partial failures stop the batch and retain files for manual inspection; no atomic create-exclusive API or cross-device lock.
- **Acceptance:** Windows/Pixel 8 directory write compatibility, Android file picker/provider and Syncthing transfer remain **Not tested**. PR CI, main CI and Pages require separate verification. No screenshots or Mindmap changes.
- **Log:** [safe file import](../logs/development/261028-1126_safe-file-import.md).

## 2026-10-28 10:25 Europe/Madrid — V0.0.41 candidate: explicit legacy URL migration
- **Code:** One-at-a-time, user-confirmed file-backed .url migration from legacy Catalog links to a connected registered Folder. Preserves Catalog stable ID, Tags, Notes, title; keeps old URL/title only as an audit snapshot. Source file is verified before a recoverable metadata rebind; stale state, pending journals, sync conflicts and collisions block the operation.
- **Risk:** Partial/orphan .url may remain on failed source/Catalog write; no atomic create-exclusive or cross-device lock. Real Windows/Pixel 8 acceptance remains Not tested.
- **Evidence at authoring:** Automated tests added; PR CI, merge, Pages and branch cleanup require independent verification. No screenshots or Mindmap changes. [Development log](../logs/development/261028-1025_legacy-url-file-migration.md).

## 2026-10-28 09:29 Europe/Madrid — V0.0.40 candidate: file-backed capture inbox and portable fixture

- **Code changes:** Link staging has explicit Create `.url` (selected writable Folder) and browser Download fallback; Android share inbox has explicit Create/Download `.url` and `.md` actions. Verified Folder writes remove the corresponding pending share only after exact readback; downloads are unverified and retain the share. Existing staged links remain until explicit removal. Manual URL/text capture also exposes browser Download.
- **Resource integrity:** Physical `.url` files are classified as Links in saved Views while retaining `kind=file`. No new fileless Catalog URL records are created; historical `kind=url` records are retained. No automatic conversion or deletion. Browser Download does not guarantee a destination, exclusive filename, or completed save; Android provider compatibility is untested.
- **M0 fixture correction:** The disposable v2 `.sb` fixture writes an ordinary `.url` under a synthetic `source-files/` folder, journals metadata referencing that physical file, and verifies its contents read-only. Legacy v1 fixtures remain on disk but cannot be validated as v2. This does not verify real external source Folder grants or Syncthing transfer.
- **Verification:** Node tests added for file-backed inbox planning, download fallback, physical shortcut View classification and v2 fixture integrity. PR CI, squash merge, Pages publication and cleanup must be verified separately. No physical Windows/Pixel 8 tests or screenshots performed. See [development log](../logs/development/261028-0929_file-backed-capture-inbox.md).

## 2026-10-28 — File-backed resource capture correction (V0.0.39 candidate)

- **Product decision:** Every durable Sourcebook Resource is an actual file/folder. `.sb` Catalogs annotate filesystem resources; `.url` files represent links and `.md` files hold pasted/dropped text.
- **Code (pending PR CI):** Bounded URL/text capture planner, unique timestamp+suffix filenames, no-known-overwrite checks, FileSystemHandle create/write/readback, explicit writable Folder picker, current-Folder paste/drop, shortcut parsing/read-only preview and human-visible permission failures. No page fetching or hidden Catalog objectification.
- **Legacy compatibility:** Keep older fileless `kind=url` Catalog JSON entries readable and editable, but disable adding new ones through the legacy UI. Migration to real `.url` and metadata rebind is not implemented; test fixtures that still generate legacy URLs must be updated.
- **Verification:** new unit tests for .url/.md planning, safety, and fake FileSystemHandle writes. Browser write providers, Android shortcut association, Windows/Pixel 8/Syncthing physical acceptance remain untested; CI result must be verified independently. No screenshots triggered.
- **Follow-up:** integrate reviewed device-staged links and incoming Android shares directly with chosen filesystem destination, migrate old Catalog-only links explicitly, and harden concurrent-create protection.

## 2026-10-28 08:31 Europe/Madrid — Cross-device M0 evidence comparison (V0.0.38 candidate)

- **Implemented in code:** A read-only, memory-only comparison of two explicitly selected M0 JSON exports (one Windows, one Android), with schema/size validation, per-scenario status matrix, release-commit and standalone checks, timestamp warnings, and missing external M0-05 evidence warnings. Imported reports are not persisted or uploaded.
- **Synthetic fixture identity:** The existing disposable .sb create/verify probes now return a SHA-256 fingerprint of their random test fixture UUID (no path or filename). A matching fingerprint across two successfully verified reports is only *supporting evidence*, not proof of Syncthing transport, live permission persistence or device acceptance.
- **Acceptance safety:** Comparison can report 'ready for manual review' but always returns accepted=false. Missing, blocked, stale, mismatched and unverified reports cannot be treated as passing. Manual M0-01…08 and physical Windows Chrome/Pixel 8 testing remain outstanding.
- **Verification at authoring:** Automated regression tests added; actual PR CI, merge and Pages publication must be checked separately. No physical devices, screenshots, visual fixtures or Mindmap changes.
- **Development log:** [M0 cross-device evidence](../logs/development/261028-0831_m0-cross-device-evidence.md).

## 2026-10-28 07:24 Europe/Madrid — M0 portable Catalog and offline diagnostic (V0.0.37 candidate)

- **Code:** Explicitly confirmed empty-disposable-parent `.sb` fixture creator exercises real Catalog journal transactions for stable nested Tags, portable URL resource, saved View and sequence allocator. Read-only verifier checks coherent metadata and clean journal after restart or Syncthing transfer. No ordinary source-file changes and no automatic fixture deletion.
- **Offline diagnostic:** Reads only Sourcebook-prefixed Cache Storage and active service-worker state. Does not simulate network disconnection or prove offline load.
- **Safety:** Refuses nonempty parent, generates unpredictable UUID fixture name, preserves partial failed writes for manual inspection, sanitizes exported results. M0 manual statuses never auto-pass. No cross-device locking or filesystem-atomic guarantee.
- **Verification at authoring:** Simulated provider tests prepared; PR CI and Pages outcome pending. No real Windows Chrome/Pixel 8 or Syncthing roundtrip, no screenshots and no Mindmap changes. See [development log](../logs/development/261028-0724_m0-portable-acceptance.md).

## 2026-10-28 06:30 Europe/Madrid — Catalog URL bulk Tags (V0.0.36 candidate)

- **Implemented in code on development branch:** Catalog links now supports title/URL/Tag-path filtering, individual/visible selection (up to 250 URLs) and explicit bulk Add/Remove of 1–16 nested Tag paths. Stable Catalog URL IDs, URLs, titles and notes are preserved; no ordinary source files are changed.
- **Safety:** Pure planner validates selection and stable Tag IDs, reuses existing taxonomy, refuses over-limit edits and skips no-ops. Bulk metadata and any new Tags use the existing snapshot-checked recoverable Catalog transaction journal. No cross-device lock, atomic filesystem commit or automatic Syncthing conflict reconciliation.
- **Verification:** New automated planner/journal tests and service-worker integration assertions; **PR CI and publishing are pending at authoring**. M0 physical Windows Chrome/Pixel 8 acceptance remains **Not tested**, including portable URL/Tag Syncthing roundtrip. No screenshots or Mindmap changes.
- **Development log:** [Portable URL bulk Tags](../logs/development/261028-0630_catalog-url-bulk-tags.md).

## 2026-10-28 05:31 Europe/Madrid — Portable Catalog URL resources (V0.0.35 candidate)

- **Implemented in source on development branch:** First-class kind=url metadata in existing resources/<catalog-code><sequence>.json, with canonical HTTP(S) URLs, title, notes and stable nested Tag IDs. Manual batch import and selected device-staged import are explicit, journaled Catalog-only writes. Staged links are retained; no page content is fetched, no ordinary source file is renamed or modified.
- **Discovery and interaction:** URL results participate in global saved Views, hashtag Tag discovery, search and Links type filtering; source/folder-scoped Views exclude URLs. Catalog Links sidebar opens link-only results and a compact import/edit dialog. Explicit external opening uses a new browser tab with noopener,noreferrer; no filesystem handle or missing-file status is assigned to URLs.
- **Safety:** Catalog sequence allocator skips occupied IDs, rejects invalid/duplicate existing URL records, checks snapshots and Catalog permissions before writes, and uses the existing recoverable journal. Backup/restore recognizes URL metadata without requiring a Folder. This is not cross-tab or cross-device atomic locking, and not a URL crawler, rich card preview or Android file-share target.
- **Verification status at authoring:** Node tests and syntax checks added; PR CI and Pages outcome must be verified separately. **No physical Windows Chrome or Pixel 8 tests** were performed. M0-01…08 remain open. No screenshots/visual fixtures were requested or generated.
- **Development log:** [Portable Catalog links](../logs/development/261028-0531_portable-catalog-links.md).

## 2026-10-28 04:25 Europe/Madrid — Incoming Android share inbox (V0.0.34 candidate)

- **Implemented in code, device unverified:** Installed-PWA POST Share Target routes text/URL to a bounded device-local IndexedDB inbox. Explicit review may stage a normalized URL into existing Capture links; only the user pressing Save commits it. Ambiguous/text-only shares remain available for manual copy. No Catalog JSON or ordinary source file is written.
- **Safety:** No shared data in redirect URL; file payloads and unsupported forms rejected; 12-item queue limit; malformed inbox records block editing; successful link save or explicit Discard removes a pending share. Service worker remains scoped to Sourcebook with cache cleanup limited to its own prefix.
- **Acceptance:** Real Pixel 8 share-target delivery, offline/restart behavior and Windows Chrome remain **Not tested**. M0-08 stays open. CI and Pages release evidence must be added only after verified runs; do not count the feature as device accepted.
- **Development log:** [Android incoming shares](../logs/development/261028-0425_android-share-inbox.md).

# 2026-10-28 03:32 Europe/Madrid — Device-local URL capture staging (V0.0.33 candidate)

- **Implemented in source:** Capture links is accessible from the launcher, toolbar and Settings even without a directory picker or open Catalog. Manual multiline HTTP(S) paste and user-triggered clipboard reading lead to an explicit Save action. The local tray supports normalized deduplication, safe external open, copy with manual fallback, title editing, explicit removal and JSON export.
- **Safety:** URL scheme/credential/control validation; 20 links per batch, 200 device-local links maximum; corrupt stored data fails closed; optimistic stale-tab checks and readback verification. No ordinary source-file or portable Catalog metadata writes, no remote fetch. IndexedDB is not a cross-tab atomic CAS, is not Syncthing and can be evicted.
- **Scope honesty:** This is a device-only staging tray, **not** a first-class portable Catalog URL resource, Android incoming share target or verified Pixel 8 clipboard experience. M0 physical-device acceptance remains **Not tested**. PR CI/Pages status must be checked after this candidate is proposed.
- **Evidence:** [Development log](../logs/development/261028-0332_device-link-capture.md); `tests/link-capture.test.mjs`. No screenshot/fixture capture requested or run.

# 2026-10-28 02:27 Europe/Madrid — M0 disposable Folder and restart feasibility (V0.0.32 candidate)

- **Implemented in source on development branch:** Explicit, confirmed disposable Folder write/readback/remove test. Requests `readwrite` only through the user-triggered picker, checks permission, generates a UUID synthetic filename, refuses preexisting collisions, verifies exact marker bytes and the original handle identity before removal, and confirms absence. Failures that leave a synthetic file are surfaced for manual cleanup; no Catalog or existing source file is touched by design. Permission, provider and cleanup failures return sanitized statuses.
- **Restart grant feasibility:** A separate user-triggered read-only picker can store a disposable Folder handle in device-local IndexedDB. A later explicit recheck uses `queryPermission` and at most one entry enumeration without calling `requestPermission` or a picker. Forget removes the stored handle. Browser/provider support remains unknown until tested on devices.
- **UI and evidence:** Both probes appear in the existing Device checks dialog; normalized statuses are added to local M0 JSON reports without filenames, raw paths, handle data or bytes. They never set an M0 scenario to Pass automatically. M0-01…08 remain physically **Not tested** on Windows Chrome and Pixel 8 Android.
- **Verification:** Added simulated File System Access regression tests for consent, denial, collisions, exact readback, identity, cleanup failures, persisted-handle recheck and sanitization. PR CI, publication and device acceptance must be reported separately after verification; this candidate entry is not a claim of passing CI or physical testing.
- **Limits:** The test creates a real synthetic file only in a freshly chosen disposable Folder and can leave it behind on failure; the filesystem is not transaction-atomic, a provider can race after identity/readback checks, and IndexedDB retention is not a cross-device grant. No screenshot/visual fixture capture was requested or run.

## 2026-10-28 01:26 Europe/Madrid — M0 device-readiness and read-only feasibility harness (V0.0.31 candidate)

- **Implemented in code:** A compact Device checks dialog available from the launcher even if Chrome lacks directory picking, and from Settings. Shows secure context, standalone mode, directory/file picker, IndexedDB, service-worker control, clipboard, Web Share and persistent-storage API presence. Does not equate feature detection with functional permission or device acceptance.
- **Explicit read-only probe:** User-triggered folder picker requests `mode: 'read'`, checks existing read permission without requesting write, enumerates at most ten entries, reads one file's metadata if present, and checks self-identity if available. No source names, bytes, file writes, telemetry or automatic permission prompts.
- **Manual M0 record:** Eight separately marked Pass / Fail / Blocked / Not tested cases, bounded notes and optional HTTPS evidence link; local-only persistence, explicit JSON export, reset confirmation and sanitized browser summary. No automatic acceptance claims.
- **Verification:** Node unit and app/SW wiring tests added; PR CI and deployment outcome pending at development time. No physical Windows/Pixel 8 testing, screenshots, visual fixtures, source-file mutation or direct release triggered.
- **Risk:** A read-only picker probe cannot prove Catalog write support, provider durability, offline operation, Android share-target support or cross-device Syncthing. Real-device M0 remains open. Browser storage may be evicted; export test evidence explicitly.

## 2026-10-28 — Roadmap acceptance scoreboard and dev-branch cleanup policy

- Added [ROADMAP_STATUS.md](ROADMAP_STATUS.md): a concise, evidence-backed 3-stage matrix separating **code implementation**, **actual Windows/Pixel 8 acceptance** and **successful deployment/acceptance**. Broader unchecked ULTRA V1 milestone checkboxes remain requirements, not an accurate implementation tally.
- Established an explicit M0 real-device test matrix (real Folders/Catalogs, permissions, Syncthing, offline, 500-file browsing and Android capture fallback), all initially **Not tested**. Automated CI does not count as physical device acceptance.
- Prioritized M0 feasibility, V0.5 URL/clipboard/Android capture and V0.6 safe filesystem operations ahead of further speculative index/Views additions; kept catalog identity/conflict safety as cross-cutting priorities.
- Updated release guidance and automation to remove merged same-repository `dev/*` branches only after checking the PR is merged and the ref still equals its PR head SHA. Added an independent, permissions-scoped GitHub Actions cleanup workflow; merge history in `main` remains intact. Actual branch deletion must be confirmed from workflow results, not assumed from a code change.

## 2026-10-28 00:23 Europe/Madrid — Overlapping Catalog record review (V0.0.30 candidate)

- **Implemented in source:** Settings → **Review overlaps** and a saved View inspector shortcut open a read-only comparison of all competing Catalog resource records under live-verified overlapping registered Folder relationships, not just the current View filter. Tags, notes, kinds, missing Tag references and other metadata differences remain visible; no automatic winner is selected.
- **Source identity:** Rechecks individual file/directory handles with read permission and `isSameEntry` before labeling a pair `same-entry`. Different, missing or unverifiable entries remain explicit. Verified root ancestry alone does **not** prove the same descendant file; matching names are never sufficient.
- **Safety:** Uses a double-read Catalog metadata backup snapshot, bounded comparison (20,000 records / 500 groups / 1,000 live entries), no source-file or Catalog writes, explicit JSON diagnostic export and per-record Show in folder. Reports may contain Catalog notes; exporting is user initiated. This is inspection, **not reconciliation** or cross-device locking.
- **Verification:** Node regression tests and syntax checks added; **PR CI verified:** [run 40602297689](https://github.com/teodor-andonov/261025-2132_sourcebook/actions/runs/40602297689) passed **196/196 Node tests** and JavaScript syntax checks on code commit `33612b7`. An earlier PR run failed on a mismatched test fixture Folder name; the fixture was corrected before the passing run.. No screenshots or physical Windows/Android testing. Branch → PR → green CI → squash → automatic main-only Actions publish remains required.

## 2026-10-27 23:28 Europe/Madrid — Verified overlapping Catalog Folders (V0.0.29 candidate)

- **Implemented in source:** After a complete device-local index exists for two registered Catalog Folders, Sourcebook checks whether the live directory handles refer to the same physical root or whether an indexed directory path resolves to the other registered root. Only File System Access `isSameEntry` proof can establish an overlap. Display names, Catalog IDs and matching filenames never establish identity. Proof is read-only, bounded and re-evaluated on Catalog reopening or successful refresh; no device-local overlap relationship is written into portable Catalog JSON.
- **Global saved Views:** When both indexed entries resolve to the same physical path under verified overlapping roots, show one unobjectified result. Prefer a fresh scan, then the deeper registered Folder. A cataloged resource wins over an unobjectified duplicate without changing its original source ID, path, tags or identity. Explicit Folder-scoped Views remain independent.
- **Ambiguous metadata:** If two separate Catalog records describe the same verified path, or a cataloged binding appears missing/type-drifted while another overlapping root reports it, **keep both** and show **Overlap · review metadata** in table status / Gallery detail. No automatic metadata reassignment, reconciliation, deletion or source-file mutation. Scan status reports verified overlap relationships and unresolved checks.
- **Fail-closed boundaries:** Overlaps are not inferred if an indexed root is missing, identity verification fails, permissions are unavailable, paths have moved, traversal is ambiguous or comparison limits are exceeded. This is path-level duplicate suppression **under verified root ancestry**, not per-file `isSameEntry` proof, cross-device identity resolution or a guarantee that stale snapshots reflect live files. Results may still duplicate when proof is unavailable; this is safer than hiding unrelated files.
- **Verification:** New simulated File System Access regression tests cover nested and identical roots, misleading names, stale/denied handles, bounded inspection, global/scoped Views, metadata conflicts, missing/type drift, freshness preference and transitive ancestry. **PR CI passed:** [run 40595699115](https://github.com/teodor-andonov/261025-2132_sourcebook/actions/runs/40595699115) verified 188/188 Node tests and JavaScript syntax checks at commit `78fba3e`. An intermediate run failed because a candidate-path performance refactor accidentally treated a path string as an entry object; the regression test caught this and it was corrected before merge. No screenshots captured; no direct Pages deployment; release only after successful PR CI and squash merge.

## 2026-10-27 22:22 Europe/Madrid — Verified subfolder refresh (V0.0.28 candidate)

- **Implemented in source:** Saved Views now expose a compact optional subfolder path alongside the registered Folder selector. After a complete root index exists, the user can type or select a known relative directory and refresh just that subtree. Only the subtree's entries are replaced in the device-local IndexedDB snapshot; siblings and the original full-root scan timestamp are preserved. Existing root-level refresh remains available.
- **Safety:** Before either root or subfolder refresh, a cached root must pass `isSameEntry` against the current directory handle; identical display names do not count. Subfolder traversal uses read permission and read-only `getDirectoryHandle` calls, never write requests or source-file mutations. Invalid paths, missing directories, failed or cancelled scans and exceeded limits cannot publish a complete subtree. Completed subtree results can assert missing/type drift only under their path; cached siblings remain stale, and all cached results become stale again after restart.
- **Scope:** This is explicit, path-targeted incremental refresh, not automatic change detection, watcher-based indexing or a cross-device index. The first complete root scan is still necessary, and changes outside the refreshed subtree require separate refreshes. The UI offers up to 150 indexed directory suggestions but accepts typed paths; the same 50,000-entry device index cap applies. Overlapping roots are not physically deduplicated. Real Windows/Android acceptance is outstanding.
- **Verification:** New simulated File System Access tests cover nested scanning, sibling preservation, identity mismatch, cancelled/failed traversal, scoped missing/type status, stale cache after reload, and malformed paths. **Initial PR CI passed:** [run 40586652803](https://github.com/teodor-andonov/261025-2132_sourcebook/actions/runs/40586652803) verified 179/179 Node tests and JavaScript syntax checks at commit `c77f2c9`; the final documentation and scan-limit adjustment still require a new green CI run. No screenshots generated; the branch → PR → CI → squash → GitHub Actions release convention remains mandatory.

## 2026-10-27 21:32 Europe/Madrid — Device-local source index with targeted Folder refresh (V0.0.27 candidate)

- **Implemented in source:** Saved Views now offer **Index / Refresh** of all already-granted registered Catalog Folders or one selected Folder. Complete scan results are stored as a device-local IndexedDB snapshot with their original directory handles. A targeted root refresh retains other cached roots, computes added/removed/type-changed path counts and never changes Catalog JSON or ordinary source files. **Clear** removes the device cache after confirmation.
- **Identity and freshness:** Cached root handles must pass `isSameEntry` against the current device's registered handle before any entries are shown. Names and source IDs alone never establish physical identity. Cached results are visibly labelled stale; no cached root may assert a catalog record is missing or changed. Only a complete scan in the current session enables those signals. Denied, disconnected, partial and cancelled scans do not overwrite a previous complete root snapshot. New partial roots remain transient and cannot be saved as complete.
- **Limits:** 50,000 entries across cached roots, 32 scan levels, no watcher or background polling, no directory-level delta crawl, no cross-device sharing, no auto-refresh on View open. IndexedDB quota/permission failures leave only an in-memory snapshot, clearly flagged. Cache deletion never deletes source files. Overlapping registered roots still have separate logical IDs; no physical deduplication. No actual Windows/Android acceptance or browser UI automation.
- **Verification:** Added Node unit/integration tests for catalog scoping, path validation, identity proof, per-root delta, partial-scan safety, cached-vs-fresh missing status and stale table labels. **PR CI passed:** [run 40579151371](https://github.com/teodor-andonov/261025-2132_sourcebook/actions/runs/40579151371) verified 169/169 Node tests and JavaScript syntax checks at commit `82ba71e`. Final documentation-only updates require PR CI before merge. No screenshots were generated. The only publication path remains automatic GitHub Actions after a CI-passing squash merge.

## 2026-10-27 — Syncthing conflict-copy inventory and fail-closed Catalog writes (V0.0.26 candidate)

- **Implemented in source:** Read-only inventory of recognizable Syncthing .sync-conflict- copies alongside Catalog root metadata (catalog.json, tags.json, sources.json, views.json, .sourcebook-pending.json) and resources/*.json. Ordinary registered source folders are never traversed. Scanner caps: 500 copies, 2 MiB per inspected metadata file.
- **Read-only inspection:** Settings → **Inspect conflicts** classifies identical, semantically equivalent, divergent, missing-canonical, malformed and foreign-catalog copies, shows canonical paths, supports recheck and exports a JSON **diagnostic report only** (names, statuses and SHA-256 hashes, not raw file content). An open Catalog displays a compact warning; conflict-copy resource JSON is excluded from the normal record map.
- **Fail closed:** Verified Catalog transactions, explicit journal resume, metadata backup export and selective restore refuse recognized conflict copies. Checks run before journal creation/replay and before clearing a completed journal; a copy appearing during a write leaves the journal for manual review. Existing read-only backup inspection can report conflicts without modifying data. Even byte-identical conflict copies block writes until manually resolved.
- **Limits:** No automatic Syncthing conflict merge, no deletion, no source-file writes, no physical-file identity reconciliation, no atomic directory snapshot and no cross-device lock. Detection depends on recognizable .sync-conflict- filenames in Catalog metadata directories; independently edited canonical JSON with no conflict copy can still race. Preserve both versions, resolve conflicts externally, and recheck before editing.
- **Verification:** Simulated File System Access tests cover root/resource conflict recognition, divergent/identical/malformed/foreign/missing copies, read-only backup inspection, write/recovery/export blocking and changed-during-inspection rejection. **PR CI verified:** 159/159 Node tests and JavaScript syntax checks passed in [run 40569827073](https://github.com/teodor-andonov/261025-2132_sourcebook/actions/runs/40569827073) after the final code and fixture changes. No physical Windows/Android testing. Screenshots not generated. Release uses branch → PR → CI → squash → GitHub Actions.

## 2026-10-27 — Explicit recovery of missing Catalog resource metadata (V0.0.25 candidate)

- **Implemented in source:** Backup inspection offers a bounded, selectable **Restore selected metadata** action for `resources/*.json` entries present in the verified backup but absent from the current Catalog. This is **not** a whole-Catalog restore. Existing resource JSON is never overwritten, changed/added files are preserved (though the Catalog ID counter may advance), and missing `tags.json`, `sources.json`, `views.json` or `catalog.json` are not reconstructed.
- **Conservative checks:** SHA-256 backup validation, twice-read current Catalog snapshot, Catalog identity, missing-file selection, duplicate physical source/path, stable ID/filename consistency, valid relative paths, existing Folder/Tag references, bounded 250-record batches and sequence allocator advancement reserving even deferred missing IDs. A pending journal in either snapshot blocks restoration. A stale preview is rejected after re-inspection. Catalog metadata-only writes use the existing recoverable journal; no ordinary source file handle is opened for writing.
- **UI:** Inspection lists selectable missing resource records and makes the action explicitly confirmable with Catalog write permission. Failure requires reinspection; interrupted transactions remain available through the existing manual **Resume** flow.
- **Limits:** Does not restore source files or previews, merge diverged metadata, remove extra records, repair missing core JSON, guarantee filesystem atomicity, or prevent races between independent offline editors. A missing resource record can refer to a physical file that is also missing: restoring metadata does not recreate that file. A failed write to a newly created resource JSON may require manual repair if the browser leaves malformed bytes. Actual Chrome filesystem/Android acceptance remains outstanding.
- **Verification:** New simulated-FileSystemHandle Node tests cover restore planning, sequence safety, foreign/tampered backups, orphan references, stale previews, interruption/recovery, invalid paths and batch caps. **CI pending at documentation authoring time**; do not treat these as verified until the PR workflow passes. Screenshots untouched. Releases follow branch → PR → CI → squash → GitHub Actions.

## 2026-10-27 — Verified Catalog metadata backups and read-only inspection (V0.0.24 candidate)

- **Implemented in source:** Settings now offers **Export backup** for the active Catalog. The JSON snapshot includes raw `catalog.json`, `sources.json`, `tags.json`, `views.json`, all `resources/*.json` metadata records and any pending `.sourcebook-pending.json` recovery journal. It intentionally excludes previews, device-local grants and ordinary source files.
- Every included file has a SHA-256 digest. Export re-reads the file list and contents to catch common concurrent modifications, caps payloads at 25 MiB/10,000 records and refuses unexpected resource JSON paths. **Not** an atomic filesystem snapshot, cross-device lock or complete catalog folder archive.
- **Inspect backup** accepts a local JSON file, verifies its digests and catalog ID/code, then compares metadata read-only against the open Catalog: unchanged, changed, missing now and added since backup. Pending journals are flagged. No automatic restore/merge exists; no source or Catalog files are written by inspection.
- Added unit tests for snapshot content, checksums, tampering, foreign Catalogs, pending journals and simulated concurrent edits. Offline shell precaches the new module. **PR CI:** [run 40551202489](https://github.com/teodor-andonov/261025-2132_sourcebook/actions/runs/40551202489) passed Node tests and JS syntax checks for the feature code and workflow changes. Pages publishing and physical Windows/Android validation remain separate.
- **Development workflow:** side branch → PR CI → squash merge into release `main` → GitHub Actions publication (manual dispatch also supported). Manual screenshots remain artifact-only and are never part of normal CI.
- Follow-up: genuine browser/file-picker acceptance, safe catalog restore design with explicit preview/confirmation, Syncthing conflict-copy detection and large-catalog streaming export.

## 2026-10-27 — Fold-inspired file identity and side-preview refinement (V0.0.23 candidate)

- Audited Fold `teodor-andonov/261013-1633_pwa-file-explorer` (its file extension palette and badges, neutral root rail, layout controls, preview pane and resizer). Ported design principles rather than Fold's edit/write/delete operations or code architecture.
- Added `src/file-symbols.mjs` with short, extension-first symbols and subtle category-specific hues for common images, code, PDFs, documents, videos, archives and CAD/BIM formats (`.dwg`, `.ifc`, `.3dm`, `.rvt`, etc). Icons are reused by Gallery, List and Table; unknown extensions remain neutral. Interaction selections, tags and panels remain grayscale plus one configurable blue accent.
- Reorganized Gallery/List/Table view buttons as one compact group; refined the sidebar rail, headings, tab and View row density, neutral active backgrounds and quiet pin/delete controls. No new collections or metadata concepts.
- Upgraded the **right inspector to include a read-only side preview** for single selections: image, PDF, video, audio, capped text/code or a format glyph; catalog metadata and tag/notes editing remain below. Existing full-screen viewer is available via `Open preview`. The side preview does not request write access, start video playback automatically or touch ordinary files.
- Sidebar and inspector can be resized on desktop by pointer or keyboard separators; sizes live in local browser preferences. On narrow screens the existing slide-out patterns are retained, with no desktop grip in the touch layout. Object URLs for side previews are revoked when selection/view changes, and stale async loads are ignored.
- New unit tests cover type labels, CAD/BIM mapping, unknown extensions and preview-size safety. **CI and physical Windows/Android testing remain pending** until externally verified. Pages and screenshot workflows were not triggered.
- Follow-up: richer Markdown/code rendering inside the side preview, fully tested pointer-resize ergonomics, and actual real-device UX validation.

## 2026-10-27 — Recoverable catalog JSON transactions (V0.0.22 candidate)

- **Implemented in source:** Metadata writes for resource objectification/editing, bulk nested Tags, Tag pinning, registered Catalog Folders and saved Views now use a catalog-local `.sourcebook-pending.json` write-ahead journal. The journal records exact before/after JSON snapshots, is verified before metadata writes, and is removed only after all changed catalog files are verified. Ordinary source folders are never written by this mechanism.
- **Recovery UX:** Opening a catalog inspects the journal **read-only**. Pending work appears in a compact sidebar warning; editing is blocked until the user explicitly chooses **Resume**, grants catalog write permission and confirms. Replay is idempotent: already-applied snapshots are skipped. Divergent records, foreign/malformed journals and changed catalog identities fail closed; no automatic overwrite or rollback occurs. After successful replay, the catalog and Folder bindings are reloaded.
- **Concurrency and failure boundaries:** Before-write snapshot checks, per-step journal identity checks and revalidation of previously applied core metadata improve safety; they are **not** an atomic filesystem transaction or cross-device lock. A race between independent browser tabs/devices after the checks remains possible. Syncthing conflict files, simultaneous offline ID allocation, malformed individual resource records and backup/restore still need dedicated reconciliation. Interrupted writes to the journal itself may require manual repair. Recovery replays catalog metadata, not physical-source validation.
- **Tests:** Simulated File System Access handles cover journal-first writes, interrupted saves, idempotent replay, external divergence, stale preflight, invalid paths/identities, no-op View updates and bulk-tag interruption. [CI run 40542438446](https://github.com/teodor-andonov/261025-2132_sourcebook/actions/runs/40542438446) passed **127/127 Node tests** plus syntax checks at `8b81611`. The final code commit `ea2b53d` also passed [CI run 40542514229](https://github.com/teodor-andonov/261025-2132_sourcebook/actions/runs/40542514229); documentation-only commits do not trigger code CI.
- **User controls:** No screenshot generation, visual fixtures, Pages publishing, releases or Mindmap changes were triggered. Physical Windows and Android filesystem interaction was **not** tested. The hosted PWA is not updated by code commits.

## 2026-10-27 — Configurable table columns and scan-aware View status filters (V0.0.21 candidate)

- Table Views now offer a compact **Columns** dialog to show/hide Type, Source, Location, Tags, Notes, Status and ID; Name is always shown. The renderer derives headings/cells and group heading spans from the chosen columns, retaining selection, keyboard preview, sorting and the same inspector. Order remains a fixed, predictable schema order; column drag/reorder and custom widths are not yet implemented.
- Added **Catalog status** filtering for active saved Views: All, Cataloged, Not cataloged, Missing (scan), and Type changed (scan). The predicate acts on the existing explicit read-only scan overlay and never silently triggers a scan. Only fully scanned roots produce missing signals; unscanned/disconnected roots are not assumed missing.
- Table-column selection and status changes update the current View in memory; **Update** writes them to the existing `views.json` only after optimistic concurrency checks and readback verification. Previously saved Views default to All statuses and the original five columns without automatic migration writes. Plain files and source-folder contents are unchanged.
- Added pure metadata/filter validation and integration/controller tests for legacy defaults, missing vs incomplete roots, column safety, and persistence/restoration. Compact neutral controls preserve the one-accent visual contract.
- Service-worker shell updated to `sourcebook-shell-0.0.21-view-columns-status`. Screenshot capture and Pages publishing remain **explicitly manual only** and were not triggered. GitHub Actions CI and physical Windows/Android validation are still pending at commit time.
- Further work: user-defined table column order/widths, additional predicate composition, high-volume rendering and recoverable catalog writes.

## 2026-10-27 — Saved Views table and grouping presentation (V0.0.20 candidate)

- Added **Table** as a third presentation alongside Gallery and List, available from the same top-bar view controls. Table rows show Name, Type, Location, Tags and the explicit read-only scan Status; selectable rows preserve the existing inspector, reveal and preview behaviours. Column headings can sort by Name, Type or Location using the shared sorter.
- Active saved Views have a compact **Group by** selector: None, Source, physical Folder or file extension/Folder Type. Grouped Gallery/List sections and Table heading rows use the same read-only grouping model, preserving the ordering within groups.
- View presentation now persists `mode: 'table'`, `sort: 'location'` and optional `groupBy` in the existing `views.json` schema. Older Views lacking `groupBy` normalize to `none` without implicit migration writes or changing stable IDs. View open restores its layout/group; explicit Update persists changes.
- Added pure presentation grouping/table-metadata tests and View model/controller tests for restoration, persistence, legacy defaults, invalid options and deterministic location sorting. No file-system mutations, catalog memberships, or separate Collection/Smart Folder types.
- Kept the neutral compact visual system and one configurable accent. The existing scan overlay remains read-only and supports table statuses for missing/unobjectified/type-changed items. Service-worker shell bumped to `sourcebook-shell-0.0.20-view-table-grouping`.
- Screenshots and Pages publishing remain manual-only and **were not triggered**. Full GitHub Actions checks, browser interaction testing and physical Windows/Android acceptance are **pending at commit time**.
- Next: table column preferences, richer filters/query builder and defensive reconciliation of multi-writer catalog JSON.

## 2026-10-27 — Read-only Catalog Folder scan and safer source bindings (V0.0.19)

- **Implemented in source:** Active saved Views expose a compact **Scan** action. It recursively enumerates already-granted registered Catalog Folders (no permission prompt, no file reads or writes), skips nested `.sb` directories, yields periodically, reports progress and supports cancellation. Each scan is limited to 50,000 entries and depth 32; incomplete/denied/disconnected roots are explicitly partial, not falsely treated as empty.
- **View behavior:** An explicit in-memory scan overlays ordinary unobjectified files/directories onto cataloged resources using source ID and relative path, without changing `*.sb` JSON or source files. Name, file-type and folder-scoped Views include these entries; tag-filtered Views include only resources with catalog tags. Reveal in folder remains the path to catalog/tag an unobjectified result. The temporary scan is discarded on catalog switch, root registration/reconnect and Sourcebook-created folder/import changes.
- **Stale source signals:** A completed scan identifies catalog records missing at their expected path or with a changed file/directory kind. An incomplete root is never marked missing merely because it was not scanned. Scans are snapshots, not watchers: external changes after a scan may invalidate these signals.
- **Metadata safety:** Catalog root reconnect now checks `isSameEntry` against a previously saved handle when available; a new-device reconnect with no prior handle requires matching folder name and explicit user confirmation. Single-resource metadata saving rechecks the live selected source entry, refuses record kind mismatch, reads back written catalog JSON, and blocks navigation/reconnect/competing metadata actions during the save. This does **not** establish crash-atomic or cross-device transaction safety.
- **Verification:** [CI run 40531222467](https://github.com/teodor-andonov/261025-2132_sourcebook/actions/runs/40531222467) passed **104 Node tests** and JavaScript syntax checks for the scan + binding implementation at commit `6879d3c`. The subsequent concurrency-guard commit `a45de0c` also passed [CI run 40531308487](https://github.com/teodor-andonov/261025-2132_sourcebook/actions/runs/40531308487) with 104/104 Node tests and syntax checks; no browser UI automation, physical Windows/Android tests, screenshot captures, Pages publishing or releases were performed.
- **Known limitations:** Scans must be requested explicitly in a saved View and are not persisted; catalog-wide Tag results still query cataloged metadata only. No automatic filesystem watchers, incremental index, search of ungranted folders, content search, or physical-source mutation. Overlapping registered roots can surface the same physical file under two logical source IDs. At the limit or on errors, results are partial. Source identity cannot be proven on a new device from a name alone; explicit user confirmation is not cryptographic verification. Syncthing conflicts, multi-writer allocations, interrupted multi-file saves and crash recovery remain open.

## 2026-10-27 — Compound nested-tag Views (V0.0.18 candidate)

- Saved Views support up to 16 stable tag IDs with **All (AND)** or **Any (OR)** matching. Descendant tags satisfy their ancestor. Conditions combine with source/folder scope, filename search, file type and gallery/list presentation.
- The existing Save View dialog includes searchable nested tag checkboxes and an All/Any selector. An active View exposes a compact **Tags** action for explicitly editing its tag conditions. Verified edits immediately refresh matching results; the normal Update button saves search/presentation without changing tags.
- Missing/deleted tags remain visibly selectable. AND Views requiring missing tags produce zero matches; OR Views match surviving alternatives but never expand to all files when everything is missing. Earlier single `tagId` Views normalize to one-element `tagIds` in memory, without automatic migration.
- Regression tests cover compound logic, hierarchy, missing IDs, validation, backwards compatibility and catalog-only persistence. Ordinary source files and resource records are not modified by View operations.
- No additional permanent sidebar panels or Collections model. Screenshots and Pages remain manual-only. GitHub CI and physical Windows/Android interaction verification pending at commit time.
- Future: richer expressions, grouping/table presentation and unobjectified filesystem search.

## 2026-10-27 — Saved View file-type filters and pinned shortcuts (V0.0.17 candidate)

- Views now have an optional file-type predicate (All, Images, PDFs, Videos, Folders, Other) and optional pin state. A compact selector in the existing content toolbar changes file-type filtering; explicit View Save/Update persists it. Folder browsing can also filter locally without creating or editing files.
- Pin/unpin and pinned-first alphabetical sorting reuse the existing Views sidebar and the catalog-only verified `views.json` writer. Stable View IDs are preserved.
- Older `views.json` files without these fields are normalized in memory. Optimistic snapshot comparisons canonicalize both legacy and new schemas to avoid rejecting unchanged legacy Views; no implicit migration write occurs.
- Tests cover backward compatibility, pinning and sorting, file-type matching and View controller saves. Source files and catalog resource records remain untouched by these View edits.
- Cache name updated to `sourcebook-shell-0.0.17-view-filters`. User-controlled screenshots and Pages were not run. CI and real-device interaction checks pending at commit time.
- Compound multi-tag conditions, grouping/table views and catalog-wide queries including unobjectified files remain later work.

## 2026-10-27 — Saved Views first vertical slice (V0.0.16)

- **Implemented in source:** catalog-local `views.json` with stable View IDs, optional registered-root/recursive-folder scope, nested tag ID, filename/hashtag query, gallery/list, density and name/type sorting. Catalog sidebar supports Save View, open, explicit Update/Rename and Delete. Results are read-only catalog metadata projections with existing preview and Show in folder actions.
- View writes request catalog permission, verify catalog identity, reject stale `views.json` snapshots, validate all saved records and read back after writing. Source files are not modified by View operations. Missing registered roots and deleted tag IDs do not widen results.
- **Scope limitation:** Views currently include cataloged resources only, not all unobjectified files on disk. Queries run over loaded metadata, not a persistent filesystem search index. Metadata writes are optimistic and not crash-atomic or fully race-safe across concurrent editors.
- **Verification:** GitHub Actions CI passed for the query/model commit (`ad12230`, run `40522343661`), UI commit (`fd3edba`, run `40522660001`), controller integration tests (`dd0bada`, run `40522825674`), and final sorting test correction (`0e2ded8`, run `40522990565`): 82 Node tests plus JavaScript syntax checks. Intermediate `faacbb4` CI failed because a new test expected `.png` to sort before `.pdf` in type order; the expectation was corrected without changing implementation. No screenshots, live deployment, or physical Windows/Android testing were performed.

# Sourcebook implementation status

**Date:** 2026-10-27  
**Build:** V0.0 initial real PWA prototype  
**Repo:** https://github.com/teodor-andonov/261025-2132_sourcebook

## 2026-10-27 — Catalog-wide nested Tag discovery (V0.0.15 candidate)

- Clicking a Tag or pinned tag shortcut opens a **catalog-wide result view** across all registered roots, including matching descendants and legacy string-tag records; it no longer silently restricts sidebar tag browsing to the last open folder. This is a transient browser view, **not** another collection/smart-folder entity or physical folder Tab.
- Result cards show their originating registered root/folder path; filename/tag search works within the results. A read-only inspector shows tags and a **Show in folder** action, which returns to the actual physical directory and selects that resource.
- Image thumbnail and preview handles resolve lazily through already-granted source folders. Offline or revoked folder permissions do not trigger hidden permission prompts; metadata results still remain visible until reconnected.
- Catalog-wide results cannot currently be bulk-tagged in place: explicitly reveal the resource in its physical folder first. This avoids applying current-folder writes to the wrong registered root. Search grouping, saved Views and full cross-root bulk editing remain future work.
- Added pure `catalogTagResults` search-index tests for nested descendants, multiple sources, legacy tags, malformed paths, duplicates and deterministic ordering. No source files or catalog records are modified by this discovery feature.
- Bumped service worker cache to `sourcebook-shell-0.0.15-ta-icons-1`. GitHub CI and physical Windows/Android acceptance remain pending until confirmed; screenshots and Pages remain manual-only and were not triggered.

## 2026-10-27 — Bulk nested Tags and safe catalog-only writes (V0.0.14 candidate)

- Added touch-friendly Select mode, Ctrl/Cmd-click, Shift range and Ctrl/Cmd+A (current filtered folder results). Shift selection excludes resources hidden by active filters; the Clear action tracks selection without redrawing the gallery. The multi-resource inspector now supports Add/Remove nested tags using hashtag pills and keyboard suggestions, with a limit of 250 selected resources per operation.
- Add preserves unrelated tags and notes; Remove matches exact paths rather than descendants. Legacy string tags migrate only on explicitly changed records. Stable IDs are reused; new resource identities are allocated without renaming or writing ordinary files.
- Catalog identity, taxonomy and selected records are preflight-checked; source entries are revalidated read-only. Selection, folder and catalog changes are blocked during bulk writes; source/path/tag input is snapshotted before asynchronous preflight. Catalog JSON writes are read back and verified, with stale checks during the batch. **Not atomic:** interrupted batches can partially save; errors report verified record count and the catalog refreshes afterward.
- Single-resource save now compares the entire previous record rather than only `updatedAt`; changing search/tag filters clears hidden selection.
- Added pure planner and simulated FileSystemHandle integration tests. **Verified:** GitHub Actions [bulk planner CI](https://github.com/teodor-andonov/261025-2132_sourcebook/actions/runs/40511954093) and [selection integration CI](https://github.com/teodor-andonov/261025-2132_sourcebook/actions/runs/40512141791) completed successfully (Node unit tests and JavaScript syntax checks). The [navigation-guard CI](https://github.com/teodor-andonov/261025-2132_sourcebook/actions/runs/40512303322) also completed successfully. No physical Windows/Android or browser-interaction validation is claimed. No screenshots or Pages deployment were triggered.

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
