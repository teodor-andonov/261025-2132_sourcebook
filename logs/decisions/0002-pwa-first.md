# ADR 0002 — Chrome-first PWA delivery, without mandatory native shell

**Date:** 2026-10-26  
**Status:** Accepted product delivery direction; capability-specific engineering work remains gated on M0.

## Context

The initial V0.1 plan considered a Tauri 2 native shell with Android filesystem bridge. User explicitly prefers a **PWA on Chrome** as the primary and only required app on Windows and Android, assuming direct folder selection is sufficient, with minimal mobile UI adaptation.

As of October 2026, the File System Access API directory picker is documented for Chrome Android 132+ (and desktop Chrome). This supports a serious PWA-first experiment; it does not guarantee unrestricted directories or all native file operations.

## Decision

Implement as installed secure-origin Chrome PWA first:
- Vite + TypeScript + React or equivalent web UI.
- showDirectoryPicker / FileSystemHandle for selected sources and *.sb catalogs.
- IndexedDB for handle persistence and local state, OPFS for optional disposable cache.
- Service worker and manifest for install/offline and Web Share Target.
- Same feature set on Windows and Android, adaptive layout only.
- No mandatory local server or cloud backend and no native wrapper in the critical path.

## Constraints and mitigations

1. **Permissions:** user-granted roots only; regrant flow after expiration/revocation.
2. **Android folder provider:** test real Syncthing directory and read/write behavior on Pixel 8 before claiming parity.
3. **Rename/move:** external file move is not universally supported as an atomic API; feature-detect, stage/verify copying or explicitly disable risky cases.
4. **Trash:** no universal Recycle Bin/Trash; irreversible delete only with explicit warning unless a recoverable holding strategy is proven.
5. **File watch:** poll/revalidate as necessary; use FileSystemObserver only when supported.
6. **Incoming Android files:** Chrome 153 PWA share target regression reported Sept 2026; build picker/clipboard fallback and test exact device.
7. **Webpage metadata:** no guaranteed cross-origin OG/screenshot fetching; URL placeholder works immediately, optional extension later.
8. **Offline colliding IDs:** per-catalog sequential naming requires conflict detection after independent edits.

## Rejected for now

- Mandatory Tauri/Electron + native Android wrapper before proving PWA limits.
- Remote backend responsible for source file storage.
- Trying to emulate OS-level access without user permission.
- Syncing live SQLite through Syncthing.

## Related documentation

- [PWA architecture](../../docs/PWA_ARCHITECTURE.md)
- [ULTRA V1 roadmap](../../docs/ROADMAP_V1_ULTRA.md)
- [Original V0.1 plan](../../docs/PLAN_V0.1.md), whose Tauri proposal is superseded.

## Verification sources

- https://web-platform-dx.github.io/web-features-explorer/features/file-system-access/
- https://developer.chrome.com/docs/capabilities/web-apis/file-system-access
- https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/share_target
- https://issuetracker.google.com/issues/561685220
