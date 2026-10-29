# 261029-0424 — Folder discovery filters

## Scope
Browser-first, read-only Folder discovery: per-Tab file type filtering, literal filename search (including # characters), dotfile visibility and independently restored filter settings. Catalog Tags/Views and legacy URL records remain unchanged. No ordinary source files are renamed, created, deleted or modified.

## Implementation
- New pure Folder classifier/filter handles Folders, images, PDFs, video, audio, Internet Shortcut .url, text/code, archives and other files. This is extension classification, not content inspection.
- Folder Tab preferences store fileType and showHidden alongside search/sort/layout/density. Existing saved Tabs default to All types / dotfiles visible. Switching/reloading restores each Tab independently; Catalog retains its own file-type semantics.
- The compact Folder toolbar exposes a type dropdown and explicit Dotfiles toggle. Filtering is local to the entries already enumerated; no recursive search, index or Catalog write.
- Count shows matches versus read entries; partial/incomplete provider results remain labeled and are never claimed complete. Selection clears when filters change. Filenames and handles are never modified.

## Verification
- Added pure Node classifier/filter tests and updated Folder Tab persistence tests.
- Added a native headless Chromium OPFS UI scenario for per-Tab filtering, toggle and reload; synthetic picker/permission shims are test-only.
- CI, merge, Pages and branch cleanup must be checked independently after PR creation. No screenshot capture or fixture regeneration.
- M0 Windows Chrome / Pixel 8 / Syncthing acceptance remains open; OPFS is origin-private, not external Folder access.

## Risks
Extension classification may misclassify uncommon file types; dotfiles are a Unix-style filename convention, not Windows hidden attributes. Browser storage can be evicted; filesystem provider changes during enumeration remain possible. No recursive search is provided.
