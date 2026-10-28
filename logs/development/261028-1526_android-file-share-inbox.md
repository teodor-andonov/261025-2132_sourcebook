# 261028-1526 — Android ordinary-file Share Target inbox (V0.0.46 candidate)

## Context and decision
Sourcebook's existing Android POST share target accepted only URL/text, leaving ordinary images and documents shared from Android Files unsupported. This cycle connects incoming file shares to the **existing real-file import** rather than inventing another Catalog Resource type. M0 Windows/Pixel 8 device acceptance is still unverified.

## Implementation
- Extend the manifest with a `files` multipart field and keep the Sourcebook-specific scope and manifest ID.
- Validate 1–5 ordinary files (up to 25 MiB each / 50 MiB total) using the existing import filename policy, including case-insensitive collision checks. Preserve original names. Fail closed on empty, malformed or oversized files and suspicious MIME descriptors.
- Upgrade the device-local incoming-share IndexedDB from version 1 to version 2, preserving old text records and adding a separate attachments object store. Enqueue metadata and Blobs in one transaction; Discard deletes both. Readback validates attachment size and type against metadata.
- Incoming shares now shows filenames and sizes, explicit **Review files**, and per-file **Download** fallback. Review invokes the same ordinary-file import confirmation, permission checks, bounded copy, collision refusal and readback verification as Add files. Clear staging **only after the entire batch is verified**; failures, cancellations and downloads retain staging.
- The service worker rejects unsupported multipart fields and checks request Content-Length where available before parsing; browser FormData parsing and IndexedDB quota remain provider-controlled.
- Add pure validation, metadata compatibility, restoration, fallback and app/SW wiring tests. Update the roadmap, contract, implementation status and manual device acceptance instructions.

## Safety boundaries
No ordinary source file is written merely by receiving a share. IndexedDB is temporary capture staging, **not** a saved Resource, synced Catalog or backup. A browser-managed Download is unverified and may rename files or be blocked by Android. Browser File System Access lacks atomic exclusive create; last-moment filename races remain. Shared files are not uploaded to Sourcebook servers. Existing legacy Catalog-only URLs remain untouched. No screenshots or Mindmap modifications.

## Verification
- Local Node tests: not run in the connector environment; require GitHub PR CI.
- PR CI: pending at authoring.
- Main CI / Pages / cleanup: pending merge.
- Physical Windows Chrome / Pixel 8 Android / Syncthing: **Not tested**. Device acceptance remains open.

## Follow-up
Perform actual Pixel 8 Android Files → Share tests for PNG/PDF and mixed MIME, including installed-PWA registration, permission denial, quota, restart and browser Download behavior. Test actual writable Folder access on both platforms; only then choose provider-specific fixes.
