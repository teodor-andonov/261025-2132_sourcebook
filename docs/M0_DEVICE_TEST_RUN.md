> **V0.0.40 file-backed acceptance addendum (28 Oct 2026):** On each real device, stage a harmless public HTTPS URL, use **Create .url** to select a disposable writable Folder, and verify the resulting ordinary shortcut file and exact URL bytes. Test incoming Android share → **Create .url** and share text → **Create .md**. If the picker is unavailable, use explicit **Download** and inspect Downloads manually; this is not equivalent to a verified Folder write. Cancel/deny permission and confirm the pending share remains. Test the **v2** portable fixture: it includes a real `source-files/*.url` inside a throwaway `.sb` and a file-bound Catalog record. Previous v1 Catalog-only URL fixtures are legacy and must not be silently converted or deleted. **M0 remains Not tested until actual Windows Chrome and Pixel 8 evidence is recorded.**

# M0 — Real-device acceptance record

**Sourcebook milestone:** [M0 device gate](ROADMAP_STATUS.md#immediate-priority--close-the-m0-device-feasibility-gate) · **Status:** No physical acceptance run recorded.

Copy this file to a new timestamped test log for **each device**. Never mark tests passing without actually performing them on hardware.

## Run information

- Timestamp (local):
- Device: Windows PC / Pixel 8 Android
- OS version:
- Chrome version:
- Installed standalone PWA or browser tab:
- Sourcebook main commit / published release:
- Storage provider: local internal storage / removable drive / Syncthing folder / Android Document Provider / other
- Catalog location category: user-granted local folder / synced folder / other (omit private paths)
- Tester:
- Evidence (link to issue or test log, not private file data):

## Read-only browse

- [ ] Open a real user-granted Folder, inspect mixed files in Gallery, List and Table (M0-02)
- [ ] Navigate nested folders and 2+ independent physical Tabs, Back/Forward; confirm source file bytes/names unchanged (M0-02)
- [ ] Select images, PDFs, text/code and an unsupported binary file; check side inspector, previews and error messaging (M0-02)
- [ ] Close and restart PWA, confirm Tabs persist/reconnect correctly (M0-04)

## Portable Catalog

- [ ] Create/open empty `Sample.sb/` in a granted directory (M0-03)
- [ ] Register a source, add a nested Tag and Note, save/close/reopen, verify metadata and no accidental source file change (M0-03)
- [ ] Test source permission denied/revoked and later regrant without losing catalog state (M0-04)
- [ ] Test a Syncthing Catalog roundtrip to the other target device and regrant its source folder (M0-05)
- [ ] Check saved Views, type/group and their results after reconnect (M0-05)\n- [ ] Create a real harmless `.url` shortcut in a disposable physical Folder, optionally annotate that file with a nested Catalog Tag, close/reopen, and verify the file and Tag persist; test actual Windows↔Pixel 8 Syncthing roundtrip (M0-03, M0-05). Preserve legacy Catalog-only URLs until explicit migration.

## Offline, performance, capture

- [ ] Install as PWA and retry offline shell, with source-file access only where the provider permits (M0-01, M0-06)
- [ ] Test service worker update after save completes; never reload mid-write (M0-06)
- [ ] Browse ~500 mixed files; note time to first interaction, scroll smoothness and crashes (M0-07)
- [ ] On Pixel 8: test Share URL/text, document unsupported Share Target behavior, and try clipboard/file-picker fallbacks (M0-08)

## Outcome

- **Result per ID:** Pass / Fail / Blocked / Not tested
- **Bugs found:** link issue(s), severity, reproducible steps and device/provider
- **Accept M0 for this device?** No / Yes, with evidence
- **Cross-device M0 complete?** No until this file exists for both platforms and the Syncthing roundtrip is verified

Do **not** upload private source files, credentials, personal directory paths or device identifiers to public GitHub issues. Synthetic fixtures may be used for reproduction; they do not replace actual device testing.

## In-app readiness workflow (V0.0.31 candidate)

Open **Device checks** from the Sourcebook launcher or Settings. Record the actual Chrome version, whether the app is standalone, and the published commit (from GitHub Actions). The capability table is diagnostic only: **API present ≠ operation works**. Optionally select a **disposable test Folder** with **Probe a Folder (read-only)**. It enumerates at most ten entries, reads metadata from at most one file and checks handle identity where available; it does not write to the Folder or request write permission.

Perform M0-01…M0-08 manually on both real devices, marking Pass / Fail / Blocked and noting the storage provider, failure steps and evidence URL. The dialog stores these entries only in this browser's local storage. **Export JSON** to retain evidence before clearing browser storage; no automatic upload occurs. The exported report contains no file names, contents, raw user-agent string or source paths. Do not paste private paths or secrets into manual notes.

The read-only probe alone does **not** establish Catalog write permission, offline survival, Syncthing portability, Android sharing or acceptance. These require the full checklist above.

## Disposable filesystem feasibility probes (V0.0.32 candidate)

In **Device checks**, first choose **Probe a Folder (read-only)** for a harmless metadata/enumeration check. For write feasibility, prepare an **empty, disposable Folder** that contains no project/source or `.sb` Catalog data, then choose **Test write / read / remove** and explicitly confirm. The probe requests readwrite through the picker, creates one unpredictable `.sourcebook-m0-probe-<UUID>.txt`, verifies exact bytes, removes it only if its identity and contents still match, and verifies absence. If cleanup is not verified, **stop** and manually inspect/remove only that synthetic probe file; do not run on a valuable Folder. Provider failures may leave a probe file behind. The test does not check Catalog transaction correctness.

To check grant persistence, choose **Remember read handle** on a disposable Folder, close/restart the installed PWA, then select **Recheck after restart**. This reads a device-local IndexedDB handle, queries read permission and tries enumerating one entry only if permission is already granted. It **never requests permission**; a prompt/denied result means regrant needs separate user action. Use **Forget handle** when finished. Browser storage eviction may remove it. Record the provider and actual results under M0-03/04; neither automated probe marks acceptance as Pass.

The exported report includes only sanitized probe status, permission and verification flags. It excludes source paths, file names, bytes and saved handles. **Clear local results** clears the checklist; **Forget handle** separately removes the stored handle.

## Incoming Share Target acceptance (V0.0.34 candidate; not tested)

On a Pixel 8 with the installed Sourcebook PWA (not just a browser tab), use Android Share from a browser to send a public test URL to Sourcebook. Confirm the **Incoming shares** dialog opens, the URL is reviewable, nothing is saved before **Save links**, and the pending item clears only after successful save. Repeat with text-only and two-URL shares; these should remain reviewable rather than silently choosing a URL. Test offline and after restarting the PWA; record browser/Android version, tested commit, exact outcome, and non-private evidence. If Sourcebook does not appear in Android's share sheet or a POST fails, record **Blocked/Fail**, not Pass. Do not share private URLs or use ordinary files for this test. This does not close other M0 rows.

### V0.0.35 portable URL acceptance extension (manual only)

On **each** target device, with a disposable Sample.sb Catalog: explicitly add a manual HTTPS URL, add a nested Tag, save, close and reopen Sourcebook, verify the URL appears in the Links surface and a tag-filtered saved View, and verify the resource JSON retains its stable ID without a sourceId/path. Import one selected device-staged URL and confirm the staged copy remains. With Syncthing enabled, verify the same URL metadata and Tags appear on the other device after regranting the Catalog. Record any permission/IndexedDB/provider failures as **Fail** or **Blocked**, never inferred Pass. Do not share private URLs or personal paths in exported evidence. **Not tested on physical devices as of 2026-10-28.**

## Portable fixture + offline cache diagnostics (V0.0.37 candidate)

In **Device checks**, choose **Create disposable .sb** only after preparing an **empty throwaway parent Folder**. Explicit confirmation is required. Sourcebook creates a unique `Sourcebook-M0-<UUID>.sb` containing a harmless example.org URL, two nested stable-ID Tags and one saved View. It exercises the existing Catalog recovery journal and verifies readback. The fixture is **left in place**, not automatically deleted. If the probe fails, inspect the named partial fixture and any pending journal manually; never test against real project data.

Close/restart the PWA, choose **Verify .sb (read-only)** and select that exact fixture. For a Syncthing test, sync the disposable fixture to the second device, regrant the Folder and verify it there, then record the actual storage provider, browser version, release commit and outcome. A local or simulated verification is **not** cross-device acceptance. The exported report contains only sanitized probe statuses, not the fixture name or paths.

Choose **Inspect cached shell** to inspect service-worker control and Sourcebook-prefixed cached index/module entries without modifying caches or going offline. This does **not** prove offline navigation: separately disable network on the actual device, restart and open Sourcebook, record results, then restore connectivity. Never interrupt a Catalog write to test updates.

## Cross-device report review (V0.0.38 candidate)

After running the eight M0 cases on **real** Windows Chrome and Pixel 8 Android Chrome, export JSON separately from **Device checks** on each device. Use **Compare Windows + Android evidence** and select both exports. The comparison is read-only and held in memory, checks same deployed commit, standalone mode, report age, eight statuses, external M0-05 evidence links, and a hashed disposable fixture identity. To compare fixture identity, choose **Verify .sb (read-only)** against the **same** Syncthing-transferred disposable fixture on both devices before exporting. No fixture path, raw UUID or file content is included in the report.

A matching fixture fingerprint proves only that both verification operations observed a fixture with the same synthetic UUID and expected metadata. It **does not** establish how the fixture was transferred or that real device tests occurred. Record an external manual Syncthing test log or issue link for M0-05. Imported reports are not uploaded or persisted. The reviewer must still explicitly accept or reject the M0 gate; Sourcebook never auto-accepts it.
