# 261028-0023 — Read-only overlapping record review

## Decision

Verified overlapping Catalog Folder roots do not establish that two descendant
file handles are still identical. Do not auto-merge Tags, notes, resource IDs or
source bindings based on a cached path mapping. Introduce an explicit,
non-destructive comparison workflow first.

## Implementation

- Added `overlap-review.mjs`: bounded Catalog-wide grouping of competing
  resource records under previously verified Folder relationships, comparison
  of Tag IDs/paths, notes, kinds, unknown Tag references and other metadata.
- Rechecks each candidate physical file/directory with read permission and
  `isSameEntry`. Reports `same-entry`, `different-entry`, `missing` or
  `unverified`; never assumes identical names are identical resources.
- Added Settings → **Review overlaps** and an inspector shortcut on ambiguous
  saved View results. Scrollable groups show records side by side, with
  **Show in folder**, **Recheck** and explicit JSON export.
- Reads a double-checked Catalog backup snapshot before comparing, so malformed
  or concurrently changed JSON fails closed rather than silently omitting data.
  Report export includes Catalog notes and other metadata; it is user-initiated.
- Added Node tests for grouping, differences, unrelated roots, read-only
  per-file identity, missing paths, permissions, limits and non-mutation.
- Bumped only Sourcebook's app-prefixed service-worker cache. Screenshot fixture
  source, Pages workflow, Mindmap and ordinary source files are untouched.

## Safety and limitations

This is a **review and diagnostic feature**, not a conflict resolver. It never
changes Catalog metadata or ordinary files. It cannot prove offline or
cross-device identity, and `isSameEntry` only describes the file handles
observed during the check. Up to 20,000 records / 500 groups / 1,000 checked
entries are supported per review; excessive inputs stop rather than silently
truncate. UI displays the first 100 groups, with full report available through
explicit export. Syncthing conflict copies or pending recovery journals can
block a consistent review.

## Verification

**PR CI passed:** [run 40602297689](https://github.com/teodor-andonov/261025-2132_sourcebook/actions/runs/40602297689) verified 196/196 Node tests and JavaScript syntax checks at `33612b7`. The first PR run failed because the test fixture named a nested root differently from the actual physical directory; corrected before the successful run. No browser UI automation or physical Windows/Android
acceptance performed. No screenshots generated. Merge only after PR CI, then
the existing main-only GitHub Actions publication workflow may run.
