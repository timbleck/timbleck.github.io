'use strict';

// ── Constants ──────────────────────────────────────────────────────────────

const COLORS = [
  '#4e9af1', '#e8625a', '#5dbf7e', '#f0a432', '#9b72c8',
  '#3bbfbe', '#e9745d', '#a3c442', '#f06db5', '#6bbde0',
  '#e8a24a', '#7bc47e',
];

const DEFAULT_SHEETS = [
  { id: uid(), name: 'OSB', w: 2440, h: 1220, count: 2 },
];

const DEFAULT_PIECES = [
  { id: uid(), label: 'Regalseite', w: 800, h: 400, count: 4, color: COLORS[0] },
  { id: uid(), label: 'Regalboden', w: 580, h: 300, count: 6, color: COLORS[1] },
  { id: uid(), label: 'Rückwand',   w: 760, h: 350, count: 2, color: COLORS[2] },
];

// ── State ──────────────────────────────────────────────────────────────────

let state = {
  sheets: [],
  pieces: [],
  kerf: 3,
  allowRotation: true,
};

// ── Utility ────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

// ── LocalStorage ──────────────────────────────────────────────────────────

function saveState() {
  try {
    localStorage.setItem('schnittplaner', JSON.stringify(state));
  } catch (_) {}
}

function loadState() {
  try {
    const raw = localStorage.getItem('schnittplaner');
    if (raw) {
      const saved = JSON.parse(raw);
      state = { ...state, ...saved };
      return true;
    }
  } catch (_) {}
  return false;
}

// ── Guillotine + BAF Algorithm ─────────────────────────────────────────────

/**
 * Place a list of rectangles into a single bin using the Guillotine algorithm
 * with BAF (Best Area Fit) free-rect selection and LAS (Longer Axis Split).
 *
 * Each placement produces exactly two new free rectangles via one guillotine
 * cut – matching the way a real saw works (cuts go all the way through).
 *
 * @param {Array<{w,h,id,label,color}>} rects  – pieces to place (sorted externally)
 * @param {number} binW        – bin width  (mm)
 * @param {number} binH        – bin height (mm)
 * @param {number} kerf        – saw blade width added to consumed space
 * @param {boolean} allowRot   – allow 90° rotation
 * @returns {Array<{x,y,w,h,rotated,id,label,color}>}
 */
