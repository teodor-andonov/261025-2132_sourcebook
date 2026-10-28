> **Updated capture/device gate (V0.0.40 candidate, 28 Oct 2026):** Test physical `.url` and `.md` creation in a disposable writable Folder on both Windows Chrome and Pixel 8. For Android share flows test single-URL `.url`, text/ambiguous `.md`, permission denial, cancellation, and explicit browser Download fallback. Download requests are not verified Folder writes. Use the v2 file-backed `.sb` fixture, but separately verify real external Folder grants and Syncthing transport. None of these tests has been run on physical devices by this development cycle.

# M0 device acceptance checklist

**Status: NOT YET TESTED.** Unit tests do not substitute for real device verification.

This is the minimum test matrix before calling Sourcebook a Windows + Android PWA. See [PWA architecture](PWA_ARCHITECTURE.md) and [implementation status](IMPLEMENTATION_STATUS.md).

## 1. Publish the prototype

1. Repository → **Settings → Pages**.
2. Under **Build and deployment**, set Source to **GitHub Actions**.
3. Publish through the existing **Publish Sourcebook** GitHub Actions workflow after a CI-passing squash merge to main (or manually dispatch it on main).
4. Confirm both **verify** and **deploy** jobs pass, then use the HTTPS Pages URL shown by the deployment job.

Use the specific successful Pages run as deployment evidence; publishing does not establish device acceptance.

## 2. Test on both devices

| Field | Windows Chrome | Pixel 8 Chrome |
|---|---|---|
| Date | Not tested | Not tested |
| OS version | — | — |
| Chrome version | — | — |
| Installed standalone PWA? | — | — |
| Folder provider (local/Syncthing/Android Files) | — | — |
| Directory picker available? | — | — |
| Create Name.sb in chosen parent | — | — |
| Reopen Name.sb after restart | — | — |
| Add source with read-only grant | — | — |
| Navigate nested source folders | — | — |
| Image previews appear in gallery | — | — |
| Save tags/notes into catalog | — | — |
| Source filename unchanged after save | — | — |
| Reconnect expired source permission | — | — |
| Create folder after explicit write grant | — | — |
| Import without overwriting existing files | — | — |
| Offline app shell after prior install | — | — |

Use **PASS / FAIL / UNSUPPORTED** for each scenario. Capture exact browser and storage-provider details on failures. If Android Chrome does not expose the directory picker for a chosen provider, mark **UNSUPPORTED** rather than treating a one-time file upload as equivalent folder access.

## 3. Disposable test fixtures

Use a throwaway source directory with a PNG, a PDF, a nested subfolder, filenames with spaces, a pre-existing multi-catalog filename token (e.g. Facade[ab967][c5].jpg), and a second folder containing a duplicate filename.

Verify saving tags/notes does not rename any source file. Inspect catalog resources JSON records for metadata. Deny write permission once and verify that no source file changes.

**Safety:** Do not test destructive operations on real project files. Avoid concurrent edits to a synced catalog on two devices; the current allocator is not transaction-safe.

## 4. Failure report format

Record device, OS version, Chrome version, file provider, action, expected behavior, actual behavior, screenshot or console error, and whether the folder was Syncthing-managed.

## 5. Exit criteria

The hosted PWA opens on both devices. Each device either passes folder enumeration and catalog persistence or reveals a documented platform blocker requiring an architecture decision. No source rename occurs during metadata save. Denied permissions are visible, and catalogs/sources can be reopened after restart.

**Do not mark M0 accepted without actual device observations.**


### V0.0.41 manual migration acceptance — not yet performed
With a disposable legacy fileless URL record, reconnect a registered Folder, confirm Create .url + rebind, inspect the physical shortcut and verify the stable ID, Tags, Notes and content after restart and a real Syncthing roundtrip. Repeat with denied permission and existing same-name file. Record unsupported Android provider operations. Browser Download is not a verified migration. Do not test on irreplaceable data.
