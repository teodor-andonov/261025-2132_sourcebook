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
- [ ] Check saved Views, type/group and their results after reconnect (M0-05)

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
