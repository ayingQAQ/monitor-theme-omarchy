# Verification record

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
