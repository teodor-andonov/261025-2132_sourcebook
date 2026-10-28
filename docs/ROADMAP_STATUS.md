> **V0.0.46 candidate — Android file share intake (28 Oct 2026):** Ordinary files shared to the installed PWA can be staged temporarily (5 files / 50 MiB per share, 100 MiB inbox-wide), reviewed and explicitly copied to a real writable Folder with verification. Browser Download remains unverified and cannot clear staging. Existing URL/text inbox remains. **Implemented in code: candidate; Device verified: Not tested; Released & accepted: No.** M0 remains open. [Development log](../logs/development/261028-1526_android-file-share-inbox.md).

> **V0.0.45 candidate (28 Oct 2026):** Explicit clipboard raster-image capture enters the existing reviewed ordinary-file import path, with generated filenames and no automatic writes. Code and Node tests are not physical-device verification. Windows Chrome, Pixel 8 and Syncthing acceptance remain **Not tested**; the M0 gate remains open.

> **V0.0.44 candidate — reviewed text intake:** Paste/drop/clipboard-read no longer writes ordinary files before an explicit review and destination confirmation. Single HTTP(S) URI-list drops become `.url` drafts; multiple URLs become `.md` drafts. **Implemented in code: candidate, pending PR CI. Device verified: Not tested. Released & accepted: No.** M0 remains open. [Development log](../logs/development/261028-1330_reviewed-text-intake.md).

> **V0.0.43 candidate — large-file import reliability:** Sourcebook implements bounded-chunk ordinary-file copying, byte-for-byte large-file readback, progress and Abort, while keeping SHA-256 for small files. **Implemented in code: candidate, pending CI. Device verified: Not tested. Released & accepted: No.** The M0 device gate remains open. [Development log](../logs/development/261028-1230_streamed-file-import.md).

> **V0.0.42 candidate:** Ordinary file import is an explicit picker/drop → review → destination confirmation → checksum-verified physical copy, without silent collision renaming or Catalog-only resource creation. Device verification **Not tested**; release acceptance **No**. [Development log](../logs/development/261028-1126_safe-file-import.md).

**V0.0.41 candidate:** Explicit legacy URL to physical .url migration implemented in code; device verification and release acceptance remain open. [Development log](../logs/development/261028-1025_legacy-url-file-migration.md).

> **V0.0.40 candidate — 28 October 2026, 09:29 Madrid:** File-backed inbox actions and explicit browser Download fallback are implemented in source. Physical `.url` files can appear in saved Views' Links filter. The M0 disposable fixture now verifies a real `.url` plus its Catalog metadata. Legacy `kind=url` records remain untouched and unmigrated. **Device verified: Not tested. Released & accepted: No.** PR CI and deployment evidence must be added only after successful Actions runs. See [development log](../logs/development/261028-0929_file-backed-capture-inbox.md).

> **Resource model correction (2026-10-28):** durable captures are ordinary filesystem files: links as `.url` and text as `.md`. Existing V0.0.35–0.0.38 Catalog-only URL rows are legacy and not a valid V1 resource model. Sourcebook retains them until explicit migration. [Design contract](DESIGN_CONTRACT.md). Physical Windows/Android acceptance remains untested.

## 2026-10-28 08:31 Europe/Madrid — Cross-device M0 evidence comparison (V0.0.38 candidate)

- **Implemented in code:** A read-only, memory-only comparison of two explicitly selected M0 JSON exports (one Windows, one Android), with schema/size validation, per-scenario status matrix, release-commit and standalone checks, timestamp warnings, and missing external M0-05 evidence warnings. Imported reports are not persisted or uploaded.
- **Synthetic fixture identity:** The existing disposable .sb create/verify probes now return a SHA-256 fingerprint of their random test fixture UUID (no path or filename). A matching fingerprint across two successfully verified reports is only *supporting evidence*, not proof of Syncthing transport, live permission persistence or device acceptance.
- **Acceptance safety:** Comparison can report 'ready for manual review' but always returns accepted=false. Missing, blocked, stale, mismatched and unverified reports cannot be treated as passing. Manual M0-01…08 and physical Windows Chrome/Pixel 8 testing remain outstanding.
- **Verification at authoring:** Automated regression tests added; actual PR CI, merge and Pages publication must be checked separately. No physical devices, screenshots, visual fixtures or Mindmap changes.
- **Development log:** [M0 cross-device evidence](../logs/development/261028-0831_m0-cross-device-evidence.md).

