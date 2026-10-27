# Sourcebook development and release convention

**Updated:** 2026-10-27 · **Hosting:** GitHub Pages via GitHub Actions · **App:** Chrome-first static PWA

## Branch → PR → squash → publish

1. Start development from the latest `main` in a dedicated `dev/YYMMDD-HHmm-short-topic` branch. Never commit ordinary development directly to `main`.
2. Implement a coherent batch and run relevant tests. Commit as often as useful on the development branch.
3. Open a pull request targeting `main`. CI runs for **every PR** (including workflow/docs changes). Fix failures on the branch.
4. After PR CI is confirmed green and the changes are reviewed, **squash merge** to `main`. Use a descriptive squash commit message. If checks cannot be confirmed, leave the PR open, report the blocker and do **not** bypass.
5. A push/merge to `main` automatically starts **Publish Sourcebook** GitHub Actions. The action verifies Node tests and JS syntax before deployment. Its existing change-detection step may skip the actual Pages publish when only docs/workflows changed.
6. To republish manually, open **Actions → Publish Sourcebook → Run workflow**, select **main** and run it. Manual dispatch forces a deployment, including when the app sources are unchanged. Publishing from development branches is explicitly blocked.
7. **Clean up branch refs after merge:** once a same-repository `dev/*` PR is verified merged, the [Prune merged development branches](../.github/workflows/prune-merged-dev-branches.yml) Actions workflow safely deletes the PR's head branch. It also sweeps historical merged branches at the next `main` push; manual dispatch is available. It checks the branch still exists and matches the merged PR's recorded head SHA. **Never** delete an open/unmerged, moved or non-`dev/*` branch. Branch deletion does not delete the squash-merged history on `main`.

Keep `main` as the latest successfully reviewed source history, **not** the location where features are developed. For fully autonomous agent cycles, CI-passing pull requests may be squash merged by the agent when no additional approval is required; failed/unconfirmed checks leave the PR open. Consider enabling GitHub branch protection/rulesets to require PRs and passing Sourcebook CI; the workflow convention alone cannot prevent direct pushes by other GitHub users.

## Workflows

| Workflow | Trigger | Effect |
| --- | --- | --- |
| **Sourcebook CI** (`ci.yml`) | Every PR into `main`, relevant pushes on `main`, manual dispatch | Unit tests and JS syntax checks; never publishes. |
| **Publish Sourcebook** (`pages.yml`) | Every push to `main` or manual dispatch on `main` | Checks changed app assets, reruns tests, stages only static PWA assets and deploys through GitHub Pages Actions. Docs-only pushes may skip the deployment. |
| **Sourcebook Desktop Screenshots** (`screenshots.yml`) | **Manual only** | Captures synthetic-browser screenshots as a downloadable Actions artifact, but does not auto-commit screenshots or push to `main`. Screenshots are never a prerequisite to publishing. |
| **Prune merged development branches** (`prune-merged-dev-branches.yml`) | Push to `main` (including squash merges) or manual dispatch | Deletes only unchanged same-repository `dev/*` branches belonging to merged PRs; preserves all unmerged or advanced branches. Initial main push sweeps older merged branches. |

No scheduled screenshot capture or separate branch-based website build is required. GitHub Pages **Settings → Pages → Build and deployment → Source: GitHub Actions** must be configured; avoid branch-based Pages publishing alongside `pages.yml`.

## Safety and verification

- **PR CI first; deployment tests again.** A newly merged change is not a successful release unless the Pages action reports success.
- Pushing `main` now triggers deployment checks automatically; this replaces the former manual-only release policy. It can make releases without another chat confirmation **after an approved/CI-passing squash merge**. This behavior is intentional.
- Do not manually run the screenshot workflow or download/capture screenshots unless explicitly requested. Its workflow is artifact-only and may not push directly to `main`.
- Catalog and source-file mutations are separate from release management. Never overwrite ordinary user data while testing or publishing.
- Publishing code does not guarantee every installed PWA has activated its updated service worker. Never force-reload during a catalog write.
- Actual Windows and Android testing must be reported separately from CI or a hosted deployment.

## Multiple TA PWAs

Sourcebook uses explicit manifest ID `/261025-2132_sourcebook/` and keeps `scope: "./"` / `start_url: "./"` relative to its GitHub Pages directory. Mindmap uses ID `/261019-1740_pwa-mindmap/`. Keep these identities distinct.

Each service worker must delete **only** its own app-prefixed caches. TA PWAs share `teodor-andonov.github.io` Cache Storage; origin-wide cache clearing would erase other apps' offline shells. Avoid indiscriminate site-data deletion when reinstalling PWAs.

This convention applies to Sourcebook only; it does not automatically authorize publishing or changing Mindmap.
