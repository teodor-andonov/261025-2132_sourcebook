# 261029-0022 — Catalog metadata write serialization (V0.0.55)

## Problem and decision
Two Sourcebook tabs can hold separate FileSystemDirectoryHandle objects for the same portable `.sb`. The old in-memory WeakSet only guarded one JavaScript handle object. Both tabs could pass journal/snapshot preflight concurrently, then race to write the same `.sourcebook-pending.json` and metadata. This is more consequential than adding further capture infrastructure while M0 device acceptance is open.

## Coherent implementation
- Add `src/catalog-write-lock.mjs`: one distinct, origin-wide exclusive Web Lock for all cooperating Catalog JSON mutations. Global serialization is deliberate because catalog paths and independently granted handles cannot reliably produce a shared per-folder key.
- Wrap **both** `commitCatalogTransaction` and `resumeCatalogTransaction` around the *entire* preflight → journal → verified JSON writes → journal removal sequence. Existing stale snapshots, identity checks, Syncthing conflict-copy refusal, pending-journal detection and same-handle WeakSet remain.
- An available but denied lock fails closed. Browsers lacking Web Locks retain previous guarded behavior, not a claim of cross-tab protection. Read-only inspection remains non-mutating.
- Expose a separate Catalog-lock capability in Device checks. Cache the new module with a Sourcebook-prefixed service-worker revision; leave other PWA caches and Mindmap untouched.
- Node tests cover queue serialization, two stale competing commits, explicit recovery, API denial and unsupported fallback. Chromium smoke adds a genuine two-tab Web Locks + OPFS journal contention test; OPFS is not an external Folder.
- Update the three-state roadmap, design contract, implementation status, release notes and M0 manual test instructions.

## Safety and remaining limitations
No ordinary source files are renamed, moved or written; no legacy URL records are migrated. Catalog records remain optional annotations of physical resources. This lock coordinates only cooperating Sourcebook tabs in the same browser origin/profile. It does not provide atomic multi-file transactions, exclusive OS file creation, cross-browser/profile/device locking, Syncthing conflict reconciliation or physical Windows/Pixel 8 acceptance. An interrupted write may retain a recovery journal for explicit user review. No screenshots, visual fixtures or Mindmap edits.

## Verification evidence
At authoring: implementation and tests committed to a development branch. Record PR CI, squash commit, main CI, publication and branch cleanup **only after actual GitHub Actions evidence**. M0 remains unaccepted.
