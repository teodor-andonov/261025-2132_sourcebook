# 261029-0831 — Read-only file inspection and relative path export

**Candidate:** V0.0.63 · **Branch:** `dev/261029-0831-file-inspection-paths` · **Base:** `6f7db56e1dd577d85aec81459f1e50bb72b5a9a7`

## Intent and decision
The previous Folder inspector exposed only the filename; Catalog results had metadata but not a current filesystem size/modified-time inspection. Add a coherent **read-only** inspection workflow for ordinary filesystem Resources and explicit, bounded clipboard export of root-labelled relative paths. This does not depend on Catalog indexing, require write permissions or fabricate absolute OS paths.

## Implemented in code
- File information panel for ordinary Folder and Catalog files: current provider-reported size, modified time and MIME; no content reads for metadata. Directories explicitly report that the browser does not provide directory size. Provider errors are shown, never replaced with stale cached attributes.
- Live metadata requests are guarded by a serial and selected Resource ID; a late response cannot overwrite a newly selected file's information. Catalog result metadata uses the existing live Folder handle/permission check.
- Copy selected paths in current displayed order across pages, up to 250, with a 64 Ki-character safety ceiling. Paths are **root-labelled relative** (`Folder/subfolder/file.ext`), not absolute OS paths. Only physical files/directories qualify; legacy `kind=url` records are rejected rather than presented as files.
- Compact Copy paths toolbar action, single-Resource inspector action and explicit unsupported-clipboard feedback. No clipboard access without a user click; no source file or Catalog metadata mutation.
- New pure Node regressions and a real headless Chromium OPFS scenario for file metadata, clipboard copy, selection filtering and untouched source bytes. Sourcebook-prefixed service-worker cache includes the module.

## Evidence and acceptance boundary
At authoring, this is a **code candidate**, not a claimed device acceptance. PR CI, squash merge, main CI, Pages publish and branch cleanup must be checked independently and recorded on the PR. The browser scenario uses genuine Chromium OPFS files with a **synthetic directory-picker permission adapter**; it does not test Windows Chrome external Folders, Android SAF, a Pixel 8, Syncthing or filesystem path portability.

**Three states:** Implemented in code: candidate (pending CI) · Device verified: **No** · Released & accepted: **No (M0 open)**.

## Risks
- Browser File System Access APIs do not expose full absolute OS paths; copied paths are deliberately labelled relative to each registered root, and two different roots may share the same visible name.
- `getFile()` can fail on revoked permissions, stale Catalog entries or external file changes. Metadata is current only at the instant reported by the provider, not a filesystem watcher.
- Clipboard writing requires browser support, a secure context and an allowed user gesture; failure does not trigger Download or file writes.
- Directory sizes are unavailable; no recursive enumeration is attempted. No physical Windows/Android test has been performed.
- No screenshots, visual fixture captures, Mindmap changes or unrelated PWA deployments.
