# 261029-0930 — M0 evidence quality gates (V0.0.64 candidate)

## Why this cycle
The M0 cross-device report comparison could previously show readyForManualReview for two all-Pass reports even when read-only Folder, saved-handle and cached-shell diagnostics were absent, and only M0-05 required an external evidence link. This risked making self-reported statuses appear more conclusive than they are.

## Coherent implementation batch
- Parse imported M0 JSON into sanitized, coarse folderRead, handleRecheck and cacheReady booleans; do not retain arbitrary imported probe fields, paths or filenames.
- Audit every Pass on both devices for an external HTTPS evidence link; retain the special M0-05 Syncthing evidence warning.
- Require supporting M0-02, M0-04 and M0-06 diagnostics on both reports before reporting internal consistency. Show a compact, separate diagnostic matrix alongside scenario statuses.
- Preserve existing release-commit, standalone, age, provider, portable .sb and ordinary .url/.md fixture checks. Never mark acceptance automatically.
- Add regression tests for fabricated all-Pass reports, missing per-scenario evidence and privacy filtering. Update M0 field instructions, roadmap, design contract, implementation status and Sourcebook-only SW cache.

## Evidence boundary and safety
This is an evidence-review quality improvement, **not** a physical Windows Chrome/Pixel 8 test, an Android SAF compatibility fix or Syncthing proof. Imported JSON remains untrusted self-report. A cached shell is not an offline run, and handle enumeration is not proof of restart. No ordinary files or Catalog metadata are written, no screenshots/visual fixtures are generated, and Mindmap is untouched.

## Verification
- Development branch: dev/261029-0930-m0-evidence-quality-gates from main ed5616621d2a65abf55d0a800cadf312c93d616b.
- Local Node/Chromium: **not run** in this connector-only execution; PR CI is the verification gate.
- PR CI / merge / Pages / branch cleanup: verify after opening PR; do not infer success.
- M0: Device verified **No**; released and accepted **No**.