# Sourcebook — live roadmap status and acceptance

**Updated:** 2026-10-28 · **Source:** `docs/ROADMAP_V1_ULTRA.md` · **Code reference:** V0.0.31 / merged PR #10; V0.0.32 M0 feasibility merged; V0.0.34 Android incoming-share staging published; V0.0.35 portable Catalog URL resources published; V0.0.36 bulk URL Tag edits in development (CI, release and device verification separate).

## How progress is tracked

The ULTRA roadmap contains **broad release requirements**, not a reliable count of finished features. Its 112 checklist items (only six checked as of this update) mix fully implemented slices, partial slices and platform acceptance gates. Do **not** report the proportion of checked boxes as product completion.

Track each workstream independently through three stages:

1. **Implemented in code:** feature works in source and has meaningful automated tests. May be *Partial*, *Yes* or *No*. A merged PR alone is not proof of real-device suitability.
2. **Verified on devices:** user or tester has actually run the end-to-end scenario on **Windows Chrome and Pixel 8 Android Chrome** (installed PWA when applicable), recording exact versions, storage provider, results and failures. Automated Node tests and synthetic Chromium screenshots do **not** qualify.
3. **Released & accepted:** relevant app commit is deployed successfully via the main-only Pages workflow **and** the acceptance scenario passes on the target devices. Main commits without verified deployment/acceptance do not qualify. This is **not** the same as `main` containing the source.

| Workstream / original release milestone | Implemented in code | Verified on both devices | Released & accepted | Main gaps / evidence |
| --- | --- | --- | --- | --- |
| **M0 / V0.0:** PWA, local file and permission feasibility | Partial | **Not tested** | **No** | Installed PWA and Syncthing-backed Folder/Catalog access need a real Windows+Pixel 8 test. Actions and manifest exist, but this gate is open. |
| **V0.1:** Browsing, Tabs, gallery/list/table, side preview and visual polish | Substantial | **Not tested** | **No** | Folder Tabs and inspector implemented; PDF page thumbnails, mobile keyboard/touch and large-folder performance still incomplete. |
| **V0.2:** Portable `.sb` Catalog and filename identity | Partial | **Not tested** | **No** | Catalog JSON, root grants, bracketed identifiers and crash recovery exist; cross-catalog token lifecycle, rename/move rediscovery, migrations and portability tests incomplete. |
| **V0.3:** Nested Tags and manual grouping | Substantial | **Not tested** | **No** | Stable nested Tags, pinned shortcuts, bulk Add/Remove, catalog-wide discovery work in code. Tag reparent/merge and genuine multi-device Sync acceptance remain. |
| **V0.4:** Saved Views and search | Substantial | **Not tested** | **No** | AND/OR tags, type/status filtering, source/folder scope, grouping, table columns and explicit indexed scan work. Richer predicates, live change detection and 10k+ responsiveness remain. |
| **V0.5:** Capture / reference collection | Partial | **Not tested** | **No** | File-backed `.url` and `.md` creation, temporary device-local link staging, Android incoming text/URL review, explicit selected-Folder save and unverified browser Download fallback exist in code. Historical Catalog-only URL import/edit and Tags are **legacy**, not valid new Resources; user-confirmed migration and real-device acceptance remain open. Android file shares and reliable provider writes remain unverified. |
| **V0.6:** Safe file-management | Early | **Not tested** | **No** | Folder creation and browsing exist; copy/move/rename/delete, conflict policy, queue/undo and truthful browser capability fallbacks remain. |
| **V0.7 / V0.8:** Rich previews and power/UX | Partial | **Not tested** | **No** | Fold-inspired symbols, side previews, View controls exist; advanced PDF/image viewer, URL cards, fast keyboard/mobile UX and high-density tuning remain. |
| **V0.9:** Safety and beta reliability | Strong foundation | **Not tested** | **No** | Recovery journal, checksummed metadata backup, selective missing-record restore, Syncthing conflict inspection, device-local index and verified root overlaps implemented; multi-writer reconciliation and stress testing open. |
| **V1:** Reliable cross-device daily driver | Not yet | **Not tested** | **No** | Acceptance scenarios A–Q in ULTRA roadmap are not yet signed off. |

