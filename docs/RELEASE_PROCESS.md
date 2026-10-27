# Sourcebook release and CI policy

**Updated:** 2026-10-27 · **Hosting:** GitHub Pages · **App:** Chrome-first static PWA

We deliberately do **not** deploy for every development commit. The hourly development task can commit independently without interrupting the live app.

| Workflow | Automatic trigger | Manual override | Outcome |
| --- | --- | --- | --- |
| **Sourcebook CI** (`ci.yml`) | Pushes to main changing web/test files and relevant pull requests | Yes | Fast Node unit tests + JavaScript syntax checks; **never deploys** |
| **Sourcebook Desktop Screenshots** (`screenshots.yml`) | Daily **02:41 UTC** | Yes | Real browser screenshots at 1440×900 using synthetic test fixtures; updates `screenshots/` only if PNGs change |
| **Publish Sourcebook** (`pages.yml`) | Daily **03:17 UTC**, **only if web app files changed since the last successful publishing run** | Yes, deploys immediately | Verifies code, stages static app assets, publishes to GitHub Pages |

## How change detection works

Nightly Publish checks the most recent **successful** run of its own workflow, reads that run's commit SHA, and compares these paths against the current checkout:

- `index.html`
- `manifest.webmanifest`
- `sw.js`
- `src/`
- `assets/`

If these paths have not changed since the previous successful publishing run, it skips publication. Changes to documentation, tests, screenshots or logs do not trigger a new website release.

Manual Publish runs always publish the current `main`, including in cases where you want to force a refresh.

The first nightly/manual release publishes automatically (once Pages is enabled) even if there are no earlier successful releases.

**No-code-change nightly checks still run a very small Actions job.** This avoids repeated Pages deployments but is not completely zero-cost. Scheduled Actions can start late or occasionally be dropped by GitHub, so use manual Publish if you need a specific change live immediately.

## Deploy now — no git command required

1. In the repository go to **Actions**.
2. Choose **Publish Sourcebook**.
3. Select **Run workflow**, choose `main`, and confirm.

**One-time configuration:** Repository **Settings → Pages → Build and deployment → Source: GitHub Actions**. Until this is enabled, the publish job can fail at `actions/configure-pages`; code tests can pass independently.

## Automatic PWA updates

The service worker caches the app shell for offline operation. Publishing new files does **not** guarantee every already-running PWA immediately switches code; clients need to discover and activate the new service worker. Later we can add a safe, visible **Update available** button rather than force reload during active catalog writes.

## Limits and rationale

GitHub documentation states standard GitHub-hosted runners for public repositories are free; the Pages soft 10-builds/hour limit does not apply to custom Actions publishing workflows. Still, scheduled publishing provides a calmer release process, smaller artifact uploads and more predictable QA.

Screenshot workflow uses a real headless Chromium browser with synthetic filesystem fixtures; no screenshot should ever be presented as real Pixel 8/Windows OS validation.

Keep manual release available for urgent fixes and major version milestones. Never publish broken verification results or claim the hosted app is live before GitHub Pages deployment succeeds.
