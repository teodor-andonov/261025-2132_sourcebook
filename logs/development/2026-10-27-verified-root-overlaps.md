# V0.0.29 — Verified overlapping Catalog Folder results

**Date:** 2026-10-27 23:28 Europe/Madrid  
**Scope:** Read-only physical root proof, global saved View duplicate suppression, ambiguous metadata visibility, tests and documentation.  
**Development:** `dev/261027-2328-verified-root-overlaps` → PR CI → squash merge to `main` → GitHub Actions Pages (only if CI passes).

## Problem and decision

Independent registered Catalog Folders can point to the same physical root or one can live inside another. Previously global saved Views displayed two identical unobjectified file paths because each Catalog Folder has its own logical source ID. Comparing names or string paths would risk hiding unrelated resources, especially after reconnection on another device.

Use a bounded live `isSameEntry` check to prove root equality or ancestor/descendant relations. Indexed directory paths are **candidates**, not proof. A read-only traversal must resolve the candidate to the current registered handle before two source-relative paths can be treated as the same physical path.

## Implementation

- New `src/source-overlap.mjs`: bounded root verification, read-only nested path traversal, explicit proof relations, conservative physical key projection, duplicate suppression with deterministic preference.
- `src/catalog-search.mjs`: apply proof-based collapse in global saved Views only, before status filtering. Scoped Views keep their own root identity.
- `src/app.mjs`: recompute proof on index restore and refresh, cancel stale asynchronous proof work, display overlap counts and unresolved checks, and flag conflicting metadata without changing it.
- `src/view-layout.mjs`: explicit `Overlap · review metadata` status in Table. Gallery/List also show the warning in the item subtitle.
- Service worker includes the new module in its app-scoped offline cache, with a bumped Sourcebook-only cache name.

## Safety boundaries and open issues

- Two different Catalog metadata records for the same proven path remain separate and visible. No automatic Tag/ID merge, reassignment, file write or deletion.
- A stale or missing cataloged record overlapping a scanned file remains visible with a warning rather than being silently hidden.
- Unproven relationships (missing index, denied permissions, renamed/replaced roots, ambiguous candidate paths, bounded comparison cap) remain separate. A cached path is not a live per-file identity proof.
- Root proof is per-device/per-session; it is not persisted into portable `.sb` JSON. It is not a cross-device lock, Syncthing conflict reconciliation or a filesystem watcher.
- Next: inspect and resolve conflicting Catalog record aliases explicitly, improve overlap proof coverage without unbounded traversal, and test on real Windows/Android Chrome devices.

## Verification

Simulated File System Access tests were added for positive and negative identity proof, duplicate suppression, scoped behavior, metadata ambiguity and stale scan safety. **Pending GitHub PR CI** at the time of this log. Do not claim physical device testing or deployment until separately verified. Screenshots not requested and not generated.
