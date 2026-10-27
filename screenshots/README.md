# Sourcebook UI snapshots

All screenshots use exactly **1440 × 900 CSS pixels**, **device pixel ratio 1**, **light theme**, desktop Chromium.

**Source of screenshots:** A browser runs the *real Sourcebook interface and workflows* with synthetic local folders/files injected through a test-only File System Access adapter. The file names and architectural SVG previews are fixtures, **not real user files**. Never describe these as a Windows or Pixel 8 hardware validation.

| Snapshot | Purpose |
| --- | --- |
| [desktop-launcher.png](desktop-launcher.png) | Real app startup / new catalog screen |
| [desktop-gallery.png](desktop-gallery.png) | Real browser gallery, inspector, file previews and saved tags/notes using fixture files |

To regenerate from the repository root:

~~~bash
npm install --no-save playwright@1.56.1
npx playwright install chromium
node scripts/capture-desktop.mjs
~~~

The **Sourcebook Desktop Screenshots** GitHub Actions workflow runs nightly at **02:41 UTC**, not on each code commit. It may also be run manually from the Actions tab after a meaningful visual change. The workflow uploads PNGs as an artifact and attempts to update the tracked screenshots. If the repository prevents automated commits, use the artifact and commit it explicitly.

**Review rules**
- Use this one desktop viewport only: 1440×900.
- Never generate a marketing mockup and label it as a UI screenshot.
- Keep image output deterministic: no timestamps, random data, or external image requests.
- Record material visual changes in the development log and compare with previous Git history.
- Snapshot failures should fail the screenshot workflow; do not silently substitute a blank page.
- Visual snapshots **supplement** device testing, not replace it.
