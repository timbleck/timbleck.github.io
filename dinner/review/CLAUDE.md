# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Berlin Dinner Challenge — Rückblick

Mobiler, deutschsprachiger Rückblick auf die Berlin Dinner Challenge von **Tim & Steve**: Über ~3 Jahre (20.04.2023 – 04.06.2026) wurde jede Woche per Zufall ein Berliner Ortsteil gezogen und dort essen gegangen. Ziel: einmal komplett durch alle Ortsteile Berlins. Diese Seite ist die abschließende Retrospektive.

Liegt unter `dinner/review/` und ergänzt die bestehende Live-Karte in `dinner/` (gleiches Leaflet, gleiche GeoJSON).

## Entwicklung

Statische Seite, kein Build-Tool, kein npm. Wegen `fetch()` von `data.json` und der GeoJSON **muss** sie über einen HTTP-Server laufen (nicht `file://`):

```bash
# aus dem Repo-Root
python3 -m http.server 8765
# -> http://localhost:8765/dinner/review/
```

## Dateien

| Datei | Zweck |
|---|---|
| `index.html` | Seitengerüst: Nav, Hero, Karte, Timeline, Zahlen, Lightbox-Markup |
| `review.css` | Mobile-first Styles (ein Spalten-Layout, Cards, Bars, Lightbox) |
| `review.js` | Lädt Daten + GeoJSON, baut Karte/Timeline/Statistiken, Lightbox |
| `data.json` | **Eingefrorener, handkorrigierter Snapshot** aller 97 Einträge (s. u.) |
| `photos/` | ~148 Original-Kamerafotos `IMG_xxxx.jpeg`, **nicht** nach Nummer benannt |

Wiederverwendete Assets aus dem Nachbarordner: `../assets/leaflet/*` und `../assets/lor_ortsteile.geojson`.

## Datenquelle & der eingefrorene Snapshot

Die Live-Karte (`dinner/`) zieht ihre Daten direkt aus einem **Google Sheet** (CSV-Export). Für den Rückblick wurden diese Daten **einmalig in `data.json` eingefroren** — bewusst statisch, damit die Retrospektive permanent, schnell und unabhängig vom Sheet bleibt.

⚠️ **`data.json` NICHT einfach neu aus dem Sheet ziehen.** Der Snapshot enthält manuelle Korrekturen und die Foto-Zuordnung, die beim Re-Fetch verloren gingen.

### Struktur `data.json`

Array aus 97 Objekten, sortiert nach `nr` (= chronologische Ziehungsreihenfolge):

```json
{
  "nr": 1,
  "ortsteil": "Friedrichshain",
  "bezirk": "Friedrichshain-Kreuzberg",
  "datum": "20.04.2023",        // dd.mm.yyyy; leer = Finale (noch offen)
  "wer": "Steve",                // wer gezogen hat: "Steve" | "Tim" | "Steve & Tim"
  "kueche": "Vietnamesisch",
  "beschreibung": "Glory Duck",  // Lokal/Beschreibung
  "fotos": ["IMG_4246.jpeg"]     // zugeordnete Dateinamen in photos/, chronologisch
}
```

### Manuelle Korrekturen ggü. dem Sheet (Tippfehler im Quell-Sheet!)

Diese drei Daten waren im Google Sheet falsch und sind in `data.json` korrigiert. **Im Sheet sind sie ggf. noch falsch** — bei Bedarf dort nachziehen:

| nr | Ortsteil | Sheet (falsch) | korrigiert | Begründung |
|---|---|---|---|---|
| 39 | Rummelsburg | `11.04.2024` | `11.07.2024` | lag im April zwischen zwei Juli-Terminen; Foto vom 11.07. passt |
| 51 | Westend | `13.11.2014` | `13.11.2024` | Jahres-Tippfehler; Foto vom 13.11.2024 passt |
| 48 | Hansaviertel | `04.07.2024` | `17.10.2024` | war Dublette zu #38, außer Reihe; Datum **aus Fotodatum erschlossen** — bei Tim verifizieren |

## Der 97. Ortsteil: Schlachtensee (Finale)

Die GeoJSON enthält genau **96 offizielle Ortsteile** — alle 96 entsprechen den 96 datierten Dinnern (kompletter Sweep). **Schlachtensee ist kein offizieller LOR-Ortsteil** (nur eine Lage in Steglitz-Zehlendorf) und fehlt daher in der GeoJSON. Er ist der gemeinsam gezogene 97. Eintrag (`datum` leer) = das große Finale.

In `review.js` als Sonderfall behandelt: fester Marker an `SCHLACHTENSEE = [52.4399, 13.2156]`, eigene `finaleCard()`, und Endpunkt der animierten Tour.

## Fotos: Zuordnung per EXIF-Datum

Die Fotos in `photos/` heißen nach Kamerasequenz (`IMG_xxxx.jpeg`), **nicht** nach Ortsteil/Nummer. Die Zuordnung zu Dinnern erfolgte **über das EXIF-Aufnahmedatum** (`sips -g creation`), gematcht auf das jeweilige `datum` (±1 Tag Toleranz für Nacht-/Tag-danach-Aufnahmen). Ergebnis: **alle 148 Fotos zugeordnet, 95 von 96 Dinnern haben Fotos.** Nur 1 Dinner hat kein Foto im Ordner.

**Neue Fotos hinzufügen:** Datei mit korrektem Aufnahmedatum in `photos/` legen, dann das Matching-Skript erneut laufen lassen, das `fotos`-Felder in `data.json` befüllt (EXIF-Datum → passendes `datum`). Cards ohne Foto fallen sauber auf eine 🍽️-Kachel zurück (`.card-photo.no-photo`).

## Architektur `review.js`

`init()` lädt `data.json` + GeoJSON parallel, dann:

- **`buildHero`** — Kennzahlen (Ortsteile, Wochen, Jahre, Anzahl Küchen) aus den Daten berechnet.
- **`buildMap`** — Leaflet-Karte; jedes GeoJSON-Polygon wird per `OTEIL` zugeordnet, in `layersByName`/`centroidByName` referenziert, Popup mit Lokal + Foto. `centroid()` mittelt grob über die äußeren Ring-Punkte (für Pfad-Animation). `playTour()` zeigt per `setInterval` (180 ms) die Ziehungsreihenfolge: Felder leuchten nacheinander grün auf, eine `L.polyline` zeichnet den Weg, Caption zeigt das aktuelle Dinner, endet am Schlachtensee-Marker.
- **`buildTimeline`** — chronologische Cards mit Jahres-Trennern; `photoCell()` rendert erstes Foto + „+N"-Badge bei mehreren; Sonderfall `finaleCard()`.
- **`buildStats`** — Distanz (Haversine entlang der Reihenfolge), längste Pause, Küchen-Ranking, Steve-vs-Tim-Duell, Abende pro Bezirk.
- **`setupLightbox`** — Klick auf eine Card-Foto-Kachel öffnet Vollbild-Lightbox mit Vor/Zurück durch alle Fotos des Dinners (`data-fotos`-Attribut).

## Eckdaten (Stand Snapshot)

- Zeitraum 20.04.2023 – 04.06.2026, **163 Wochen / 3,1 Jahre**, 96 datierte Dinner + Finale.
- **Duell perfekt unentschieden: Steve 48 : 48 Tim.**
- 43 verschiedene Küchen; **Deutsch dominiert mit 33×**; 32 Küchen nur einmal.
- Alle 12 Bezirke komplett. Längste Pause 70 Tage (Friedenau → Gatow).
