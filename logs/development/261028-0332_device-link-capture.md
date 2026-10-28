# 2026-10-28 03:32 Europe/Madrid — Device-local link capture (V0.0.33 candidate)

## Intent
Make link capture useful even when Chrome/Android has no directory picker or Catalog permission. This is an explicit **device-local staging tray**, not a new Collection, synced URL resource, Android Web Share Target or replacement for portable Catalog records. Keep M0 acceptance unverified.

## Delivered in code
- Launcher, top toolbar and Settings now open **Capture links** regardless of Catalog state or File System Access API availability.
- Paste up to 20 HTTP(S) URLs per batch or explicitly read clipboard text into the field; **Save links** remains a separate deliberate action. Invalid/oversized batches fail without partially saving.
- Canonical URL validation rejects non-web schemes, embedded credentials, control characters and whitespace. Duplicate normalized URLs are skipped. At most 200 links are stored locally in IndexedDB.
- Compact responsive link list supports safe external open (direct anchor with `noopener noreferrer`), copy URL (manual fallback), optional title editing, explicit removal and explicit JSON export with a private-link warning.
- Fail-closed corrupt-record validation and optimistic read/recheck/write/readback protection against common stale-tab races. This is **not** a true atomic cross-tab CAS.
- Service-worker precache includes the new module; cache name changes only within Sourcebook's `sourcebook-shell-` prefix. Manifest identity and other TA PWAs are untouched.

## Verification
- New `tests/link-capture.test.mjs` exercises normalization, unsafe schemes, duplicate handling, limits, stale storage, persistence readback, title changes, removal and UI/SW wiring.
- PR CI, merge, Pages publishing and branch cleanup are **pending at commit time** and must be reported from actual Actions results.
- No screenshots or visual fixtures were requested, captured or committed. No physical Windows/Pixel 8 tests were performed.

## Limitations / next work
- These links remain **on this browser only**; JSON export is a manual handoff. They do not appear in Catalog Views or Syncthing and are not yet portable `.sb` URL resources.
- Clipboard read requires a user gesture and browser permission; manual paste is the fallback. Android incoming share-target is **not implemented**.
- Independent tabs can still race between IndexedDB reads and writes; no atomic CAS. IndexedDB eviction can lose staged links. Export before relying on them.
- M0-01…M0-08 remain **Not tested** on actual Windows Chrome and Pixel 8. Next: real-device acceptance and a separately designed, journaled portable Catalog URL schema with explicit import from staging.
