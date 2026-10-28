# 2026-10-28 12:30 Europe/Madrid — V0.0.43 bounded streaming file import

## Why this batch
V0.0.42 copied and hashed entire selected files in memory, limiting imports to 25 MiB each and 50 MiB per batch. That was safe for small files but unsuitable for common reference videos and large drawings. The M0 physical-device gate remains open; this work reduces memory pressure without claiming browser-provider compatibility.

## Scope
- Extend explicit ordinary-file picker/drop → review → destination confirmation to 512 MiB/file and 1 GiB/10-file batch.
- Keep SHA-256 readback for files up to 25 MiB. For larger files, copy in 1 MiB chunks, close the writable stream, then reread and compare all bytes with the source in 1 MiB chunks. The large-file result reports verification: bytewise and sha256: null (no misleading digest).
- Report copy/verify phase, current file and byte progress. Offer Abort without silently removing partial files.
- Check for exact-name existence immediately before create in addition to enumerated case-insensitive collision checks. This narrows but cannot close the race with another writer creating an empty file.
- Test streaming, corruption, short reads, provider failure, cancellation during write and verification, large-file integration and size limits. Update the offline service-worker precache and device acceptance instructions.

## Invariants and known limits
- No Catalog-only resources, source-file rename/move, automatic overwrite, background write, screenshot generation or Mindmap changes.
- User-selected writable destination remains mandatory. Android picker/provider support remains unverified.
- Bytewise readback detects mismatches against the source at verification time; it is not a cryptographic checksum, atomic write or cross-device synchronization proof.
- Abort after close may leave a complete but unverified file; failed/aborted copies require manual inspection.
- Browser File System Access has no atomic create-exclusive operation; provider memory usage and durability are outside Sourcebook's control.
- M0 three-state status remains: implemented in code (candidate), physical Windows/Pixel 8 verification **not tested**, released & accepted **no**.

## Release procedure
Development branch dev/261028-1230-streamed-file-import from main 349a4a7dd3983dd529d3630b1421eeb7784a9908. Open PR to main, wait for Sourcebook CI, squash only after green, then inspect main CI, Publish Sourcebook and the merged-dev-branch pruning workflow. Do not trigger screenshot or direct publishing workflows. CI and deployment links are reported after their actual outcomes, not asserted here.
