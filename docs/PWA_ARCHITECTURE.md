# Sourcebook PWA-first architecture / feasibility specification

**Date:** 2026-10-26 · **Status:** Chosen product delivery model, implementation details to verify.  
**Owner:** Sourcebook project  
**Primary reference:** [ULTRA V1 roadmap](ROADMAP_V1_ULTRA.md)

## Direction

One Chrome-first installed PWA, same application/features/data model on Windows and Android. No mandatory desktop backend, Tauri/Electron wrapper, account or cloud service. PWA uses a secure HTTPS origin, web manifest, service worker, the File System Access API, IndexedDB/OPFS and browser-native media tooling.

**What this does not mean:** The browser has unrestricted file-system access or every native file manager API. Users grant chosen catalog and source directories. We must detect what each Chrome version/provider can actually do.

### Architecture map

~~~text
Installed Chrome PWA (same code on both platforms)
  App shell / sidebar / gallery / list / inspector / quick look
    Catalog service (portable JSON document folder: Name.sb/)
    Identity service (catalog-code sequential bracket IDs)
    Resource query/search index (local IndexedDB, rebuildable)
    Preview service (worker queue / cache)
    Capture service (drop / picker / clipboard / web share target)
    File adapter (File System Access API; permission/capability detection)
         |                   |
         v                   v
  Chosen catalog Name.sb/   User-granted source folders
  JSON + previews          Real files, unchanged until user action

  Browser IndexedDB + OPFS = device-private cache, handles and remapping
  Syncthing = independent file/folder transport, outside Sourcebook
~~~

## APIs and their responsibilities

| Capability | Primary API | Caveats |
|---|---|---|
| Open catalog/source folder | window.showDirectoryPicker | Secure context, user activation, provider permissions |
| Enumerate subfolders | FileSystemDirectoryHandle.values/entries | Scan in batches; avoid recursion blocking |
| Read file | FileSystemFileHandle.getFile | May need refreshed permission |
| Write/create | DirectoryHandle.getFileHandle + createWritable | Write grant, source provider behaviour |
| Persist handles | IndexedDB structured cloning | Permission not necessarily persistent, recheck each session |
| Local index | IndexedDB | Disposable; rebuilding must work |
| Large cache | OPFS/Cache Storage | Data might be evicted; not catalog truth |
| Clipboard | Async Clipboard API | Permissions, focus and mobile UX constraints |
| Drag/drop | HTML Drag and Drop + DataTransferItem | Chrome support varies for directory handles |
| Android share | PWA share_target + service-worker handler | Known 2026 Chrome file share regression |
| Offline shell | Service worker/Cache | update consistency with open catalog |
| PWA install | Manifest + HTTPS | Android WebAPK behavior dependent on Chrome/device |
| Browser file association | file_handlers, launchQueue | Desktop Chromium only in current MDN support guidance |
| File change notifications | FileSystemObserver when available | Feature-detect; fallback manual/focus refresh |
| Remote website metadata | fetch if CORS permitted | Arbitrary sites often disallow |
| Webpage screenshot | extension or explicit optional service | Cannot guarantee PWA-only screenshotting |

## Required experimental “M0” test matrix

Tests run on target Windows Chrome **and** Pixel 8 Android Chrome, recording OS + Chrome version, whether installed PWA is used, selected root provider and any Syncthing-specific storage location.

### Experiment A — pick, enumerate, create
1. Install PWA via HTTPS.
2. Create/open an empty Catalog.sb using directory grant.
3. Read/write catalog.json and resources/test.json; close/reopen; compare bytes.
4. Grant one source folder; enumerate nested files, get metadata/real Blob.
5. Reboot phone/PC, reopen app, recheck permissions and recover on regrant.
6. Test catalog inside source root; exclude *.sb from source scans.

**Pass:** Same UI can navigate and safely write catalog data on both platforms, or the true provider limitation is documented and resolved before committing to PWA-only V1.

### Experiment B — baseline file operations
- Create new file and folder, write and verify checksum.
- Attempt simple rename/move, detect supported method; do not assume external FileSystemHandle.move.
- Explore safe copy / verification / delete constraints; test interrupted transfer.
- Confirm result across source boundaries and on Android provider.
- Do not implement an “Undo Move” button until undo is demonstrated and durable.
- Test deleting only disposable fixtures; browser deletion cannot be described as OS Trash.

**Pass:** Every enabled operation has verified user-visible semantics. Unsupported file moves are disabled or implemented with explicit safety path.

### Experiment C — Android sharing
- Register manifest share_target for text and files, install PWA.
- Share a URL from Chrome and a copied URL from another app.
- Share JPEG/PDF from Android Files/Gallery.
- Detect payload presence, type and names in service-worker request.
- Test fallback via file picker, URL paste and clipboard.
- Verify no file claims success when share payload is actually empty.

**Pass:** Phone capture works one way or another even during the Chrome 153-era regression.

