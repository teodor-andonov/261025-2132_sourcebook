# 2026-10-27 — Saved Views development cycle

Delivered a coherent first saved Views slice: validated portable `views.json` schema; stable-ID nested tag filters; catalog-wide or recursive registered-root folder scopes; text/hashtag search; name/type sorting; gallery/list and density persistence. A compact Views sidebar offers open, Save, Update, Rename and Delete. Result cards use existing permission-aware preview/reveal; original source files remain untouched.

Safety: opening Views is read-only; writes explicitly request catalog permission, verify identity, compare the loaded snapshot to disk and verify the written JSON. Missing source/tag filters fail closed rather than widening a saved View. There is no new Collections or Smart Folder system.

Verification: pure query/model tests and mocked UI-controller integration tests. Prior query/model CI: run 40522343661 (passed); prior UI wiring CI: run 40522660001 (passed). Controller integration tests passed CI run 40522825674. A later folder-sort test initially failed due to incorrect expected extension order (run 40522929233); corrected test passed CI run 40522990565 with 82 tests and JavaScript syntax checks. No screenshots, visual fixtures, Pages deployment or physical device testing performed.

Known gaps: View results index only objectified catalog metadata, not every file in registered roots; no durable search index; write checks are optimistic rather than crash-atomic and multi-writer safe. Browser/manual UX testing and Windows/Android acceptance remain outstanding.
