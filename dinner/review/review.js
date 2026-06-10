// Berlin Dinner Challenge – Rückblick
// Lädt die eingefrorenen Daten + Geo-Daten, baut Karte, Timeline und Statistiken.

const SCHLACHTENSEE = [52.4399, 13.2156]; // Finale: kein offizieller Ortsteil -> eigener Marker
const MONATE = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];

function parseDate(s) {
  // "dd.mm.yyyy" -> Date
  if (!s) return null;
  const [d, m, y] = s.split('.').map(Number);
  return new Date(y, m - 1, d);
}
function fmtDate(s) {
  const dt = parseDate(s);
  if (!dt) return "";
  return `${dt.getDate()}. ${MONATE[dt.getMonth()]} ${dt.getFullYear()}`;
}
function haversine(a, b) {
  const R = 6371, toRad = x => x * Math.PI / 180;
  const dLat = toRad(b[0] - a[0]), dLon = toRad(b[1] - a[1]);
  const s = Math.sin(dLat/2)**2 + Math.cos(toRad(a[0]))*Math.cos(toRad(b[0]))*Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
function centroid(geometry) {
  // grobe Schwerpunktberechnung aus allen äußeren Ring-Punkten
  let lat = 0, lon = 0, n = 0;
  const rings = geometry.type === "MultiPolygon"
    ? geometry.coordinates.map(p => p[0])
    : [geometry.coordinates[0]];
  for (const ring of rings)
    for (const [x, y] of ring) { lon += x; lat += y; n++; }
  return [lat / n, lon / n];
}

let map, animTimer = null, finaleMarker = null;
const layersByName = {}, centroidByName = {};
const TOUR_INTERVAL = 2500; // ms pro Station
// Popups beschränken + im Kartenausschnitt halten, damit nichts abgeschnitten wird
const POPUP_OPTS = { maxWidth: 520, minWidth: 300, autoPanPadding: [24, 24], keepInView: true };

async function init() {
  const [data, geo] = await Promise.all([
    fetch('data.json').then(r => r.json()),
    fetch('../assets/lor_ortsteile.geojson').then(r => r.json())
  ]);

  const done = data.filter(d => d.datum).sort((a, b) => a.nr - b.nr);
  const finale = data.find(d => !d.datum);
  const byName = new Map(data.map(d => [d.ortsteil, d]));

  buildHero(done, finale);
  buildMap(geo, byName, done, finale);
  buildTimeline(done, finale);
  buildStats(done);
}

/* ---------- Hero ---------- */
function buildHero(done, finale) {
  const first = parseDate(done[0].datum), last = parseDate(done[done.length - 1].datum);
  const weeks = Math.round((last - first) / (1000 * 60 * 60 * 24 * 7));
  document.getElementById('stat-districts').textContent = done.length;
  document.getElementById('stat-weeks').textContent = weeks;
  document.getElementById('stat-years').textContent =
    (Math.round((last - first) / (1000 * 60 * 60 * 24 * 365.25) * 10) / 10).toString().replace('.', ',');
  document.getElementById('stat-cuisines').textContent =
    new Set(done.map(d => d.kueche).filter(Boolean)).size;
}

/* ---------- Karte ---------- */
function buildMap(geo, byName, done, finale) {
  map = L.map('map', { scrollWheelZoom: false }).setView([52.518611, 13.408333], 10);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap, Geoportal Berlin / Ortsteile von Berlin'
  }).addTo(map);

  const styleDone = { color: "#fff", opacity: 1, fillColor: "#c8102e", fillOpacity: 0.6, weight: 1 };
  const styleOff  = { color: "#fff", opacity: 0.6, fillColor: "#caa6ab", fillOpacity: 0.18, weight: 1 };

  L.geoJson(geo, {
    style: styleDone,
    onEachFeature: (f, layer) => {
      const name = f.properties.OTEIL;
      layersByName[name] = layer;
      centroidByName[name] = centroid(f.geometry);
      const v = byName.get(name);
      const html = v
        ? cardMarkup(v)
        : `<em>${name} (${f.properties.BEZIRK})</em>`;
      layer.bindPopup(html, POPUP_OPTS);
    }
  }).addTo(map);

  // Finale-Marker
  centroidByName[finale.ortsteil] = SCHLACHTENSEE;
  finaleMarker = L.marker(SCHLACHTENSEE).addTo(map)
    .bindPopup(cardMarkup(finale, true), POPUP_OPTS);

  // animierter Pfad
  const path = L.polyline([], { color: "#c8102e", weight: 3, opacity: 0.85, dashArray: "1 6", lineCap: "round" }).addTo(map);
  const order = done.concat([finale]);

  document.getElementById('play').addEventListener('click', () => playTour(order, path, styleDone, styleOff));
}