function guillotine(rects, binW, binH, kerf, allowRot) {
  let freeRects = [{ x: 0, y: 0, w: binW, h: binH }];
  const placed = [];
  const cuts = [];
  const remaining = [...rects]; // mutable – pieces removed as they are placed

  while (remaining.length > 0) {
    // One-step lookahead: evaluate every (piece × free-rect × orientation) triple.
    // Score = area placed now  +  area of remaining pieces that can still find a slot afterwards.
    // This lets the algorithm prefer placements that keep future pieces placeable,
    // even when that means choosing a smaller piece over a larger one right now.
    let bestScore   = -Infinity;
    let bestBaf     =  Infinity;
    let bestBssf    =  Infinity;
    let bestPi      = -1;
    let bestFi      = -1;
    let bestRotated = false;

    for (let pi = 0; pi < remaining.length; pi++) {
      const { w: rw, h: rh } = remaining[pi];

      const evalOrientation = (pw, ph, rotated) => {
        for (let fi = 0; fi < freeRects.length; fi++) {
          const fr = freeRects[fi];
          if (pw > fr.w || ph > fr.h) continue;

          const usedW   = Math.min(pw + kerf, fr.w);
          const usedH   = Math.min(ph + kerf, fr.h);
          const rightW  = fr.w - usedW;
          const bottomH = fr.h - usedH;

          // Build the free-rect list that would result from this placement
          const newFR = [];
          for (let k = 0; k < freeRects.length; k++) {
            if (k !== fi) newFR.push(freeRects[k]);
          }
          if (rightW >= bottomH) {
            if (rightW  > 0) newFR.push({ x: fr.x + usedW, y: fr.y,       w: rightW,  h: fr.h    });
            if (bottomH > 0) newFR.push({ x: fr.x,          y: fr.y + usedH, w: usedW, h: bottomH });
          } else {
            if (bottomH > 0) newFR.push({ x: fr.x,          y: fr.y + usedH, w: fr.w,   h: bottomH });
            if (rightW  > 0) newFR.push({ x: fr.x + usedW, y: fr.y,          w: rightW, h: usedH   });
          }

          // Lookahead: which of the other remaining pieces could still be placed?
          let score = pw * ph;
          for (let pi2 = 0; pi2 < remaining.length; pi2++) {
            if (pi2 === pi) continue;
            const r2 = remaining[pi2];
            if (newFR.some(f =>
              (r2.w <= f.w && r2.h <= f.h) ||
              (allowRot && r2.h <= f.w && r2.w <= f.h)
            )) {
              score += r2.w * r2.h;
            }
          }

          // Tie-break 1: BAF (tighter slot preferred); Tie-break 2: BSSF
          const baf  = fr.w * fr.h - pw * ph;
          const bssf = Math.min(Math.max(0, fr.w - pw - kerf), Math.max(0, fr.h - ph - kerf));

          if (score > bestScore ||
             (score === bestScore && baf < bestBaf) ||
             (score === bestScore && baf === bestBaf && bssf < bestBssf)) {
            bestScore = score; bestBaf = baf; bestBssf = bssf;
            bestPi = pi; bestFi = fi; bestRotated = rotated;
          }
        }
      };

      evalOrientation(rw, rh, false);
      if (allowRot && rh !== rw) evalOrientation(rh, rw, true);
    }

    if (bestPi === -1) break; // no piece fits anywhere

    // Commit the chosen placement
    const rect  = remaining.splice(bestPi, 1)[0];
    const fr    = freeRects[bestFi];
    const pw    = bestRotated ? rect.h : rect.w;
    const ph    = bestRotated ? rect.w : rect.h;
    const usedW = Math.min(pw + kerf, fr.w);
    const usedH = Math.min(ph + kerf, fr.h);

    placed.push({ x: fr.x, y: fr.y, w: pw, h: ph, rotated: bestRotated,
                  id: rect.id, label: rect.label, color: rect.color });

    freeRects.splice(bestFi, 1);

    const rightW  = fr.w - usedW;
    const bottomH = fr.h - usedH;

    if (rightW >= bottomH) {
      if (rightW > 0) {
        cuts.push({ x1: fr.x + usedW, y1: fr.y, x2: fr.x + usedW, y2: fr.y + fr.h });
        freeRects.push({ x: fr.x + usedW, y: fr.y, w: rightW, h: fr.h });
      }
      if (bottomH > 0) {
        cuts.push({ x1: fr.x, y1: fr.y + usedH, x2: fr.x + usedW, y2: fr.y + usedH });
        freeRects.push({ x: fr.x, y: fr.y + usedH, w: usedW, h: bottomH });
      }
    } else {
      if (bottomH > 0) {
        cuts.push({ x1: fr.x, y1: fr.y + usedH, x2: fr.x + fr.w, y2: fr.y + usedH });
        freeRects.push({ x: fr.x, y: fr.y + usedH, w: fr.w, h: bottomH });
      }
      if (rightW > 0) {
        cuts.push({ x1: fr.x + usedW, y1: fr.y, x2: fr.x + usedW, y2: fr.y + usedH });
        freeRects.push({ x: fr.x + usedW, y: fr.y, w: rightW, h: usedH });
      }
    }
  }

  return { placed, cuts };
}

// ── Optimization runner ────────────────────────────────────────────────────

function optimize() {
  const kerf = state.kerf;
  const allowRot = state.allowRotation;

  // Expand pieces by count into individual rects
  let allPieces = [];
  for (const p of state.pieces) {
    for (let i = 0; i < p.count; i++) {
      allPieces.push({ id: p.id, label: p.label, w: p.w, h: p.h, color: p.color });
    }
  }

  // Expand sheets by count
  const allBins = [];
  for (const s of state.sheets) {
    for (let i = 0; i < s.count; i++) {
      allBins.push({ sheetId: s.id, name: s.name, w: s.w, h: s.h, index: allBins.length });
    }
  }

  const results = []; // [{bin, placed, cuts}]
  let remaining = [...allPieces];

  for (const bin of allBins) {
    if (remaining.length === 0) break;
    // guillotine() now selects pieces globally via one-step lookahead,
    // so no pre-sorting or multi-ordering is needed.
    const { placed, cuts } = guillotine(remaining, bin.w, bin.h, kerf, allowRot);
    const placedSet = trackPlaced(remaining, placed);
    remaining = remaining.filter((_, idx) => !placedSet.has(idx));
    results.push({ bin, placed, cuts });
  }

  return { results, unplaced: remaining };
}

