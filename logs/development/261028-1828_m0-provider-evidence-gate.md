# 261028-1828 — M0 filesystem-provider evidence gate

## Problem
All eight manually entered Pass results could previously appear review-ready even with absent directory-picker support and no successful disposable physical writes. This obscured the unresolved Pixel 8 M0 gate.

## Coherent batch
- Added pure, conservative provider triage with Blocked, Failed, Unverified and probe-ready states.
- Displayed the state and next action in Device checks; refreshes after relevant probes.
- Added coarse state to sanitized JSON export; cross-device comparison independently recomputes from underlying evidence, not the exported claim.
- Made verified physical .url/.md fixture proof mandatory for **ready for manual review**, alongside the existing portable .sb fixture.
- Added tests for unsupported, denied, partial and missing evidence, legacy reports, contradictory all-Pass claims, UI and offline precache wiring.

## Boundaries
No ordinary source file or Catalog writes are performed by this triage. Existing probes require explicit consent and disposable Folders. Browser Download cannot clear the gate. No screenshots, visual fixtures or Mindmap changes.

At authoring PR CI, squash merge, main CI, automatic Pages publication and cleanup are pending separate verification. Physical Windows Chrome, Pixel 8 Android Chrome, offline, permissions and Syncthing **Not tested**. M0 remains open.
