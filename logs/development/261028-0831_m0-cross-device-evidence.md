# 261028-0831 — M0 cross-device evidence review

**Branch:** `dev/261028-0831-m0-cross-device-evidence`  
**Target:** V0.0.38 candidate  
**M0:** Physical-device acceptance remains **Not tested**.

## Problem and decision

V0.0.37 creates and verifies a portable disposable Catalog, but its exported M0 reports cannot establish whether Windows and Android inspected the same fixture. Each device stores separate checklist notes; a person must compare results manually. Introduce a local-only report comparison and a synthetic fixture fingerprint. Keep device acceptance explicitly manual and avoid leaking folder paths or UUIDs.

## Batch

1. Hash the random M0 fixture UUID using SHA-256 after successful fixture creation/verification; export only the digest, never the fixture name.
2. Strictly parse bounded, exported M0 JSON reports into an allowlisted summary; compare Windows and Android scenario outcomes, deployed commits, standalone state, freshness, matching verified fixture proofs and external M0-05 evidence.
3. Integrate two local JSON file selectors and compact comparison matrix into Device checks. No import into Catalog, no browser persistence and no network calls.
4. Add regression tests for matching/mismatched proof, denied verification, missing evidence, malformed/oversized reports, old timestamps, platform mixups and service-worker precache inclusion.
5. Update M0 acceptance instructions, design contract, roadmap and implementation status without claiming device verification.

## Safety and known limits

A matching digest only establishes consistency of the random fixture identifier and validated metadata at inspection time. It does not prove Syncthing transport, source-file integrity, PWA installation, permission persistence or independent physical device execution. The manually entered Pass/Fail statuses and evidence links are not independently verified by code. No automated result can close M0.

**Verification at authoring:** PR CI and publication pending. No screenshots or visual fixtures generated. Mindmap unchanged.
