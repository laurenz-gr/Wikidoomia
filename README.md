# WikiFeed

Ein endloser, lernender Wikipedia-Feed — erst der Abstract, beim Antippen der ganze Artikel. Der Feed passt sich an dein Verhalten an (lokal, ohne Server), mit Suche, Sammlungen, A/B/C/D-Quiz, Lese-Rückblick und einer „genug gelernt?"-Pause.

Alles läuft in einer einzigen `index.html` — kein Build, kein Backend. Personalisierung, Sterne, Sammlungen und Statistiken liegen ausschließlich im `localStorage` deines Browsers.

## Funktionen

- **Endlos-Feed** aus Wikipedia mit drei Kartenvarianten (Standard, kompakt, Feature)
- **Personalisierung** über Verhalten: Stern (stärkstes Signal) > Artikel öffnen > Verweildauer, plus „Weniger davon"-Negativsignal und adaptive Explore/Exploit-Rate
- **Serendipität**: in unregelmäßigen Abständen ein „Zufallsfund"
- **Suche** mit Live-Vorschlägen und „Zuletzt gesucht"
- **Sammlungen** und **Teilen** (Web Share API)
- **Quiz** nach ~10 gelesenen Artikeln
- **Lese-Rückblick** (Scrollytelling aus deinen eigenen Daten)
- **DE / EN / FR** — Oberflächensprache und Artikelsprache getrennt einstellbar
- **Hell/Dunkel**, barrierearm (Fokusführung, WCAG-AA-Kontraste), `prefers-reduced-motion`
- **PWA**: installierbar, App-Shell offline nutzbar

## Lokal starten

Einfach `index.html` im Browser öffnen — funktioniert direkt vom Dateisystem (Daten werden per JSONP geladen, daher kein CORS-Problem).

Für PWA/Service-Worker einen lokalen Server nutzen:

```bash
python3 -m http.server 8000
# dann http://localhost:8000 öffnen
```

## Auf GitHub Pages veröffentlichen

1. Repo-Inhalt pushen (siehe unten).
2. In den Repo-Einstellungen unter **Pages** als Quelle den `main`-Branch / Root wählen.
3. Die App ist dann unter `https://<user>.github.io/<repo>/` erreichbar — inkl. Installierbarkeit.

## Datenschutz

Es werden keine personenbezogenen Daten an einen Server gesendet. Alle Präferenzen bleiben lokal im Browser. Inhalte stammen direkt von der Wikipedia-API.

## Lizenz & Inhalte

- Code: MIT (siehe `LICENSE`).
- Artikelinhalte stammen von Wikipedia und stehen unter [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). WikiFeed zeigt sie an und verlinkt auf den Originalartikel.
