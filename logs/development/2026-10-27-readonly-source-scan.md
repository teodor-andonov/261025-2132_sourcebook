# 2026-10-27 — Read-only Catalog Folder discovery for saved Views

## Goal
Close the most visible saved-View gap without silently objectifying or modifying ordinary files. Preserve the browser-first model: folder Tabs work without catalogs; registered Catalog Folders are physical roots; tags remain stable-ID metadata; Views are saved queries and presentation, not separate Collections.

## Delivered
- Bounded, cancellable recursive scanner over previously granted directory handles. It only uses `queryPermission({mode:'read'})` and `entries()`, with a yield every 250 entries. No permission request, write, rename, move or file-body read.
- Ephemeral per-catalog scan snapshot; explicit Scan/Cancel in an active saved View. Catalog records remain the source of truth. Scanned-only files can be revealed in their physical folder for deliberate tagging.
- Query overlay deduplicates by catalog source ID + relative path. Missing metadata paths are flagged only for fully scanned roots. Type drift is displayed separately.
- Catalog source reconnect checks same-entry when possible and asks for explicit confirmation when no previous handle exists. Single-resource saves verify current source entry and JSON readback, and serialize against competing navigation/tag actions.
- Added scanner, overlay, cancellation, limits, missing-source, type-drift, reconnection and binding tests. No visual fixtures or deployments touched.

## Decision and trade-offs
The index is intentionally temporary and opt-in. This avoids writing to ordinary source files, avoids misleading durable-cache promises and limits the cost of scanning large external folders. It also means an unscanned View still returns only cataloged records. Missing and changed-kind labels are last-scan evidence, not filesystem watchers.

A file registered under overlapping roots may appear twice under different logical source IDs. We must resolve nearest-root identity and device-local root mapping before claiming physical deduplication. Permission-denied roots remain incomplete. Reconnecting a root on a new device relies on user confirmation; a matching name alone is insufficient evidence.

## Verification
- Scan + safety implementation: commit `6879d3c63afb47bdc3428933e35e34eacc3df8f8`, CI run `40531222467`: 104/104 Node tests and syntax checks passed.
- Earlier intermediate commits `a8903fa` and `0449bc4` failed CI due respectively to a test ID-factory fixture error and a malformed inspector template; both were fixed in later commits. Commit `33102b9` passed CI run `40530980793` (101/101 tests).
- The final guard commit `a45de0c` passed CI run `40531308487` with 104/104 Node tests and JavaScript syntax checks. No screenshot, Pages workflow, release, browser UI acceptance or physical-device validation was performed.

## Next
1. Add a durable disposable local index with explicit invalidation/reconciliation, not a second catalog source of truth.
2. Harden catalog writes with crash recovery, per-record conflict detection and sync-aware reconciliation.
3. Improve root overlap resolution, stale path handling, and manual Windows/Android permission tests.
