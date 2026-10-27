# 2026-10-27 19:30 Europe/Madrid — Selective Catalog metadata recovery

## Context and decision

V0.0.24 added SHA-256 metadata export and read-only drift inspection, but deleted Catalog records could not be recovered without manual JSON editing. General-purpose restore and automatic three-way merge would be premature: Catalog metadata spans identity sequences, nested Tags, registered Folders, saved Views and independent offline editors. Blind replacement could erase newer edits or introduce collisions.

This cycle implements **missing-resource-only restoration**. It is a conservative first recovery primitive, not complete restore.

## Delivered

- Testable `src/catalog-restore.mjs` plan/execute API: verifies backup and live Catalog, validates references, catches duplicate source/path identities, caps batches, advances the allocator when needed, rejects stale previews and uses the existing recovery journal.
- Settings → Inspect / restore: verified comparison, selectable missing resource JSON, explicit confirmation, permission request, state refresh and visible failure/reinspection path. Existing/changed metadata and ordinary source files are untouched.
- Service worker precaches the new module; Node tests cover interrupted/resumed operations, stale checks, tampering, orphan references and large batches.
- README now follows feature-branch development and automatic GitHub Actions publishing.

## Safety boundaries

- Missing metadata does not prove an original source file still exists. This operation never writes to a registered source Folder.
- Only `resources/*.json` entries can be restored. Missing core Catalog metadata, diverged JSON, Syncthing conflict copies and source files remain out of scope.
- Journaled transactions are not filesystem-atomic or a cross-device lock. A partially created malformed JSON record may need manual repair.
- No screenshots were requested or captured; no physical browser/device acceptance is claimed. CI pending at writing time.

## Next priorities

1. Read-only discovery/triage of Syncthing conflict copies and explicit manual reconciliation.
2. Full-catalog restore design with safe deletion semantics and reference reconciliation.
3. Durable incremental index, overlap deduplication and Windows/Android acceptance.
