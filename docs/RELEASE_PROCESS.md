# Sourcebook development, CI and publishing

**Updated:** 2026-10-27 · **Hosting:** GitHub Pages · **App:** Chrome-first PWA

## Branch → PR → squash merge → publish

- `main` is the **release branch**, not a workspace for development commits.
- Each coherent development cycle uses a `dev/YYMMDD-HHmm-description` branch, then a pull request into `main`.
- Run automatic PR CI (Node tests and syntax checks); address failures on the side branch. Squash merge only after CI succeeds. Keep the branch open if verification is blocked.
- GitHub Actions **Publish Sourcebook** is the sole deployment path. It runs automatically when `main` is updated, and can also be triggered manually via `workflow_dispatch`.
- The publish workflow tests the candidate before uploading only the PWA assets. It skips unchanged app content on ordinary `main` pushes; manual runs always request publication.
- **Do not publish directly from local tools or another branch.** Do not bypass PR checks merely to trigger publishing.
- No automation should commit directly to `main`. Rebase/update a branch and open a new PR if `main` advances during development.

## Workflows

| Workflow | Trigger | Purpose |
| --- | --- | --- |
| **Sourcebook CI** (`ci.yml`) | Relevant PRs and pushes to `main`; manual | Unit tests and JS syntax checks. No deployment. |
| **Publish Sourcebook** (`pages.yml`) | Push to `main`; manual | Recheck tests, stage app assets, deploy via GitHub Pages. |
| **Sourcebook Desktop Screenshots** (`screenshots.yml`) | **Manual only** | Chromium fixture screenshots, only when explicitly requested. |

A screenshot fixture run is **not** part of normal development, PR CI or publishing. It currently pushes generated screenshots to `main` when manually invoked; avoid running it until that writeback is moved to a PR or removed to preserve the protected release-branch convention.

## Release safety

- Sourcebook metadata backups are **catalog JSON only**; no automatic restore or cross-device locking. Keep backups before risky changes and do not assume an uninterrupted export is a filesystem-atomic snapshot.
- Publishing does not guarantee a running installed PWA has already activated its new service worker. Never force-refresh while a catalog write is in progress.
- Pages must remain **Settings → Pages → GitHub Actions**.
- The manifest ID `/261025-2132_sourcebook/` is unique; Mindmap uses `/261019-1740_pwa-mindmap/`. Each service worker may remove only its own `sourcebook-shell-` caches; GitHub Pages PWAs share origin-wide Cache Storage.
- Real Windows/Android File System Access behavior requires separate device testing. Node CI and Chromium screenshots are not substitutes.
