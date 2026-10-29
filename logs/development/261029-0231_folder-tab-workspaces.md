# 261029-0231 — Folder Tab workspaces

**Cycle:** 2026-10-29 02:31 Europe/Madrid · **Candidate:** V0.0.57  
**Branch:** `dev/261029-0231-folder-tab-workspaces` from main `5f08d2aa61f94295bf21a1ec8c6888173dbf2a70`

## Intent and decision

After V0.0.56 improved physical file previews, browser-first navigation remains more useful than further synthetic capture infrastructure. Keep independent Folder Tabs as *navigation workspaces*, not Catalog Views, Collections or Smart Folders. The M0 Windows Chrome / Pixel 8 / Syncthing acceptance gate stays open.

## Coherent implementation

- `src/workspace.mjs`: normalize and bound each Folder Tab's search, sort, layout and thumbnail size. Retain independent path/back-forward history and reject malformed saved preferences. Add pure adjacent-Tab cycling.
- `src/app.mjs`: persist per-Tab presentation in device-local IndexedDB; restore on Tab switch and boot, reset folder-scoped search on navigation, expose plain Folder sort controls and previous/next Tab actions. Add Alt+Shift+Left/Right without changing the existing Alt+Left/Right history shortcuts. Debounce preference writes while keeping navigation persistence immediate.
- `src/styles.css`: compact grayscale tab-switch group, hidden on narrow screens where sidebar Tabs remain available.
- `sw.js`: bump Sourcebook-prefixed shell cache for updated offline assets; no origin-wide cache deletion.
- `tests/workspace.test.mjs`: validate independent preferences, bounds, corrupt/legacy restoration, immutability and Tab wraparound.
- `scripts/browser-smoke.mjs`: real Chromium OPFS Folder Tabs, search/layout/sort switching and persisted native directory handles after reload. This uses a synthetic picker and permission shim, **not** external user-granted Folders.

## Safety and evidence boundary

No ordinary source files are modified; no Catalog metadata migration or new fileless URL Resources. Browser Folder browsing remains read-only. Device-local IndexedDB can fail or be evicted, so Tab preferences may become session-only. Test-only OPFS directories are origin-private; neither Windows Chrome nor Pixel 8 Android Chrome nor Syncthing physical filesystem access is verified by CI.

**At authoring:** CI not yet run; PR/merge/Pages/cleanup must be verified separately. No screenshots or visual fixtures were requested or generated. Mindmap untouched.

## Remaining risks / next step

M0 real-device Folder permission, PWA restart, writable provider and Syncthing roundtrip remain unresolved. Also verify Tab restoration and shortcut interception on physical Windows and Android; browser-level shortcuts can conflict with OS/browser navigation.
