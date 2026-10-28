# 2026-10-28 10:25 Europe/Madrid — Legacy URL file migration (V0.0.41 candidate)

## Scope
Implement the superseding real-file Resource decision without silently converting V0.0.35–0.0.38 fileless URL records. No further Catalog-only URL creation.

## Development
- Added stable-ID .url migration planner, real file write/readback and in-place journaled metadata rebinding.
- Added explicit per-link UI confirmation and registered Folder choice; both Catalog and Folder must be writable.
- Refuse stale metadata, pending journals, recognized Syncthing conflict copies, case-insensitive collisions and duplicate Catalog paths.
- Preserve ID, Tags, Notes and title; retain the old URL/title as historical audit metadata, not live content.
- Added synthetic provider tests for success, permission denial, collisions, stale metadata, partial writes and interrupted journal recovery. Bumped Sourcebook-only service worker precache.

## Limits
File creation and metadata journal are not one atomic transaction; a failed write can leave an orphan or partial .url. Never auto-delete it. File System Access cannot guarantee atomic exclusive creation or cross-device locking. Real Windows Chrome/Pixel 8, offline and Syncthing roundtrip tests remain open. No screenshots or Mindmap changes.

## Release verification
PR CI, squash merge, main CI, Pages deployment and merged-branch cleanup must be verified independently after opening the PR.
