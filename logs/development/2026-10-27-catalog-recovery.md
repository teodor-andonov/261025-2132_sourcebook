# 2026-10-27 — Catalog recovery journal (V0.0.22 candidate)

## Why this cycle

Previously a bulk Tag save could update tags.json and catalog.json, then fail after only some resources/*.json records were written. A power loss or simultaneous editor could leave a partially updated Catalog with no machine-readable record of the intended transaction. The same issue affected single-resource saves when new nested Tags or IDs were allocated. Saved Views, Tag pins and registered Catalog Folders also wrote directly to JSON.

## Delivered

1. Added src/catalog-transactions.mjs: a restricted catalog-only write-ahead journal named .sourcebook-pending.json, with before/after snapshots, path validation, catalog identity checks, verified writes, replay and cleanup. A missing journal means no pending transaction. A malformed or foreign journal fails closed.
2. Integrated the journal into bulk nested Tags, single-resource metadata/objectification, Tag pinning, Folder registration and saved View CRUD. Each operation retains stale snapshot checks. No ordinary source file is renamed, moved or written by these metadata operations.
3. Opening a Catalog inspects the journal read-only and shows a compact warning. Catalog edits are blocked while pending. The user can explicitly Resume after granting permission and confirming; already-applied changes are skipped. Conflicting snapshots require manual repair rather than automatic overwrites.
4. Recovered Catalog state, registered Folders and resource records are reloaded, with an attempt to navigate the active physical Folder. If its permission is unavailable, reconnect manually.
5. Added simulated filesystem tests for interrupted writes, safe replay, stale snapshots, invalid paths/identity, divergent external edits, bulk mid-save interference and View no-op behavior.

## Verification

- Commit 5e7e2cc: journal engine and tests; CI 40541660337 passed.
- Commit db9c55b: bulk integration; intermediate CI 40541864566 failed because a test incorrectly treated restoration of the original tags snapshot as a conflict. The corrected test verifies replay, not a false conflict.
- Commit 85dff32: corrected replay test; CI 40541989035 passed.
- Commits cb5c62c, 2689d19, 64ca024 and 444d509: Views, recovery UI, metadata integration and identity/no-op fixes; corresponding CI runs passed.
- Commit 8b81611: Folder binding and permission correction; CI 40542438446 passed 127 Node tests and JavaScript syntax checks.
- The later navigation-refresh commit ea2b53d and documentation are not covered by the above run. Consult GitHub Actions for their CI status.
- No browser-interaction fixture was run; no screenshots or visual captures were generated or committed; no Pages deployment or release was triggered; no physical Windows or Android test was performed.

## Explicit limitations and next steps

This is a recoverable intent journal, not atomic multi-file filesystem writes, distributed locking or a full database transaction. Another tab or Syncthing process can still race after checks. A journal that is corrupt, a partially written resource JSON file or divergent Syncthing conflict copy needs manual intervention. Recovery replays Catalog metadata only and does not revalidate all physical resource paths. There is no automated rollback, backup/export, conflict-copy merge or offline ID reconciliation. Avoid simultaneous edits to the same synced Catalog.

Next cycle: build backup/export and a safe, user-directed conflict inspection/reconciliation workflow, then test interrupted writes on actual Windows Chrome and Android Chrome providers. Durable incremental scanning and large-library performance remain pending.
