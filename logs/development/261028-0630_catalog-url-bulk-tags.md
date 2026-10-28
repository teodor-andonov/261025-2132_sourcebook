# 2026-10-28 06:30 Europe/Madrid — Portable Catalog URL bulk Tags

## Goal and product fit

Close the gap between portable URL capture and the existing stable-ID nested Tag workflow without introducing Collections, Smart Folders or implicit source-file operations. M0 Windows Chrome and Pixel 8 acceptance is **still open**; this is code development, not device sign-off.

## Implemented in this branch

- In **Catalog links**, filter URL records by title, URL or resolved nested Tag path; select individual links, select visible matches or clear selection. Maximum 250 selected URL resources.
- Add or remove 1–16 comma-separated nested Tag paths across selected URL resources. Add reuses existing stable IDs or creates taxonomy paths once; Remove matches exact paths and never creates Tags. Unchanged resources are not rewritten.
- The pure planner rejects invalid/duplicate selections, missing or malformed URL records, unresolved Tag IDs, oversized batches and the 64-Tag-per-resource limit before any writes.
- Bulk writes pass through the existing Catalog snapshot revalidation and recoverable journal; a changed taxonomy and all affected resources are committed together. URL, stable ID, notes and title are preserved. No ordinary source Folder write, URL fetch or automatic staging deletion.
- Offline shell pre-caches the new planner using the Sourcebook-only service-worker cache prefix. No Mindmap changes, no screenshot generation.

## Verification and acceptance

- New Node regression tests cover nested path reuse, exact-path removal, no-op behavior, invalid selections, immutable planning, metadata preservation and in-memory journal integration. PR CI results must be checked separately before merge.
- No physical Windows Chrome or Pixel 8 test has been performed. M0-01…M0-08 remain **Not tested** until evidence is recorded by a tester. Syncthing portable URL/Tag roundtrip and Android Share Target delivery are outstanding.
- Catalog transactions remain recoverable, not filesystem-atomic or protected by a cross-device lock. A concurrent editor or Syncthing conflict can block saves and require manual review.

## Release process

Branch: `dev/261028-0630-catalog-link-bulk-tags`. Open PR into main, wait for green PR CI, squash merge only if verified; automatic main-only Pages publishing and merged-head branch pruning then run through GitHub Actions. Record exact PR, CI, publication and cleanup outcomes after verification.
