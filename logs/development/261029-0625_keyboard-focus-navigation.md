# V0.0.61 — Folder keyboard focus and navigation

**Created:** 2026-10-29 06:25 Europe/Madrid
**Branch:** `dev/261029-0625-keyboard-focus-navigation`
**Base:** `05de207b113bfbf3335ebc47e0cb8bb8bd117f23`

## Coherent batch

V0.0.60 selection left all resource buttons tabbable, lost keyboard focus during progressive redraw, and treated Enter differently in gallery/list versus table. This batch establishes one roving Tab stop across all Folder presentations; retains focus through partial redraws and Show more; keeps arrow/Home/End navigation within the focused Resource list; enables bounded Shift and Ctrl/Cmd+Shift ranges; and makes Enter open previews consistently. Space toggles selection. Explicit focus outlines distinguish keyboard focus from selection.

No Catalog-only resources, source-file writes, renames, screenshot capture or Mindmap changes. Existing optional Catalog, Tags and Views remain untouched.

## Evidence and limits

Added pure Node navigation tests and a native Chromium OPFS scenario covering three layouts, redraw focus, Enter preview, filtering and unchanged ordinary fixture files. PR CI, main CI, Pages and cleanup must be checked after execution. OPFS/test-only permissions do not verify real Windows Chrome, Pixel 8 Android SAF or Syncthing; M0 acceptance remains open.
