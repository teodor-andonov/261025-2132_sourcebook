# 261028-1927 — Android file-bearing share fallback

## Context and scope

M0 remains unaccepted because Chrome on Pixel 8 has not been shown to expose writable user-selected Folders. Rather than adding Catalog-only Resources or another simulated acceptance gate, this batch adds a distinct, explicitly unverified **outbound file handoff** option for Android and compatible browsers. It complements but never impersonates a verified Folder save.

## Changes

- Added src/file-share-out.mjs: validates real .url/.md file plans, creates a browser File with the expected bytes, requires canShare({files}), and calls navigator.share({files}) without degrading to text-only payloads.
- Integrated Send file to app into the existing URL/text review dialog. Its filename is generated from the reviewed content; nothing is written to source folders or Catalog metadata.
- Added per-file and bounded batch Send to app for integrity-checked temporary Android incoming file attachments. A successful share does **not** clear IndexedDB staging; failed/cancelled operations retain the content.
- Added an API-only Web Share files indicator in Device checks, extended offline shell cache, and documented actual Android/Windows acceptance steps.
- Added regression tests for exact .url/.md bytes, unsupported/cancelled shares, unsafe filenames, batch handoff, no silent inbox removal and offline inclusion.

## Verification and boundaries

- Automated tests: pending PR CI verification; do not claim physical devices tested.
- No screenshot or visual fixture capture. No Mindmap modifications. No ordinary source-file writes or Catalog-only Resource creation.
- Critical limitation: Web Share promise resolution means the browser completed its handoff; it does **not** establish that an external app saved the file, preserved its filename, or placed it inside Syncthing. A receiving app may be absent. Android activation/permission and installed-PWA behavior remain unverified.
- File System Access still has no atomic exclusive-create guarantee. The real M0 device gate remains open.
