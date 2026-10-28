# 261028-1729 — M0 physical capture provider gate

## Intent and priority

M0 physical Windows Chrome and Pixel 8 Android Chrome filesystem acceptance is still unverified. Rather than add more Catalog indexing, make the existing file-backed capture model testable on real providers with a repeatable, explicitly disposable, non-destructive acceptance fixture.

## Coherent implementation batch

- Added `src/m0-capture-acceptance.mjs`: explicit confirmation and empty-parent checks, unpredictable UUID-named child Folder, production `planFileCapture` / `writeCapturedFile` creation of one physical `.url` and one `.md`, independent exact readback and a separate read-only fixture verifier.
- Provider failures, cancellation, permission denial, existing/nonempty parents, malformed fixture identity, unexpected files, content tampering and partial writes are surfaced conservatively. No automatic cleanup of questionable fixtures.
- Integrated Create/Verify actions into **Device checks**, exported only normalized outcomes and hashed synthetic fixture identity; never export raw paths, filenames, bytes or FileSystemHandles. The cross-device M0 report comparator now optionally checks matching verified physical capture fixture proofs; mismatch or one-sided evidence warns but no result automatically passes acceptance.
- Added test coverage for success, simulated Syncthing copy/reopen, tampering, failure and no-write guards; updated scoped service-worker precache and the roadmap, design contract, implementation status, M0 checklist and device run instructions.

## Release process and evidence

Branch: `dev/261028-1729-m0-capture-provider-gate`, created from main `57076a8beb00312f254d24f5bc74f768ef7c7f3f`. Development stays off main. PR CI must pass before squash merge; GitHub Actions is the only publication path. The screenshot workflow is not invoked. Record actual PR/CI/Pages/cleanup links in the PR discussion after verification, not as invented pass claims here.

## Verification boundaries and remaining risks

Node unit tests and GitHub Actions validate code and synthetic providers only. No physical Windows Chrome, Pixel 8 Android Chrome, Android Storage Access Framework provider, offline restart or actual Syncthing transfer was performed during this code cycle. An absent Android directory picker is a **Blocked** capability requiring an architecture decision, not a successful capture. Browser Download remains unverified. The File System Access API lacks atomic exclusive-create guarantees; provider races and partial files remain possible. M0 is **not accepted**.

The fixture intentionally remains in the selected disposable parent. Inspect and remove it manually after testing; never run on irreplaceable data. No Catalog-only Resources or silent source-file mutations are introduced. No screenshots/visual fixtures generated; Mindmap untouched.
