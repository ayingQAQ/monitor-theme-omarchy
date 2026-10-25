# Third-party sources

- Visual rendering, ASCII effects, palettes, text utilities, language dictionary and keyboard interactions adapted from [with5/komari-theme-omarchy](https://github.com/with5/komari-theme-omarchy), commit `e7f51d6429ab236784445a4f06e0d5c285734b7a` (manifest 1.0.4), MIT, Copyright (c) 2026 with5. Full license preserved in LICENSE.
- The upstream palette collection is generated from Omarchy colors.toml files. This port preserves the upstream generated collection, attribution and unofficial status; it does not require a local Omarchy installation. No Omarchy logo or bundled third-party font is distributed.
- Monitor protocol behavior was consulted in the official documentation and monitor-theme-default. HTTP and stream coordination are new plain-JavaScript implementations; the local monitor-guangao code was inspected as a behavior reference, not copied as a React component.
- The terminal favicon and its raster Apple touch icon are newly drawn for this port. Fonts are local system fallbacks, not bundled files or external requests.

Changes from upstream include Monitor-native fields and history, ordered gzip decoding, REST fallback, cancellation, safe text rendering, missing-data states, fixed glyph cells, configuration validation and accessibility. The Komari RPC and unlock plugin integration are removed.

Independent port. Not affiliated with or endorsed by Omarchy or its authors, Komari, or Monitor.
