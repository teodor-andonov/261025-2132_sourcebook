# 261028-0126 — M0 device-readiness and read-only feasibility

## Why this cycle
Sourcebook had 196 passing automated tests and rich Catalog features, but no recorded real Windows Chrome or Pixel 8 Android acceptance. Adding more indexing without confronting this gap would create false confidence. The M0 checklist existed only in Markdown, so a user on an unsupported browser had no direct capability diagnosis.

## Delivered
- Launcher and Settings entry for M0 checks, including when the Folder picker API is unavailable.
- No-prompt capability snapshot (secure context, standalone mode, pickers, IndexedDB, service worker, clipboard, Web Share and persistent-storage API).
- Explicit read-only Folder probe: user selects a disposable directory; at most ten entries enumerated; optional file metadata and self-identity checks. No write permission or ordinary file mutation.
- Eight independent manual M0 outcomes, bounded notes, optional HTTPS evidence URL, release SHA field, local persistence, explicit sanitized JSON export and reset confirmation.
- Tests cover nonautomatic acceptance, corrupt local state, permission denial, cancelled/failed enumeration, read-only constraints, privacy and app/SW wiring.

## Verification and boundaries
PR CI and automatic main-only Pages workflow must be checked before declaring this cycle merged or released. No screenshot workflow was run. Real device tests cannot be performed by this code change: M0-01…08 stay unverified on Windows and Pixel 8. The probe does not prove Catalog write support, permission persistence, offline access, Syncthing portability or Android Share Target functionality.

## Next
Run M0 on both devices using disposable fixtures, record actual provider-specific failures, then address first-class URL/clipboard capture and safe file operations only where browser support is verified.
