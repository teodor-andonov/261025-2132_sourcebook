# 261028-0724 — M0 portable Catalog and offline acceptance aids

**Version candidate:** V0.0.37 · **Branch:** dev/261028-0724-m0-portable-acceptance · **Device acceptance:** NOT TESTED.

## Why
The existing disposable file probe cannot establish that real Catalog JSON transactions, nested stable-ID Tags, URL records and saved Views survive a provider or Syncthing roundtrip. Cached PWA assets also need a diagnostic distinct from a genuine offline test.

## Coherent batch
- Add a **consent-gated disposable .sb fixture** creator inside Device checks. It refuses a nonempty parent, generates a UUID-named Catalog, writes only within the new Catalog, commits nested Tags, a portable URL, saved View and allocator update using the existing verified recovery journal, and verifies readback.
- Add a separate **read-only verifier** for that fixture. It checks Catalog identity, exact stable IDs, taxonomy, URL, View query result, clean journal and metadata coherence. Use it after restart or on a second device with a Syncthing-synced copy.
- Add a **non-network cache inspection** for this app's service-worker controller and cached shell/module. It never toggles offline or clears caches.
- Persist/export **sanitized diagnostic booleans and statuses**, never fixture names, paths or content. Keep M0-01…08 manual and unaccepted.
- Add simulated provider, interruption, tamper, cross-copy and cache tests. No screenshots or Mindmap changes.

## Safety and limitations
The creator must be invoked by the user, requests readwrite only for an empty throwaway parent, and **intentionally leaves the fixture** for portability testing. It never writes registered source files. Interrupted writes can leave a partial Catalog or pending journal; **do not automatically delete it**. A simulated copied fixture is not an actual Syncthing or Pixel 8 roundtrip. Cache presence is not offline success. Device permissions and cross-device concurrency remain unverified.

## Verification
At authoring: tests and source are prepared for PR CI. **Do not claim CI passed or Pages deployed until the actual workflow results are checked.** Physical Windows Chrome and Pixel 8 tests have not been run.