### Evidence from merged work

- **V0.0.22:** catalog write-ahead recovery journal — 127 Node tests passed in [CI run 40542514229](https://github.com/teodor-andonov/261025-2132_sourcebook/actions/runs/40542514229).
- **V0.0.23:** Fold-inspired icons, compact rail and previews — committed to main; physical validation not performed.
- **V0.0.24–0.0.26:** checksummed metadata backup, selective restore and Syncthing conflict-copy guard — see `IMPLEMENTATION_STATUS.md`.
- **V0.0.27–0.0.29:** indexed refresh, subtree refresh and verified overlapping Catalog Folders — [PR #7](https://github.com/teodor-andonov/261025-2132_sourcebook/pull/7) verified **188/188** Node tests in its PR CI.
- **V0.0.30:** read-only overlapping Catalog record review — [PR #8](https://github.com/teodor-andonov/261025-2132_sourcebook/pull/8) verified **196/196** Node tests and JavaScript syntax checks. These are automated simulations, not device acceptance.

**V0.0.36 candidate:** Catalog URL selection and bulk Add/Remove nested Tags (up to 250 URLs, 16 paths) use stable Tag IDs and the recoverable Catalog journal. Code tests are not physical acceptance. No Windows Chrome/Pixel 8 acceptance or Syncthing roundtrip has been recorded; see [development log](../logs/development/261028-0630_catalog-url-bulk-tags.md).\n\n**V0.0.35 published:** Portable URL resources use Catalog-local sequential IDs in resources/<id>.json, with canonical HTTP(S) URLs, stable-ID Tags, notes, title, saved View filtering and read-only external opening. Manual batch import or selected device-staged transfer is explicit and journaled. Staged links are retained. Device verified: **No**; released & accepted: **No**. See [development log](../logs/development/261028-0531_portable-catalog-links.md).

**V0.0.34 candidate:** Android/Web Share Target POST inbox is implemented in code with explicit review and separate Save to device-local captured links. **Device verified: No. Released & accepted: No.** M0-08 remains Not tested on Pixel 8. Text-only shares remain manual-copy staging; no portable Catalog URL resources. See [development log](../logs/development/261028-0425_android-share-inbox.md).

**V0.0.33 candidate:** Device-local link staging is implemented in code; it is not physical-device verified or accepted. Do not count clipboard API presence as a successful Android capture test. See [development log](../logs/development/261028-0332_device-link-capture.md).

## V0.0.37 M0 portable acceptance aids (candidate; device unverified)

Device checks now includes an opt-in, **empty disposable parent** portable .sb Catalog fixture writer and read-only verifier. The fixture exercises the actual journal, nested stable-ID Tags, URL metadata, saved View and allocator, and remains in place for explicit restart/Syncthing roundtrip tests. An offline shell cache diagnostic distinguishes cached assets from an actual offline run. All M0 outcomes stay **Not tested** until physical evidence is recorded. Fixture creation is a Catalog write test, not proof of Android filesystem support. See [development log](../logs/development/261028-0724_m0-portable-acceptance.md).

## Immediate priority — close the M0 device feasibility gate

The next real milestone is **not another index feature**. Validate and record each line below on *both* target devices. A person using the devices must complete these checks; an agent must not invent a passing result.

| ID | Test / evidence to capture | Windows Chrome | Pixel 8 Android Chrome |
| --- | --- | --- | --- |
| M0-01 | Install/open Sourcebook as a standalone PWA. Record OS, browser version and Pages release commit. | Not tested | Not tested |
| M0-02 | Open real physical Folder, browse mixed images/PDFs/other files, navigate nested directories and multiple Tabs without changing originals. | Not tested | Not tested |
| M0-03 | Create/open `Sample.sb/` Catalog, register a physical source Folder, add a nested Tag and Notes, reopen, verify JSON persistence and source file bytes unchanged. | Not tested | Not tested |
| M0-04 | Close/restart PWA, confirm saved Tabs and Catalog; test regrant after permission revocation and device restart. | Not tested | Not tested |
| M0-05 | With a Syncthing-synchronized storage location, open/regrant the Catalog and confirm Tags/Views survive an actual Windows↔Android roundtrip. | Not tested | Not tested |
| M0-06 | Install/offline app shell, load local content (where permissions allow), test service-worker update without interrupting a Catalog save. | Not tested | Not tested |
| M0-07 | Run basic 500-file browse, side previews and a tagged View; record latency, bad states and crashes. | Not tested | Not tested |
| M0-08 | Explicitly test Android URL/text share plus file-picker/clipboard fallbacks; document unsupported Chrome/provider operations rather than assuming they work. | Not tested | Not tested |

**Record for each run:** date, device/OS, browser version, PWA vs browser tab, source provider/path class (not personal path), tested commit, steps, *Pass / Fail / Blocked / Not tested*, actual result, reproducible issues and evidence link. Do not include private folder contents or IDs in published test reports. Never mark a row passed simply because CI is green.

If the user cannot perform M0 now, agent development should prepare harmless test fixtures, permission/error logging and reproducible test instructions while continuing low-risk code work—do not claim the gate is closed.

## Development sequence after M0

1. **M0 real-device feasibility + fixes:** verify picker/read/write/grants, offline shell, Syncthing portability and high-value browser interaction. Keep screenshots manual only.
2. **V0.5 capture:** verify `.url` / `.md` file creation on Windows and Pixel 8, destination choice and optional Catalog annotation; then integrate Android Share Target and migrate legacy fileless URL rows by explicit confirmation.
3. **V0.6 physical operations:** capability detection and explicit safe copy/move/rename/create/delete; no overwrites without user choice, clear progress and recovery.
4. **V0.2 identity completeness + V0.9 hardening:** dual-Catalog token identity, rename/move reconciliation, crash/sync conflicts and acceptance tests.
5. **V0.7+ rich media, 10k–50k gallery measurements and user-visible polish** based on actual usability feedback.

**Release tracking:** after PR CI passes, squash merge into main, let the main-only Pages workflow deploy, delete the merged `dev/*` branch with verified head match, and update this status file only as evidence changes. Do not mistake deployment or synthetic browser screenshots for Windows/Android acceptance.

## M0 code-side readiness harness (V0.0.31 merged; V0.0.32 candidate)

Sourcebook exposes **Device checks** from the launcher (including browsers where the Folder picker is missing) and Settings. The panel reports API *presence* and standalone display state without requesting permissions; an explicitly clicked, read-only Folder probe samples at most ten entries and optionally reads file metadata without accessing file bytes or writing anything. The eight M0 cases remain **Not tested** until a person records actual Windows/Pixel 8 outcomes and evidence. Entries stay device-local until explicitly exported as sanitized JSON. This is not a substitute for a real-device test, Syncthing roundtrip, or offline acceptance. Automated tests cover the probe's read-only boundary and conservative status handling.

### Disposable permission feasibility (V0.0.32 candidate)

**Implemented in code, not device verified:** An explicitly confirmed test uses an empty user-selected disposable Folder and attempts a unique synthetic file create/write/exact-readback/delete/absence check. It does not touch existing source or Catalog files. If the browser cannot prove the synthetic file's identity/content or remove it, the test fails and warns about manual cleanup. A separate read-only picker stores an opt-in handle in device-local IndexedDB; after restart, **Recheck** queries permission and enumerates at most one entry without a new picker or permission request. **Forget handle** removes the stored grant reference. Probe outcomes are sanitized in the manual JSON report; private paths, file contents and synthetic filenames are not exported. Neither result marks M0 accepted; actual Windows Chrome and Pixel 8 observations remain **Not tested**.
