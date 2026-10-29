# 261029-0522 — Folder selection and keyboard/touch workflow

**Candidate:** V0.0.60 · **Branch:** `dev/261029-0522-folder-selection-keyboard` · **Date:** 29 Oct 2026, Europe/Madrid

## Decision and scope

M0 physical Windows Chrome / Pixel 8 / Syncthing acceptance remains the blocking product milestone. This cycle improves browser-first everyday navigation without claiming synthetic Chromium OPFS is an external Folder provider.

- Read-only, ephemeral selection model shared across gallery, list and table; stable Shift anchor and additive Ctrl/Cmd+Shift ranges.
- Compact Select, All shown and Clear actions in ordinary Folder Tabs and Catalog Folder browsing. Select mode enables touch-friendly multi-selection; Ctrl/Cmd+A selects only displayed entries, not unseen 20k directory results.
- Explicit 250-item cap; oversized ranges fail without changing the previous selection and All shown reports truncation.
- Filtering prunes hidden selected IDs. Modal dialogs and input fields retain native keyboard behavior. Space toggles a focused resource, Escape clears selection when no viewer/menu/dialog owns the key.
- No ordinary file writes, Catalog migration, new resource storage class, additional metadata concept, screenshot generation or Mindmap changes.

## Verification and acceptance

New pure Node tests cover range anchoring, toggle/additive behavior, filtered selection, cap enforcement, invalid input and non-persistence. A real headless Chromium OPFS scenario covers clicks, Shift, touch-mode button, Select shown, Ctrl+A, Escape, filtering and unchanged physical file entries. PR CI is required before merge; this log does not claim unrun tests passed.

**Three-state gate:** Implemented in code: candidate pending CI. Device verified: **No** (neither Windows Chrome nor Pixel 8 tested). Released and accepted: **No** (M0 open). The OPFS picker adapter is synthetic and cannot establish Android SAF, external Syncthing Folder access, or offline device permissions.

## Risks

- Selection applies to currently displayed resources; a 20,000-entry partial directory read remains partial.
- Selection is intentionally not persisted across Folder Tab changes or reloads.
- The 250-item limit constrains bulk metadata actions and prevents accidental large selections; use narrower filters for other ranges.
- Browser shortcuts may differ on actual devices; physical acceptance is still required.
