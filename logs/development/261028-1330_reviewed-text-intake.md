# 261028-1330 — Reviewed clipboard, paste and drop intake

**Branch:** `dev/261028-1328-reviewed-text-intake` (created from `41b7d10a7425ac367d5f46bc67266154f17ca148`)
**Scope:** V0.0.44 candidate · browser-first capture safety · M0 still unverified

## Finding and decision
Text pasted or dropped into the browser was previously passed straight to `writeCapture(..., {allowPicker:false})`. With a previously granted writable Folder this could create a real file without reviewing the generated name, content or destination. File drops already had explicit review; text/URL drops did not. This is inconsistent with the user-confirmed, file-backed Resource model.

## Coherent implementation batch
- Route browser-scroller paste and text/URI drops through a shared pure intake parser and an explicit review dialog; no write happens on the gesture itself.
- Support URI-list comments, up to 20 HTTP(S) URLs, multi-link Markdown drafts and fail-closed unsupported schemes.
- Add an explicit clipboard-read button that populates a draft without saving; manual paste and browser Download remain alternatives for unsupported/denied browser APIs.
- Preview `.url` versus `.md`, preserve editable content and title, require Folder destination and explicit confirmation for verified writes; ordinary file drops keep reviewed import.
- Precache the new intake module in this app's scoped service worker. No screenshots or visual fixture generation.

## Verification and limitations
Added Node tests for input classification, URI-list safety, draft-only routing and service-worker integration. At authoring, CI and publication are **not yet verified**; check PR and main Actions separately. No physical Windows Chrome or Pixel 8 test was performed. Android Folder write support, Syncthing roundtrip and atomic create-exclusive behavior remain unresolved. No Catalog-only URL Resources are created and legacy records are unchanged.

## Release evidence
Fill only after actual GitHub Actions results; do not infer CI success from code review.