// Karte so verschieben, dass der Ortsteil ~110px unter der Mitte liegt,
// damit das nach oben öffnende Popup auch im Norden komplett Platz hat.
function panForPopup(latlng) {
  if (!map) return;
  const z = map.getZoom();
  const p = map.project(latlng, z).subtract([0, 110]);
  map.panTo(map.unproject(p, z), { animate: true, duration: 0.6 });
}

function playTour(order, path, styleDone, styleOff) {
  if (animTimer) clearInterval(animTimer);
  const btn = document.getElementById('play');
  const cap = document.getElementById('map-caption');
  btn.disabled = true;
  // zurücksetzen
  Object.values(layersByName).forEach(l => l.setStyle(styleOff));
  path.setLatLngs([]);

  const step = () => {
    const v = order[i];
    const layer = layersByName[v.ortsteil];
    if (layer) layer.setStyle(styleDone);
    const c = centroidByName[v.ortsteil];
    if (c) {
      path.addLatLng(c);
      panForPopup(c);  // Ortsteil unter die Mitte rücken -> Platz fürs Popup darüber
    }
    const isFin = !v.datum;
    if (isFin) {
      if (finaleMarker) finaleMarker.openPopup();
    } else if (layer) {
      layer.openPopup();
    }
    cap.innerHTML = isFin
      ? `🏁 <b>Finale – ${v.ortsteil}</b>`
      : `<b>#${v.nr} · ${v.ortsteil}</b> — ${v.beschreibung} (${v.kueche}) · ${fmtDate(v.datum)}`;
    i++;
    if (i >= order.length) {
      clearInterval(animTimer); animTimer = null;
      btn.disabled = false;
      Object.values(layersByName).forEach(l => l.setStyle(styleDone));
    }
  };

  let i = 0;
  step();                       // erste Station sofort zeigen
  animTimer = setInterval(step, TOUR_INTERVAL);
}

/* ---------- Timeline ---------- */
function buildTimeline(done, finale) {
  const wrap = document.getElementById('timeline');
  let lastYear = null;
  for (const v of done) {
    const year = parseDate(v.datum).getFullYear();
    if (year !== lastYear) {
      const div = document.createElement('div');
      div.className = 'year-divider';
      div.textContent = year;
      wrap.appendChild(div);
      lastYear = year;
    }
    wrap.appendChild(card(v));
  }
  wrap.appendChild(finaleCard(finale));
}

// Mosaik aus bis zu 4 Fotos; mehr Bilder werden auf der letzten Kachel als "+N" angezeigt.
function photoMosaic(fotos, onerror = "") {
  const MAX = 4;
  const shown = fotos.slice(0, MAX);
  const extra = fotos.length - MAX;
  return `<div class="photo-mosaic n${shown.length}">
    ${shown.map((f, i) => {
      const more = (i === MAX - 1 && extra > 0)
        ? `<span class="mosaic-more">+${extra}</span>` : ``;
      return `<div class="mosaic-tile" data-idx="${i}">
                <img loading="lazy" src="photos/${f}" alt=""${onerror}>${more}
              </div>`;
    }).join('')}
  </div>`;
}

function photoCell(v) {
  const fotos = v.fotos || [];
  if (!fotos.length) return `<div class="card-photo no-photo"></div>`;
  return `<div class="card-photo" data-fotos='${JSON.stringify(fotos)}'>
            ${photoMosaic(fotos, ` onerror="this.closest('.card-photo').classList.add('no-photo')"`)}
          </div>`;
}

