# 2026-10-28 20:24 Europe/Madrid — Activation-safe incoming file share (V0.0.51)

## Why this batch
The V0.0.50 staged-file **Send to app** handler awaited IndexedDB list and SHA-256 verification before calling navigator.share(). Android Chrome can reject a share when the original click's transient user activation has expired. This was a code-path risk, not a physically observed Pixel 8 failure.

## Implemented
- Split staged file handoff into **Prepare to send** (read, validate, SHA-256 check, choose file(s)) and **Send prepared file(s)** (synchronous Web Share invocation in a new user gesture).
- A bounded, one-shot in-memory session rejects unsafe/empty batches and expires after two minutes; clear on cancellation, new action, rerender or handoff.
- Keep staging intact after success/cancel/error. No source file/Catalog writes or silent text-only fallback. Reuse the existing exact-File Web Share helper.
- Extend Node tests for immediate share invocation before microtasks, expiry, cancellation, invalid batches, checksum verification and UI wiring. Cache the new module for offline shell.

## Evidence and acceptance
- Base main: `7008e78a1f47b0cac3e765d2176c28be658520c2` (V0.0.50).
- Branch: `dev/261028-2024-activation-safe-share-handoff`.
- PR CI / merge / Pages / cleanup: **pending verification** at authoring; see PR Actions.
- Windows Chrome, Pixel 8 Android Chrome, OS share destinations, physical Folder writes, installed-PWA restart and Syncthing: **Not tested**. M0 remains open.
- No screenshots, visual fixtures, Mindmap edits or direct main commits.

## Remaining risks
- Chrome may still reject unsupported file MIME types, oversized payloads or external share targets; Web Share support is browser/provider dependent.
- Prepared File objects consume temporary browser memory until used, cancelled, expired or the dialog is destroyed. TTL is checked at send time, not a background timer.
- A successful share promise cannot prove that the target saved the file, kept its filename or placed it inside a Syncthing Folder.
- Android directory-picker and portable .sb feasibility require actual device observations.
