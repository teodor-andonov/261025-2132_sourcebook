# 261027-1826 — Catalog metadata backup and inspection

## Context and decision

The recoverable write-ahead journal from V0.0.22 is useful, but without a portable, independently verifiable snapshot, users cannot safely inspect what changed when Syncthing or another editor diverges. This cycle adds **backup/export and read-only comparison**, not an unsafe one-click restore.

The user also adopted a repository convention: feature branches, PR checks, squash merge to `main`, GitHub Actions-only publishing (manual or after a `main` update). Screenshot captures remain manually requested and artifact-only.

## Implemented

- `src/catalog-backup.mjs`: metadata-only export, SHA-256 per file, safe path validation, size/count caps, second-pass consistency checks, and read-only diff by path.
- Settings: Export backup (local download), Inspect backup (file picker and compact changed/missing/added report). No network upload or write permissions requested.
- Includes raw pending journal even if its JSON is malformed. Ordinary source files and previews are deliberately excluded.
- `tests/catalog-backup.test.mjs`: snapshots, drift, tampering, foreign identity, interrupted journal, and concurrent edits.
- PWA precache entry and cache revision; app-specific cache cleanup remains isolated.
- GitHub workflows: PR CI, Pages publishing on main updates and manual dispatch, manual screenshot artifact-only (no writeback to main).

## Safety and limits

- File System Access API provides no atomic snapshot across catalog files. Second-pass revalidation catches many changes but not every ABA/race; avoid simultaneous editors.
- Backup is JSON, not a complete `.sb` folder archive. Previews and device-local handles are not included. Do not claim full restore.
- The UI never writes the selected backup back to disk; inspection compares only.
- Unknown resource JSON names cause export to fail closed instead of silently dropping metadata.
- 25 MiB metadata / 10,000-file limits keep memory and verification bounded.
- No screenshots or visual fixture capture run. Physical Windows and Android validation not performed.

## Verification

PR CI: pending until run completes. Do not claim green before confirming the run.
Release: only after verified squash merge to `main` through Actions.