/**
 * Given remaining pieces and placed results from maxRects (which consumed some),
 * return a Set of indices into remaining[] that were placed.
 */
function trackPlaced(remaining, placed) {
  // MaxRects returns placed items but doesn't tell us which index.
  // We simulate the same greedy pass to know which got placed.
  // Simpler: count how many of each (id) were placed vs available.
  const countMap = {};
  for (const p of placed) {
    countMap[p.id] = (countMap[p.id] || 0) + 1;
  }
  const used = new Set();
  const seenCount = {};
  for (let i = 0; i < remaining.length; i++) {
    const p = remaining[i];
    const needed = countMap[p.id] || 0;
    const seen = seenCount[p.id] || 0;
    if (seen < needed) {
      used.add(i);
      seenCount[p.id] = seen + 1;
    }
  }
  return used;
}

// ── Canvas rendering ───────────────────────────────────────────────────────

const MAX_CANVAS_W = 800; // max display width in px

function renderCanvas(bin, placed, cuts) {
  const scale = Math.min(MAX_CANVAS_W / bin.w, 1);
  const cw = Math.round(bin.w * scale);
  const ch = Math.round(bin.h * scale);

  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d');

  // ① Wood background
  ctx.fillStyle = '#c9a05e';
  ctx.fillRect(0, 0, cw, ch);
  ctx.strokeStyle = '#b8924e';
  ctx.lineWidth = 1;
  for (let y = 0; y < ch; y += Math.round(12 * scale)) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(cw, y + Math.round(4 * scale));
    ctx.stroke();
  }

  // ② Piece fills
  for (const p of placed) {
    const px = Math.round(p.x * scale);
    const py = Math.round(p.y * scale);
    const pw = Math.round(p.w * scale);
    const ph = Math.round(p.h * scale);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = 0.88;
    ctx.fillRect(px, py, pw, ph);
    ctx.globalAlpha = 1;
  }

  // ③ Hatch over waste (evenodd clips out pieces)
  const hatchCanvas = document.createElement('canvas');
  hatchCanvas.width = 8; hatchCanvas.height = 8;
  const hc = hatchCanvas.getContext('2d');
  hc.strokeStyle = 'rgba(0,0,0,0.18)'; hc.lineWidth = 1;
  hc.beginPath(); hc.moveTo(0,0); hc.lineTo(8,8); hc.stroke();
  hc.beginPath(); hc.moveTo(-4,4); hc.lineTo(4,-4); hc.stroke();
  hc.beginPath(); hc.moveTo(4,12); hc.lineTo(12,4); hc.stroke();
  const hatchPat = ctx.createPattern(hatchCanvas, 'repeat');
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, cw, ch);
  for (const p of placed)
    ctx.rect(Math.round(p.x*scale), Math.round(p.y*scale), Math.round(p.w*scale), Math.round(p.h*scale));
  ctx.clip('evenodd');
  ctx.fillStyle = hatchPat;
  ctx.globalAlpha = 0.6;
  ctx.fillRect(0, 0, cw, ch);
  ctx.globalAlpha = 1;
  ctx.restore();

  // ④ Piece borders
  ctx.setLineDash([]);
  for (const p of placed) {
    const px = Math.round(p.x * scale);
    const py = Math.round(p.y * scale);
    const pw = Math.round(p.w * scale);
    const ph = Math.round(p.h * scale);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1);
  }

  // ⑤ Board border
  ctx.strokeStyle = '#6b4c2a';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, cw - 2, ch - 2);

  // ⑥ Cut lines — two passes for contrast: white outline first, then coloured dash
  const CUT_COLOR = '#c0392b';
  for (const cut of cuts) {
    const x1 = Math.round(cut.x1 * scale);
    const y1 = Math.round(cut.y1 * scale);
    const x2 = Math.round(cut.x2 * scale);
    const y2 = Math.round(cut.y2 * scale);
    // White outline
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 3.5;
    ctx.setLineDash([]);
    ctx.stroke();
    // Red dashed line
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = CUT_COLOR;
    ctx.lineWidth = 1.8;
    ctx.setLineDash([7, 4]);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // ⑦ Cut number badges
  const BADGE_R = 10;
  cuts.forEach((cut, idx) => {
    const x1 = cut.x1 * scale, y1 = cut.y1 * scale;
    const x2 = cut.x2 * scale, y2 = cut.y2 * scale;
    const lineLen = Math.hypot(x2 - x1, y2 - y1);
    if (lineLen < BADGE_R * 2.8) return;
    const mx = Math.round((x1 + x2) / 2);
    const my = Math.round((y1 + y2) / 2);
    ctx.beginPath();
    ctx.arc(mx, my, BADGE_R, 0, Math.PI * 2);
    ctx.fillStyle = CUT_COLOR;
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = 'white';
    ctx.font = `bold 9px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(idx + 1), mx, my);
  });

  // ⑧ Piece labels (drawn last so always readable)
  for (const p of placed) {
    const px = Math.round(p.x * scale);
    const py = Math.round(p.y * scale);
    const pw = Math.round(p.w * scale);
    const ph = Math.round(p.h * scale);
    if (pw <= 30 || ph <= 20) continue;
    const fontSize = clamp(Math.min(pw, ph) * 0.12, 9, 14);
    const cx = px + pw / 2;
    const cy = py + ph / 2;
    ctx.save();
    ctx.beginPath();
    ctx.rect(px + 2, py + 2, pw - 4, ph - 4);
    ctx.clip();
    ctx.fillStyle = textColorFor(p.color);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
    ctx.fillText(p.label, cx, cy - fontSize * 0.6);
    ctx.font = `${clamp(fontSize * 0.82, 8, 12)}px system-ui, sans-serif`;
    ctx.fillText(`${p.w}×${p.h}`, cx, cy + fontSize * 0.6);
    if (p.rotated) {
      ctx.font = `bold ${clamp(fontSize, 9, 13)}px system-ui, sans-serif`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText('↻', px + pw - 3, py + 3);
    }
    ctx.restore();
  }

  return canvas;
}

function textColorFor(hex) {
  // Simple luminance check
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return lum > 160 ? '#1a1a1a' : '#ffffff';
}

// ── Render results ─────────────────────────────────────────────────────────

function renderResults() {
  const { results, unplaced } = optimize();

  const emptyState = document.getElementById('empty-state');
  const summaryEl = document.getElementById('summary');
  const canvasesEl = document.getElementById('canvases');

  emptyState.classList.add('hidden');
  canvasesEl.innerHTML = '';

  // Compute stats
  let totalArea = 0;
  let usedArea = 0;
  let totalPlaced = 0;

  for (const { bin, placed } of results) {
    if (placed.length === 0) continue;
    totalArea += bin.w * bin.h;
    for (const p of placed) usedArea += p.w * p.h;
    totalPlaced += placed.length;
  }

  const efficiency = totalArea > 0 ? (usedArea / totalArea * 100) : 0;
  const binsUsed = results.filter(r => r.placed.length > 0).length;

  // Summary
  summaryEl.classList.remove('hidden');
  const effClass = efficiency >= 75 ? 'good' : efficiency >= 50 ? 'warn' : 'bad';
  summaryEl.innerHTML = `
    <div class="stat">
      <span class="stat-label">Platten verwendet</span>
      <span class="stat-value">${binsUsed}</span>
    </div>
    <div class="stat">
      <span class="stat-label">Materialnutzung</span>
      <span class="stat-value ${effClass}">${efficiency.toFixed(1)} %</span>
    </div>
    <div class="stat">
      <span class="stat-label">Teile platziert</span>
      <span class="stat-value">${totalPlaced}</span>
    </div>
    <div class="stat">
      <span class="stat-label">Nicht platziert</span>
      <span class="stat-value ${unplaced.length > 0 ? 'bad' : 'good'}">${unplaced.length}</span>
    </div>
  `;

  // Per-bin canvases
  for (const { bin, placed, cuts } of results) {
    if (placed.length === 0) continue;

    const binArea = bin.w * bin.h;
    const binUsed = placed.reduce((s, p) => s + p.w * p.h, 0);
    const binEff = binUsed / binArea * 100;
    const bEff = binEff >= 75 ? 'good' : binEff >= 50 ? 'warn' : 'bad';

    const card = document.createElement('div');
    card.className = 'canvas-card';

    // Header
    const header = document.createElement('div');
    header.className = 'canvas-card-header';
    header.innerHTML = `
      <h3>Platte ${bin.index + 1} – ${bin.name} (${bin.w}×${bin.h} mm)</h3>
      <span class="efficiency-badge ${bEff}">${binEff.toFixed(1)} %</span>
    `;
    card.appendChild(header);

    // Canvas
    const wrapper = document.createElement('div');
    wrapper.className = 'canvas-wrapper';
    wrapper.appendChild(renderCanvas(bin, placed, cuts));
    card.appendChild(wrapper);

    // Legend
    const seen = new Map();
    for (const p of placed) {
      if (!seen.has(p.id)) seen.set(p.id, { label: p.label, color: p.color });
    }
    const legend = document.createElement('div');
    legend.className = 'legend';
    for (const [, info] of seen) {
      const item = document.createElement('div');
      item.className = 'legend-item';
      item.innerHTML = `
        <span class="legend-swatch" style="background:${info.color}"></span>
        <span>${info.label}</span>
      `;
      legend.appendChild(item);
    }
    // Cut swatch
    const cutItem = document.createElement('div');
    cutItem.className = 'legend-item';
    cutItem.innerHTML = `<span class="legend-swatch legend-swatch--cut"></span><span>Schnittlinie</span>`;
    legend.appendChild(cutItem);
    card.appendChild(legend);

    // Cut sequence table (collapsible)
    if (cuts.length > 0) {
      const details = document.createElement('details');
      details.className = 'cut-list';
      const summary = document.createElement('summary');
      summary.textContent = `Schnittfolge – ${cuts.length} Schnitte`;
      details.appendChild(summary);

      const table = document.createElement('table');
      table.className = 'cut-table';
      table.innerHTML = '<thead><tr><th>#</th><th>Richtung</th><th>Position</th><th>Länge</th></tr></thead>';
      const tbody = document.createElement('tbody');
      cuts.forEach((cut, idx) => {
        const isV = cut.x1 === cut.x2;
        const pos = isV ? `x = ${cut.x1} mm` : `y = ${cut.y1} mm`;
        const len = isV ? Math.abs(cut.y2 - cut.y1) : Math.abs(cut.x2 - cut.x1);
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><span class="cut-badge">${idx + 1}</span></td>
          <td class="${isV ? 'cut-dir-v' : 'cut-dir-h'}">${isV ? '↕ Vertikal' : '↔ Horizontal'}</td>
          <td>${pos}</td>
          <td>${len} mm</td>
        `;
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      details.appendChild(table);
      card.appendChild(details);
    }

    canvasesEl.appendChild(card);
  }

  // Show unplaced warning
  if (unplaced.length > 0) {
    const warn = document.createElement('div');
    warn.style.cssText = 'padding:12px 16px;background:#fdedec;border:1px solid #f5c6cb;border-radius:8px;color:#c0392b;font-size:.88rem;';
    const counts = {};
    for (const p of unplaced) {
      counts[p.label] = (counts[p.label] || 0) + 1;
    }
    const list = Object.entries(counts).map(([l, n]) => `${n}× ${l}`).join(', ');
    warn.textContent = `⚠ Nicht platziert (kein Platz): ${list}`;
    canvasesEl.appendChild(warn);
  }
}

