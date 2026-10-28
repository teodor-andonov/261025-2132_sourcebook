# 261028-2330 — Cooperative physical-file write locks

**Branch:** dev/261028-2330-cooperative-file-write-locks · **Target:** main · **Release candidate:** V0.0.54

## Scope
- Introduce one named, origin-scoped Web Lock for Sourcebook physical URL/Markdown capture and reviewed ordinary-file imports, including streamed batches. Hold it through destination enumeration, existence checks, file creation, byte readback and batch completion.
- Legacy URL-to-file migration and disposable capture probes inherit the guard through writeCapturedFile; source file bytes and Catalog metadata remain unchanged by the lock itself.
- Preserve read-only browser mode, explicit destination permission, existing collision checks and no-silent-overwrite rules. A missing Web Locks API uses the previous guarded workflow rather than pretending concurrency is solved.
- Add a same-origin Web Locks capability indicator, Node lock/fallback/abort tests and a **real headless Chromium two-tab** OPFS concurrency scenario that proves a second writer waits and an existing shortcut remains unchanged.
- Add the module to Sourcebook's scoped offline shell and increment its own cache prefix version. No screenshots, visual fixtures or Mindmap changes.

## Safety boundary and risks
- Web Locks coordinate cooperating Sourcebook tabs on **one browser origin only**. They do not lock other applications, external file managers, Syncthing, other browser profiles, different devices, or non-cooperating code.
- File System Access has no atomic exclusive-create primitive. A last-moment empty-file race with an external writer is still possible; partial files remain for manual inspection. No automatic rename, move, cleanup or Catalog-only Resource is introduced.
- OPFS is origin-private synthetic browser acceptance; neither a user-selected external Folder nor Windows/Pixel 8/Syncthing M0 verification.
- Physical device and portable .sb roundtrip acceptance remain open. CI and release evidence must be checked after the PR is opened; do not mark them passed from this log alone.
