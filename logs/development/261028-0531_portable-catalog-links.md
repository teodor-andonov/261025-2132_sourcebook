# 2026-10-28 05:31 Europe/Madrid — Portable Catalog links

## Problem and decision

Device-only URL capture and Android incoming shares are staging but do not synchronize through a portable Catalog. Make URLs first-class **Resources** in the existing Catalog model, not a new Collection/Smart Folder database or physical source Folder. Preserve browser-first read-only browsing and M0 device acceptance as an independent gate.

## Coherent batch

1. Introduce canonical HTTP(S) URL records in resources/<id>.json, sharing the Catalog-local sequential identity allocator. Reject malformed/duplicate URL records and unsupported schemes; keep sourceId and path absent.
2. Explicit manual import (up to 20 URLs) and checkbox-selected transfer from device-local Capture links. Optionally create nested Tags at import; keep staged copies and skip canonical duplicates. All writes use the verified Catalog journal, Catalog permission checks, metadata snapshot checks and stale-state protection.
3. Add Catalog Links management, link-only results, title/notes/Tag edits, safe external opening, global View/Tag search and Links type filter. Source-scoped Views exclude URLs; device filesystem scans, overlap checks and missing-file labels do not treat URLs as files.
4. Extend selective Catalog backup restoration for missing URL metadata without physical source roots, with duplicate canonical URL rejection. Add regression tests and update status/acceptance docs.

## Boundaries and known risks

- No URL thumbnails, crawler, page metadata fetch, rich card rendering, offline webpage archive, Android file share or automatic staged-link deletion.
- The journal is recoverable but not filesystem-atomic or a cross-device lock. Concurrent editors, Syncthing conflicts and browser storage eviction remain risks.
- Actual Windows Chrome and Pixel 8 installed-PWA Catalog URL persistence, permission regranting, offline behavior and Syncthing roundtrip remain **Not tested**. The M0 gate is open.
- Screenshot/visual fixture capture was not requested and must remain manual-only. Mindmap is untouched.

## Evidence (fill only after verification)

- Branch: dev/261028-0531-portable-catalog-links from main 5a878828cafed0d24debf80a54e73938f0a0fd47.
- PR CI: pending until GitHub Actions reports a conclusion.
- Main publication: pending successful PR CI and squash merge; not a device acceptance claim.
