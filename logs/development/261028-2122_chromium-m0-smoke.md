# 261028-2122 — Chromium M0 browser smoke and no-picker landing

## Rationale and scope
M0 needs evidence from a real browser engine, not another Node-only simulated provider. This cycle adds a separate Chromium CI gate and a conservative unsupported-directory-picker landing. It does **not** impersonate Windows or Pixel 8, access user folders or claim physical-device acceptance.

## Implementation
- Headless Chromium serves the static app under the same URL path as GitHub Pages. Tests assert manifest ID/scope, service-worker control, offline reload, multipart Share Target POST and integrity-checked temporary File retrieval/removal.
- With the directory picker deliberately unavailable, unusable Folder/Catalog/import landing actions and the capture Create in Folder button are hidden; Device checks must report Blocked; URL capture explicitly requests an Internet Shortcut Download, whose bytes are checked from the browser Download stream.
- PR CI runs the existing Node suite and a separate pinned Playwright/Chromium job. No screenshots, traces, videos or visual fixtures are generated.
- Scoped service-worker cache version advances; unrelated TA PWA caches remain untouched.

## Evidence and acceptance boundary
At authoring, CI and publication are not yet verified. Record exact PR CI, main CI, Pages and cleanup outcomes separately. The smoke runs on **Linux headless Chromium**, not Windows Chrome, Pixel 8, Android native sharing or a real Syncthing-managed Folder. Browser Download cannot verify destination, filename or durable persistence. **M0 remains open.**

## Remaining risks
- Chromium headless does not model Android filesystem providers, OS share sheets or real permission persistence.
- Pinned Playwright and browser download/install in CI add external package and runtime dependencies.
- Browser Downloads can be renamed/relocated by the OS; temporary inbox staging is not a durable Resource.
- Physical Windows/Android/Syncthing acceptance is still the blocking milestone.
