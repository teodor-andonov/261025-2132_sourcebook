# 261029-0325 — Progressive, bounded Folder browsing

## Context and decision
V0.0.57 added independent Folder Tab presentation, but navigation still sorted and rebuilt the resource grid every 100 enumerated entries. A large Folder could repeatedly rebuild the UI and delay tab switching. This cycle targets everyday read-only Folder navigation rather than more synthetic M0 acceptance infrastructure.

## Implementation
- Added a pure asynchronous Folder enumerator: bounded 256-entry batches, event-loop yields, time-throttled progress snapshots and request-generation cancellation.
- Wired plain Folder Tabs and registered Catalog Folder browsing through the same read-only path. Partial results can be searched and sorted, but 20,000-entry overflow is explicitly labeled partial; provider exceptions label the visible results incomplete.
- The directory iterator is closed on cap/cancellation through `for await` early return/break. No ordinary file is created, renamed, moved or removed, and no Catalog metadata is written.
- Added seven Node tests for progress, limit, exact-limit, filtered entries, cancellation, provider errors, invalid entries and throttling, plus one native Chromium OPFS scenario. Service-worker cache includes the new module and uses only Sourcebook's prefix.

## Verification and acceptance boundaries
- **At authoring:** Code and tests added; actual PR CI, main CI and Pages outcome must be verified separately. Do not claim unrun tests passed.
- **Device verified:** Not established on physical Windows Chrome or Pixel 8 Android. Chromium OPFS is synthetic origin-private storage, not a Syncthing-managed Folder.
- **Released & accepted:** No; M0 physical filesystem-provider, permission persistence and Syncthing roundtrip gates remain open.
- No screenshots, visual fixtures or Mindmap changes.

## Remaining risks
- The 20,000-entry ceiling intentionally trades completeness for bounded memory. Searches/sorts on such a Folder are partial; users should open a narrower Folder. There is no resumable filesystem cursor or filesystem watcher.
- Native File System Access iteration is browser/provider-dependent; a stalled provider cannot be forcibly cancelled, though its stale results are ignored after control returns.
- Other applications and Syncthing can modify files while enumeration is running; this is not a coherent filesystem snapshot.
