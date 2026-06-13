# Wikidoomia

An endless, learning Wikipedia feed — abstracts first, the full article on tap. The feed adapts to your behaviour entirely on-device by default (no accounts required), with optional encrypted device sync, search, collections, an A/B/C/D quiz, a reading recap, and a gentle "had enough for today?" nudge.

The whole app is a single `index.html` — no build step. Personalization, stars, collections, and stats live in your browser's `localStorage`. **Optional device sync** stores an E2E-encrypted copy on a tiny Cloudflare Worker (see [`worker/README.md`](worker/README.md)); the sync code is your only key.

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

The feed mixes related content (exploit) with random discovery (explore); the balance shifts toward exploration after misses and toward your interests after hits. A few refinements keep it honest over time:

- **Time decay** — all profile scores fade a little every day, so last month's binge no longer dominates today's feed.
- **Damped picking** — recommendation seeds are weighted by the square root of their score, so one starred article can't monopolise the feed.
- **Topic-profile searches** — the learned category profile occasionally drives a search of its own, not just article-to-article similarity.
- **Language-scoped seeds** — seeds are tied to the article language, so switching DE/EN/FR never sends mismatched queries.

None of this leaves the browser during normal use — open the dev console and type `state.profile` to inspect it.

## Device sync (optional)

You can optionally sync your profile across devices with an **accountless sync code**:

1. Open **Sammlungen & Profil** → **Geräte-Sync** → **Sync einrichten**.
2. Save the `WD-…` code somewhere safe (password manager, export file).
3. On another device: enter the same code under **Mit Code verbinden**.

The sync code derives both the storage address (SHA-256) and the AES-GCM encryption key (HKDF). The server stores ciphertext only — it cannot read your profile. Sync is opt-in and can be disconnected anytime. Without the code, cloud data is unrecoverable.

Deploy the sync worker once (free on Cloudflare) — see [`worker/README.md`](worker/README.md). Until `SYNC_ENDPOINT` is set in `index.html`, the sync UI stays hidden and the app works fully offline/on-device.

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

## Accessibility

- Keyboard focus is trapped inside open overlays and restored on close; all controls are reachable and labelled.
- Colour contrast meets WCAG 2.1 AA for text in both themes.
- Motion (confetti, count-ups, transitions) is disabled under `prefers-reduced-motion`.

## Project structure

```
.
├── index.html      # the entire app
├── manifest.json   # PWA manifest
├── sw.js           # service worker (offline app shell)
├── worker/         # optional E2E sync backend (Cloudflare Worker + KV)
├── icons/          # app icons (192, 512, maskable, apple-touch)
├── README.md
└── LICENSE
```

## Privacy

By default, no personal data is sent to any server. All preferences live in your browser. Article content is fetched directly from Wikipedia.

If you **opt in** to device sync, an E2E-encrypted blob (your `localStorage` profile) is stored on the sync worker. The server cannot decrypt it; only someone with your sync code can. You can disconnect sync or use export/import instead at any time.

## License & content

- Code is released under the [MIT License](LICENSE).
- Article content comes from Wikipedia and is licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Wikidoomia displays it and links back to the original article.
