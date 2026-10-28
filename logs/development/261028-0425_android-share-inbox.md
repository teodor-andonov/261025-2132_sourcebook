# 2026-10-28 04:25 Europe/Madrid — Android incoming Share Target inbox (V0.0.34 candidate)

## Scope
- Register an installed-PWA **POST multipart Web Share Target** scoped to Sourcebook only. The module service worker accepts title/text/URL, rejects file payloads and oversized input, and persists at most 12 pending shares in a separate device-local IndexedDB store before redirecting with a constant marker (never shared text in the URL).
- Add compact **Incoming shares** review from launcher and Settings. Shared URL candidates are extracted conservatively; ambiguous or unsupported text remains available for manual copying. **Review URL** pre-fills Capture links; only explicit **Save links** writes device-local captured links. A pending share clears only after confirmed save or explicit Discard.
- Preserve optional Catalog boundaries, read-only browser mode, source files, Tag IDs, saved Views, unique PWA manifest ID and Sourcebook-only cache cleanup. The navigation fallback uses the cached shell when offline.

## Risks and acceptance
- Installed Android Chrome Web Share Target behavior, POST interception, service-worker lifecycle, offline redirect and device/provider support are **not verified on physical devices**. A POST outside an active controlling worker can reach GitHub Pages and fail; do not assume reliable delivery.
- Incoming shares and captured links are **device-local** and subject to browser storage eviction. Incoming text is not a Catalog resource. No automatic background capture, URL fetching, file-share handling or Syncthing synchronization.
- The service worker is now an ES module (Chrome target); other browsers may not support it. A successful CI run is not Android acceptance.
- Manual M0-08: install/update PWA on Pixel 8, share a public URL from another app, verify Inbox and explicit Save, test text-only and ambiguous URLs, test offline and restart, and verify no unexpected file writes. Record outcomes with non-private evidence.

## Verification
- Added Node regression tests for parsing, credential-bearing URL rejection, ambiguity, record integrity, manifest scope, POST wiring and explicit review.
- **CI pending until PR runs**. No screenshots, visual fixture captures, manual Pages dispatch or Mindmap changes.
