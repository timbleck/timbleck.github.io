# Schnittplaner – Claude Context

## What this is

A browser-based 2D wood cutting optimizer (Zuschnittplaner). The user enters stock panels and required cut pieces; the app finds a near-optimal way to arrange the pieces on as few panels as possible and renders an interactive cut plan.

**Stack:** Vanilla HTML/CSS/JS – no framework, no build step. Open `index.html` directly in the browser.
**No JS runtime available** (no Node, Bun, Deno) – cannot run CLI tests.

---

## File layout

| File | Purpose |
|---|---|
| `index.html` | Structure: sidebar (inputs) + results area |
| `style.css` | CSS variables, flexbox layout, responsive, canvas card styles |
| `app.js` | All logic: state, algorithm, canvas rendering, LocalStorage |

---

## UI layout

```
[Header: 🪵 Schnittplaner]
┌──────────────────────┬──────────────────────────────────┐
│ Sidebar (380px)      │ Results (flex: 1, scrollable)    │
│  • Ausgangsplatten   │  • Summary bar (stats)           │
│  • Zuschnitte        │  • Per-board canvas cards        │
│  • Einstellungen     │    – Canvas with pieces + cuts   │
│  • [⚡ Optimieren]   │    – Legend + cut sequence table │
└──────────────────────┴──────────────────────────────────┘
```

**State fields:** `sheets[]`, `pieces[]`, `kerf` (mm), `allowRotation` (bool).
**LocalStorage key:** `schnittplaner` – saved on every input change.
**Default data** (first load): OSB 2440×1220 ×2, three example cut pieces.

---

## Algorithm: Guillotine + BAF + one-step lookahead

Implemented in `guillotine(rects, binW, binH, kerf, allowRot)` in `app.js`.

### Core loop

```
remaining = copy of all pieces
while remaining not empty:
  for every (piece × free-rect × orientation) triple:
    simulate this placement → get resulting free-rect list
    score = piece.area + Σ area(other pieces that still fit somewhere)
  commit the triple with the highest score
  tie-break 1: BAF – smallest (fr.area – piece.area)
  tie-break 2: BSSF – smallest min(fr.w – pw, fr.h – ph) remainder
```

### Key design decisions

**Piece selection is global, not ordered.** At every step the algorithm considers *all* remaining pieces, not just the next in a sorted queue. This lets it choose a smaller piece now if that keeps more space available for subsequent pieces.

**Kerf is only consumed where a cut actually happens.**
```js
usedW = Math.min(pw + kerf, fr.w)   // no kerf if piece fills to sub-board edge
usedH = Math.min(ph + kerf, fr.h)
```
Fitting check is `pw <= fr.w && ph <= fr.h` (not `pw + kerf <= fr.w`).

**LAS split (Longer Axis Split):** after placing a piece, one guillotine cut divides the free rect into exactly two new free rects. The cut is made along the longer remaining axis so the larger strip is preserved as one rectangle.

```
rightW  = fr.w - usedW
bottomH = fr.h - usedH

if rightW >= bottomH:           // vertical primary cut
  right  = (fr.x+usedW, fr.y,      rightW,  fr.h   )
  bottom = (fr.x,        fr.y+usedH, usedW, bottomH )
else:                           // horizontal primary cut
  bottom = (fr.x,        fr.y+usedH, fr.w,  bottomH )
  right  = (fr.x+usedW, fr.y,        rightW, usedH  )
```

**Rotation:** both orientations (pw×ph and ph×pw) are evaluated for every free rect. BAF is rotation-invariant, so BSSF is the differentiator between the two orientations of the same piece in the same slot.

**No pre-sorting, no multi-ordering** – the lookahead makes upfront ordering unnecessary.

---

## Cut visualisation

`renderCanvas(bin, placed, cuts)` – draw order:
1. Wood background + grain lines
2. Piece fills (semi-transparent coloured rectangles)
3. Hatch over waste areas (evenodd clip)
4. Piece borders
5. Board border
6. Cut lines: white 3.5px solid outline + red `#c0392b` 1.8px dashed on top
7. Cut number badges (red circle, white number)
8. Piece labels + dimensions + rotation indicator ↻ (drawn last, always readable)

`cuts[]` is recorded live during `guillotine()`. Each placement produces up to 2 cut records (primary cut first, secondary cut second), in the physical saw order.

The cut sequence is also shown as a collapsible `<details>` table below each canvas (Schnittfolge), listing cut #, direction (↕/↔), position in mm, length in mm.

---

## Data flow

```
state  ──►  optimize()
              └─ guillotine(remaining, bin.w, bin.h, kerf, allowRot)
                   returns { placed[], cuts[] }
              └─ trackPlaced(remaining, placed)
                   maps placed piece IDs back to remaining[] indices
           ──►  renderResults()
                  └─ renderCanvas(bin, placed, cuts)
                  └─ cut sequence <details> table
```

`trackPlaced` uses piece-id counting (not index) so it is order-independent.

---

## Key constants / IDs

| Symbol | Value / ID | Notes |
|---|---|---|
| `COLORS` | 12-color palette | assigned by piece index mod 12 |
| `MAX_CANVAS_W` | 800 px | canvas scaled to fit, never upscaled |
| `BADGE_R` | 10 px | cut-number badge radius |
| `#sheets-body` | `<tbody>` | sheet rows rendered by `renderSheets()` |
| `#pieces-body` | `<tbody>` | piece rows rendered by `renderPieces()` |
| `#summary` | `<div>` | stats bar, toggled via `.hidden` |
| `#canvases` | `<div>` | canvas cards injected here |
| `#empty-state` | `<div>` | hidden once first result rendered |

---

## CSS variables (style.css)

```css
--bg, --surface, --surface-2   /* page / card / card-header backgrounds */
--border, --border-strong      /* dividers */
--text, --text-muted           /* typography */
--accent, --accent-hover, --accent-light   /* orange brand colour */
--header-bg, --header-text     /* dark wood header */
--radius: 8px
--sidebar-w: 380px
```

---

## Extending the app – pointers

- **New algorithm variant:** replace or wrap `guillotine()`. It must return `{ placed[], cuts[] }` where each cut is `{ x1, y1, x2, y2 }` in board-mm coordinates.
- **New input field:** add to the sidebar HTML, read in the settings `change` handler, persist in `state`, reset via `init()`.
- **New summary stat:** extend the `summaryEl.innerHTML` template in `renderResults()`.
- **Styling:** all colours and spacings are CSS variables – change them in `:root`.
- **Canvas appearance:** `renderCanvas()` is fully self-contained; adjust draw order or add new layers there.