// Gemeinsames Card-Markup für Timeline UND Karten-Popups, damit beide gleich aussehen.
function cardMarkup(v, finale = false) {
  const body = finale
    ? `<div class="card-head">
         <span class="card-nr">#${v.nr}</span>
         <span class="card-date">Das große Finale</span>
       </div>
       <h3 class="card-title">${v.ortsteil}</h3>
       <p class="card-bezirk">${v.bezirk} · gezogen von ${v.wer}</p>
       <p class="finale-note">🏁 Der krönende Abschluss – am See, gemeinsam.</p>`
    : `<div class="card-head">
         <span class="card-nr">#${v.nr}</span>
         <span class="card-date">${fmtDate(v.datum)}</span>
       </div>
       <h3 class="card-title">${v.beschreibung || v.ortsteil}</h3>
       <p class="card-bezirk">${v.ortsteil} · ${v.bezirk}</p>
       <div class="card-tags">
         ${v.kueche ? `<span class="tag cuisine">${v.kueche}</span>` : ``}
         <span class="tag who-${v.wer}">gezogen: ${v.wer}</span>
       </div>`;
  return `<article class="card${finale ? ' finale' : ''}">
    ${photoCell(v)}
    <div class="card-body">${body}</div>
  </article>`;
}

function cardEl(v, finale = false) {
  const tmp = document.createElement('div');
  tmp.innerHTML = cardMarkup(v, finale);
  return tmp.firstElementChild;
}

function card(v)       { return cardEl(v); }
function finaleCard(v) { return cardEl(v, true); }

