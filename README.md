# WikiFeed

An endless, learning Wikipedia feed — abstracts first, the full article on tap. The feed adapts to your behaviour entirely on-device (no server, no accounts), with search, collections, an A/B/C/D quiz, a reading recap, and a gentle "had enough for today?" nudge.

The whole app is a single `index.html` — no build step, no backend. Everything you do (personalization, stars, collections, stats) stays in your browser's `localStorage`.

## Features

- **Endless feed** of Wikipedia articles with three card rhythms (standard, compact, feature)
- **Behaviour-based personalization** — star (strongest signal) > opening an article > dwell time, plus a "less like this" negative signal and an adaptive explore/exploit rate
- **Serendipity** — an occasional "random find" mixed in at irregular intervals
- **Search** with live suggestions and recent searches
- **Collections** and **sharing** (Web Share API, clipboard fallback)
- **Quiz** that appears after ~10 articles read, generated from what you've actually read
- **Reading recap** — a short scrollytelling story built from your own stats
- **Three languages (DE / EN / FR)** with interface language and article language set independently
- **Light / dark theme**, accessible by design (focus management, WCAG-AA contrast, `prefers-reduced-motion`)
- **PWA** — installable, app shell works offline

## How personalization works

Every interaction feeds a small on-device profile:

| Signal | Weight | Effect |
| --- | --- | --- |
| Star / favourite | strongest | boosts the article's topics; used as a recommendation seed |
| Open full article | medium | seeds related content via the API's `morelike` |
| Dwell time | weakest (capped) | a light nudge, so a long article can't dominate the profile |
| "Less like this" | negative | hides the article, dampens its topics, weakens that recommendation source |

The feed mixes related content (exploit) with random discovery (explore); the balance shifts toward exploration after misses and toward your interests after hits. None of this leaves the browser — open the dev console and type `state.profile` to inspect it.

## Tech

- Single self-contained `index.html`: vanilla HTML/CSS/JS, no framework, no build.
- Content is loaded from the public Wikipedia Action API via **JSONP**, so the app works even when opened directly from the file system (no CORS setup needed).
- PWA layer: `manifest.json` + `sw.js` (app-shell precache, font caching). Wikipedia responses are intentionally not cached (JSONP callbacks are unique per request), so offline shows the in-app retry state rather than stale content.

## Run locally

Just open `index.html` in a browser — it works straight from disk.

To exercise the PWA / service worker, serve it over HTTP:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Being a static site, it can be hosted on any static host (e.g. GitHub Pages); the PWA/install support requires serving it over HTTPS.

## Privacy

No personal data is sent to any server. All preferences live in your browser. Article content is fetched directly from Wikipedia.

## License & content

- Code is released under the [MIT License](LICENSE).
- Article content comes from Wikipedia and is licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). WikiFeed displays it and links back to the original article.