// ── UI – Sheets ────────────────────────────────────────────────────────────

function renderSheets() {
  const tbody = document.getElementById('sheets-body');
  tbody.innerHTML = '';
  for (const s of state.sheets) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="text"   value="${esc(s.name)}"  data-id="${s.id}" data-field="name"></td>
      <td><input type="number" value="${s.w}"           data-id="${s.id}" data-field="w" min="1" max="9999"></td>
      <td><input type="number" value="${s.h}"           data-id="${s.id}" data-field="h" min="1" max="9999"></td>
      <td><input type="number" value="${s.count}"       data-id="${s.id}" data-field="count" min="1" max="99"></td>
      <td><button class="btn-delete" data-id="${s.id}" data-type="sheet" title="Entfernen">✕</button></td>
    `;
    tbody.appendChild(tr);
  }
}

function renderPieces() {
  const tbody = document.getElementById('pieces-body');
  tbody.innerHTML = '';
  for (const p of state.pieces) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="text"   value="${esc(p.label)}" data-id="${p.id}" data-field="label"></td>
      <td><input type="number" value="${p.w}"           data-id="${p.id}" data-field="w" min="1" max="9999"></td>
      <td><input type="number" value="${p.h}"           data-id="${p.id}" data-field="h" min="1" max="9999"></td>
      <td><input type="number" value="${p.count}"       data-id="${p.id}" data-field="count" min="1" max="999"></td>
      <td><input type="color"  value="${p.color}"       data-id="${p.id}" data-field="color"></td>
      <td><button class="btn-delete" data-id="${p.id}" data-type="piece" title="Entfernen">✕</button></td>
    `;
    tbody.appendChild(tr);
  }
}

