# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quiz App

Eine JavaScript-Anwendung für ein Quiz, das den Spieler durch Beantwortung von 5 Fragen durch einen Comic-Strip führt. Jede korrekte Antwort deckt das nächste Bildsegment auf; am Ende erscheint ein Final-Bild.

## Entwicklung

Die App besteht aus einer einzigen Datei (`index.html`) — kein Build-Tool, kein npm, keine externe Abhängigkeit. Zum Entwickeln reicht ein lokaler HTTP-Server:

```bash
python3 -m http.server 8080
# oder
npx serve .
```

Ohne HTTP-Server (direktes Öffnen als `file://`) funktioniert die App ebenfalls — sie fällt dann automatisch auf die eingebetteten Fragen zurück (`EMBEDDED_CSV`).

## Architektur

Alles befindet sich in `index.html`: CSS im `<head>`, JavaScript am Ende des `<body>`. Es gibt keine externen Skripte oder Stylesheets.

**Drei Screens** (per CSS opacity + `pointer-events` umgeschaltet):
- `#start-screen` — zeigt `images/bild1.jpg`
- `#quiz-screen` — Bildraster + Fragebereich
- `#end-screen` — zeigt `images/bild3.jpg`

**Bildraster** (`#image-area`): Flexbox-Spalte mit 3 `.comic-row`-Zeilen, je als Flexbox-Zeile:
- Zeile 1 (`.comic-row`): szene1.jpg + szene2.jpg — `height: 100%; width: auto`, Breite ergibt sich aus natürlichem Seitenverhältnis
- Zeile 2 (`.comic-row`): szene3.jpg + szene4.jpg + szene5.jpg — gleich
- Zeile 3 (`.comic-row--banner`): szene6.jpg — `flex: 1` + `object-fit: cover`, füllt volle Breite

Panels liegen direkt aneinander (kein Leerraum zwischen ihnen); überschüssiger Platz erscheint als dunkler Rand an den Viewport-Außenkanten.

Jede Zelle hat ein darüber liegendes `.scene-cover`-Div (dunkle Abdeckung). Korrekte Antworten rufen `revealNext()` auf, das der Cover-Klasse `revealed` hinzufügt → CSS-Übergang auf `opacity: 0`.

**Fragerunde**: `NUM_QUESTIONS = 5` (= `NUM_SCENES - 1`). `cover-0` ist beim Start bereits aufgedeckt (erste Szene immer sichtbar). `revealedIdx` zählt mit, welches Cover als nächstes aufzudecken ist.

**Fragendaten**: CSV-Format mit Semikolon als Trennzeichen:
```
Frage;Richtige Antwort;Falsche Antwort 1, Falsche Antwort 2
```
- `questions.csv` wird via `fetch()` geladen, wenn die Seite über HTTP läuft.
- `EMBEDDED_CSV` (hardcodiert im Skript) dient als Fallback.
- Aus dem Pool werden zufällig 5 Fragen ausgewählt; Antwortreihenfolge wird ebenfalls zufällig gemischt.

**Falsche Antworten** pro Frage: mindestens 2, kommagetrennt im dritten CSV-Feld. Die Antwortbuttons (`#answers`) werden bei jeder Frage neu gerendert.

## Bilder

| Datei | Verwendung |
|---|---|
| `images/bild1.jpg` | Start-Screen Vorschaubild |
| `images/bild3.jpg` | End-Screen Final-Bild |
| `images/szene1–6.jpg` | Comicstrip-Raster im Quiz (6 Segmente) |

Fehlende Bilder zeigen einen Platzhalter (`img-placeholder`) — kein JS-Fehler.
