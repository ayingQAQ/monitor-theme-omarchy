# Verification record

Date: 2026-10-26. Independent project on `feat/monitor-port`; no remote repository or Release created.

Final results: 14/14 Node tests and 51/51 browser cases passed (17 each in Chromium, Firefox and WebKit). Production build, compiled-page smoke check, screenshot width assertions, archive validation and staged whitespace check passed. Final local archive is 83,336 bytes with 12 entries; its current SHA-256 is stored in `theme.tar.gz.sha256`.

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

- Real Monitor Hub upload, theme activation, custom site icon override, configuration persistence through reinstall, and actual Hub upgrade.
- GitHub installation and automatic update after a real public repository, author/URL and official Release exist.
- Physical phone and real Safari interaction.

No test Hub address or credentials were supplied. Docker is installed but its Linux daemon is not running, so this task did not install the theme into a real Hub or change a running site. Archive checks validate its structure, sizes, gzip completion and manifest; those checks do not replace a real Hub installation.

The author and URL fields intentionally remain blank until publication identity is supplied. All six required metadata fields are present. The archive and SHA-256 sidecar are local build artifacts.