function esc(str) {
  return String(str).replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

// ── Event delegation for table inputs ─────────────────────────────────────

document.getElementById('sheets-body').addEventListener('change', e => {
  const el = e.target;
  const id = el.dataset.id;
  const field = el.dataset.field;
  if (!id || !field) return;
  const sheet = state.sheets.find(s => s.id === id);
  if (!sheet) return;
  sheet[field] = field === 'name' ? el.value : Number(el.value) || 1;
  saveState();
});

document.getElementById('pieces-body').addEventListener('change', e => {
  const el = e.target;
  const id = el.dataset.id;
  const field = el.dataset.field;
  if (!id || !field) return;
  const piece = state.pieces.find(p => p.id === id);
  if (!piece) return;
  if (field === 'label' || field === 'color') {
    piece[field] = el.value;
  } else {
    piece[field] = Number(el.value) || 1;
  }
  saveState();
});

// Delete buttons
document.addEventListener('click', e => {
  const btn = e.target.closest('.btn-delete');
  if (!btn) return;
  const { id, type } = btn.dataset;
  if (type === 'sheet') {
    state.sheets = state.sheets.filter(s => s.id !== id);
    renderSheets();
  } else {
    state.pieces = state.pieces.filter(p => p.id !== id);
    renderPieces();
  }
  saveState();
});

// Add sheet
document.getElementById('add-sheet').addEventListener('click', () => {
  state.sheets.push({ id: uid(), name: 'Platte', w: 2440, h: 1220, count: 1 });
  renderSheets();
  saveState();
});

// Add piece
document.getElementById('add-piece').addEventListener('click', () => {
  const idx = state.pieces.length;
  state.pieces.push({
    id: uid(),
    label: 'Teil ' + (idx + 1),
    w: 400,
    h: 300,
    count: 1,
    color: COLORS[idx % COLORS.length],
  });
  renderPieces();
  saveState();
});

// Settings
document.getElementById('kerf').addEventListener('change', e => {
  state.kerf = parseFloat(e.target.value) || 0;
  saveState();
});

document.getElementById('allow-rotation').addEventListener('change', e => {
  state.allowRotation = e.target.checked;
  saveState();
});

// Optimize
document.getElementById('optimize-btn').addEventListener('click', renderResults);

// ── Init ───────────────────────────────────────────────────────────────────

function init() {
  const hadSaved = loadState();
  if (!hadSaved) {
    state.sheets = DEFAULT_SHEETS.map(s => ({ ...s, id: uid() }));
    state.pieces = DEFAULT_PIECES.map((p, i) => ({ ...p, id: uid(), color: COLORS[i % COLORS.length] }));
  }

  // Sync settings inputs
  document.getElementById('kerf').value = state.kerf;
  document.getElementById('allow-rotation').checked = state.allowRotation;

  renderSheets();
  renderPieces();
}

init();
