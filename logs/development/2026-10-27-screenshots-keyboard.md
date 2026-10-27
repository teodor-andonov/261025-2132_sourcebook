# Development cycle — 2026-10-27 · Screenshots + gallery keyboard navigation

## Delivered

- Generated fixed-size 1440 × 900 PNG screenshots with a Playwright Chromium browser fixture: `screenshots/desktop-launcher.png` and `screenshots/desktop-gallery.png`.
- Added `scripts/capture-desktop.mjs` running actual application UI with mocked granted folder handles and synthetic architectural SVG reference resources. Exercise catalog creation, source browsing, tagging/notes persistence, original filename protection and image rendering.
- Added `.github/workflows/screenshots.yml` to capture, upload an artifact and update tracked screenshots on UI changes; the initial GitHub run completed successfully.
- Added `src/navigation.mjs` and `tests/navigation.test.mjs` with arrow-key gallery/list, Home/End and Enter navigation integration.
- Updated service-worker cache to 0.0.4.
- Updated hourly development automation instructions to produce honest fixture-labelled screenshots for meaningful visual changes, using only the one desktop viewport.

## Verification

- GitHub Actions `verify` job passed Node tests and JavaScript syntax checks for the development commit.
- Screenshot Actions `capture` job passed and committed the two PNGs.
- Full GitHub Pages deployment still fails at `configure-pages`; user must enable Settings → Pages → Build and deployment → Source: GitHub Actions.
- No real device test or measured FPS/latency claims.

## UX next

- Introduce real gallery virtualization beyond current Show More cap.
- Replace comma-separated tags with hierarchical catalog taxonomies.
- Add catalog source/grant recovery flows and actual Windows/Pixel 8 PWA acceptance tests.

## Important constraints

- Fixture screenshots are genuine browser renders but use fake granted folders, not real OS permissions.
- No implicit physical filename mutation when saving metadata.
- Multi-device concurrent allocation remains unresolved and should not be presented as safe.
