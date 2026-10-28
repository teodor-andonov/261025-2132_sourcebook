# 261028-1626 — Android share integrity and storage readiness

**Scope:** V0.0.47 candidate; M0 acceptance is still open. Development branch `dev/261028-1626-share-integrity-storage`.

## Problem and decision
Temporary Android Share Target attachments were validated only by Blob length and MIME at review time. A same-size modification or swapped same-type Blob could pass metadata validation. Android IndexedDB quota/persistence behavior was also invisible in Device checks. This cycle adds per-file SHA-256 checksums before staging and verifies them before review/download, plus explicit, privacy-bounded storage diagnostics.

## Changes
- Hash bounded shared files in the scoped service worker before one-transaction IndexedDB staging. Store SHA-256 with each descriptor; reject unreadable/changing files and absent crypto.
- Verify each digest after retrieving staged Blobs and **before** constructing importable Files. Mismatches fail closed and preserve the inbox entry for manual inspection. No automatic source-file writes or Catalog-only resources.
- Preserve compatibility with earlier v2 inbox records lacking SHA-256; they remain readable but are **not** cryptographically attested.
- Device checks can inspect coarse, origin-wide storage quota/pressure and persisted status without prompting. A separate explicit button may request persistent storage; refusal is reported, not silently retried. The sanitized M0 report includes only coarse buckets.
- Add tests for same-size tampering, swapped payloads, missing crypto, legacy records, storage errors, explicit persistence and integration.
- Update roadmap/design/status/M0 guidance; no screenshots or Mindmap changes.

## Evidence and limits
Tests are exercised by the PR GitHub Actions CI; do not infer success until the run finishes. No Windows Chrome, Pixel 8 Android Chrome, real IndexedDB eviction, provider permissions, installed-PWA share delivery or Syncthing transport was physically tested. Origin storage estimates are approximate and shared with other TA PWAs; persistence is not a guarantee against deletion, nor a filesystem grant. SHA-256 verifies staged bytes, **not** that the Android sender delivered the intended bytes, nor that a later physical copy persisted.

## Acceptance
M0-08 remains Not tested. On Pixel 8, explicitly share a small PNG/PDF, inspect Device checks storage, reopen inbox, test verified Folder save and Download fallback, then test restart and provider denial. Independently check resulting ordinary files and Syncthing transfer. Do not mark Pass from API presence or automated Node tests.
