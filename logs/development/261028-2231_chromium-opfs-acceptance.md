# 261028-2231 — Chromium OPFS M0 integration

## Why this cycle

The V0.0.52 headless Chromium smoke covered service worker/offline, multipart incoming shares and no-picker Download, but not actual browser-engine FileSystemDirectoryHandle writes, portable .sb transactions or IndexedDB handle restoration. Recent positive Android user feedback has no scoped per-scenario evidence. M0 must remain open.

## Coherent implementation batch

1. Exercise real Chromium OPFS directory/file handles to write ordinary-format .url/.md test files using the production file capture writer, check exact bytes, case-insensitive and exact-name collision refusal, and prove a sentinel file remains unchanged.
2. Create a disposable M0 physical capture fixture through production logic against OPFS, retain its native directory handle in real IndexedDB, reload the page, verify the handle still points to the same entry, independently verify the two files, then deliberately corrupt the Markdown fixture and require read-only verification to fail.
3. Create a portable disposable .sb Catalog fixture using the production journaled transaction, nested stable-ID Tags, saved View and file-backed .url record; reload, verify the complete fixture and journal clearance, then corrupt the shortcut and require verification failure.
4. Extend the CI smoke contract and update the roadmap, design contract, implementation status and device testing instructions. Tests use disposable origin-private browser storage and remove it; no screenshots, traces, videos, ordinary user source writes or Mindmap changes.

## Evidence boundary

OPFS is real Chromium filesystem API storage, but is **origin-private**, not a user-selected external Folder or Android SAF/Syncthing path. The permission adapter only supplies synthetic granted results so that production fixture routines can run in OPFS; it does not verify Chrome's real directory-picker grants or regrant behavior. A page reload is not a physical device restart. Automated CI must not be marked as M0 acceptance.

## Verification and release

- Branch: `dev/261028-2231-chromium-opfs-acceptance`, from `81f4ab8baa3aaeee17f649dd59a396ee723f20b6`.
- PR CI, main CI, Pages publication and branch cleanup: **pending** at authoring; inspect GitHub Actions before asserting success.
- Physical Windows Chrome / Pixel 8 / Syncthing roundtrip: **not tested in this cycle**.

## Remaining risks

Android Chrome may not support a user-granted writable directory provider. OPFS does not grant access to ordinary Syncthing-managed files. FileSystemAccess creation lacks atomic exclusive-create guarantees, and journaled Catalog writes are not multi-device locks. The user must perform physical M0 scenarios and attach evidence before release acceptance.
