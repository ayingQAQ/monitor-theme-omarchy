# Monitor Omarchy

Omarchy terminal-style public theme for Monitor. Faithful port of [with5/komari-theme-omarchy](https://github.com/with5/komari-theme-omarchy), preserving ASCII banners, character cards, btop meters, 23 palettes, English/Chinese, Vim navigation and the idle screensaver.

Independent project; not affiliated with or endorsed by Omarchy or its authors.

![Demo screenshot](preview.png)

## Develop

Node.js 22.12+ or 24 LTS, npm. On Windows PowerShell:

```powershell
npm ci
npm run dev:demo
# Explicit generated demo data. No real servers or credentials.

$env:MONITOR_HUB = 'https://your-test-hub.example'
npm run dev
```

Normal development proxies same-origin `/api` and WebSocket to `MONITOR_HUB` (default `http://127.0.0.1:9911`). The Hub must have its public page enabled. Production never imports the demo middleware or falls back to fake nodes.

## Build and install

```powershell
npm test
npm run test:e2e
npm run package
npm run check:package
```

Install `theme.tar.gz` via the Monitor admin theme upload, then select **Omarchy · Monitor**. Do not upload source ZIP files. The archive includes a root `theme.json`, licenses, preview and `dist/`, with a SHA-256 sidecar. All application routes use `/` with `#/node/<id>` for node details; `/admin` is owned by Hub.

Local `theme.json` author and URL are intentionally blank while publication identity is undecided. GitHub installation, automatic updates and theme-list submission require a real public repository, an official Release with a fixed `theme.tar.gz` asset, matching version/tag and a unique short name. No release has been published by this development task.

## Controls

- Click a node or press Enter to enter details; u/Esc returns.
- h/j/k/l or arrows move between nodes; gg/G, 0/$ and number prefixes are supported.
- `/` or the visible search button searches; H/L changes groups.
- t/T changes palettes; i changes language; ? opens help; a opens `/admin`.
- r replays the banner; s starts the screensaver. Automatic saver starts after 90s idle. Reduced motion disables animation and saver.
- Details: o/p selects overview/ping; [/] changes time window; j/k selects tasks; Enter zooms a task; R refreshes. Tab remains normal focus navigation.

Theme settings are declared in `theme.json` and stored by Hub: default language, dark/light palette, visitor palette switching, group filter, banner, intro and saver. Visitor language/palette preferences remain in their own browser, with in-memory fallback if storage is unavailable.

## Data semantics and differences from Komari

- Uses Monitor's `/api/me`, `/api/nodes`, node metrics, `/api/ws?gzip`, and theme config. REST polling covers unavailable WebSocket; ordered frame processing and stale-result protection preserve current data.
- Offline, waiting for first report, invalid metrics and failed requests remain distinct. Missing measurements display a dash.
- Totals and current-cycle traffic use Hub results. Dates prefer `expires_in` and `last_seen_ago`. No agent counters are accumulated in the browser.
- Ping history is aggregate bucket data: the graph shows bucket medians, loss is supplied by Hub, min/max require complete valid bands. Raw-sample percentiles, jitter, standard deviation and sample count are intentionally omitted.
- Historical memory is bytes, since Monitor does not provide capacity for every historical sample.
- Komari unlock-test integration is omitted because Monitor's standard public API does not supply that data.
- Private addresses and private remarks remain excluded even when the browser has an admin session.

The implementation targets the 1.4.1-era Monitor interface with feature checks for older optional fields. Tested browser and Hub versions, commands and remaining validation are recorded in `docs/verification.md`; this is not a claim of compatibility with every old Hub.

## License

MIT. Original Copyright (c) 2026 with5 preserved in LICENSE. See THIRD_PARTY.md and THIRD_PARTY_NOTICES.txt for source baseline and changes.
