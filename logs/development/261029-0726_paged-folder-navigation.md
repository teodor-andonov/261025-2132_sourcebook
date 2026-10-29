# 261029-0726 — Bounded Folder and Catalog result paging

## Decision and scope

V0.0.61 keyboard focus worked only in the first 150 rendered Resources. Repeated Show more expanded the DOM indefinitely (up to the 20,000-entry read limit), creating an avoidable large-Folder performance and navigation risk. Replace cumulative rendering with a bounded, explicit page window across Gallery/List/Table and Catalog results. Keep browser-first vocabulary and source-file safety; no Collections or Smart Folders.

## Implementation

- New pure `resource-paging.mjs` clamps page windows and locates a keyboard target's page. At most 150 resource nodes are rendered, even when the read-only enumerator has collected more entries. Pagination does **not** increase the 20,000-entry safety ceiling or make partial scans complete.
- Previous/Next controls show exact visible ranges and page number. Filtering, navigation, and Folder Tab switching reset the current page; sorting keeps the page index if still valid. Selection is retained across pages while entries remain in the filtered listing; All shown selects only the current page. Shift ranges exceeding 250 fail closed.
- Home/End and arrows can reach entries on another page without rendering all preceding resources. Roving keyboard focus is restored after a page change. Off-page thumbnail object URLs are revoked to bound retained image memory.
- Added Node boundary/validation tests and a native Chromium OPFS scenario covering 325 ordinary files, page controls, Shift selection across pages, current-page bulk selection, End jump, search reset and no file mutation. Synthetic picker/permission adapter is **not** physical Windows Chrome, Pixel 8 Android SAF or Syncthing evidence.
- Updated roadmap/design/status, service-worker cache and timestamped log. No screenshots, visual fixtures or Mindmap changes.

## Evidence and remaining risks

PR CI, main CI, Pages and merged branch cleanup must be independently checked; do not mark them green based on authored tests. Large Folders still require enumerating/sorting up to 20,000 entries in memory, and provider operations may block. Real Windows Chrome/Pixel 8 external Folder permission, portable `.sb` and Syncthing roundtrip remain M0 **not verified**. The historical `kind=url` Catalog records remain preserved as legacy; no new Catalog-only Resource path was introduced.
