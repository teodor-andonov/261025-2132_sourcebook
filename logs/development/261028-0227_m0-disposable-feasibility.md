# 261028-0227 — M0 disposable filesystem feasibility

**Branch:** `dev/261028-0227-m0-disposable-feasibility`  
**Milestone:** M0 remains OPEN; Windows Chrome and Pixel 8 Android have not been physically tested.

## Decision and scope

The previous Device checks panel could only detect APIs and enumerate ten entries read-only. That was insufficient to separate real permission/provider failures from missing API exposure, especially for writable portable `.sb` directories and grant survival after restarting an installed PWA. Implement two bounded, explicitly initiated tests rather than claiming browser compatibility.

## Delivered in code

1. **Disposable write lifecycle:** after explicit confirmation, pick an empty disposable Folder with readwrite permission, reject unavailable/denied permission, generate an unpredictable UUID filename, refuse collision, create one synthetic text file, verify exact readback, check original handle identity before removing, and confirm absence. If cleanup cannot be verified, report failure and show the synthetic name for manual cleanup. Do not touch existing source files or Catalog JSON.
2. **Opt-in remembered read grant:** pick a disposable Folder with read permission, store the handle only in device-local IndexedDB, recheck permission and bounded enumeration after restart without prompting, and offer explicit Forget. No automatic probing on launch.
3. **M0 evidence:** sanitized probe statuses in the existing local manual report, without names, paths, raw handles, file bytes or automatic Pass. The original eight manual scenarios and read-only probe remain intact.
4. **Integration:** precache the new module in Sourcebook's own service-worker shell, compact existing Device checks controls, add simulated File System Access tests and update the 3-state roadmap and M0 instructions.

## Verification and constraints

- New unit tests simulate consent, readwrite grant, collision, readback, identity mismatch, write failure, cleanup failure, permission revocation, IndexedDB adapter errors and sanitized exports.
- **PR CI:** pending until GitHub Actions confirms; do not report passing tests before a green run.
- **Real Windows / Pixel 8 tests:** not performed. **M0 accepted:** No.
- **Screenshot generation:** prohibited without explicit user request; not performed.
- **Pages release:** only via automatic main-branch Publish Sourcebook after a green-checked squash merge.
- **Risk:** provider crashes/races can leave a synthetic file. Never use valuable folders; the UI instructs manual cleanup when necessary. This is not an atomic file operation, a Catalog write transaction test, or proof that an Android document provider supports persistent directory handles.

## Next

Run M0-01…08 on both devices, including an actual portable `.sb` reopen and Syncthing roundtrip. Use the new probes to isolate write/permission failures. Then prioritize URL/clipboard/Android capture and safe file operations based on the actual platform findings.
