# 261028-0929 — File-backed capture inbox and M0 fixture (V0.0.40 candidate)

## Context and decision
The 28 October resource-model correction supersedes the V0.0.35–0.0.38 fileless Catalog URL approach. Every durable Resource must be a real ordinary file/folder; Catalogs hold optional metadata only. The preceding V0.0.39 work added manual .url/.md writing but left staged links, Android shares and the disposable M0 fixture disconnected from that invariant.

## Coherent implementation batch
1. **Staged link → real .url:** Add an explicit per-link Create .url action using a user-selected writable Folder and exact readback. Keep staged links until explicitly removed; cancelled/denied writes preserve them.
2. **Android share → real file:** Add Create .url for unambiguous URLs and Create .md for text/ambiguous shares. Clear the pending share only after a verified Folder write; merely staging a URL no longer clears it.
3. **Browser Download fallback:** Add explicit .url/.md download requests for Android/providers without a directory picker, including manual capture, staged links and incoming shares. This is *not* verified disk persistence: the browser controls destination, filename collision handling and completion. Pending shares remain until user confirmation/discard.
4. **Physical Links Views:** Classify ordinary .url files as Links for saved View filtering while preserving kind=file and sourceId/path. Legacy kind=url metadata remains readable/editable; new fileless creation stays disabled.
5. **M0 v2 fixture:** Replace the synthetic Catalog-only URL with a physical source-files/*.url file and a file-bound resource JSON, nested stable-ID Tags and saved View. Read-only verification checks the actual shortcut contents. The synthetic source folder lives within a throwaway .sb solely to make a self-contained fixture; it is not a production storage recommendation or a test of external source grants. Older v1 fixtures are preserved but not accepted by the v2 verifier.
6. **Documentation and tests:** Update roadmap, design contract, implementation status, device test instructions and Node regression coverage.

## Safety and limitations
- No silent ordinary source file changes, automatic Catalog objectification, legacy metadata migration, or overwrites of known collisions.
- File System Access cannot promise atomic create-exclusive semantics. A last-moment race or interrupted write can leave a partial new file; the UI reports failures.
- Browser Download cannot prove that a file was saved, where it was saved, or how the browser resolved a collision. This is a user-triggered fallback only.
- The M0 fixture's real file verifies portable synthetic bytes, not Windows Chrome/Pixel 8 provider compatibility or Syncthing transfer.
- Existing legacy kind=url JSON remains intact pending a user-confirmed, collision-safe, stable-ID-preserving migration.
- No screenshots, visual fixtures, physical-device runs or Mindmap modifications.

## Verification and release evidence
- Branch: `dev/261028-0929-file-backed-capture-inbox` from `f1abf289190f024852196bb4c349cd58be9d399f`.
- PR CI, merge commit, Pages deployment and branch cleanup: **pending at log authoring time**; report only verified runs after checks complete.
- M0 Windows Chrome: **Not tested**. Pixel 8 Android Chrome: **Not tested**. M0 released/accepted: **No**.
