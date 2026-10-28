> **V0.0.51 prepared Android file share (manual, NOT tested):** Share a small PDF/PNG into the installed Pixel 8 PWA, open Incoming shares, select **Prepare to send** (or **Prepare all to send**), wait for integrity verification, then explicitly click **Send prepared file(s)**. Confirm the OS share sheet opens from this second click, that the receiving app sees the actual original file(s), and that inbox staging remains after success/cancel. Test a second attempt, the two-minute expiry and an unsupported target. Inspect receiving-app file bytes and final destination independently. A successful Web Share promise does **not** pass M0 writable Folder or Syncthing acceptance.

> **V0.0.50 outbound file handoff (manual, NOT tested):** On Pixel 8 installed Chrome PWA, open reviewed URL/text capture and choose **Send file to app…**; confirm a receiving app can accept the actual .url/.md attachment (not just URL text), inspect the file bytes independently and verify the chosen destination. For Incoming shares, use **Send to app** on one attachment and **Send all to app** on a batch, including cancellation/unsupported target; confirm staged shares remain pending. A resolved Web Share promise is **not** proof of a saved file, a writable Sourcebook Folder or Syncthing. If no suitable target appears, use Download or record Blocked. Repeat on Windows where supported. Do not mark M0 Pass from API detection alone.

> **V0.0.48 physical capture provider gate (manual, NOT tested):** On each real Windows Chrome and installed Pixel 8 PWA, open **Device checks → Create .url + .md fixture**. Prepare an EMPTY disposable parent Folder (never real project data), explicitly confirm, select it and record whether the picker and readwrite permission work. Sourcebook creates a new `Sourcebook-M0-Capture-*` Folder containing one ordinary `.url` and `.md`, verifies their exact contents, and retains them. Close/restart, choose **Verify files (read-only)** and select the **fixture Folder itself**, not its parent. Optionally transfer the fixture via Syncthing and verify on the other device. Check the actual files in an independent file manager; compare hashed fixture proofs if available. If Android lacks `showDirectoryPicker`, mark **Blocked**, not Pass; an explicit browser Download is unverified and does not establish Folder write access. If a partial fixture remains, inspect it manually; no automatic deletion. This test does **not** automatically pass M0-03/05/08 or prove transfer.

> **V0.0.47 share integrity and storage (manual, NOT tested):** On Pixel 8 installed Chrome PWA, open Device checks → Inspect storage, record coarse available/pressure/persisted state; optionally click Request persistence and record granted/denied. Neither establishes Android Folder write access or protection against eviction. Share a harmless PNG/PDF; verify staging, restart, review and explicitly save to a granted Folder or use the unverified browser Download. New attachments have SHA-256 checked before review; old inbox entries without hashes are legacy and not attested. Test denied permission, low storage and share failure without deleting the pending entry. Do not claim M0 Pass without real-device evidence.

> **V0.0.46 file-share acceptance (manual, NOT tested):** On Pixel 8 Android Chrome with the **installed** Sourcebook PWA, share a harmless PNG and PDF (individually and together) from Android Files. Confirm the share sheet exposes Sourcebook, the Incoming shares inbox lists exact filenames and sizes, and no physical file is created before Review files → choose Folder → Copy files. Verify all copied bytes with a separate file manager, then confirm the staged share clears. Repeat with cancelled import, denied Folder grant, a filename collision and a browser Download fallback; these must retain staging. Restart the PWA and inspect the pending share; confirm Discard removes it. Test a >25 MiB file and unsupported provider, recording Blocked/Fail and browser/provider versions. **Do not assume Android supports arbitrary file MIME shares or writable Folder access.**

> **V0.0.44 manual intake acceptance (not tested):** On both Windows Chrome and Pixel 8, paste a single URL and multi-line text into a physical Folder, then drop a URL, multiple URLs and an ordinary file. Confirm that each text/drop gesture opens review and writes **nothing** until Create in Folder is clicked. Test Cancel, denied permission, no directory picker, clipboard-read denied, browser Download fallback and collision refusal. Inspect resulting `.url` / `.md` bytes in a disposable Folder. Record provider/browser versions and failures; do not count a Download as verified Folder persistence.

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
