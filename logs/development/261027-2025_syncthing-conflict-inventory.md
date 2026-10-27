# 261027-2025 — Catalog sync-conflict detection and write safety

**Cycle:** V0.0.26 candidate · **Branch:** dev/261027-2025-sync-conflict-guard · **PR:** #4

## Context and decision

A verified backup and write-ahead journal do not protect a Catalog when Syncthing leaves sibling conflict copies. Previously, Sourcebook read canonical JSON without noticing the alternate version, and the resource loader could parse a conflict copy as an ordinary resource record. Treat every recognized metadata conflict copy as a **stop signal**, including an identical copy. Inspection must be non-destructive; there is no automatic conflict merging, deletion or hidden selection of a winning version.

## Implementation

- Added src/catalog-conflicts.mjs: bounded read-only inventory and comparison for recognized conflict filenames in the .sb root and resources/, with statuses, SHA-256 checksums, expected Catalog identity check, double-read drift checks and fail-closed write preflight.
- Integrated preflight into commitCatalogTransaction, explicit resumeCatalogTransaction and the final journal-clear boundary. Catalog backup export and selective resource restoration refuse unresolved conflict copies; read-only backup inspection can still show the conflict count.
- Added Settings **Inspect conflicts**, sidebar warning, recheck, and a JSON diagnostic report export. Resource loading ignores recognized conflict-copy JSON; no source folders are scanned for conflicts and no ordinary files are written.
- Added simulated File System Access tests for detection, read-only classification, backup inspection, unsafe-write refusal, interrupted journal protection and inspection races. Bumped the app-specific service-worker cache and added the new module to the offline shell.
- Updated roadmap, design contract, implementation status and README.

## Safety and unresolved work

- Syncthing filename recognition is heuristic. Renamed copies, canonical edits without copies, unsupported conflict patterns and simultaneous cross-device writes are not detected reliably.
- No automatic conflict resolution or complete ancestry-aware three-way merge. A reported "identical" copy still needs manual cleanup after preservation of both versions.
- No filesystem-atomic snapshot, lock, physical Windows/Android validation, or proof that a live PWA has activated the updated shell.
- GitHub Actions PR CI and squash merge must be verified before marking the cycle complete. No screenshots or manual deployments.

## Follow-up

After a physical-device test and a carefully designed ancestry/revision model, explore safe preview-only reconciliation for nonoverlapping changes. In parallel, prioritize durable incremental indexing and performant high-volume browsing; do not add new collection concepts.
