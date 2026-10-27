# Sourcebook — device-local source indexing

**Date:** 2026-10-27 21:32 Europe/Madrid  
**Branch:** `dev/261027-2130-durable-source-index`  
**Cycle:** V0.0.27 candidate · root-granular durable indexing

## Why this batch

The existing explicit View scan was ephemeral. Every restart discarded the discovery of unobjectified files, and rescanning a single Folder required discarding unrelated results. A persisted snapshot introduces another risk: stale cached files must never be represented as live or be used to infer missing resources.

## Implementation

1. New `src/source-index.mjs` validates bounded device-local index snapshots, ties each registered root to a persisted FileSystemDirectoryHandle, and restores entries only when `isSameEntry` proves the current handle is the same physical root.
2. Explicit View Index/Refresh now offers All Folders or a single root, retains unrelated complete root snapshots and reports path additions/removals/type changes for refreshed roots. A partial or denied scan preserves the last complete cached snapshot and does not assert absence. Cancelled scans do not publish results.
3. Persist only complete root snapshots into the existing IndexedDB settings store, namespaced by Catalog ID. No `.sb` metadata, source-file or Tag writes. Clearing the device index is explicitly confirmed.
4. Cached results are visibly stale in the View table/inspector. Missing and type-drift status require a completed scan in the current session. The PWA service worker precaches the new module and retains its app-specific cache deletion rule.
5. Add unit/integration tests for identity mismatch, malformed/foreign caches, root-specific delta, cancellation/partial safety and stale status. Update README, design contract, roadmap and implementation status.

## Verification and honesty

**PR CI pending at authoring.** Tests and syntax checks must be verified by GitHub Actions before merging. No screenshot capture or physical Windows/Android test is claimed. No separate deployment is triggered; only the established squash-merge → Actions path is allowed.

## Remaining risks

- Refresh is **incremental by registered root**, but still enumerates every entry of the selected root. No filesystem watchers, subtree fingerprints, durable scan cursor or automatic background refresh.
- The index is device-local and disposable; it does not synchronize with Syncthing or reconstruct browser permissions. Browser storage eviction, clone restrictions or quota failures may prevent persistence.
- Two different registered root IDs may still point at overlapping physical trees; physical deduplication remains unresolved.
- A complete scan is only a point-in-time observation; external changes after the scan are not observed until the next refresh.
- Multi-editor Catalog JSON reconciliation and physical-device acceptance remain separate open tasks.
