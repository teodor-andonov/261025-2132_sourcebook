# Sourcebook release and CI policy

**Updated:** 2026-10-27 · **Hosting:** GitHub Pages · **App:** Chrome-first static PWA

## User-controlled releases and screenshots

The user explicitly chose to control **all visual screenshot capture and live publishing**. Neither may run on a schedule or as a side effect of ordinary code commits. In GitHub Actions, both workflows now use `workflow_dispatch` **only**.

| Workflow | Trigger | Purpose |
| --- | --- | --- |
| **Sourcebook CI** (`ci.yml`) | Automatically on code changes to main / relevant pull requests, or manually | Node tests and JS syntax checks. Never deploys. |
| **Sourcebook Desktop Screenshots** (`screenshots.yml`) | Manually only, at user's explicit request | 1440×900 actual headless Chromium fixture snapshots using synthetic test data; never physical device validation. |
| **Publish Sourcebook** (`pages.yml`) | Manually only, at user's explicit request | Verify code, stage PWA assets and deploy to GitHub Pages. |

## Release when requested

1. Open the repository **Actions** tab.
2. Select **Publish Sourcebook**.
3. Choose **Run workflow** on `main` and confirm.

There is no longer a nightly Pages deployment or nightly screenshot regeneration. Updates stay on the development branch until a user-triggered release. The existing `pages.yml` change-detection job is kept for workflow continuity but a manual run always sets should_deploy=true.

## Safety and validation

- App code and documentation can continue to be committed in substantial development cycles without changing the live hosted PWA.
- Do not run the screenshot fixture or publish code without explicit instruction.
- The screenshot fixture uses a genuine Chromium browser on synthetic data; never present it as Windows or Android device validation.
- Publishing code does not guarantee already-running PWAs have updated; the service worker may need to activate. Do not force-reload while a catalog write is in progress.
- Pages source must remain **Settings → Pages → GitHub Actions**.