/* ---------- Statistiken ---------- */
function buildStats(done) {
  // Distanz entlang der Reihenfolge
  let dist = 0;
  for (let i = 1; i < done.length; i++) {
    const a = centroidByName[done[i-1].ortsteil], b = centroidByName[done[i].ortsteil];
    if (a && b) dist += haversine(a, b);
  }
  // längste Pause
  let gap = 0, gapTxt = "";
  for (let i = 1; i < done.length; i++) {
    const d = (parseDate(done[i].datum) - parseDate(done[i-1].datum)) / (1000*60*60*24);
    if (d > gap) { gap = d; gapTxt = `${done[i-1].ortsteil} → ${done[i].ortsteil}`; }
  }
  // Küchen
  const cuisine = {};
  done.forEach(d => { if (d.kueche) cuisine[d.kueche] = (cuisine[d.kueche]||0)+1; });
  const ranked = Object.entries(cuisine).sort((a,b) => b[1]-a[1]);
  const onceOnly = ranked.filter(([,n]) => n === 1).length;
  // Wer
  const wer = {};
  done.forEach(d => { wer[d.wer] = (wer[d.wer]||0)+1; });
  // Bezirke
  const bez = {};
  done.forEach(d => { bez[d.bezirk] = (bez[d.bezirk]||0)+1; });

  // Längster Streak: aufeinanderfolgende Kalenderwochen ohne Lücke
  const weekIdx = s => {
    const dt = parseDate(s);
    dt.setDate(dt.getDate() - ((dt.getDay() + 6) % 7)); // auf Montag zurück
    return Math.round(dt.getTime() / (7 * 864e5));
  };
  const weeks = [...new Set(done.map(d => weekIdx(d.datum)))].sort((a, b) => a - b);
  let streak = 1, bestStreak = 1;
  for (let i = 1; i < weeks.length; i++) {
    streak = weeks[i] - weeks[i-1] === 1 ? streak + 1 : 1;
    bestStreak = Math.max(bestStreak, streak);
  }

  // Ø Tage zwischen Abenden
  const spanDays = (parseDate(done[done.length-1].datum) - parseDate(done[0].datum)) / 864e5;
  const avgGap = Math.round(spanDays / (done.length - 1));

  // Fotos gesamt
  const photoCount = done.reduce((s, d) => s + (d.fotos ? d.fotos.length : 0), 0);

  // weiteste Einzeletappe (Luftlinie zwischen zwei aufeinanderfolgenden Lokalen)
  let maxHop = 0;
  for (let i = 1; i < done.length; i++) {
    const a = centroidByName[done[i-1].ortsteil], b = centroidByName[done[i].ortsteil];
    if (a && b) maxHop = Math.max(maxHop, haversine(a, b));
  }

  // Abende pro Jahr
  const perYear = {};
  done.forEach(d => { const y = parseDate(d.datum).getFullYear(); perYear[y] = (perYear[y]||0)+1; });

  // Wochentage
  const WD = ["Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag","Sonntag"];
  const weekday = {};
  done.forEach(d => { const k = (parseDate(d.datum).getDay() + 6) % 7; weekday[k] = (weekday[k]||0)+1; });

  // Stat-Kacheln
  document.getElementById('stat-distance').textContent = Math.round(dist);
  document.getElementById('stat-gap').textContent = Math.round(gap);
  document.getElementById('stat-bezirke').textContent = Object.keys(bez).length;
  document.getElementById('stat-once').textContent = onceOnly;
  document.getElementById('stat-streak').textContent = bestStreak;
  document.getElementById('stat-avg').textContent = avgGap;
  document.getElementById('stat-photos').textContent = photoCount;
  document.getElementById('stat-hop').textContent = Math.round(maxHop);

  // Duell
  const s = wer['Steve']||0, t = wer['Tim']||0, sum = s+t;
  document.getElementById('duel').innerHTML = `
    <div class="side Steve"><b>${s}</b><span>Steve</span></div>
    <div class="bar"><i class="s" style="width:${s/sum*100}%"></i><i class="t" style="width:${t/sum*100}%"></i></div>
    <div class="side Tim"><b>${t}</b><span>Tim</span></div>`;

  // Küchen: mehrfach besuchte als Balken, einmalige als Tag-Liste darunter
  const max = ranked[0][1];
  const multi = ranked.filter(([, n]) => n > 1);
  const once  = ranked.filter(([, n]) => n === 1);
  const bars = multi.map(([k, n]) => `
    <div class="barrow">
      <span class="lbl">${k}</span>
      <span class="track"><i style="width:${n/max*100}%"></i></span>
      <span class="val">${n}</span>
    </div>`).join('');
  const tags = once.length ? `
    <p class="cuisine-once-label">…und je einmal probiert:</p>
    <div class="cuisine-tags">
      ${once.map(([k]) => `<span class="ctag">${k}</span>`).join('')}
    </div>` : '';
  document.getElementById('cuisines').innerHTML = bars + tags;

  // Abende pro Jahr
  const years = Object.entries(perYear).sort((a, b) => a[0] - b[0]);
  const ymax = Math.max(...years.map(([, n]) => n));
  document.getElementById('years').innerHTML = years.map(([y, n]) => `
    <div class="barrow">
      <span class="lbl" style="flex-basis:54px">${y}</span>
      <span class="track"><i style="width:${n/ymax*100}%"></i></span>
      <span class="val">${n}</span>
    </div>`).join('');

  // Wochentage
  const wmax = Math.max(...Object.values(weekday));
  document.getElementById('weekdays').innerHTML = WD
    .map((name, k) => [name, weekday[k] || 0])
    .filter(([, n]) => n > 0)
    .map(([name, n]) => `
    <div class="barrow">
      <span class="lbl">${name}</span>
      <span class="track"><i style="width:${n/wmax*100}%"></i></span>
      <span class="val">${n}</span>
    </div>`).join('');
  const topDay = WD[Object.entries(weekday).sort((a, b) => b[1] - a[1])[0][0]];
  const topDayN = Math.max(...Object.values(weekday));
  document.getElementById('weekday-detail').textContent =
    `${topDayN} von ${done.length} Abenden fielen auf einen ${topDay}.`;

  // Bezirke-Liste
  const bezRanked = Object.entries(bez).sort((a,b) => b[1]-a[1]);
  const bmax = bezRanked[0][1];
  document.getElementById('bezirke').innerHTML = bezRanked.map(([k, n]) => `
    <div class="barrow">
      <span class="lbl" style="flex-basis:150px">${k}</span>
      <span class="track"><i style="width:${n/bmax*100}%"></i></span>
      <span class="val">${n}</span>
    </div>`).join('');

  document.getElementById('gap-detail').textContent = gapTxt ? `längste Pause: ${gapTxt}` : "";
}

/* ---------- Lightbox ---------- */
function setupLightbox() {
  const box = document.getElementById('lightbox');
  const img = box.querySelector('img');
  let list = [], idx = 0;
  const show = () => { img.src = 'photos/' + list[idx]; };
  document.addEventListener('click', e => {
    const cell = e.target.closest('.card-photo');
    if (!cell || !cell.dataset.fotos) return;
    list = JSON.parse(cell.dataset.fotos);
    const tile = e.target.closest('.mosaic-tile');
    idx = tile ? Number(tile.dataset.idx) : 0;
    show();
    box.classList.add('open');
  });
  box.addEventListener('click', e => {
    if (e.target.classList.contains('lb-next')) { idx = (idx + 1) % list.length; show(); }
    else if (e.target.classList.contains('lb-prev')) { idx = (idx - 1 + list.length) % list.length; show(); }
    else box.classList.remove('open');
  });
}

init();
setupLightbox();
