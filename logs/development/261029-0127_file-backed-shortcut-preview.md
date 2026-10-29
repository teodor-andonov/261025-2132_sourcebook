# 261029-0127 — File-backed shortcut and bounded text preview

## Intent
Make ordinary .url files useful in Folder Tabs and Catalog results rather than showing a generic unsupported-file download. Preserve read-only browsing, never fetch external pages automatically, and bound text preview memory.

## Implementation
- Shared read-only physical file preview module. Only canonical HTTP(S) Internet Shortcuts are actionable; reject oversized, ambiguous, credential-bearing, non-HTTP(S) and malformed shortcuts.
- Support common Windows .url metadata while refusing URL keys in unrelated sections. Legacy Catalog-only URL records remain untouched.
- Side preview and full preview share the validated reader; an explicit link click is required for external navigation. No ordinary file or Catalog writes.
- Text/Markdown full previews read at most 200 KB at the Blob.slice layer; truncation is visible. Async full preview rendering is protected against stale selections and Close.
- Node regressions and a headless Chromium OPFS UI scenario exercise the workflow. OPFS is NOT an external Folder, Android SAF or Syncthing acceptance test. No screenshots or visual fixtures.

## Verification
- Development branch: `dev/261029-0127-file-backed-shortcut-preview` from main `c5f6bd0a634d271221baa2932847c8fac437601b`.
- PR CI, squash merge, Pages publishing and post-merge branch cleanup are separate gates and must be checked independently after authoring.

## Remaining risks
- Physical Windows Chrome and Pixel 8 external Folder access, permissions, offline and Syncthing roundtrip remain M0 unverified.
- Browser file handles can become stale while a preview is loading; external writers can still change files independently.
- A clicked external website is outside Sourcebook's control; Sourcebook never prefetches the shortcut target.
