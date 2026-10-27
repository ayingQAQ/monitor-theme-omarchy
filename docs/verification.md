# Verification record

## v1.0.1 preparation — 2026-10-27

- Reproduced all three review findings before fixing them: late site metadata overwriting the node banner, hidden ping refresh failures, and redundant ping model/SVG rebuilding on live node updates.
- 22 Node tests, production build/runtime smoke, tag/version validation, archive validation and whitespace checks passed locally.
- The local full browser run passed all 87 existing cases. Four of the nine new cases failed because the new test used an exact Chinese accessible name despite character spans, or read layout before WebKit completed a resize. After correcting the locator and waiting for layout, the complete nine-case regression file passed in Chromium, Firefox and WebKit. The release workflow runs all 96 cases together before publishing.
- With 24 probes and 3,840 points, a CPU-only snapshot preserves every existing SVG and performs zero ping sorts (previously 624). History replacement, viewport changes, language switching, zoom and time-range navigation are covered by browser checks.
- A Chromium check entered and left detail 20 times. After forced garbage collection at visits 5/10/15/20, DOM counters remained at one document, 3,156 nodes and 56 listeners. JavaScript used heap was approximately 3.4/3.7/3.7/3.7 MB. This is a bounded repeat-navigation check, not a long-duration or total-process-memory guarantee.
- Current detail models are cleared on exit/range/node changes. DOM templates and chart render state use weak keys; templates are detached clones in the main document so they do not retain an entire temporary parsing document. Pixel meters and their rendering code are unchanged; the only visual CSS addition wraps error messages on narrow screens.

## v1.0.0 preparation — 2026-10-26

- 22 Node tests passed, including history TTL/LRU, entry/point/estimated-size budgets, clear/retain races, binary WebSocket ordering, unread stale-frame cleanup, and 120-sample limits.
- The final local Windows three-engine run had 86/87 passing cases. WebKit's existing `loaded fonts and viewport resizing keep character geometry aligned` case timed out waiting for `.blk` under the default five-second assertion; its two immediate isolated runs both passed. This full run is not recorded as 87/87. All new node-removal, detail cleanup, route, and cache regressions passed across the three engines.
- An earlier repeatable WebKit Blob-stream access-control error was traced to `src/data/live.js` during reload. ArrayBuffer transport and pre-decode generation guards fixed it; the original routing/language/palette case then passed both in isolation and in the full run.
- Production build, production runtime smoke, package validation, release tag/version validation, whitespace check, and actionlint passed. GitHub Actions performs the full release-gating Linux run before publishing v1.0.0.
- Pixel meter rendering and visual CSS are unchanged. The history cache's approximate 4 MiB serialized-size budget is not a total JavaScript heap cap. Entries also have a 20,000-point combined budget and 25-second TTL; very large responses remain available for the active detail page but are not cached.
- v0.1.3's main check succeeded; its red tag check was cancelled during manual publication. v1.0.0 is published by an uninterrupted tag workflow. Reruns validate all existing public release assets without replacing them.

Date: 2026-10-26. Initial implementation verified locally; public release preparation targets `ayingQAQ/monitor-theme-omarchy`, tag `v0.1.0`.

Final results: 14/14 Node tests and 51/51 browser cases passed (17 each in Chromium, Firefox and WebKit). Production build, compiled-page smoke check, screenshot width assertions, archive validation and staged whitespace check passed. Archive size and digest change when release metadata is filled. The packaged manifest, archive root and limits are checked on each build; the current SHA-256 is stored in `theme.tar.gz.sha256`.

## Implementation

- Original Omarchy visuals, 23 palettes, ASCII effects, bilingual UI and Vim navigation retained.
- Monitor-native public models, historical queries, ordered gzip/text snapshots, REST polling, stale-result protection and visibility/BFCache recovery implemented.
- Invalid individual metrics retain other valid fields; private fields remain excluded.
- Fixed terminal glyph cells; filled and empty meter portions share a 12px rectangle and the same cell widths.
- Removed Komari-only endpoints, raw-sample ping statistics and unlock plugin integration.

## Verification commands

```text
npm test
npm run test:e2e
node scripts/capture.mjs
node scripts/smoke-production.mjs
npm run package
npm run check:package
git diff --check
```

Node tests cover normalization, partially invalid metrics, groups, retention, config validation, billing, expiry semantics, ping aggregation, short-term samples, HTTP failures, ordered gzip decoding, old REST suppression, interruption status and 401 cleanup.

Browser suite contains 17 cases per engine (Chromium, Firefox, WebKit): list/detail and hash routes, preferences, grouping and summary, storage getter/method denial, safe text, auth loss, empty data, keyboard activation/focus preservation, BFCache resume, idle saver and dynamic reduced motion, no decompressor, CJK details and 320/375/768/1200px layouts. Cases wait for historical charts before testing overflow. Font readiness and resizing are tested after full-page capture, which exposed a real font-metric mismatch.

Windows Node.js v24.11.1; Playwright 1.64.1. Installed browser engines: Chromium bundled by Playwright, Firefox 157.0 (build 1555), WebKit 27.2 (build 2370). WebKit on Windows is an engine check, not a claim of testing a physical iPhone or Safari installation.

## Visual evidence

`preview.png` and `docs/previews/` contain generated demo screenshots. `scripts/capture.mjs` prints viewport versus document width for detail views after resize; all measured widths must fit. No screenshot contains real server data.

## Review findings resolved

An independent reviewer identified native Enter interception, lost focus during updates, invisible WebSocket interruption, missing BFCache resume and overly broad invalid-metric rejection. Each was reproduced with a test and fixed. Development artifacts and demo middleware are excluded from the production bundle.

## Remaining integration checks

### v0.1.2 regression record

GitHub-hosted Linux run [40219236644](https://github.com/ayingQAQ/monitor-theme-omarchy/actions/runs/40219236644) passed the full suite: 16 Node tests and 66 Chromium/Firefox/WebKit cases, plus build, archive and production smoke checks.

The simultaneous local Windows full run reported 63 passing cases and 3 timeouts: Firefox `palette control fits its text and uses an underline instead of a focus box` timed out during browser-context teardown; WebKit `native buttons activate with Enter and retain focus across snapshots` timed out while waiting for a stable click target; WebKit `no horizontal overflow at 768px including detail` timed out waiting for the detail view. The isolated Firefox focus case also reproduced its teardown timeout. These are recorded rather than counted as local passes; all corresponding Linux engine cases passed. The local Chromium targeted cases and 320/375/768px screenshot-width checks passed. Physical Windows Firefox/WebKit interaction remains worth checking independently.

- Real Monitor Hub upload, theme activation, custom site icon override, configuration persistence through reinstall, and actual Hub upgrade.
- GitHub installation and automatic update after a real public repository, author/URL and official Release exist.
- Physical phone and real Safari interaction.

No test Hub address or credentials were supplied. Docker is installed but its Linux daemon is not running, so this task did not install the theme into a real Hub or change a running site. Archive checks validate its structure, sizes, gzip completion and manifest; those checks do not replace a real Hub installation.

Release metadata identifies `ayingQAQ` as the Monitor port maintainer and points to `https://github.com/ayingQAQ/monitor-theme-omarchy`. Original author attribution remains in LICENSE and THIRD_PARTY.md. All six required metadata fields are present. The archive and SHA-256 sidecar are published as Release assets.
