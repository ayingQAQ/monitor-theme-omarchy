# Monitor Omarchy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Ship a faithful Omarchy port consuming Monitor's public protocol.

**Architecture:** Preserve upstream ES modules, palettes and ASCII renderer. Separate HTTP, snapshot coordination and history models from views. Vite builds static assets; Node tests and Playwright verify behavior.

**Tech Stack:** JavaScript ES Modules, Vite, Node test runner, Playwright.

**Spec:** `../specs/2026-10-26-monitor-omarchy-design.md`

## Global Constraints
- Fixed upstream e7f51d6429ab236784445a4f06e0d5c285734b7a, MIT notices preserved.
- Independent project in the user-specified directory; native execution authorized by user.
- No Komari endpoints or unlock plugin; no fabricated raw ping statistics.
- Runtime fixtures excluded from production. Fixed icons; gzip archive root has theme.json and dist/index.html.
- Node identifiers are Monitor IDs; missing values are not zero.

## Review Focus
- Numeric IDs, hostile strings, null and missing fields: validated without crashing other nodes.
- Old REST and decoded frames after reconnect: cannot replace current snapshots.
- Auth loss: remove sensitive stale display and cache.
- No storage / reduced motion / IME: interface remains operable.
- Narrow CJK layouts and partial histories: no overflow, no invented measurements.

### Task 1: Data contracts and configuration
Files: `src/data/model.js`, `src/config/settings.js`, `theme.json`, `tests/model.test.js`.
Interfaces: `normalizeNodes(unknown) -> Node[]`, `ranges(days) -> number[]`, `pingModel(response) -> task[]`, `resolveConfig(fields,saved) -> object`.
- [x] Write assertions for waiting/offline/invalid nodes, private-field exclusion, ranges, ping bucket semantics, config fallback and special groups.
- [x] Run Node tests to observe missing contract failure, implement, rerun.

### Task 2: HTTP and live coordination
Files: `src/data/http.js`, `src/data/live.js`, `tests/live.test.js`.
Interfaces: `api(path,{signal})`, `createLive({receive,error,fetchNodes,Socket,timers}) -> {resume,pause,stop}`.
- [x] Write failing tests for mixed frames, stale REST, reconnect, bad-frame timeout and 401.
- [x] Implement serial frame decode, generations, fallback poll, bounded requests and safe errors; run full Node suite.

### Task 3: Faithful application and fixtures
Files: upstream `src/visual/*`, `src/render/util.js`, `src/i18n/index.js`; new `src/app.js`, `src/views/detail.js`, `index.html`, `dev/hub.js`, `vite.config.js`.
- [x] Write browser acceptance cases for list/details, routes, group summary, input safety, storage and mobile width.
- [x] Run to see app missing, then preserve upstream rendering and wire Monitor-native models.
- [x] Verify languages, palettes, keyboard navigation, 90s saver and dynamic reduced motion.

### Task 4: Packaging and delivery
Files: `scripts/package.mjs`, `scripts/check-package.mjs`, `README.md`, licenses and icons.
- [x] Verify production has no demo data, no Komari requests, and has correct manifest/icon paths.
- [x] Build, run Node and Playwright suites, inspect desktop/mobile screenshots; fix evidenced regressions.
- [x] Generate theme.tar.gz + SHA256, inspect archive root/limits and save preview.
- [x] Independent final code review; report actual verification and unperformed live Hub/release checks.

## Execution ledger

2026-10-26: Plan recorded. Ruling: use new independent repository in requested folder, not a linked worktree of unrelated neighboring projects. Initial metadata URL/author stay empty until the user supplies a publication identity. Do not publish.

2026-10-26: Tasks 1–4 implemented. Node suite: 14 passing. Independent code review completed; keyboard/focus, transport status, BFCache and partial-metric findings reproduced and fixed. Archive build/check passes. Screenshots inspected; Windows glyph ink and canvas-vs-CSS cell differences corrected with DOM geometry and meter rectangles.

Ruling: preserve normal Tab focus navigation instead of intercepting Tab to switch detail pages; o/p and visible native buttons provide tab switching — keeps the spec accessibility guarantee. Real Hub installation and Release checks remain explicitly unperformed in docs/verification.md, because no Hub was supplied and Docker daemon is unavailable.

2026-10-26 final verification: 14 Node tests passed; 51 browser cases passed across Chromium, Firefox and WebKit. Production build and compiled-page smoke passed; archive checked at 83,336 bytes / 12 entries. Latest user feedback about unequal solid/dotted meter geometry fixed with 12px CSS cells and a regression test. Screenshots regenerated after the fix.
