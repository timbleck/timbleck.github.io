// Pizzateig-Rechner – Neapolitanisch
// Berechnet Mehl, Wasser, Salz und Hefe aus Anzahl Pizzen und Hydration.

const inputs = {
  pizzas:    document.getElementById('pizzas'),
  hydration: document.getElementById('hydration'),
  ball:      document.getElementById('ball'),
  salt:      document.getElementById('salt'),
  yeast:     document.getElementById('yeast'),
};

const out = {
  flour: document.getElementById('out-flour'),
  water: document.getElementById('out-water'),
  salt:  document.getElementById('out-salt'),
  yeast: document.getElementById('out-yeast'),
  total: document.getElementById('out-total'),
};

function num(el, fallback) {
  const v = parseFloat(el.value);
  return Number.isFinite(v) && v >= 0 ? v : fallback;
}

function fmt(grams) {
  if (grams >= 1000) return (grams / 1000).toFixed(2).replace('.', ',') + ' kg';
  if (grams >= 100)  return Math.round(grams) + ' g';
  if (grams >= 10)   return grams.toFixed(1).replace('.', ',') + ' g';
  return grams.toFixed(2).replace('.', ',') + ' g';
}

function calculate() {
  const pizzas    = num(inputs.pizzas,    4);
  const hydration = num(inputs.hydration, 60) / 100;
  const ball      = num(inputs.ball,      250);
  const saltPct   = num(inputs.salt,      2.8) / 100;
  const yeastPct  = num(inputs.yeast,     0.2) / 100;

  const totalDough = pizzas * ball;

  // total = flour * (1 + hydration + saltPct + yeastPct)
  const flour = totalDough / (1 + hydration + saltPct + yeastPct);
  const water = flour * hydration;
  const salt  = flour * saltPct;
  const yeast = flour * yeastPct;

  out.flour.textContent = fmt(flour);
  out.water.textContent = fmt(water);
  out.salt.textContent  = fmt(salt);
  out.yeast.textContent = fmt(yeast);
  out.total.textContent = `Gesamtteig: ${fmt(totalDough)} (${pizzas} × ${ball} g)`;
}

Object.values(inputs).forEach(el => el.addEventListener('input', calculate));
calculate();