### Experiment D — sync / multi-device
- Catalog created on Windows in synced folder; Syncthing to Android.
- Android re-grants new local folder path to same logical source.
- Change tags/offline; sync; check record state.
- Independently assign next sequential resource token offline on both devices; create deliberate duplicate.
- Verify conflict detection preserves both physical files and metadata; repair ID.
- Clear browser storage and re-open catalog only from *.sb; recover truth.

**Pass:** No unannounced data loss; sharing catalog does not require syncing ephemeral browser index.

### Experiment E — speed / offline
- Build 10k fixture in a real filesystem folder.
- Show first 30 visible entries before full scan completes.
- Virtualized scroll with background preview queue, profile dropped frames.
- Repeat from cold/warm startup; offline after service worker install.
- Force refresh/version update during an uncommitted edit and verify recovery.

**Pass:** Browser acts like an app, not a page that hangs while indexing.

## File System Access limitations — explicit product commitments

### Rename and move
Documented FileSystemHandle.move behavior is not universally shipped for external files; older Chrome docs describe OPFS only / external files behind a flag and directory moves unsupported. **Do capability probes on live Chrome builds**. Where unavailable, a copy-to-target, verify, delete-from-source workflow is *not an atomic rename*. Mark operation as staged, do not silently discard source, and treat interruption as resumable/repairable. For especially risky assets, use safe Copy only and refuse Move.

### Delete
The browser can delete granted entries, but has no standard cross-platform Recycle Bin API. UI must never call that operation “Move to Trash” without a true trash implementation. Prefer app-owned recoverable holding area only when safe and within selected directory, otherwise explicit permanent delete with stronger confirmation.

### Watchers
Do not require real-time filesystem watching. Feature-detect FileSystemObserver; on browse/focus/reopen/refresh compare directory entries and resource tokens. Optional periodic idle checks only while active, within a CPU/battery budget.

### Linked assets
Appending [abN] to a file can break references in Rhino/CAD, websites and media projects. Offer Objectify without filename mutation with weaker identity binding, plus clear consequences. Always keep file raw-name option.

### Browser origin
The PWA is tied to its hosted HTTPS origin; switching from GitHub Pages URL to a custom domain can strand device-local handles/index. Sourcebook catalogs remain portable, but folder grants must be reestablished. Decide production origin before public release and document migration.

### Web links
Arbitrary website metadata and screenshots cannot be guaranteed via fetch owing to CORS. Create a useful link immediately and let user provide an image/cover. An optional Chrome extension can later capture page title, selected content, favicon, page image and screenshot without a mandatory backend.

## Storage and consistency

**Portable truth**
- catalog.json, sources.json, tags.json, properties.json, collections.json, smart-folders.json, views.json.
- Small resources/<id>.json records.
- Optional shared previews/ derivatives; each preview records original revision/fingerprint.

**Device-local (IndexedDB/OPFS)**
- Catalog FileSystemDirectoryHandle (if serializable).
- Local source handle mappings keyed by catalog persistent ID and source ID.
- Fast index, transient current position/tabs/pane width.
- Preview LRU, pending operation journal, permission status.
- All device-local data reconstructable or safely regranted.

**Concurrency**
- Never rely on synchronized one-counter writes as atomic across devices.
- Avoid concurrent editing of shared JSON blindly; compare expected revisions.
- Syncthing conflict files surfaced for explicit reconciliation.
- For a colliding filename resource ID, safely allocate new number and update one filename + record together or mark unresolved; preserve both.

## Build / deployment

- Main app is a Vite+React+TypeScript SPA built into a secure hosted origin (GitHub Pages possible).
- Installable manifest with title, icons, scope/start_url, display standalone, theme/background and share_target.
- Service worker caches app shell + versioned assets, not arbitrary user folder content.
- Update prompts when a write/operation is active; refresh only from safe idle state.
- Security: Content-Security-Policy, careful object URL revocation, no dangerous SVG/script execution, no accidental source file network upload.
- Use feature detection rather than hard-coded Chrome version exceptions.
- Minimum deployment requirement: app still launches offline after initial install, and clearly indicates unreachable remote URL previews.

## Suggested M0 output

- Working hosted PWA with “New/Open catalog”, “Add source”, and thumbnails of chosen folder.
- Installed screenshot on Windows and Android.
- Capability report with pass/fail for picker, permissions, create/write/rename/delete, share text/files, persistence, offline.
- ADR capturing exact implementation choices, browser versions and known limitations.
- No need to build every sidebar or full catalog system yet.

## Primary external documentation

- File System Access: https://developer.chrome.com/docs/capabilities/web-apis/file-system-access
- Browser compatibility: https://web-platform-dx.github.io/web-features-explorer/features/file-system-access/
- Directory picker: https://developer.mozilla.org/en-US/docs/Web/API/Window/showDirectoryPicker
- PWA share target: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/share_target
- Known Android file share regression: https://issuetracker.google.com/issues/561685220
- Desktop PWA file handling: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Associate_files_with_your_PWA
- Observer feasibility: https://developer.chrome.com/blog/file-system-observer
