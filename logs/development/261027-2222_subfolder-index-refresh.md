# Sourcebook — V0.0.28 explicit subfolder refresh

**2026-10-27 22:22 Europe/Madrid** · Development branch: `dev/261027-2222-subfolder-index-refresh`

## Problem

A 50,000-entry root-level index can persist across app restarts, but refreshing one changed nested folder still requires traversing every sibling. A careless incremental implementation would also mark unvisited siblings missing, or treat stale cached kinds as fresh filesystem evidence.

## Work delivered

- Read-only `scanRegisteredSubfolder`: resolves an existing relative path using `getDirectoryHandle`, checks read permission, traverses only that subtree and returns explicit complete-subtree markers.
- `assertIndexedRootIdentity` checks `isSameEntry` before replacing cached data; neither matching root names nor source IDs prove identity.
- `refreshSourceSubtreeIndex` replaces only fully scanned entries within the requested subtree, keeps sibling entries and the full-root scan timestamp, reports added/removed/type changes, and rejects invalid or foreign paths.
- View toolbar gains a compact Folder selector and optional subfolder input with directory suggestions. Empty path keeps existing full-root refresh behavior.
- Query overlay uses verified subtree scopes for missing/type-drift and stale indicators. No unvisited root or sibling is silently marked fresh. After restarting the PWA, restored entries are stale again.
- Regression tests cover path traversal, incomplete/cancelled scans, wrong root identity, stale status, and sibling preservation.

## Boundaries and verification

No automatic watcher or change notifications, no source-file writes, no Catalog JSON changes, no cross-device index sync, no overlap deduplication. Initial complete-root indexing is still required; a missing/deleted subfolder is reported as an error rather than silently erasing its cached entries. The 50,000-entry cap and 32-level traversal limit remain.

PR CI and squash merge are required before claiming completion. No screenshots or visual fixtures were captured or requested. Actual physical Windows/Android testing is still outstanding.
