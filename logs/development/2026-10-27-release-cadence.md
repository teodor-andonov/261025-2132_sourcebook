# Development cycle — 2026-10-27 · Release automation

## Decision

Decouple hourly development commits from live deployment. Use simple CI on changes, nightly screenshot capture, and nightly change-aware Pages publishing with a manual release option. Avoid unnecessary release artifact uploads.

## Changes

- Split one combined on-push verify + deploy workflow into `.github/workflows/ci.yml` and a scheduled/manual `.github/workflows/pages.yml`.
- Publish workflow compares web asset paths against the last successful publishing workflow run, skips clean nightly releases, and stages only static site files.
- Screenshot workflow now runs nightly (02:41 UTC) or manually rather than each UI source commit.
- Updated README, screenshot documentation, implementation status and [release policy](../../docs/RELEASE_PROCESS.md).

## Caveats

- No successful GitHub Pages deployment has yet been observed; enable Pages source: GitHub Actions. CI passing does not mean live deployment succeeded.
- GitHub scheduled jobs may be delayed. Manual release is available.
- Service-worker updates may not become active instantly on installed PWAs; future safe update UX remains necessary.

## Validation

- After commit, check the separate `Sourcebook CI` workflow and screenshot/manual release event configuration. Do not claim a Pages publication occurred without a successful publishing workflow.
