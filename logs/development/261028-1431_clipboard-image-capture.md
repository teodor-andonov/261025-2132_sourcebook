# 261028-1431 — Reviewed clipboard image capture

**Branch:** `dev/261028-1431-clipboard-image-capture` · **Target:** main · **Candidate:** V0.0.45

## Problem and scope
The previous review-first URL/text intake did not handle raster images pasted from the clipboard. Drag/drop and file picker already supported ordinary files, but a clipboard image had no safe file-backed path. This cycle adds in-memory raster intake and routes it through the existing reviewed, checksum-verified ordinary-file import. It does not add new Catalog resource classes, Android file Share Target support, or any automatic write.

## Changes
- New `src/clipboard-images.mjs`: extract image blobs from ClipboardEvent.files or items, or request them explicitly through `navigator.clipboard.read()`. Accept only PNG/JPEG/WebP/GIF. Reject unsupported formats, invalid/empty blobs, >25 MiB/image, >50 MiB total, or >10 images. Generate collision-resistant, timestamped filenames that are shown before confirmation.
- File browser paste prioritizes clipboard images when present; ordinary text/URL paste keeps the existing .md/.url review. Launcher, toolbar and Settings expose an explicit Clipboard image action for browsers without image paste delivery.
- Existing `showFileImport` dialog reviews destination and filenames, then `importOrdinaryFiles` handles permission, collision checks, SHA-256 readback, partial failures and cancellation. The source Blob is never modified. No IndexedDB or Catalog metadata write is performed by intake.
- Offline precache includes the new module and uses a Sourcebook-only cache prefix. Tests cover file planning, formats, limits, bytes, permission denial and wiring. Documentation and M0 manual acceptance steps updated.

## Verification and limits
- **At authoring:** automated tests are provided; GitHub PR CI must be checked before squash merge. No physical Windows/Pixel 8 testing was performed. No screenshots/visual fixtures generated; Mindmap untouched.
- Clipboard image paste and `navigator.clipboard.read()` may not work in all Android Chrome contexts. Destination Folder write remains dependent on the real provider and user grant. Browser File System Access has no exclusive-create guarantee; a last-moment empty-file race is possible. Syncthing roundtrip and offline installed-PWA acceptance remain open.
- M0 stays **Not tested** on both devices until independently recorded real hardware evidence exists.
