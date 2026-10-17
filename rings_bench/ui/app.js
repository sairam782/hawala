/* Rings bench: many model families hunt laundering patterns in one slice of IBM's synthetic transfers.
   Everything on the page is drawn from two inputs: window.SLICE (../data/slice.js: the transfers, IBM's labels,
   the IBM's laundering groups) and the bench output (../data/bench_results.json over http, ../data/bench_results.js from a
   file, else a SAMPLE this page makes up and labels). No libraries. Pencil, unstamped, 2026-10-17. */
(function () {
'use strict';

/* ---------- small helpers ---------- */
const $ = (s, r) => (r || document).querySelector(s);
const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const num = (x, d) => x == null || isNaN(x) ? '–' : Number(x).toLocaleString('en-US', { maximumFractionDigits: d == null ? 0 : d, minimumFractionDigits: d == null ? 0 : d });
const pct = x => x == null || isNaN(x) ? '–' : (x * 100).toFixed(1) + '%';
const wrongN = p => p == null || isNaN(p) ? null : Math.round((1 - p) * 10);
const wrongText = p => { const w = wrongN(p); return w == null ? 'flagged nothing' : 'wrong ' + w + (w === 1 ? ' time' : ' times') + ' in ten'; };
const secs = ms => ms == null ? '–' : (ms / 1000).toFixed(1) + ' s';
function seeded(seed) { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }

/* Money: the day kit's Molds.money rules, copied (kit/day_kit/ui_molds/molds.js): amounts are numbers in major units,
   tabular figures, the sign is printed when it carries meaning (a real minus), color only backs it up. */
const CUR = { 'US Dollar': 'USD', 'Euro': 'EUR', 'Canadian Dollar': 'CAD', 'Rupee': 'INR', 'Yen': 'JPY', 'Swiss Franc': 'CHF', 'Australian Dollar': 'AUD', 'UK Pound': 'GBP', 'Brazil Real': 'BRL', 'Yuan': 'CNY', 'Shekel': 'ILS', 'Mexican Peso': 'MXN', 'Ruble': 'RUB', 'Saudi Riyal': 'SAR', 'Bitcoin': 'BTC' };
const Money = {
  fmt(v, cur, o) {
    o = o || {}; if (typeof v !== 'number' || isNaN(v)) return '–';
    const code = CUR[cur] || (cur && /^[A-Z]{3}$/.test(cur) ? cur : 'USD'); const d = o.decimals == null ? 2 : o.decimals; let s;
    try { s = new Intl.NumberFormat('en-US', { style: 'currency', currency: code, minimumFractionDigits: d, maximumFractionDigits: d }).format(Math.abs(v)); }
    catch (e) { s = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) + ' ' + code; }
    if (o.signed) return v < 0 ? '−' + s : v > 0 ? '+' + s : s;
    return s;
  },
  html(v, cur, o) { o = o || {}; const cls = o.signed && typeof v === 'number' ? (v < 0 ? ' amt-out' : v > 0 ? ' amt-in' : '') : ''; return '<span class="fig' + cls + '">' + esc(Money.fmt(v, cur, o)) + '</span>'; }
};

/* ---------- the pattern shapes: a fan is a tree, a mesh is a web; only a cycle is a ring ---------- */
const SHAPES = ['cycle', 'fan-out', 'fan-in', 'scatter-gather', 'chain', 'mesh', 'other', 'lone'];
const SHAPE_WORDS = { cycle: 'a ring: money goes around and comes back', 'fan-out': 'a tree: one account pays many', 'fan-in': 'a tree, inverted: many accounts pay one', 'scatter-gather': 'two trees joined: one scatters to relays, the relays pay one', chain: 'a chain: hop to hop to hop', mesh: 'a web: a knot of accounts paying each other', other: 'another structure', lone: 'one labeled transfer on its own', ordinary: 'ordinary traffic' };
const dot = (x, y, r) => '<circle class="n" cx="' + x + '" cy="' + y + '" r="' + (r || 1.6) + '"/>';
const GLYPH = {
  cycle: '<circle cx="12" cy="12" r="7"/><path d="M15.5 4.6l2.3 1.6-1.9 1.8"/>' + dot(12, 5) + dot(18.1, 15.5) + dot(5.9, 15.5),
  'fan-out': '<path d="M5 12L19 4M5 12L19 8M5 12L19 12M5 12L19 16M5 12L19 20"/>' + dot(5, 12, 2.3) + [4, 8, 12, 16, 20].map(y => dot(19, y)).join(''),
  'fan-in': '<path d="M19 12L5 4M19 12L5 8M19 12L5 12M19 12L5 16M19 12L5 20"/>' + dot(19, 12, 2.3) + [4, 8, 12, 16, 20].map(y => dot(5, y)).join(''),
  'scatter-gather': '<path d="M3 12L12 5M3 12L12 9.5M3 12L12 14.5M3 12L12 19M12 5L21 12M12 9.5L21 12M12 14.5L21 12M12 19L21 12"/>' + dot(3, 12, 2.2) + dot(21, 12, 2.2) + [5, 9.5, 14.5, 19].map(y => dot(12, y)).join(''),
  chain: '<path d="M3 15L9 9L15 15L21 9"/>' + dot(3, 15, 2) + dot(9, 9) + dot(15, 15) + dot(21, 9, 2),
  mesh: '<path d="M12 4L19.6 9.5L16.7 18.5L7.3 18.5L4.4 9.5ZM12 4L16.7 18.5M12 4L7.3 18.5M19.6 9.5L4.4 9.5M19.6 9.5L7.3 18.5M4.4 9.5L16.7 18.5"/>' + dot(12, 4) + dot(19.6, 9.5) + dot(16.7, 18.5) + dot(7.3, 18.5) + dot(4.4, 9.5),
  other: '<path d="M5 17L11 7L19 12L11 7"/>' + dot(5, 17) + dot(11, 7) + dot(19, 12),
  lone: '<path d="M5 16L19 8"/>' + dot(5, 16, 2) + dot(19, 8, 2),
  ordinary: '<path d="M4 12h16" stroke-dasharray="2 3"/>'
};
const glyph = s => '<svg class="glyph" viewBox="0 0 24 24" aria-hidden="true">' + (GLYPH[s] || GLYPH.other) + '</svg>';

/* ---------- the slice ---------- */
function sampleSlice() {
  /* A small made-up network, used only when ../data/slice.js is missing, so the page still opens. */
  const rnd = seeded(3); const T = []; const key = {}; const meta = {}; let id = 0; let ring = 0;
  const acc = i => 'S' + String(i).padStart(3, '0'); const day0 = Date.UTC(2022, 8, 1);
  const ts = m => { const d = new Date(day0 + m * 60000); return d.toISOString().slice(0, 16).replace('T', ' ').replace(/-/g, '/'); };
  const add = (f, t, paid, fmt, m, lab, r) => { id++; const tid = 'T' + String(id).padStart(4, '0'); T.push([tid, ts(m), f, t, Math.round(paid * 100) / 100, 'US Dollar', fmt, '001', '002']); key[tid] = [lab ? 1 : 0, lab ? r : -1]; };
  const planted = (shape, fn) => { const n0 = T.length; fn(ring); meta[ring] = { shape, n: T.length - n0 }; ring++; };
  let a = 0; const next = () => acc(a++);
  planted('cycle', r => { const c = [next(), next(), next(), next(), next(), next()]; c.forEach((x, i) => add(x, c[(i + 1) % 6], 9000 + rnd() * 3000, 'ACH', 600 + i * 300, 1, r)); });
  planted('fan-out', r => { const h = next(); for (let i = 0; i < 8; i++) add(h, next(), 2000 + rnd() * 900, 'ACH', 3000 + i * 4, 1, r); });
  planted('fan-in', r => { const h = next(); for (let i = 0; i < 8; i++) add(next(), h, 5000 + rnd() * 2000, 'ACH', 6000 + i * 3, 1, r); });
  planted('scatter-gather', r => { const s = next(), g = next(); for (let i = 0; i < 6; i++) { const m = next(); add(s, m, 7000 + rnd() * 1000, 'ACH', 8000 + i * 60, 1, r); add(m, g, 6800 + rnd() * 900, 'ACH', 9500 + i * 70, 1, r); } });
  planted('chain', r => { const x = next(), y = next(), z = next(); add(x, y, 12000, 'ACH', 10000, 1, r); add(y, z, 11800, 'ACH', 10400, 1, r); });
  planted('mesh', r => { const m = [next(), next(), next(), next(), next()]; for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) if (i !== j && rnd() < 0.5) add(m[i], m[j], 1000 + rnd() * 500, 'ACH', 11000 + i * 50 + j * 7, 1, r); });
  planted('lone', r => add(next(), next(), 48000, 'ACH', 12000, 1, r));
  planted('lone', r => add(next(), next(), 31000, 'ACH', 12600, 1, r));
  const nR = a; for (let i = 0; i < 120; i++) next();
  const fmts = ['Cheque', 'Credit Card', 'ACH', 'Cash', 'Wire', 'Reinvestment'];
  for (let i = 0; i < 260; i++) { const f = acc(Math.floor(rnd() * a)), t = rnd() < 0.08 ? f : acc(Math.floor(rnd() * a)); add(f, t, Math.exp(3 + rnd() * 7), fmts[Math.floor(rnd() * fmts.length)], Math.floor(rnd() * 14000), 0, -1); }
  T.sort((x, y) => x[1] < y[1] ? -1 : 1);
  const lab = T.filter(r => key[r[0]][0]).length;
  return { dataset: 'SAMPLE network made up by this page', ran: '', columns: ['id', 'time', 'from', 'to', 'paid', 'currency', 'format', 'from_bank', 'to_bank'], transfers: T, key, ring_meta: meta, slice: { rows: T.length, laundering: lab, rate: lab / T.length, full_rows: 0, full_laundering: 0 }, sample: true };
}
const DATA = window.DATA_DIR || '../data/'; const SLICE_NAME = window.SLICE_NAME || '';
const SL = window.SLICE || window.RUNS || sampleSlice();
const SLICE_SRC = SL.sample ? 'SAMPLE network, made up in the page' : DATA + 'slice.js';
const TR = SL.transfers.map((r, i) => ({ i, id: r[0], ts: r[1], from: r[2], to: r[3], paid: r[4], cur: r[5], fmt: r[6],
  t: Date.UTC(+r[1].slice(0, 4), +r[1].slice(5, 7) - 1, +r[1].slice(8, 10), +r[1].slice(11, 13), +r[1].slice(14, 16)) / 60000,
  label: (SL.key[r[0]] || [0, -1])[0], ring: (SL.key[r[0]] || [0, -1])[1], self: r[2] === r[3], fb: r[7] || '', tb: r[8] || '' }));
const BYID = {}; TR.forEach(t => BYID[t.id] = t);
const T0 = Math.min(...TR.map(t => t.t)), T1 = Math.max(...TR.map(t => t.t));
const TRUTH = new Set(TR.filter(t => t.label).map(t => t.id));
const RINGS = {}; TR.forEach(t => { if (t.label) (RINGS[t.ring] = RINGS[t.ring] || []).push(t.id); });
const RING_IDS = Object.keys(RINGS).sort((a, b) => +a - +b);
const NRINGS = RING_IDS.length;
const ringShape = r => (SL.ring_meta && SL.ring_meta[r] && SL.ring_meta[r].shape) || 'other';
const SHAPE_N = {}; RING_IDS.forEach(r => { const s = ringShape(r); SHAPE_N[s] = SHAPE_N[s] || { rings: 0, edges: 0 }; SHAPE_N[s].rings++; SHAPE_N[s].edges += RINGS[r].length; });
const SHAPES_HERE = SHAPES.filter(s => SHAPE_N[s]);

/* ---------- graph layout: components, a force layout, shelf packing (once; same for every model) ---------- */
const nodeIdx = {}; const nodes = [];
function nodeOf(a) { if (!(a in nodeIdx)) { nodeIdx[a] = nodes.length; nodes.push({ a, x: 0, y: 0, deg: 0 }); } return nodeIdx[a]; }
const edges = [];
TR.forEach(t => { const u = nodeOf(t.from), v = nodeOf(t.to); if (t.self) { t.e = -1; } else { t.e = edges.length; edges.push({ u, v, t: t.t, tr: t }); nodes[u].deg++; nodes[v].deg++; } });
(function layout() {
  const rnd = seeded(12345);
  const par = nodes.map((_, i) => i); const find = x => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
  edges.forEach(e => { par[find(e.u)] = find(e.v); });
  const comps = {}; nodes.forEach((n, i) => (comps[find(i)] = comps[find(i)] || []).push(i));
  const boxes = [];
  Object.values(comps).forEach(c => {
    const n = c.length; const idx = {}; c.forEach((v, k) => idx[v] = k);
    const ce = edges.filter(e => idx[e.u] != null);
    if (n === 1) { nodes[c[0]].x = 0; nodes[c[0]].y = 0; boxes.push({ c, w: 9, h: 9, minx: -4.5, miny: -4.5 }); return; }
    const K = 26, R0 = Math.sqrt(n) * K * 0.55;
    c.forEach(v => { const a = rnd() * 6.2832, r = R0 * Math.sqrt(rnd()); nodes[v].x = Math.cos(a) * r; nodes[v].y = Math.sin(a) * r; });
    const iters = n > 300 ? 130 : 220; let temp = R0 * 0.35;
    for (let it = 0; it < iters; it++) {
      const dx = new Float32Array(n), dy = new Float32Array(n);
      for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {
        const A = nodes[c[a]], B = nodes[c[b]]; const x = A.x - B.x, y = A.y - B.y; const d2 = x * x + y * y + 0.01;
        if (d2 > 90000) continue; const f = K * K / d2; dx[a] += x * f; dy[a] += y * f; dx[b] -= x * f; dy[b] -= y * f;
      }
      ce.forEach(e => { const a = idx[e.u], b = idx[e.v]; const A = nodes[e.u], B = nodes[e.v]; const x = A.x - B.x, y = A.y - B.y; const d = Math.sqrt(x * x + y * y) + 0.01; const f = d / K; dx[a] -= x * f; dy[a] -= y * f; dx[b] += x * f; dy[b] += y * f; });
      for (let a = 0; a < n; a++) { const A = nodes[c[a]]; const d = Math.sqrt(dx[a] * dx[a] + dy[a] * dy[a]) + 0.01; const m = Math.min(d, temp); A.x += dx[a] / d * m; A.y += dy[a] / d * m; }
      temp *= 0.975;
    }
    let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9; c.forEach(v => { const N = nodes[v]; minx = Math.min(minx, N.x); maxx = Math.max(maxx, N.x); miny = Math.min(miny, N.y); maxy = Math.max(maxy, N.y); });
    boxes.push({ c, w: maxx - minx + 24, h: maxy - miny + 24, minx: minx - 12, miny: miny - 12 });
  });
  boxes.sort((a, b) => b.h - a.h || b.w - a.w);
  let area = 0; boxes.forEach(b => area += b.w * b.h); const W = Math.max(Math.sqrt(area) * 1.25, boxes[0].w);
  let x = 0, y = 0, rowH = 0;
  boxes.forEach(b => { if (x + b.w > W) { x = 0; y += rowH; rowH = 0; } const ox = x - b.minx, oy = y - b.miny; b.c.forEach(v => { nodes[v].x += ox; nodes[v].y += oy; }); x += b.w; rowH = Math.max(rowH, b.h); });
})();
const WB = { minx: 1e9, miny: 1e9, maxx: -1e9, maxy: -1e9 };
nodes.forEach(n => { WB.minx = Math.min(WB.minx, n.x); WB.maxx = Math.max(WB.maxx, n.x); WB.miny = Math.min(WB.miny, n.y); WB.maxy = Math.max(WB.maxy, n.y); });
const EDGE_ORDER = edges.map((_, i) => i).sort((a, b) => edges[a].t - edges[b].t);

/* the one-line rule, recounted here: flag every ACH transfer between two different accounts */
const RULE = (function () { const F = TR.filter(t => t.fmt === 'ACH' && !t.self); const tp = F.filter(t => t.label).length; let found = 0; RING_IDS.forEach(r => { const h = RINGS[r].filter(id => BYID[id].fmt === 'ACH' && !BYID[id].self).length; if (h / RINGS[r].length >= 0.5) found++; }); return { flagged: F.length, tp, precision: F.length ? tp / F.length : null, recall: TRUTH.size ? tp / TRUTH.size : 0, found }; })();
const N_ACH_LAB = TR.filter(t => t.label && t.fmt === 'ACH').length;
/* the honest comparator: a structural rule with no payment-format tell. Flag every transfer of an account that deals with
   BURST_K or more different counterparties inside BURST_WIN minutes (sending or receiving). Measured 2026-10-17 12:05 on
   this slice, k=3 in a day finds the most IBM's laundering groups of the burst settings tried (k 3..8, windows 60 min and a day). */
const BURST_K = 3, BURST_WIN = 1440;
const BURST = (function () {
  const by = {}; TR.forEach(t => { if (t.self) return; (by[t.from] = by[t.from] || []).push(['o', t]); (by[t.to] = by[t.to] || []).push(['i', t]); });
  const F = new Set();
  Object.values(by).forEach(lst => { lst.sort((a, b) => a[1].t - b[1].t);
    for (let i = 0; i < lst.length; i++) { let j = i; const others = new Set(); const ids = [];
      while (j < lst.length && lst[j][1].t - lst[i][1].t <= BURST_WIN) { const [d, t] = lst[j]; others.add(d === 'o' ? t.to : t.from); ids.push(t.id); j++; }
      if (others.size >= BURST_K) ids.forEach(id => F.add(id)); } });
  let tp = 0; F.forEach(id => { if (TRUTH.has(id)) tp++; }); let found = 0; RING_IDS.forEach(r => { const h = RINGS[r].filter(id => F.has(id)).length; if (h / RINGS[r].length >= 0.5) found++; });
  return { F, flagged: F.size, tp, precision: F.size ? tp / F.size : null, recall: TRUTH.size ? tp / TRUTH.size : 0, found };
})();

/* ---------- candidate groups (for the SAMPLE bench): the IBM's laundering groups plus ordinary clusters ---------- */
function candidateGroups() {
  const groups = []; RING_IDS.forEach((r, i) => groups.push({ id: 'g' + String(i + 1).padStart(2, '0'), expected: 'ring', shape: ringShape(r), ring: r, ids: RINGS[r] }));
  const rnd = seeded(11); const adj = {}; const labAcct = new Set();
  TR.forEach(t => { if (t.label) { labAcct.add(t.from); labAcct.add(t.to); } });
  TR.forEach(t => { if (t.self || t.label) return; (adj[t.from] = adj[t.from] || []).push(t); (adj[t.to] = adj[t.to] || []).push(t); });
  const accts = Object.keys(adj).filter(a => !labAcct.has(a) && adj[a].length >= 2).sort();
  const used = new Set(), usedT = new Set(); let k = groups.length;
  for (let tries = 0; tries < 600 && groups.length < 60 && accts.length; tries++) {
    const seed = accts[Math.floor(rnd() * accts.length)]; if (used.has(seed)) continue;
    const want = 5 + Math.floor(rnd() * 8); const ids = []; const q = [seed]; const seen = new Set([seed]);
    while (q.length && ids.length < want) { const a = q.shift(); used.add(a); for (const t of adj[a]) { if (ids.length >= want) break; if (usedT.has(t.id)) continue; usedT.add(t.id); ids.push(t.id); const o = t.from === a ? t.to : t.from; if (!seen.has(o) && !labAcct.has(o)) { seen.add(o); q.push(o); } } }
    if (ids.length >= 3) { k++; groups.push({ id: 'g' + String(k).padStart(2, '0'), expected: 'ordinary', shape: 'ordinary', ids }); }
  }
  return groups;
}
function groupFacts(ids) {
  const ts = ids.map(id => BYID[id]).filter(Boolean); const acc = {}; ts.forEach(t => { acc[t.from] = (acc[t.from] || 0) + 1; acc[t.to] = (acc[t.to] || 0) + 1; });
  const top = Object.keys(acc).sort((a, b) => acc[b] - acc[a]); const tt = ts.map(t => t.t);
  return { n: ts.length, accounts: Object.keys(acc).length, top: top[0] || '?', top2: top[1] || '?', days: ts.length ? Math.max(1, Math.round((Math.max(...tt) - Math.min(...tt)) / 1440)) : 0, hours: ts.length ? Math.max(1, Math.round((Math.max(...tt) - Math.min(...tt)) / 60)) : 0, ach: ts.filter(t => t.fmt === 'ACH').length };
}

/* ---------- the SAMPLE bench: made up to the contract, so the layout can be judged before the engine writes ---------- */
function sampleBench() {
  const rnd = seeded(7); const groups = candidateGroups();
  const fams = [
    { family: 'anthropic', versions: ['v1', 'v2'], skill: 0.62, fr: 0.10, cost: 0.0070, lat: 4100 },
    { family: 'openai', versions: ['v1', 'v2'], skill: 0.58, fr: 0.14, cost: 0.0060, lat: 3600 },
    { family: 'deepseek', versions: ['v1', 'v2'], skill: 0.45, fr: 0.18, cost: 0.0020, lat: 5200 },
    { family: 'mistral', versions: ['v1'], skill: 0.38, fr: 0.22, cost: 0.0030, lat: 2900 },
    { family: 'moonshot', versions: ['v1'], skill: 0.42, fr: 0.20, cost: 0.0020, lat: 6100 },
    { family: 'xai', versions: ['v1'], skill: 0.50, fr: 0.16, cost: 0.0050, lat: 3300 },
    { family: 'z-ai', versions: ['v1'], skill: 0.35, fr: 0.25, cost: 0.0010, lat: 4800 }
  ];
  const hard = { cycle: 0.55, 'fan-out': 1.0, 'fan-in': 1.0, 'scatter-gather': 0.95, chain: 0.25, mesh: 0.8, other: 0.3, lone: 0.3 };
  const why = {
    found: { cycle: f => 'Money leaves ' + f.top + ' and comes back to it through ' + f.accounts + ' accounts, all by ACH, inside ' + f.days + ' days.',
      'fan-out': f => f.top + ' pays ' + (f.accounts - 1) + ' accounts by ACH within ' + f.hours + ' hours, none of which it had paid before.',
      'fan-in': f => (f.accounts - 1) + ' accounts pay ' + f.top + ' by ACH within ' + f.hours + ' hours; the receiver has no other income in the file.',
      'scatter-gather': f => f.top + ' scatters money to relays and every relay pays ' + f.top2 + ' within two days: the same money, two hops.',
      chain: f => 'A hop-to-hop pass through ' + f.accounts + ' accounts with the amount shrinking at each step.',
      mesh: f => f.accounts + ' accounts trade among themselves ' + f.n + ' times in ' + f.days + ' days with no outside counterparty.',
      other: f => 'A tight cluster of ' + f.n + ' ACH transfers with no ordinary history on either side.',
      lone: f => 'A single large ACH transfer between two accounts that never trade otherwise.' },
    missed: [f => 'The accounts carry ordinary traffic too; the burst does not stand out from it.', f => 'Only ' + f.n + ' transfers across ' + f.days + ' days; too thin to call a pattern.', f => 'The counterparties look like regular business partners; I read it as normal settlement.'],
    falseRing: [f => f.top + ' takes ' + (f.accounts - 1) + ' payments in ' + f.days + ' days; I read it as a fan-in.', f => 'Repeated round amounts between ' + f.top + ' and ' + f.top2 + ' look like layering.', f => 'A short loop of payments among ' + f.accounts + ' accounts; I called it a cycle.']
  };
  const models = [], runs = []; let rid = 0;
  fams.forEach(fm => fm.versions.forEach(ver => {
    const skill = Math.min(0.95, fm.skill + (ver === 'v2' ? 0.22 : 0)), fr = ver === 'v2' ? fm.fr * 0.5 : fm.fr;
    const id = fm.family + '/sample-model'; const by = {}; let falseRings = 0, costSum = 0; const lats = []; const F = new Set();
    groups.forEach(g => {
      rid++; const run_id = 'r' + String(rid).padStart(4, '0'); const f = groupFacts(g.ids); let verdict, flagged = [], pattern = null, w;
      if (g.expected === 'ring') {
        by[g.shape] = by[g.shape] || { rings: 0, found: 0 }; by[g.shape].rings++;
        const hit = rnd() < skill * (hard[g.shape] || 0.5);
        if (hit) { const share = 0.6 + rnd() * 0.4; flagged = g.ids.filter(() => rnd() < share); if (flagged.length < Math.ceil(g.ids.length / 2)) flagged = g.ids.slice(0, Math.ceil(g.ids.length / 2)); verdict = 'ring'; pattern = rnd() < 0.8 ? g.shape : SHAPES[Math.floor(rnd() * 6)]; w = (why.found[g.shape] || why.found.other)(f); by[g.shape].found++; }
        else { verdict = 'ordinary'; w = why.missed[Math.floor(rnd() * why.missed.length)](f); }
      } else {
        if (rnd() < fr) { verdict = 'ring'; flagged = g.ids.slice(0, Math.max(3, Math.floor(g.ids.length * (0.5 + rnd() * 0.5)))); pattern = ['fan-in', 'cycle', 'fan-out'][Math.floor(rnd() * 3)]; w = why.falseRing[Math.floor(rnd() * why.falseRing.length)](f); falseRings++; }
        else { verdict = 'ordinary'; w = 'Regular counterparties, mixed payment formats, nothing tightly timed.'; }
      }
      flagged.forEach(x => F.add(x));
      const lat = Math.round(fm.lat * (0.7 + rnd() * 0.8) * (ver === 'v2' ? 0.6 : 1)), cost = Math.round(fm.cost * (0.6 + rnd()) * (ver === 'v2' ? 0.5 : 1) * 10000) / 10000;
      lats.push(lat); costSum += cost;
      runs.push({ run_id, model: id, version: ver, group_id: g.id, shape: g.shape, expected: g.expected, verdict, pattern, flagged_transfer_ids: flagged, correct: verdict === g.expected, why: w, latency_ms: lat, cost_usd: cost, prism_trace_id: 'sample-' + run_id });
    });
    let tp = 0; F.forEach(x => { if (TRUTH.has(x)) tp++; }); let found = 0; RING_IDS.forEach(r => { const h = RINGS[r].filter(x => F.has(x)).length; if (h / RINGS[r].length >= 0.5) found++; });
    lats.sort((a, b) => a - b);
    models.push({ id, family: fm.family, version: ver, runs: groups.length, precision: F.size ? Math.round(tp / F.size * 1000) / 1000 : null, recall: Math.round(tp / Math.max(1, TRUTH.size) * 1000) / 1000, rings_found: found, rings_total: NRINGS, by_shape: by, false_rings: falseRings, cost_usd: Math.round(costSum * 100) / 100, latency_ms_median: lats[Math.floor(lats.length / 2)] || 0, prism_agent_name: 'rings-' + fm.family + '-' + ver });
  }));
  const fbs = {}; runs.forEach(r => { if (!r.correct && r.expected === 'ring') (fbs[r.shape] = fbs[r.shape] || []).push({ run_id: r.run_id, model: r.model, version: r.version }); });
  return { sample: true, dataset: { name: SL.sample ? 'SAMPLE network (made up)' : 'IBM AMLworld HI-Small (synthetic)', slice_transfers: TR.length, slice_laundering: TRUTH.size, groups: NRINGS, shapes: Object.fromEntries(SHAPES_HERE.map(s => [s, SHAPE_N[s].rings])) },
    versions: { v1: 'model reads the raw transfers of a candidate group', v2: 'code computes the group\'s facts (degrees, loops, timing, amounts, payment formats) and the model names the outcome' }, models, runs, failures_by_shape: fbs };
}

/* ---------- loading the bench output ---------- */
function loadScript(src) { return new Promise(res => { const t = document.createElement('script'); t.src = src; t.onload = () => res(true); t.onerror = () => res(false); document.head.append(t); }); }
async function loadBench() {
  if (!/^https?:/.test(location.protocol)) await loadScript(DATA + 'bench_results.js');
  if (/^https?:/.test(location.protocol)) {
    try { const r = await fetch(DATA + 'bench_results.json', { cache: 'no-store' }); if (r.ok) { const j = await r.json(); if (j && j.models) return { bench: j, src: DATA + 'bench_results.json' }; } } catch (e) { /* fall through */ }
  }
  if (window.BENCH && window.BENCH.models) return { bench: window.BENCH, src: DATA + 'bench_results.js' };
  return { bench: sampleBench(), src: 'SAMPLE', sample: true };
}

/* ---------- the panel: a unit is a pattern when at least k of the n complete families say so ---------- */
let PANEL = null; const PK = { ver: 'v1', k: 0 };
async function loadPanel() {
  if (/^https?:/.test(location.protocol)) { try { const r = await fetch(DATA + 'panel.json', { cache: 'no-store' }); if (r.ok) { const j = await r.json(); if (j && j.versions) return j; } } catch (e) { /* none */ } }
  else { if (!window.PANEL) await loadScript(DATA + 'panel.js'); }
  return window.PANEL && window.PANEL.versions ? window.PANEL : null;
}
function panelModel(ver, k) {
  const V = PANEL.versions[ver]; const fams = V.summary.families; const n = fams.length; const row = (V.vote_table || []).find(x => x.votes_needed === k) || {};
  const famRuns = {}; (BENCH.runs || []).forEach(r => { if (fams.includes(r.model) && (r.version || 'v1') === ver) famRuns[r.model + '|' + gid(r)] = r; });
  const R = V.agreement.map(u => {
    const yes = u.said_ring || []; const runs = yes.map(f => famRuns[f + '|' + u.unit]).filter(Boolean); const ring = u.ring_votes >= k;
    const ids = []; const seen = new Set(); runs.forEach(r => (r.flagged_transfer_ids || []).forEach(id => { if (!seen.has(id)) { seen.add(id); ids.push(id); } }));
    const pat = {}; runs.forEach(r => { if (r.pattern) pat[r.pattern] = (pat[r.pattern] || 0) + 1; }); const pattern = Object.keys(pat).sort((a, b) => pat[b] - pat[a])[0] || null;
    return { run_id: 'panel:' + u.unit, model: 'panel', version: ver, unit: u.unit, shape: u.shape, expected: u.expected, verdict: ring ? 'ring' : 'ordinary', pattern: ring ? pattern : null, flagged_transfer_ids: ring ? ids : [], correct: (ring ? 'ring' : 'ordinary') === u.expected,
      why: u.ring_votes + ' of ' + u.families + ' families said pattern' + (yes.length ? ': ' + yes.map(shortName).join(', ') : '') + (ring ? '. Flags are the union of what those families flagged.' : '. Under ' + k + ' votes, so the panel leaves it alone.'),
      latency_ms: runs.length ? Math.max(...runs.map(r => r.latency_ms || 0)) : null, cost_usd: runs.reduce((a, r) => a + (r.cost_usd || 0), 0), votes: u.ring_votes, of: u.families };
  });
  const cost = MODELS.filter(m => fams.includes(m.id) && m.version === ver).reduce((a, m) => a + (m.cost_usd || 0), 0);
  const m = { id: 'panel:' + ver + ':' + k, panel: true, k, n, fams, family: 'panel', version: ver, runs: R.length, precision: row.precision, recall: row.recall, rings_found: row.rings_found, rings_total: row.rings_total || NRINGS, false_rings: row.false_rings, verdict_right: row.verdict_right, cost_usd: cost, latency_ms_median: null, by_shape: null };
  const d = deriveModel(m, R); d.short = k + ' of ' + n + ' families'; return d;
}
function renderPanelRow() {
  const box = $('#panelRow'); if (!PANEL) { box.hidden = true; return; } box.hidden = false; box.innerHTML = '';
  const vers = Object.keys(PANEL.versions).filter(v => PANEL.versions[v].summary && PANEL.versions[v].summary.families.length);
  if (!vers.includes(PK.ver)) PK.ver = vers[0]; if (!vers.length) { box.hidden = true; return; }
  const V = PANEL.versions[PK.ver]; const n = V.summary.families.length;
  box.append(el('span', 'plabel', 'Or let the families vote:'));
  vers.forEach(v => { const b = el('button', 'chip vchip' + (v === PK.ver ? ' on' : ''), esc(v)); b.type = 'button'; b.title = (BENCH.versions || {})[v] || v; b.onclick = () => { PK.ver = v; renderPanelRow(); if (PK.k) pickPanel(PK.k); }; box.append(b); });
  box.append(el('span', 'plabel', 'families that must agree:'));
  (V.vote_table || []).forEach(row => { const k = row.votes_needed; const b = el('button', 'chip kchip', '<span class="k">' + k + '</span><span class="ver">of ' + n + '</span><span class="fig">' + row.rings_found + '/' + (row.rings_total || NRINGS) + '</span>'); b.type = 'button'; b.dataset.id = 'panel:' + PK.ver + ':' + k + '|' + PK.ver;
    b.title = 'A candidate group counts as a pattern when at least ' + k + ' of the ' + n + ' families that finished every group say so. Precision ' + pct(row.precision) + ' (' + wrongText(row.precision) + '), recall ' + pct(row.recall) + ', ' + row.rings_found + ' of ' + (row.rings_total || NRINGS) + ' found, ' + row.false_rings + ' false alarms. Click to put the panel\'s verdict on the network.';
    b.onclick = () => pickPanel(k); box.append(b); });
  box.append(Object.assign(el('span', 'plabel muted', n + ' families finished all ' + (UNITS || 60) + ' groups' + (PANEL.written ? ', panel written ' + PANEL.written.slice(11) : '')), { title: V.summary.families.join(', ') }));
}
function pickPanel(k) { PK.k = k; selectModel(panelModel(PK.ver, k), { replay: false }); }

/* ---------- per-model derivation from the runs ---------- */
let BENCH, SRC, IS_SAMPLE, MODELS = [], CUR_M = null, UNITS = 0;
const gid = r => r.group_id || r.unit || '?';
function shortName(id) { const k = id.indexOf('/'); return k >= 0 ? id.slice(k + 1) : id; }
function deriveModel(m0, Rgiven) {
  let m = m0;
  const R = (Rgiven || (BENCH.runs || []).filter(r => r.model === m.id && (r.version || 'v1') === (m.version || 'v1'))).sort((a, b) => a.run_id < b.run_id ? -1 : a.run_id > b.run_id ? 1 : 0);
  const F = new Set(); const flagRun = {}; R.forEach(r => (r.flagged_transfer_ids || []).forEach(id => { if (BYID[id]) { F.add(id); if (!flagRun[id]) flagRun[id] = r; } }));
  const G = R.filter(r => r.verdict === 'ring' && (r.flagged_transfer_ids || []).length).map(r => {
    const es = [], ns = new Set(); let hit = 0, n = 0;
    r.flagged_transfer_ids.forEach(id => { const t = BYID[id]; if (!t) return; n++; if (t.label) hit++; if (t.e >= 0) { es.push(t.e); ns.add(edges[t.e].u); ns.add(edges[t.e].v); } else ns.add(nodeIdx[t.from]); });
    return { r, es, ns: [...ns], hit, n, ok: n ? hit / n >= 0.5 : false };
  });
  const ringsFound = S => { let k = 0; RING_IDS.forEach(r => { let h = 0; RINGS[r].forEach(id => { if (S.has(id)) h++; }); if (h / RINGS[r].length >= 0.5) k++; }); return k; };
  const steps = [{ n: 0, tp: 0, fp: 0, prec: null, rec: 0, found: 0, alarms: 0 }]; const S = new Set(); let alarms = 0;
  G.forEach(g => { g.r.flagged_transfer_ids.forEach(id => { if (BYID[id]) S.add(id); }); if (g.r.expected !== 'ring') alarms++; let tp = 0; S.forEach(id => { if (TRUTH.has(id)) tp++; }); steps.push({ n: S.size, tp, fp: S.size - tp, prec: S.size ? tp / S.size : null, rec: TRUTH.size ? tp / TRUTH.size : 0, found: ringsFound(S), alarms }); });
  const litEdge = new Map(); G.forEach((g, gi) => g.es.forEach(e => { if (!litEdge.has(e)) litEdge.set(e, { gi, ok: edges[e].tr.label === 1 }); }));
  const missed = []; TR.forEach(t => { if (t.label && !F.has(t.id) && t.e >= 0) missed.push(t.e); });
  /* the engine sums flags per run, so a transfer flagged in two candidate groups counts twice; the recount does the same. The network draws the union. */
  let tp = 0, flags = 0; R.forEach(r => (r.flagged_transfer_ids || []).forEach(id => { const t = BYID[id]; if (!t) return; flags++; if (t.label) tp++; }));
  const denom = typeof m.fn === 'number' ? tp + m.fn : TRUTH.size;  /* recall over the labeled transfers in the groups this model has run so far */
  let tpU = 0; F.forEach(id => { if (TRUTH.has(id)) tpU++; });
  const recount = { flagged: flags, tp, prec: flags ? tp / flags : null, rec: denom ? tp / denom : 0, found: ringsFound(F), union: F.size, traced: tpU, fpU: F.size - tpU };
  const alarmRuns = R.filter(r => r.expected !== 'ring' && r.verdict === 'ring'); const alarmsOnRing = alarmRuns.filter(r => (r.ring_accounts_flagged || []).length).length;
  if (m.precision === 0 && (m.tp || 0) + (m.fp || 0) === 0) m = Object.assign({}, m, { precision: null });
  const hasIds = F.size > 0;
  const near = (a, b) => a == null && b == null ? true : a == null || b == null ? false : Math.abs(a - b) < 0.006;
  const checked = hasIds && near(recount.prec, m.precision) && near(recount.rec, m.recall) && recount.found === m.rings_found;
  const perRing = RING_IDS.map(r => { const ids = RINGS[r]; const hit = ids.filter(id => F.has(id)).length; const run = R.find(x => x.expected === 'ring' && ids.some(id => (x.flagged_transfer_ids || []).includes(id))) || R.find(x => x.expected === 'ring' && x.shape === ringShape(r) && x.verdict !== 'ring'); return { r, shape: ringShape(r), n: ids.length, hit, found: hit / ids.length >= 0.5, run }; });
  return Object.assign({}, m, { version: m.version || 'v1', short: shortName(m.id), R, F, G, steps, litEdge, missed, recount, hasIds, checked, flagRun, perRing, ringsTotal: m.rings_total || NRINGS, alarms: alarmRuns.length, alarmsOnRing, hasAcct: R.some(r => r.ring_accounts_flagged != null) });
}
function orderModels(list) {
  const fam = {}, mid = {}; list.forEach(m => { const r = m.recall == null ? -1 : m.recall; fam[m.family] = Math.max(fam[m.family] == null ? -1 : fam[m.family], r); mid[m.id] = Math.max(mid[m.id] == null ? -1 : mid[m.id], r); });
  return list.slice().sort((a, b) => (fam[b.family] - fam[a.family]) || (a.family < b.family ? -1 : a.family > b.family ? 1 : 0) || (mid[b.id] - mid[a.id]) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0) || (a.version < b.version ? -1 : 1));
}

/* ---------- replay ---------- */
const TA = 3, TB = 7, TC = 1.5, TOTAL = TA + TB + TC;
let T = TOTAL, playing = false, last = 0, showTruth = false;
const PH = T => T < TA ? 0 : T < TA + TB ? 1 : 2;
const P = { cam: { x: 0, y: 0, s: 1 }, tgt: null, shown: 0, parts: [], spawned: 0, W: 0, H: 0, dpr: 1, landed: true, litAt: {} };
/* the one reveal: the result resolving into place (600 ms, eased; instant under reduced motion) */
function land() { const h = $('#headline'); h.classList.remove('land'); void h.offsetWidth; h.classList.add('land'); }
const HL = { es: [], until: 0, node: -1 };
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const stage = $('#stage'), cv = $('#cv'), ctx = cv.getContext('2d');
function resize() { const w = stage.clientWidth || 600, h = stage.clientHeight || 400; const dpr = Math.min(window.devicePixelRatio || 1, 2); cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); P.W = w; P.H = h; P.dpr = dpr; }
function fitCam() { const w = P.W || 600, h = P.H || 400; const bw = WB.maxx - WB.minx + 40, bh = WB.maxy - WB.miny + 40; return { x: (WB.minx + WB.maxx) / 2, y: (WB.miny + WB.maxy) / 2, s: Math.min(w / bw, h / bh) }; }
function camFor(ns) { let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9; ns.forEach(v => { const n = nodes[v]; minx = Math.min(minx, n.x); maxx = Math.max(maxx, n.x); miny = Math.min(miny, n.y); maxy = Math.max(maxy, n.y); }); const bw = Math.max(maxx - minx, 150) + 90, bh = Math.max(maxy - miny, 100) + 90; return { x: (minx + maxx) / 2, y: (miny + maxy) / 2, s: Math.min(P.W / bw, P.H / bh) }; }
const sx = x => (x - P.cam.x) * P.cam.s + P.W / 2, sy = y => (y - P.cam.y) * P.cam.s + P.H / 2;

function draw(T) {
  const c = ctx, d = P.dpr; c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, P.W, P.H);
  const net = css('--net-edge'), nodeC = css('--net-node'), ok = css('--net-ok'), bad = css('--net-bad'), miss = css('--net-miss'), part = css('--net-particle'), acc = css('--accent');
  const ph = PH(T), a = CUR_M, zoom = P.cam.s; const done = T >= TOTAL - 0.01;
  c.lineWidth = 1; c.strokeStyle = net; c.globalAlpha = ph === 0 ? 0.3 : 0.42; c.beginPath();
  for (let i = 0; i < edges.length; i++) { const e = edges[i]; c.moveTo(sx(nodes[e.u].x), sy(nodes[e.u].y)); c.lineTo(sx(nodes[e.v].x), sy(nodes[e.v].y)); }
  c.stroke(); c.globalAlpha = 1;
  const reveal = ph === 2 || done;
  if (showTruth) { c.strokeStyle = miss; c.globalAlpha = 0.5; c.lineWidth = 1.4; c.beginPath(); TR.forEach(t => { if (t.label && t.e >= 0) { const e = edges[t.e]; c.moveTo(sx(nodes[e.u].x), sy(nodes[e.u].y)); c.lineTo(sx(nodes[e.v].x), sy(nodes[e.v].y)); } }); c.stroke(); c.globalAlpha = 1; }
  if (reveal && a) {
    const pulse = done ? 0.9 : 0.75 + 0.25 * Math.sin(T * 5); c.strokeStyle = miss; c.lineWidth = 3; c.setLineDash([5, 4]); c.globalAlpha = pulse; c.beginPath();
    a.missed.forEach(ei => { const e = edges[ei]; c.moveTo(sx(nodes[e.u].x), sy(nodes[e.u].y)); c.lineTo(sx(nodes[e.v].x), sy(nodes[e.v].y)); }); c.stroke(); c.setLineDash([]);
    c.fillStyle = miss; a.missed.forEach(ei => { const e = edges[ei]; [e.u, e.v].forEach(v => { c.beginPath(); c.arc(sx(nodes[v].x), sy(nodes[v].y), 3.2, 0, 6.3); c.fill(); }); }); c.globalAlpha = 1;
  }
  if (a) {
    for (const ok2 of [true, false]) {
      c.strokeStyle = ok2 ? ok : bad; c.lineWidth = 2.4; c.setLineDash(ok2 ? [] : [6, 4]); c.beginPath(); let any = false;
      a.litEdge.forEach((v, ei) => { if (v.ok === ok2 && v.gi < P.shown) { any = true; const e = edges[ei]; c.moveTo(sx(nodes[e.u].x), sy(nodes[e.u].y)); c.lineTo(sx(nodes[e.v].x), sy(nodes[e.v].y)); } });
      if (any) c.stroke();
    }
    c.setLineDash([]);
  }
  const r0 = Math.max(1.4, Math.min(3, 1.6 * Math.sqrt(zoom) + 0.6));
  c.fillStyle = nodeC;
  for (let i = 0; i < nodes.length; i++) { const n = nodes[i]; const X = sx(n.x), Y = sy(n.y); if (X < -5 || Y < -5 || X > P.W + 5 || Y > P.H + 5) continue; c.beginPath(); c.arc(X, Y, r0, 0, 6.3); c.fill(); }
  if (a) {
    for (let gi = 0; gi < P.shown && gi < a.G.length; gi++) {
      const G = a.G[gi]; c.fillStyle = G.ok ? ok : bad;
      G.ns.forEach(v => { const n = nodes[v]; const X = sx(n.x), Y = sy(n.y); c.beginPath(); c.arc(X, Y, r0 + 2.2, 0, 6.3); c.fill(); });
      /* the catch moment: a caught ring resolves on screen over 450 ms (a thick stroke that settles into the green line); misses and false alarms stay quiet */
      const lit = P.litAt[gi]; if (G.ok && !REDUCED && lit != null && !done) { const k = Math.min(1, (performance.now() - lit) / 450); if (k < 1) { const e1 = 1 - Math.pow(1 - k, 3);
        c.strokeStyle = ok; c.lineWidth = 2.4 + 7 * (1 - e1); c.globalAlpha = 0.95 * (1 - e1) + 0.05; c.beginPath(); G.es.forEach(ei => { const e = edges[ei]; c.moveTo(sx(nodes[e.u].x), sy(nodes[e.u].y)); c.lineTo(sx(nodes[e.v].x), sy(nodes[e.v].y)); }); c.stroke();
        c.fillStyle = ok; G.ns.forEach(v => { const n = nodes[v]; c.beginPath(); c.arc(sx(n.x), sy(n.y), r0 + 2.2 + 10 * (1 - e1), 0, 6.3); c.fill(); }); c.globalAlpha = 1; } }
    }
  }
  if (ph === 0 || T < TA + 1) {
    c.fillStyle = part; P.parts.forEach(q => { const e = edges[q.e]; const k = Math.min(1, (T - q.t) / 0.9); if (k < 0 || k > 1) return; const X = sx(nodes[e.u].x + (nodes[e.v].x - nodes[e.u].x) * k), Y = sy(nodes[e.u].y + (nodes[e.v].y - nodes[e.u].y) * k); c.globalAlpha = 0.85; c.beginPath(); c.arc(X, Y, 2.2, 0, 6.3); c.fill(); }); c.globalAlpha = 1;
  }
  if (a && P.shown > 0 && !done) {
    a.litEdge.forEach((v, ei) => { if (v.gi >= P.shown) return; const e = edges[ei]; const k = ((T * 0.55 + (ei * 0.37 % 1)) % 1); const X = sx(nodes[e.u].x + (nodes[e.v].x - nodes[e.u].x) * k), Y = sy(nodes[e.u].y + (nodes[e.v].y - nodes[e.u].y) * k); c.fillStyle = v.ok ? ok : bad; c.beginPath(); c.arc(X, Y, 3, 0, 6.3); c.fill(); });
  }
  if (HL.es.length && (HL.until === Infinity || performance.now() < HL.until)) {
    c.strokeStyle = acc; c.lineWidth = HL.until === Infinity ? 3.5 : 5; c.globalAlpha = HL.until === Infinity ? 0.9 : 0.55 + 0.4 * Math.sin(performance.now() / 120); c.beginPath();
    HL.es.forEach(ei => { const e = edges[ei]; c.moveTo(sx(nodes[e.u].x), sy(nodes[e.u].y)); c.lineTo(sx(nodes[e.v].x), sy(nodes[e.v].y)); }); c.stroke(); c.globalAlpha = 1;
    if (HL.node >= 0) { const n = nodes[HL.node]; c.strokeStyle = acc; c.lineWidth = 2.5; c.beginPath(); c.arc(sx(n.x), sy(n.y), r0 + 7, 0, 6.3); c.stroke(); }
  }
}

function update(T, dt) {
  const a = CUR_M; if (!a) return; const ph = PH(T);
  if (T < TA + 1) {
    const frac = Math.min(1, T / TA); const upTo = T0 + (T1 - T0) * frac;
    while (P.spawned < EDGE_ORDER.length && edges[EDGE_ORDER[P.spawned]].t <= upTo) { P.parts.push({ e: EDGE_ORDER[P.spawned], t: T }); P.spawned++; }
    P.parts = P.parts.filter(q => T - q.t < 1);
  } else P.parts = [];
  const tb = ph === 0 ? 0 : Math.min(1, (T - TA) / TB);
  const want = ph === 0 ? 0 : Math.round(tb * a.G.length);
  /* two zooms, named in advance: (1) into the first pattern the model flags, (2) the pull back to the whole for the result */
  if (want > P.shown) { const first = P.shown === 0; for (let gi = P.shown; gi < want; gi++) { P.litAt[gi] = performance.now(); if (a.G[gi] && a.G[gi].ok) rosterCatch(a.G[gi], true); } P.shown = want; const G = a.G[0]; if (first && G && G.ns.length >= 3) P.tgt = camFor(G.ns); }
  else if (want < P.shown) P.shown = want;
  if (T >= TA + TB * 0.45) P.tgt = fitCam();
  if (ph === 0 && P.shown === 0) P.tgt = fitCam();
  if (P.tgt) { const k = Math.min(1, dt * 2.2); P.cam.x += (P.tgt.x - P.cam.x) * k; P.cam.y += (P.tgt.y - P.cam.y) * k; P.cam.s += (P.tgt.s - P.cam.s) * k; }
  /* values are final before they light: the tiles show the real cumulative count after each flagged group, never a tween */
  const st = a.steps[Math.min(P.shown, a.steps.length - 1)];
  const done = T >= TOTAL - 0.01;
  renderTiles(done ? null : { prec: st.prec, rec: st.rec, fp: st.fp, found: st.found, tp: st.tp, alarms: st.alarms, hasPrec: st.prec != null }, done);
  if (done && !P.landed) { P.landed = true; land(); rosterFinish(); }
  const G = P.shown ? a.G[P.shown - 1] : null;
  const phaseEl = $('#phase');
  if (done) phaseEl.innerHTML = glyph('ordinary') + '<span>Result: ' + esc(a.short) + ' ' + esc(a.version) + '. Amber dotted = IBM\'s laundering it missed.</span>';
  else if (ph === 0) phaseEl.innerHTML = '<span>Ten days of transfers: ' + num(TR.length) + ' in this slice, ' + num(nodes.length) + ' accounts</span>';
  else if (ph === 1 && G) { const sh = G.r.pattern || G.r.shape || 'other'; phaseEl.innerHTML = glyph(sh) + '<span>' + esc(a.short) + ' ' + esc(a.version) + ' flags ' + esc(gid(G.r)) + ' as ' + esc(sh) + ': ' + (G.ok ? 'IBM agrees' : 'a false alarm') + '</span>'; }
  else if (ph === 1) phaseEl.innerHTML = '<span>' + esc(a.short) + ' ' + esc(a.version) + ' works through ' + num(a.R.length) + ' candidate groups</span>';
  else phaseEl.innerHTML = '<span>What it missed: amber dotted</span>';
  const sim = new Date((T0 + (T1 - T0) * Math.min(1, T / TA)) * 60000);
  $('#clock').textContent = done ? num(a.F.size) + ' transfers flagged' : ph === 0 ? sim.toISOString().slice(0, 16).replace('T', ' ') : 'replay ' + Math.round(T) + ' s of ' + Math.round(TOTAL);
  $('#bar').style.width = (T / TOTAL * 100) + '%';
  $('#headline').classList.toggle('pending', !done);
}

function loop(ts) {
  const dt = Math.min(0.1, (ts - (last || ts)) / 1000); last = ts;
  if (playing) { T += dt; if (T >= TOTAL) { T = TOTAL; playing = false; $('#play').textContent = 'Replay the hunt'; } }
  if (!P.W) resize();
  if (CUR_M) { update(T, dt); if (T >= TOTAL) P.shown = CUR_M.G.length; draw(T); }
  requestAnimationFrame(loop);
}
function restart() { T = 0; P.spawned = 0; P.parts = []; P.shown = 0; P.landed = false; P.litAt = {}; rosterReset(); P.cam = fitCam(); P.tgt = null; playing = true; $('#play').textContent = 'Pause'; }
function skip() { T = TOTAL; playing = false; P.parts = []; P.cam = fitCam(); P.tgt = null; P.litAt = {}; if (CUR_M) P.shown = CUR_M.G.length; $('#play').textContent = 'Replay the hunt'; rosterReset(); rosterFinish(); P.landed = true; }

/* ---------- hover on the network ---------- */
function nearestEdge(ev) {
  const r = cv.getBoundingClientRect(); const mx = ev.clientX - r.left, my = ev.clientY - r.top; let best = -1, bd = 36;
  for (let i = 0; i < edges.length; i++) {
    const e = edges[i]; const x1 = sx(nodes[e.u].x), y1 = sy(nodes[e.u].y), x2 = sx(nodes[e.v].x), y2 = sy(nodes[e.v].y);
    const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy + 1e-6; let k = ((mx - x1) * dx + (my - y1) * dy) / l2; k = Math.max(0, Math.min(1, k)); const px = x1 + k * dx - mx, py = y1 + k * dy - my; const d = px * px + py * py;
    if (d < bd) { bd = d; best = i; }
  }
  return best < 0 ? null : edges[best].tr;
}
function hover(ev) {
  if (!CUR_M) return; const tip = $('#tip'); const t = nearestEdge(ev); if (!t) { tip.hidden = true; return; } const a = CUR_M; const flagged = a.F.has(t.id); const run = a.flagRun[t.id]; const known = (T >= TOTAL - 0.01 || showTruth);
  tip.innerHTML = '<b>' + esc(t.id) + '</b> · ' + esc(t.ts) + '<br>' + esc(t.from) + ' to ' + esc(t.to) + '<br>' + Money.html(t.paid, t.cur) + ' ' + esc(t.cur) + ' · ' + esc(t.fmt) +
    '<br>' + (flagged ? 'flagged by ' + esc(a.short) + ' ' + esc(a.version) + (run ? ' in ' + esc(run.run_id) + ' (' + esc(gid(run)) + ', called ' + esc(run.pattern || run.verdict) + ')' : '') : 'not flagged by ' + esc(a.short) + ' ' + esc(a.version)) +
    (known ? '<br>IBM label: ' + (t.label ? '<b>laundering</b>, in an IBM ' + esc(ringShape(t.ring)) + ' group' : 'ordinary') : '') + '<br><span class="muted">click to open ' + esc(t.from) + ' on the desk</span>';
  tip.hidden = false; tip.style.left = Math.min(window.innerWidth - 350, ev.clientX + 14) + 'px'; tip.style.top = (ev.clientY + 14) + 'px';
}

/* ---------- the result ---------- */
function selectModel(m, opts) {
  opts = opts || {}; CUR_M = m; P.shown = 0; P.parts = []; P.spawned = 0; if (!m.panel) PK.k = 0;
  document.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c.dataset.id === m.id + '|' + m.version));
  const sel = $('#modelPick'); if (sel && !m.panel) sel.value = m.id + '|' + m.version;
  document.querySelectorAll('.board tbody tr').forEach(c => c.classList.toggle('on', c.dataset.id === m.id + '|' + m.version));
  renderHeadline(); renderHeldout(); if (opts.replay) restart(); else skip(); if (DESK.acct) renderAccount();
}
function renderHeadline() {
  const m = CUR_M;
  if (m.panel) {
    const V = PANEL.versions[m.version]; const S = V.summary; const t = V.vote_table || []; const first = t[0], last = t[t.length - 1];
    $('#headline').innerHTML = 'A panel of <b>' + m.n + ' families</b>, <b>' + m.k + '</b> required to agree, caught <b>' + m.rings_found + ' of IBM\'s ' + m.ringsTotal + ' laundering rings</b> and traced <b>' + num(m.recount.traced) + ' of ' + num(TRUTH.size) + '</b> laundering transfers; it raised <b>' + num(m.alarms) + '</b> alarms on ordinary neighborhoods.';
    $('#strong').hidden = true;
    let vs = 'On the ' + NRINGS + ' IBM laundering groups the families agree (' + S.ring_units_all_agree_ring + ' unanimous, ' + S.ring_units_none_say_ring + ' missed by all); on the ' + ((UNITS || 60) - NRINGS) + ' ordinary neighborhoods they split (' + S.ordinary_units_split + ' of ' + ((UNITS || 60) - NRINGS) + '). Disagreement is the signal for a false alarm.';
    if (first && last && first !== last) vs += ' Requiring all ' + m.n + ' instead of 1 drops false alarms from ' + first.false_rings + ' to ' + last.false_rings + ' and patterns found from ' + first.rings_found + ' to ' + last.rings_found + '.';
    $('#versus').textContent = vs + ' ' + m.version + ' panel: ' + m.fams.map(shortName).join(', ') + '.';
    $('#basis').textContent = 'basis: ' + m.n + ' families x ' + (UNITS || 60) + ' groups, ' + m.version + ' · vote table from panel.json · labels: IBM · scorer: ours · source: ' + (IS_SAMPLE ? 'SAMPLE' : SRC.replace(DATA, ''));
    return;
  }
  const traced = m.recount.traced;
  $('#headline').innerHTML = '<b>' + esc(m.short) + ' ' + esc(m.version) + '</b> caught <b>' + m.rings_found + ' of IBM\'s ' + m.ringsTotal + ' laundering rings</b> and traced <b>' + num(traced) + ' of ' + num(TRUTH.size) + '</b> laundering transfers; it raised <b>' + num(m.alarms) + '</b> alarm' + (m.alarms === 1 ? '' : 's') + ' on ordinary neighborhoods' + (m.hasAcct ? ', <b>' + num(m.alarmsOnRing) + '</b> of them on accounts that sit inside a ring' : '') + '.';
  let vs;
  vs = '';
  if (m.precision == null) vs = 'It flagged nothing.';
  /* compare with the adjacent version of the same model: v1 with v2, v2 with v3 (or v1 when no v3), v3 with v2 */
  const sibs = MODELS.filter(x => x.id === m.id && x.version !== m.version && x.runs).sort((x, y) => x.version < y.version ? -1 : 1);
  const twin = sibs.find(x => x.version > m.version) || sibs.slice().reverse().find(x => x.version < m.version);
  const VW = { v2: 'code computes the facts first', v2x: 'the same, with the payment format hidden from the model', v3: 'facts plus a knowledge-base lookup' };
  if (twin) { const a = m.version < twin.version ? m : twin, b = a === m ? twin : m; const w = VW[b.version] || (BENCH.versions || {})[b.version]; vs += ' ' + a.version + ' to ' + b.version + (w ? ' (' + w + ')' : '') + ': alarms ' + num(a.alarms) + ' to ' + num(b.alarms) + ', rings caught ' + a.rings_found + ' to ' + b.rings_found + (b.runs < (UNITS || b.runs) ? ' so far' : '') + '.'; }
  /* the limit, in one line */
  const missedShapes = m.perRing.filter(p => !p.found).map(p => p.shape); const ms = {}; missedShapes.forEach(x => ms[x] = (ms[x] || 0) + 1);
  const plural = { lone: ['single transfer', 'single transfers'], other: ['group of another shape', 'groups of other shapes'], mesh: ['mesh', 'meshes'], chain: ['chain', 'chains'], cycle: ['cycle', 'cycles'], 'fan-in': ['fan-in', 'fan-ins'], 'fan-out': ['fan-out', 'fan-outs'], 'scatter-gather': ['scatter-gather', 'scatter-gathers'] };
  const missedTxt = missedShapes.length ? 'Missed ' + missedShapes.length + ': ' + Object.keys(ms).map(k => ms[k] + ' ' + (plural[k] || [k, k + 's'])[ms[k] > 1 ? 1 : 0]).join(', ') + '.' : 'Missed none.';
  vs += ' ' + missedTxt + ' The rule a bank could run catches ' + BURST.found + ' of ' + NRINGS + ' but flags ' + num(BURST.flagged - BURST.tp) + ' ordinary transfers to do it; this model flagged ' + num(m.recount.fpU) + '.';
  if (m.technical_failures) vs += ' ' + m.technical_failures + ' of ' + m.runs + ' runs failed technically (no usable answer came back).';
  if (UNITS && m.runs < UNITS) vs += ' So far: ' + m.runs + ' of ' + UNITS + ' candidate groups run.';
  $('#versus').textContent = vs.trim() + (IS_SAMPLE ? ' SAMPLE numbers: made up by this page to show the layout.' : '');
  /* end on the strongest true number */
  const full = SHAPES_HERE.filter(sh => { const b = (m.by_shape || {})[sh]; return b && b.rings >= 1 && b.found === b.rings && sh !== 'lone' && sh !== 'other'; });
  const strong = full.length >= 2 ? 'Every ' + full.map(x => x === 'mesh' ? 'mesh' : x).join(', every ') + ' in the slice: caught.' : traced ? num(traced) + ' of ' + num(TRUTH.size) + ' laundering transfers traced, ' + pct(traced / TRUTH.size) + '.' : '';
  $('#strong').textContent = strong; $('#strong').hidden = !strong;
  $('#basis').textContent = 'basis: ' + num(m.R.length) + ' runs, one per candidate group · ' + num(TR.length) + ' transfers, ' + num(TRUTH.size) + ' labeled laundering · labels: IBM · scorer: ours · source: ' + (IS_SAMPLE ? 'SAMPLE' : SRC.replace(DATA, ''));
}
function renderChips() {
  const sel = $('#modelPick'); sel.innerHTML = '';
  MODELS.forEach(m => { const o = el('option'); o.value = m.id + '|' + m.version; o.textContent = m.short + ' ' + m.version + '  ' + m.rings_found + ' of ' + m.ringsTotal + ', ' + wrongText(m.precision).replace(' times', '').replace(' time', ''); sel.append(o); });
  sel.onchange = () => { const [id, ver] = sel.value.split('|'); const m = MODELS.find(x => x.id === id && x.version === ver); if (m) selectModel(m, { replay: true }); };
  sel.title = 'Pick a model: the network replays its hunt and the result updates. ' + MODELS.length + ' models in the bench.';
  $('#pickNote').textContent = MODELS.length + ' models' + (UNITS ? ', ' + (UNITS) + ' candidate groups each' : '');
}
function renderTiles(live, done) {
  const m = CUR_M; if (!m) return; const box = $('#tiles');
  const v = live ? { found: Math.round(live.found), traced: live.tp, alarms: live.alarms, rec: live.rec, prec: live.hasPrec ? live.prec : null } : { found: m.rings_found, traced: m.recount.traced, alarms: m.alarms, rec: m.recall, prec: m.precision };
  const tiles = [
    { cls: 'ok', b: v.found + ' <span style="display:inline;font-size:14px;color:var(--muted-fg)">of ' + m.ringsTotal + '</span>', s: 'of IBM\'s laundering rings caught', t: 'One of IBM\'s rings counts as caught when at least half of its transfers are flagged (page recount: ' + m.recount.found + ' of ' + NRINGS + '; engine: ' + m.rings_found + '). Click for every ring and what this model said about it.', d: 'rings' },
    { cls: 'ok', b: num(v.traced) + ' <span style="display:inline;font-size:14px;color:var(--muted-fg)">of ' + num(TRUTH.size) + '</span>', s: 'laundering transfers traced', t: 'Distinct IBM-labeled laundering transfers this model flagged, counted by the page from the flagged ids. Recall as the engine counts it: ' + pct(m.recall) + '.', d: 'rings' },
    { cls: 'quiet', b: num(v.alarms), e: m.hasAcct && !live ? num(m.alarmsOnRing) + ' on accounts inside a ring' : null, s: 'alarms on ordinary neighborhoods', t: 'Ordinary neighborhoods this model called a laundering pattern. Every ordinary neighborhood in this slice holds an account that sits in one of IBM\'s rings, so such an alarm usually points at a real laundering account\'s unlabeled traffic. Click for each one and the model\'s own why.', d: 'false' },
    { cls: '', b: pct(v.prec), e: wrongText(v.prec), s: 'precision: flags that were real', t: 'Share of flagged transfers IBM labels laundering. "Wrong N in ten" is (1 minus precision) times ten, rounded. Engine: ' + pct(m.precision) + '; page recount: ' + pct(m.recount.prec) + '.', d: 'false' },
    { cls: '', b: pct(v.rec), s: 'recall: laundering found', t: 'Share of IBM-labeled laundering transfers this model flagged, as the engine counts it. Page recount: ' + pct(m.recount.rec) + '.', d: 'rings' },
    { cls: '', b: Money.html(m.cost_usd, 'USD'), s: m.panel ? 'cost of the ' + m.n + ' families\' runs' : 'cost of all ' + num(m.runs) + ' runs', t: 'US dollars for every run of this model, as reported by the engine (Nicrron pricing). Per run: ' + Money.fmt(m.runs ? m.cost_usd / m.runs : null, 'USD', { decimals: 4 }) + '. Click for the runs.', d: 'cost' },
    { cls: '', b: m.panel ? '–' : secs(m.latency_ms_median), s: m.panel ? 'time: the slowest family per group' : 'median time per run', t: 'Median wall-clock time of one run (one candidate group). Click for the slowest runs.', d: 'latency' }
  ];
  const more = $('#tilesMore'); const main = [0, 1, 2], rest = [3, 4, 5, 6];
  if (box.children.length !== main.length) { box.innerHTML = ''; main.forEach(i => { const b = el('button', 'tile'); b.type = 'button'; b.dataset.i = i; box.append(b); }); }
  if (more.children.length !== rest.length) { more.innerHTML = ''; rest.forEach(i => { const b = el('button', 'tile'); b.type = 'button'; b.dataset.i = i; more.append(b); }); }
  [...box.children, ...more.children].forEach(b => { const t = tiles[+b.dataset.i]; b.className = 'tile ' + t.cls; b.title = t.t; b.onclick = () => openDrawer(t.d, m); b.innerHTML = '<b class="fig">' + t.b + '</b>' + (t.e ? '<em>' + esc(t.e) + '</em>' : '') + '<span>' + esc(t.s) + '</span>'; });
}

/* ---------- leaderboard ---------- */
function renderBoard() {
  const th = [['Model', 'Family and model id, as reachable through the one Nicrron key'], ['Precision', 'Flags that were real, per the engine. Under it: wrong N times in ten.'], ['Recall', 'IBM-labeled laundering this model found'], ['Found', 'IBM\'s laundering groups found, of ' + NRINGS], ['False', 'Ordinary groups the model called a pattern'], ['Right', 'Candidate groups where the verdict (pattern or ordinary) matched IBM\'s label, of the groups run so far'], ['Cost', 'US dollars for all runs of this model'], ['Median', 'Median wall-clock time of one run'], ['Check', 'This page recounted precision, recall and patterns found from the flagged transfer ids in the runs. Matches = the engine\'s numbers and the recount agree within half a point.']];
  const X = { Recall: 1, Right: 1, Cost: 1, Median: 1, Check: 1 };
  let h = '<thead><tr>' + th.map((x, i) => '<th class="' + (i < 1 ? 'l ' : '') + (X[x[0]] ? 'x' : '') + '" title="' + esc(x[1]) + '">' + esc(x[0]) + '</th>').join('') + '</tr></thead><tbody>';
  const best = { prec: Math.max(...MODELS.map(m => m.precision == null ? -1 : m.precision)), rec: Math.max(...MODELS.map(m => m.recall == null ? -1 : m.recall)), found: Math.max(...MODELS.map(m => m.rings_found || 0)) };
  let lastFam = null;
  MODELS.forEach(m => {
    const first = m.family !== lastFam; lastFam = m.family;
    if (first) h += '<tr class="famrow"><th class="l" colspan="9">' + esc(m.family) + '</th></tr>';
    h += '<tr data-id="' + esc(m.id + '|' + m.version) + '" title="Click: put this model\'s flags on the network">' +
      '<td class="l"><span class="mid">' + esc(m.short) + '</span> <span class="ver" title="' + esc((BENCH.versions || {})[m.version] || '') + '">' + esc(m.version) + '</span>' + (UNITS && m.runs < UNITS ? '<span class="prog" title="' + m.runs + ' of ' + UNITS + ' candidate groups run so far; the file is still filling"><i style="width:' + Math.round(m.runs / UNITS * 100) + '%"></i></span>' : '') + '</td>' +
      '<td class="fig ' + (m.precision != null && m.precision === best.prec ? 'best' : '') + '">' + pct(m.precision) + '<span class="wrong">' + esc(wrongText(m.precision).replace(' times', '').replace(' time', '')) + '</span></td>' +
      '<td class="fig x ' + (m.recall === best.rec ? 'best' : '') + '">' + pct(m.recall) + '</td>' +
      '<td class="fig ' + (m.rings_found === best.found ? 'best' : '') + '">' + m.rings_found + ' of ' + m.ringsTotal + '</td>' +
      '<td class="fig">' + num(m.false_rings) + '</td>' +
      '<td class="fig x">' + (m.verdict_right == null ? '–' : m.verdict_right + ' of ' + num(m.runs)) + (m.technical_failures ? '<span class="wrong">' + m.technical_failures + ' failed to run</span>' : '') + '</td>' +
      '<td class="fig x">' + Money.html(m.cost_usd, 'USD') + '</td>' +
      '<td class="fig x">' + secs(m.latency_ms_median) + '</td>' +
      '<td class="x">' + (m.hasIds ? '<span class="vbadge ' + (m.checked ? 'ok' : 'warn') + '" title="' + esc('Page recount from the flagged ids in the runs (a transfer flagged in two groups counts twice, as the engine counts): precision ' + pct(m.recount.prec) + ', recall ' + pct(m.recount.rec) + ', found ' + m.recount.found + ' of ' + NRINGS + '. Engine: ' + pct(m.precision) + ', ' + pct(m.recall) + ', ' + m.rings_found + '. Distinct transfers flagged: ' + num(m.recount.union) + '.') + '">' + (m.checked ? 'matches' : 'differs') + '</span>' : '<span class="vbadge plain" title="No flagged transfer ids in this model\'s runs, so the page cannot recount or draw its flags.">no ids</span>') + '</td></tr>';
  });
  h += '<tr class="rule" title="Plain code, not an AI, no payment-format tell: flag every transfer of an account that deals with ' + BURST_K + ' or more different accounts inside a day. Recounted by this page from the slice."><td class="l"><span class="mid">rule a bank could run: ' + BURST_K + '+ counterparties in a day</span> <span class="ver">code</span></td><td class="fig">' + pct(BURST.precision) + '<span class="wrong">' + esc(wrongText(BURST.precision).replace(' times', '')) + '</span></td><td class="fig x">' + pct(BURST.recall) + '</td><td class="fig">' + BURST.found + ' of ' + NRINGS + '</td><td class="fig">–</td><td class="fig x">–</td><td class="fig x">' + Money.html(0, 'USD') + '</td><td class="fig x">0.0 s</td><td class="x"><span class="vbadge ok" title="Recounted by this page from the slice">recount</span></td></tr>';
  h += '<tr class="rule" title="The slice\'s tell, not a rule a bank could run: every laundering transfer in this slice is ACH, so flagging every ACH transfer between two accounts catches all of them. On the whole file ACH is common in ordinary traffic too. Recounted by this page from the slice."><td class="l"><span class="mid">the tell: flag every ACH transfer</span> <span class="ver">leak</span></td><td class="fig">' + pct(RULE.precision) + '<span class="wrong">' + esc(wrongText(RULE.precision).replace(' times', '')) + '</span></td><td class="fig x">' + pct(RULE.recall) + '</td><td class="fig">' + RULE.found + ' of ' + NRINGS + '</td><td class="fig">–</td><td class="fig x">–</td><td class="fig x">' + Money.html(0, 'USD') + '</td><td class="fig x">0.0 s</td><td class="x"><span class="vbadge ok" title="Recounted by this page from the slice">recount</span></td></tr>';
  $('#boardTable').innerHTML = h + '</tbody>'; $('#boardTable').classList.toggle('full', $('#boardMore').checked);
  document.querySelectorAll('.board tbody tr[data-id]').forEach(tr => { tr.onclick = () => { const [id, ver] = tr.dataset.id.split('|'); const m = MODELS.find(x => x.id === id && x.version === ver); if (m) selectModel(m, { replay: false }); }; });
  $('#boardNote').textContent = MODELS.length + ' models, ' + num(BENCH.runs ? BENCH.runs.length : 0) + (UNITS ? ' of ' + num(UNITS * MODELS.length) : '') + ' runs, one per model per candidate group' + (BENCH.written ? ', written ' + BENCH.written : '');
}

/* ---------- failures by shape ---------- */
function renderGrid() {
  let h = '<thead><tr><th class="l">Shape</th>' + MODELS.map(m => '<th title="' + esc(m.id + ' ' + m.version) + '"><span class="rot">' + esc(m.short) + ' <b>' + esc(m.version) + '</b></span></th>').join('') + '</tr></thead><tbody>';
  SHAPES_HERE.forEach(s => {
    h += '<tr><th class="l sh" title="' + esc(SHAPE_WORDS[s] + '. ' + SHAPE_N[s].rings + ' groups IBM marked, ' + SHAPE_N[s].edges + ' transfers.') + '">' + glyph(s) + '<span><b>' + esc(s) + '</b><small>' + SHAPE_N[s].rings + ' from IBM</small></span></th>';
    MODELS.forEach(m => {
      const b = (m.by_shape || {})[s]; const rings = b ? b.rings : SHAPE_N[s].rings; const ran = m.R.filter(r => r.expected === 'ring' && r.shape === s).length; const found = b && ran ? b.found : null;
      const frac = found == null || !rings ? null : found / rings; const cls = frac == null ? 'na' : frac === 0 ? 'c0' : frac < 0.5 ? 'c1' : frac < 1 ? 'c2' : 'c3';
      h += '<td><button type="button" class="' + cls + '" data-s="' + esc(s) + '" data-id="' + esc(m.id + '|' + m.version) + '" title="' + esc(m.short + ' ' + m.version + ': ' + (found == null ? 'has not run a ' + s + ' group yet' : found + ' of ' + rings + ' ' + s + ' patterns found (' + ran + ' of ' + rings + ' run)') + '. Click for the runs and the model\'s why.') + '">' + (found == null ? '–' : found + '/' + rings + (ran < rings ? '<small>' + ran + ' run</small>' : '')) + '</button></td>';
    });
    h += '</tr>';
  });
  const maxF = Math.max(1, ...MODELS.map(m => m.false_rings || 0));
  h += '<tr><th class="l sh" title="Candidate groups IBM labels ordinary that the model called a pattern">' + glyph('ordinary') + '<span><b>false alarms</b><small>ordinary, called a pattern</small></span></th>' + MODELS.map(m => '<td><button type="button" class="fr ' + ((m.false_rings || 0) / maxF > 0.6 ? 'hot' : '') + '" data-s="false" data-id="' + esc(m.id + '|' + m.version) + '" title="' + esc(m.short + ' ' + m.version + ': ' + num(m.false_rings) + ' false alarms. Click for each one.') + '">' + num(m.false_rings) + '</button></td>').join('') + '</tr>';
  $('#gridTable').innerHTML = h + '</tbody>';
  $('#gridKey').innerHTML = '<span><i style="background:var(--cell-0)"></i>found none</span><span><i style="background:var(--cell-1)"></i>under half</span><span><i style="background:var(--cell-2)"></i>most</span><span><i style="background:var(--cell-3)"></i>all</span><span>Shape names are our reading of IBM\'s labeled edges. Hover a shape for what it is.</span>';
  document.querySelectorAll('.grid button[data-id]').forEach(b => { b.onclick = () => { const [id, ver] = b.dataset.id.split('|'); const m = MODELS.find(x => x.id === id && x.version === ver); document.querySelectorAll('.grid button.on').forEach(x => x.classList.remove('on')); b.classList.add('on'); if (m) openDrawer(b.dataset.s === 'false' ? 'false' : 'cell', m, b.dataset.s); }; });
}

/* ---------- the drawer: the runs behind any number ---------- */
function runRow(r, extra) {
  const ok = r.correct === true || r.verdict === r.expected; const flagged = (r.flagged_transfer_ids || []); const real = flagged.filter(id => BYID[id] && BYID[id].label).length;
  const tag = r.technical_failure || r.verdict == null ? '<span class="tag plain">no answer (technical failure' + (r.error ? ': ' + esc(r.error) : '') + ')</span>' : r.expected === 'ring' ? (r.verdict === 'ring' ? '<span class="tag ok">found</span>' : '<span class="tag miss">missed</span>') : (r.verdict === 'ring' ? '<span class="tag bad">false alarm</span>' : '<span class="tag plain">correctly left alone</span>');
  const idsHtml = flagged.length ? flagged.slice(0, 40).map(id => '<button type="button" data-id="' + esc(id) + '">' + esc(id) + '</button>').join(' ') + (flagged.length > 40 ? ' and ' + (flagged.length - 40) + ' more' : '') : '';
  return '<div class="run"><div class="r1">' + glyph(r.expected === 'ring' ? r.shape : (r.pattern || 'ordinary')) + '<b>' + esc(gid(r)) + '</b> ' + tag + ' <span class="muted">IBM: ' + esc(r.expected === 'ring' ? r.shape : 'ordinary') + ' · model said: ' + esc(r.verdict == null ? 'nothing' : r.verdict === 'ring' ? (r.pattern || 'a pattern') : 'ordinary') + (r.confidence ? ', ' + esc(r.confidence) + ' confidence' : '') + '</span>' + (extra || '') + '</div>' +
    (r.why ? '<p class="why">' + esc(r.why) + '</p>' : '') +
    '<div class="r3"><span>' + esc(r.run_id) + '</span><span>' + (flagged.length ? flagged.length + ' flagged, ' + real + ' real' : 'nothing flagged') + '</span><span class="fig">' + secs(r.latency_ms) + '</span><span>' + Money.html(r.cost_usd, 'USD', { decimals: 4 }) + '</span>' + (r.prism_trace_id ? '<span title="PRISM trace id">trace ' + esc(r.prism_trace_id) + '</span>' : '') + (r.tail_truth_rows ? '<span class="tag miss" title="Labeled rows after 2022-09-10 sit in the file\'s tail, where most rows are labeled; a late timestamp is a tell there">' + r.tail_truth_rows + ' labeled rows in the tail</span>' : '') + '</div>' +
    (idsHtml ? '<div class="ids">' + idsHtml + '</div>' : '') + '</div>';
}
function openDrawer(kind, m, shape) {
  const d = $('#drawer'), body = $('#dBody'); let title = '', sub = '', html = '';
  const name = m.short + ' ' + m.version;
  if (kind === 'rings') {
    title = name + ': the ' + NRINGS + ' laundering groups IBM marked'; sub = 'Found = at least half of the pattern\'s transfers flagged. Each row shows what the model said about that group.';
    html = m.perRing.map(p => '<div class="run"><div class="r1">' + glyph(p.shape) + '<b>' + esc(p.shape) + '</b> ' + (p.found ? '<span class="tag ok">found</span>' : '<span class="tag miss">missed</span>') + ' <span class="muted fig">' + p.hit + ' of ' + p.n + ' transfers flagged</span></div>' + (p.run ? '<p class="why">' + esc(p.run.why || '') + '</p><div class="r3"><span>' + esc(p.run.run_id) + '</span><span>' + esc(gid(p.run)) + '</span><span>model said: ' + esc(p.run.verdict === 'ring' ? (p.run.pattern || 'a pattern') : 'ordinary') + '</span></div>' : '<p class="why muted">No run in the bench output names this group.</p>') + '<div class="ids">' + RINGS[p.r].map(id => '<button type="button" data-id="' + esc(id) + '">' + esc(id) + '</button>').join(' ') + '</div></div>').join('');
  } else if (kind === 'false') {
    const R = m.R.filter(r => r.expected !== 'ring' && r.verdict === 'ring'); title = name + ': ' + R.length + ' false alarms'; sub = 'Ordinary groups this model called a laundering pattern, with its own one-sentence why. Precision also drops for real patterns flagged with extra ordinary transfers.';
    html = R.length ? R.map(r => runRow(r)).join('') : '<p class="empty">No false alarms in the runs.</p>';
  } else if (kind === 'cell') {
    const R = m.R.filter(r => r.expected === 'ring' && r.shape === shape); title = name + ' on ' + shape + ' (' + esc(SHAPE_WORDS[shape] || '') + ')'; sub = R.length + ' ' + shape + ' groups IBM marked. Found and missed, with the model\'s why.';
    html = R.length ? R.map(r => runRow(r)).join('') : '<p class="empty">No ' + esc(shape) + ' group run yet for this model' + (UNITS ? ' (' + m.R.length + ' of ' + UNITS + ' candidate groups run so far)' : '') + '.</p>';
  } else if (kind === 'cost') {
    const R = m.R.slice().sort((a, b) => (b.cost_usd || 0) - (a.cost_usd || 0)); title = name + ': ' + Money.fmt(m.cost_usd, 'USD') + ' across ' + R.length + ' runs'; sub = 'Most expensive runs first.';
    html = R.slice(0, 60).map(r => runRow(r)).join('') || '<p class="empty">No runs.</p>';
  } else if (kind === 'latency') {
    const R = m.R.slice().sort((a, b) => (b.latency_ms || 0) - (a.latency_ms || 0)); title = name + ': median ' + secs(m.latency_ms_median) + ' per run'; sub = 'Slowest runs first.';
    html = R.slice(0, 60).map(r => runRow(r)).join('') || '<p class="empty">No runs.</p>';
  }
  $('#dTitle').textContent = title; $('#dSub').textContent = sub + (IS_SAMPLE ? ' SAMPLE: made-up runs.' : ''); body.innerHTML = html; d.hidden = false; body.scrollTop = 0;
  body.querySelectorAll('button[data-id]').forEach(b => { b.onclick = () => { const t = BYID[b.dataset.id]; if (!t) return; if (HL.until !== Infinity) { HL.es = t.e >= 0 ? [t.e] : []; HL.until = performance.now() + 2500; } if (t.e >= 0) { P.tgt = camFor([edges[t.e].u, edges[t.e].v]); } }; });
}

/* ---------- the honest panel ---------- */
function renderHonest() {
  const ds = BENCH.dataset || {}; const sl = SL.slice || {};
  const bestPrec = MODELS.filter(m => m.precision != null).sort((a, b) => b.precision - a.precision)[0];
  const L = [
    ['Synthetic data' + (SLICE_NAME ? ', held-out slice ' + SLICE_NAME : '') + '.', 'IBM AMLworld HI-Small via a public mirror: ' + num(TR.length) + ' transfers in this slice, ' + num(TRUTH.size) + ' laundering (' + (sl.rate ? (sl.rate * 100).toFixed(1) : (TRUTH.size / TR.length * 100).toFixed(1)) + '%) in ' + NRINGS + ' laundering groups. IBM\'s simulator injected those groups and labeled them; we planted nothing.', 'The whole file has ' + num(sl.full_laundering) + ' laundering transfers of ' + num(sl.full_rows) + ' (' + (sl.full_rows ? (sl.full_laundering / sl.full_rows * 100).toFixed(2) : '–') + '%); the slice is enriched, so real-life precision would be far lower for the same flags. No real customer is in it. Models saw the transfers without the label column.'],
    ['Pattern names are our reading.', 'IBM\'s pattern file is not in the mirror; cycle, fan-out, mesh and the rest are what we see in the labeled edges. A fan is a tree, a mesh is a web; only a cycle is a ring.', 'The shape of each IBM group was read by code from IBM\'s label-1 transfers, by the Oct 15 cut. It can be argued with; the labels cannot.'],
    ['One run per cell.', 'Each model saw each candidate group once. A second run could score differently.', (BENCH.runs ? num(BENCH.runs.length) : '–') + ' runs across ' + MODELS.length + ' models. The engine records one run per model per group; nothing is averaged.'],
    ...(Object.keys(HELD).length ? [['Held-out slices.', (function () { const parts = []; Object.keys(HELD).forEach(name => { const hs = (HELD[name].models || []).filter(x => x.runs && x.rings_found != null); if (!hs.length) return; const best = hs.slice().sort((a, b) => ((b.rings_found || 0) + (b.precision || 0) * NRINGS) - ((a.rings_found || 0) + (a.precision || 0) * NRINGS))[0]; const here = MODELS.find(x => x.id === best.id && x.version === (best.version || 'v1')); parts.push(name + ': best so far ' + shortName(best.id) + ' ' + best.version + ', ' + best.rings_found + ' of ' + (best.rings_total || NRINGS) + ', ' + wrongText(best.precision) + (here ? ' (on this slice ' + here.rings_found + ' of ' + here.ringsTotal + ', ' + wrongText(here.precision) + ')' : '')); }); return 'Cuts of the same file that share no account with this one and that no prompt was tuned on. ' + parts.join('. ') + '.'; })(), 'Read from rings_bench/slices/<name>/bench_results.json. The Slice picker at the top opens any of them in full.']] : []),
    ['The honest baseline.', 'A rule a bank could run today, with no payment-format tell (any account dealing with ' + BURST_K + ' or more different accounts in a day), finds ' + BURST.found + ' of ' + NRINGS + ' of IBM\'s groups at precision ' + pct(BURST.precision) + ': ' + wrongText(BURST.precision) + '. That is the comparison the models have to beat.', 'Recounted by this page from the slice: ' + num(BURST.flagged) + ' transfers flagged, ' + num(BURST.tp) + ' real, recall ' + pct(BURST.recall) + '. Settings tried 12:05: 3 to 8 counterparties, inside an hour or a day; k=3 in a day found the most patterns. A loop detector (cycles up to 4 accounts) was also tried.'],
    ['The ACH tell is a leak, not a baseline.', 'All ' + num(N_ACH_LAB) + ' of ' + num(TRUTH.size) + ' laundering transfers here are ACH, so flagging every ACH transfer catches every one at precision ' + pct(RULE.precision) + ' on this slice. On the whole file the same rule is 0.84% precise (4,472 real among 529,450 ACH transfers, recall 86.4%): useless to a bank. The slice inflates it thirty times over, and any model that leans on ACH gets the same free lift.', 'Whole-file figures counted 2026-10-17 12:05 from the HI-Small mirror (5,078,345 rows). Recounted on the slice by this page: the rule flags ' + num(RULE.flagged) + ' transfers, ' + num(RULE.tp) + ' real.'],
    [bestPrec ? 'Better than the rule, still ' + wrongText(bestPrec.precision) + '.' : 'No model beats the rule.', bestPrec ? 'The best precision on the board is ' + shortName(bestPrec.id) + ' ' + bestPrec.version + ' at ' + pct(bestPrec.precision) + (RULE.precision != null && bestPrec.precision > RULE.precision ? ', fewer false alarms than the rule' : ', not better than the rule') + '.' : '', 'Precision is flags that were real. Wrong N in ten = (1 minus precision) times ten, rounded.'],
    ...(PANEL && PANEL.versions.v1 && PANEL.versions.v1.summary.families.length ? [['Families vote.', (function () { const S = PANEL.versions.v1.summary; return 'On the ' + NRINGS + ' IBM laundering groups the ' + S.families.length + ' complete families agree (' + S.ring_units_all_agree_ring + ' unanimous, ' + S.ring_units_none_say_ring + ' missed by all); on the ordinary neighborhoods they split (' + S.ordinary_units_split + ' of ' + ((UNITS || 60) - NRINGS) + '). Disagreement is the signal for a false alarm.'; })(), 'From panel.json (v1), written by the engine\'s panel.py; the "or let the families vote" row above the leaderboard puts any vote threshold on the network.']] : []),
    ...((BENCH.dataset && BENCH.dataset.notes) || []).map(n => ['From the engine.', n, 'Printed verbatim from dataset.notes in the bench output.']),
    ['Where the numbers come from.', 'Two files beside the page: the slice (transfers, IBM\'s labels, IBM\'s laundering groups) and the bench output (models, runs, the engine\'s scores); the families vote and the desk read two more (panel, units). Everything drawn here is computed from those files; nothing is typed in.', 'slice.js, bench_results.json (or .js from a file), panel.json, units.json. Over http the page re-reads the bench every 20 seconds.'],
    ['Numbers read from ' + (IS_SAMPLE ? 'a SAMPLE this page made up.' : esc(SRC) + '.'), IS_SAMPLE ? 'Nothing on this page is a measurement until the engine writes bench_results.json beside the slice.' : 'Precision, recall, patterns found, cost and latency are the engine\'s; the Check column is this page\'s recount from the flagged transfer ids.', 'Slice: ' + SLICE_SRC + '. Bench: ' + SRC + '.']
  ];
  $('#honestList').innerHTML = L.map(x => '<li><b>' + esc(x[0]) + '</b> ' + esc(x[1]) + ' <span class="muted">' + esc(x[2]) + '</span></li>').join('');
  $('#honestStrip').innerHTML = '<span><b>Synthetic IBM data, labels are IBM\'s.</b> One run per model per group. A plain rule a bank could run catches ' + BURST.found + ' of ' + NRINGS + ' but flags ' + num(BURST.flagged - BURST.tp) + ' ordinary transfers; the slice also has a tell (every laundering transfer is ACH).</span>';
  const b = el('button', 'btn sm', 'What this is not'); b.type = 'button'; b.onclick = () => showScreen(5); $('#honestStrip').append(b);
}
function renderBadges() {
  const b = $('#badges'); b.innerHTML = '';
  b.append(Object.assign(el('span', 'vbadge warn', 'Synthetic data'), { title: 'The transfers are made up by IBM\'s AML simulator; the laundering labels are IBM\'s own.' }));
  if (IS_SAMPLE) b.append(Object.assign(el('span', 'vbadge warn', 'SAMPLE bench: made-up numbers'), { title: 'The engine has not written ../data/bench_results.json (or .js) yet. Every score, cost and why on this page was made up by the page to show the layout.' }));
  else b.append(Object.assign(el('span', 'vbadge ok', 'Real runs: ' + SRC.replace(DATA, '') + (BENCH.written ? ', ' + BENCH.written.slice(11) : '')), { title: 'Read from ' + SRC + (BENCH.written ? ', written ' + BENCH.written : '') + '. One run per model per candidate group. Over http the page re-reads the file every 20 seconds.' }));
  if (SL.sample) b.append(Object.assign(el('span', 'vbadge warn', SLICE_NAME ? 'slice "' + SLICE_NAME + '" not found' : 'SAMPLE network'), { title: DATA + 'slice.js was not found; this small network was made up by the page.' }));
  if (SLICE_NAME && !SL.sample) b.append(Object.assign(el('span', 'vbadge ok', 'held-out slice ' + SLICE_NAME), { title: 'No prompt was tuned on this slice. It shares no account with the main slice. Read from ' + DATA }));
}


/* ---------- the desk: search an account, follow the money, see what every model said, decide, export ---------- */
/* Alex, 11:45 (relayed): "search for individual people or accounts ... follow the transactions in the app and other
   high value actions for the user". The data has account ids and bank codes, no names. */
const ACCT = {}; const BANKS = {};
TR.forEach(t => { const a = ACCT[t.from] = ACCT[t.from] || { id: t.from, rows: [], banks: new Set() }; a.rows.push(t); a.banks.add(t.fb); if (!t.self) { const b = ACCT[t.to] = ACCT[t.to] || { id: t.to, rows: [], banks: new Set() }; b.rows.push(t); b.banks.add(t.tb); } });
TR.forEach(t => { [[t.fb, t.from], [t.tb, t.to]].forEach(([bk, ac]) => { if (!bk) return; (BANKS[bk] = BANKS[bk] || new Set()).add(ac); }); });
let UNITS_BY_ACCT = null, UNITS_DATA = null;
async function loadUnits() {
  if (/^https?:/.test(location.protocol)) { try { const r = await fetch(DATA + 'units.json', { cache: 'no-store' }); if (r.ok) { const j = await r.json(); if (j && j.units) return j; } } catch (e) { /* none */ } }
  else { if (!window.UNITS) await loadScript(DATA + 'units.js'); }
  return window.UNITS && window.UNITS.units ? window.UNITS : null;
}
function indexUnits() { UNITS_BY_ACCT = {}; if (!UNITS_DATA) return; UNITS_DATA.units.forEach(u => (u.accounts || []).forEach(a => (UNITS_BY_ACCT[a] = UNITS_BY_ACCT[a] || []).push(u))); }
const DESK = { path: [], acct: null, all: false, watch: [], decisions: {}, notes: {} };
function deskLoad() { try { const j = JSON.parse(localStorage.getItem('rings-desk') || '{}'); DESK.watch = j.watch || []; DESK.decisions = j.decisions || {}; DESK.notes = j.notes || {}; } catch (e) { /* none */ } }
function deskSave() { try { localStorage.setItem('rings-desk', JSON.stringify({ watch: DESK.watch, decisions: DESK.decisions, notes: DESK.notes })); } catch (e) { /* none */ } }
function flaggedBy(id) { return MODELS.filter(m => !m.panel && m.F.has(id)); }
function deskSuggest() {
  const score = {}; TR.forEach(t => { if (t.label) { score[t.from] = (score[t.from] || 0) + 1; score[t.to] = (score[t.to] || 0) + 1; } });
  const seen = new Set(); const out = [];
  Object.keys(score).sort((a, b) => score[b] - score[a]).forEach(a => { const sh = ringShape(TR.find(t => t.label && (t.from === a || t.to === a)).ring); if (seen.has(sh) || out.length >= 4) return; seen.add(sh); out.push({ a, sh }); });
  return out;
}
function renderDeskHome() {
  const box = $('#deskBody'); const sug = deskSuggest();
  box.innerHTML = '<p class="note">Type an account id or a bank code. The slice has ' + num(Object.keys(ACCT).length) + ' accounts in ' + num(Object.keys(BANKS).length) + ' banks and no names. Or click a transfer on the network, or try: ' +
    sug.map(x => '<button type="button" class="chip" data-acct="' + esc(x.a) + '" title="an account inside an IBM ' + esc(x.sh) + ' group">' + esc(x.a) + ' <span class="ver">' + esc(x.sh) + '</span></button>').join(' ') + '</p>' +
    (DESK.watch.length ? '<p class="note">Watchlist: ' + DESK.watch.map(a => '<button type="button" class="chip" data-acct="' + esc(a) + '">' + esc(a) + (DESK.decisions[a] ? ' <span class="ver">' + esc(DESK.decisions[a]) + '</span>' : '') + '</button>').join(' ') + '</p>' : '');
  box.querySelectorAll('button[data-acct]').forEach(b => b.onclick = () => openAccount(b.dataset.acct, false));
  clearHL();
}
function clearHL() { HL.es = []; HL.until = 0; HL.node = -1; }
function openAccount(a, hop) {
  a = String(a || '').trim(); if (!a) return;
  if (!ACCT[a]) { if (BANKS[a]) return openBank(a); $('#deskBody').innerHTML = '<p class="empty">No account or bank "' + esc(a) + '" in this slice.</p>'; return; }
  if (hop) { const i = DESK.path.indexOf(a); DESK.path = i >= 0 ? DESK.path.slice(0, i + 1) : DESK.path.concat(a); } else DESK.path = [a];
  DESK.acct = a; DESK.all = false; $('#deskSearch').value = a; renderAccount();
  const A = ACCT[a]; HL.es = A.rows.filter(t => t.e >= 0).map(t => t.e); HL.until = Infinity; HL.node = nodeIdx[a];
  const ns = new Set([nodeIdx[a]]); A.rows.forEach(t => { if (t.e >= 0) { ns.add(edges[t.e].u); ns.add(edges[t.e].v); } }); P.tgt = camFor([...ns]);
  if (CUR_S !== 4) showScreen(4);
}
function openBank(bk) {
  const accts = [...BANKS[bk]].sort((a, b) => ACCT[b].rows.length - ACCT[a].rows.length);
  const lab = accts.filter(a => ACCT[a].rows.some(t => t.label));
  $('#deskBody').innerHTML = '<p class="note">Bank <b>' + esc(bk) + '</b>: ' + num(accts.length) + ' accounts in the slice, ' + num(lab.length) + ' touching a labeled transfer. Busiest first.</p><p>' + accts.slice(0, 40).map(a => '<button type="button" class="chip" data-acct="' + esc(a) + '">' + esc(a) + ' <span class="ver fig">' + ACCT[a].rows.length + '</span>' + (ACCT[a].rows.some(t => t.label) ? ' <span class="tag miss">labeled</span>' : '') + '</button>').join(' ') + (accts.length > 40 ? ' and ' + (accts.length - 40) + ' more' : '') + '</p>';
  $('#deskBody').querySelectorAll('button[data-acct]').forEach(b => b.onclick = () => openAccount(b.dataset.acct, false));
  HL.es = TR.filter(t => t.e >= 0 && (t.fb === bk || t.tb === bk)).map(t => t.e); HL.until = Infinity; HL.node = -1;
}
function markIds(text, mine) { return esc(text).replace(/T\d{4}/g, id => mine.has(id) ? '<mark>' + id + '</mark>' : id); }
function renderAccount() {
  const a = DESK.acct, A = ACCT[a]; const rows = A.rows.slice().sort((x, y) => x.t - y.t); const mine = new Set(rows.map(t => t.id));
  const inn = rows.filter(t => t.to === a && !t.self), out = rows.filter(t => t.from === a && !t.self), selfR = rows.filter(t => t.self);
  const byCur = {}; rows.forEach(t => { if (t.self) return; const c = byCur[t.cur] = byCur[t.cur] || { in: 0, out: 0 }; if (t.to === a) c.in += t.paid; else c.out += t.paid; });
  const curs = Object.keys(byCur).sort((x, y) => (byCur[y].in + byCur[y].out) - (byCur[x].in + byCur[x].out));
  const labN = rows.filter(t => t.label).length; const shapes = [...new Set(rows.filter(t => t.label).map(t => ringShape(t.ring)))];
  const days = rows.length ? Math.max(1, Math.round((rows[rows.length - 1].t - rows[0].t) / 1440)) : 0;
  let burst = null; for (let i = 0; i < rows.length; i++) { let j = i; while (j + 1 < rows.length && rows[j + 1].t - rows[i].t <= 60) j++; const n = j - i + 1; if (!burst || n > burst.n) burst = { n, i, span: Math.round(rows[j].t - rows[i].t) }; }
  const flaggers = new Set(); rows.forEach(t => flaggedBy(t.id).forEach(m => flaggers.add(m.id + ' ' + m.version)));
  const cm = CUR_M; const cmName = cm ? (cm.panel ? cm.short + ' (' + cm.version + ')' : cm.short + ' ' + cm.version) : '';
  const crumb = DESK.path.map((x, i) => '<button type="button" class="crumb' + (x === a ? ' on' : '') + '" data-acct="' + esc(x) + '">' + esc(x) + '</button>').join('<span class="muted"> to </span>');
  // the ten-day strip: ticks colored in the selected model's grammar (green = flagged and labeled, red = flagged false alarm, amber = labeled and missed)
  const W = 600, H = 46, x = t => 8 + (t.t - T0) / Math.max(1, T1 - T0) * (W - 16);
  const tick = t => { const f = cm && cm.F.has(t.id); const c = f && t.label ? 'var(--net-ok)' : f ? 'var(--net-bad)' : t.label ? 'var(--net-miss)' : 'var(--hairline-strong)'; const y1 = t.to === a && !t.self ? 6 : 24, y2 = t.to === a && !t.self ? 22 : 40; return '<line x1="' + x(t).toFixed(1) + '" y1="' + y1 + '" x2="' + x(t).toFixed(1) + '" y2="' + y2 + '" stroke="' + c + '" stroke-width="' + (f || t.label ? 2.2 : 1.2) + '"><title>' + esc(t.id + ' ' + t.ts + ' ' + (t.to === a ? 'in' : 'out') + ' ' + Money.fmt(t.paid, t.cur) + ' ' + t.cur) + '</title></line>'; };
  const dayTicks = []; for (let d = 0; d <= 10; d++) { const tt = T0 + d * 1440; if (tt > T1 + 1) break; dayTicks.push('<line x1="' + x({ t: tt }).toFixed(1) + '" y1="23" x2="' + x({ t: tt }).toFixed(1) + '" y2="23" stroke="var(--hairline-strong)"/><text x="' + x({ t: tt }).toFixed(1) + '" y="45" font-size="8" fill="var(--muted-fg)" text-anchor="middle">' + new Date(tt * 60000).toISOString().slice(5, 10).replace('-', '/') + '</text>'); }
  const strip = '<svg class="strip" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-label="Ten days: transfers in above the line, out below"><line x1="8" y1="23" x2="' + (W - 8) + '" y2="23" stroke="var(--hairline-strong)"/>' + dayTicks.join('') + rows.map(tick).join('') + '</svg><div class="striplabels"><span>in, above</span><span>out, below</span></div>';
  const shown = DESK.all ? rows : rows.slice(0, 40);
  const rowsHtml = shown.map(t => { const dir = t.self ? 'self' : t.to === a ? 'in' : 'out'; const other = t.self ? a : (t.to === a ? t.from : t.to); const fb = flaggedBy(t.id); const f = cm && cm.F.has(t.id);
    return '<tr title="' + esc(t.id) + '"' + (f ? ' class="lit"' : '') + '><td class="fig muted">' + esc(t.ts.slice(5)) + '</td><td class="' + dir + '">' + (dir === 'in' ? 'in from' : dir === 'out' ? 'out to' : 'self') + '</td><td>' + (t.self ? '<span class="muted">same account</span>' : '<button type="button" class="hop" data-acct="' + esc(other) + '" title="Follow the money to ' + esc(other) + '">' + esc(other) + '</button>') + '</td>' +
      '<td class="fig r" title="' + esc(t.cur) + '">' + Money.html(dir === 'in' ? t.paid : -t.paid, t.cur, { signed: true }) + '</td><td class="muted">' + esc(t.fmt) + '</td>' +
      '<td>' + (t.label ? '<span class="tag miss" title="IBM labels this transfer laundering, in a ' + esc(ringShape(t.ring)) + ' group">laundering</span>' : '') + '</td>' +
      '<td>' + (fb.length ? '<span class="tag ' + (t.label ? 'ok' : 'bad') + '" title="' + esc(fb.map(m => m.short + ' ' + m.version).join(', ')) + '">' + fb.length + ' model' + (fb.length === 1 ? '' : 's') + (f ? ' incl. ' + esc(cm.short) : '') + '</span>' : '<span class="muted small">none</span>') + '</td></tr>'; }).join('');
  // what the models said: runs on units holding the account, else runs whose flags touch it
  let units = (UNITS_BY_ACCT && UNITS_BY_ACCT[a]) ? UNITS_BY_ACCT[a].map(u => u.id) : null;
  let runs = (BENCH.runs || []).filter(r => units ? units.includes(gid(r)) : (r.flagged_transfer_ids || []).some(id => mine.has(id)));
  runs = runs.filter(r => r.model !== 'panel').sort((x, y) => (gid(x) < gid(y) ? -1 : gid(x) > gid(y) ? 1 : 0) || (x.model < y.model ? -1 : 1) || (x.version < y.version ? -1 : 1));
  const byUnit = {}; runs.forEach(r => (byUnit[gid(r)] = byUnit[gid(r)] || []).push(r));
  const said = Object.keys(byUnit).map(u => { const R = byUnit[u]; const r0 = R[0]; const ud = UNITS_DATA && UNITS_DATA.units.find(x => x.id === u);
    return '<div class="unitblock"><div class="r1">' + glyph(r0.expected === 'ring' ? r0.shape : 'ordinary') + '<b>' + esc(u) + '</b> <span class="muted">' + (r0.expected === 'ring' ? 'IBM ' + esc(r0.shape) + ' group' : 'ordinary neighborhood') + (ud ? ', ' + ud.accounts.length + ' accounts, ' + (ud.n_rows || (ud.rows || []).length) + ' transfers' : '') + ' · ' + R.filter(r => r.verdict === 'ring').length + ' of ' + R.length + ' models called it a pattern</span></div>' +
      R.map(r => '<div class="said"><span class="who">' + esc(shortName(r.model)) + ' <span class="ver">' + esc(r.version) + '</span></span> ' + (r.verdict == null ? '<span class="tag plain">no answer</span>' : r.verdict === 'ring' ? '<span class="tag ' + (r.expected === 'ring' ? 'ok' : 'bad') + '">' + esc(r.pattern || 'pattern') + (r.expected === 'ring' ? '' : ', false alarm') + '</span>' : '<span class="tag ' + (r.expected === 'ring' ? 'miss' : 'plain') + '">ordinary' + (r.expected === 'ring' ? ', missed' : '') + '</span>') + (r.confidence ? ' <span class="muted small">' + esc(r.confidence) + '</span>' : '') + '<p class="why">' + markIds(r.why || '', mine) + '</p></div>').join('') + '</div>'; }).join('');
  const dec = DESK.decisions[a]; const note = DESK.notes[a] || '';
  $('#deskBody').innerHTML = '<div class="crumbs">' + crumb + '</div>' +
    '<div class="acct"><div><span class="eyebrow">Account</span><h3 class="fig">' + esc(a) + '</h3><span class="muted">bank ' + esc([...A.banks].filter(Boolean).join(', ') || '?') + ' · ' + inn.length + ' in, ' + out.length + ' out' + (selfR.length ? ', ' + selfR.length + ' self' : '') + ' · active ' + days + ' day' + (days === 1 ? '' : 's') + '</span></div>' +
    '<div class="sums">' + curs.slice(0, 3).map(c => '<div><span class="muted small">' + esc(c) + '</span><br>' + Money.html(byCur[c].in, c, { signed: true }) + ' <span class="muted">in</span> · ' + Money.html(-byCur[c].out, c, { signed: true }) + ' <span class="muted">out</span></div>').join('') + (curs.length > 3 ? '<div class="muted small">and ' + (curs.length - 3) + ' more currencies</div>' : '') + '</div>' +
    '<div class="facts">' + (labN ? '<span class="tag miss">IBM: ' + labN + ' of ' + rows.length + ' transfers laundering, in a ' + esc(shapes.join(', ')) + ' group</span>' : '<span class="tag plain">IBM: no laundering on this account</span>') + ' <span class="tag ' + (flaggers.size ? 'bad' : 'plain') + '" title="' + esc([...flaggers].join(', ')) + '">flagged by ' + flaggers.size + ' of ' + MODELS.filter(m => !m.panel).length + ' models</span>' + (burst && burst.n >= 4 ? ' <span class="tag plain" title="the busiest hour on this account">burst: ' + burst.n + ' transfers in ' + burst.span + ' min on ' + esc(rows[burst.i].ts.slice(5, 10)) + '</span>' : '') + (dec ? ' <span class="tag ' + (dec === 'escalate' ? 'bad' : 'ok') + '">decided: ' + esc(dec) + '</span>' : '') + '</div></div>' +
    strip +
    '<div class="tablewrap deskrows"><table class="desk"><thead><tr><th>when</th><th></th><th title="click an account to follow the money there">counterparty</th><th class="r">amount</th><th>format</th><th>IBM says</th><th title="how many models flagged this transfer' + (cm ? '; the current view is ' + esc(cmName) : '') + '">models</th></tr></thead><tbody>' + rowsHtml + '</tbody></table>' + (rows.length > shown.length ? '<button type="button" class="btn sm" id="deskMore">Show all ' + rows.length + ' transfers</button>' : '') + '</div>' +
    '<h3 class="deskh">What the models said about this account</h3>' + (said || '<p class="empty">No run in the bench output touches this account' + (UNITS_BY_ACCT ? '' : ' (units.json not loaded, so only runs whose flags touch it are shown)') + '.</p>') +
    '<div class="decide"><span class="plabel">Decide (a person decides; the model never files):</span> <button type="button" class="btn sm" id="dEsc">Escalate</button> <button type="button" class="btn sm" id="dDis">Dismiss</button> <button type="button" class="btn sm" id="dPin">' + (DESK.watch.includes(a) ? 'Unpin from watchlist' : 'Pin to watchlist') + '</button> <button type="button" class="btn sm primary" id="dExport">Export case pack</button> <button type="button" class="btn sm" id="dHome">Clear</button>' +
    '<textarea id="dNote" rows="2" placeholder="Note for the case pack: what you looked at, why">' + esc(note) + '</textarea></div>';
  const body = $('#deskBody');
  body.querySelectorAll('button.hop, button.crumb').forEach(b => b.onclick = () => openAccount(b.dataset.acct, true));
  const more = $('#deskMore'); if (more) more.onclick = () => { DESK.all = true; renderAccount(); };
  $('#dNote').oninput = e => { DESK.notes[a] = e.target.value; deskSave(); };
  $('#dEsc').onclick = () => { DESK.decisions[a] = 'escalate'; deskSave(); renderAccount(); };
  $('#dDis').onclick = () => { DESK.decisions[a] = 'dismiss'; deskSave(); renderAccount(); };
  $('#dPin').onclick = () => { const i = DESK.watch.indexOf(a); if (i >= 0) DESK.watch.splice(i, 1); else DESK.watch.push(a); deskSave(); renderAccount(); };
  $('#dHome').onclick = () => { DESK.acct = null; DESK.path = []; $('#deskSearch').value = ''; renderDeskHome(); P.tgt = fitCam(); };
  $('#dExport').onclick = () => exportCase(a, rows, runs);
}
function exportCase(a, rows, runs) {
  const pack = { written: new Date().toISOString(), page: 'Rings bench, follow the money', dataset: (BENCH.dataset || {}).name || SL.dataset, source: IS_SAMPLE ? 'SAMPLE' : SRC, account: a, path: DESK.path.slice(), decision: DESK.decisions[a] || null, note: DESK.notes[a] || '',
    transfers: rows.map(t => ({ id: t.id, time: t.ts, from: t.from, to: t.to, paid: t.paid, currency: t.cur, format: t.fmt, ibm_label: t.label ? 'laundering' : 'ordinary', ibm_group_shape: t.label ? ringShape(t.ring) : null, flagged_by: flaggedBy(t.id).map(m => m.id + ' ' + m.version) })),
    model_verdicts: runs.map(r => ({ run_id: r.run_id, unit: gid(r), model: r.model, version: r.version, expected: r.expected, shape: r.shape, verdict: r.verdict, pattern: r.pattern, confidence: r.confidence, why: r.why, flagged_transfer_ids: r.flagged_transfer_ids, prism_trace_id: r.prism_trace_id || null })) };
  const blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' }); const u = URL.createObjectURL(blob); const l = document.createElement('a'); l.href = u; l.download = 'case_' + a + '_' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-') + '.json'; document.body.append(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(u), 2000);
}
function initDesk() {
  deskLoad(); const dl = $('#deskList'); dl.innerHTML = Object.keys(ACCT).sort().map(a => '<option value="' + esc(a) + '">').join('') + Object.keys(BANKS).sort().map(b => '<option value="' + esc(b) + '">bank</option>').join('');
  const go = () => openAccount($('#deskSearch').value, false);
  $('#deskGo').onclick = go; $('#deskSearch').addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  renderDeskHome();
}

/* ---------- the ring-by-ring list: what the selected model found, in plain words ---------- */
function ringFacts(r) {
  const ts = RINGS[r].map(id => BYID[id]).filter(Boolean); const acc = new Set(); ts.forEach(t => { acc.add(t.from); acc.add(t.to); });
  const byCur = {}; ts.forEach(t => byCur[t.cur] = (byCur[t.cur] || 0) + t.paid); const curs = Object.keys(byCur).sort((a, b) => byCur[b] - byCur[a]);
  const tt = ts.map(t => t.t); const d0 = new Date(Math.min(...tt) * 60000), d1 = new Date(Math.max(...tt) * 60000);
  const span = Math.max(...tt) - Math.min(...tt);
  const when = d0.toISOString().slice(5, 10).replace('-', '/') + (d1.toISOString().slice(0, 10) !== d0.toISOString().slice(0, 10) ? ' to ' + d1.toISOString().slice(5, 10).replace('-', '/') : '');
  const hub = (() => { const c = {}; ts.forEach(t => { c[t.from] = (c[t.from] || 0) + 1; c[t.to] = (c[t.to] || 0) + 1; }); return Object.keys(c).sort((a, b) => c[b] - c[a])[0]; })();
  return { n: ts.length, accounts: acc.size, curs, byCur, when, span, hub, ts };
}
function ringWords(shape, f) {
  const money = f.curs.length ? Money.fmt(f.byCur[f.curs[0]], f.curs[0]) + (f.curs.length > 1 ? ' and ' + (f.curs.length - 1) + ' other currenc' + (f.curs.length > 2 ? 'ies' : 'y') : '') : '';
  const inWin = f.span <= 90 ? 'inside ' + Math.max(1, Math.round(f.span)) + ' minutes' : f.span <= 1440 ? 'inside ' + Math.round(f.span / 60) + ' hours' : 'over ' + Math.round(f.span / 1440) + ' days';
  switch (shape) {
    case 'fan-out': return 'One account paid ' + (f.accounts - 1) + ' different accounts ' + inWin + ': ' + money + ' spread out.';
    case 'fan-in': return (f.accounts - 1) + ' different accounts all paid one account ' + inWin + ': ' + money + ' gathered in.';
    case 'cycle': return 'Money went around a loop of ' + f.accounts + ' accounts and came back where it started, ' + inWin + ': ' + money + '.';
    case 'scatter-gather': return 'One account split money out to middle accounts, and they passed it on to one collector, ' + inWin + ': ' + f.accounts + ' accounts, ' + money + '.';
    case 'chain': return 'Money hopped account to account, ' + f.n + ' hops ' + inWin + ': ' + money + '.';
    case 'mesh': return f.accounts + ' accounts kept paying each other, ' + f.n + ' transfers ' + inWin + ': ' + money + '.';
    case 'lone': return 'A single transfer with no pattern around it: ' + money + '. The hardest kind to tell from ordinary traffic.';
    default: return f.accounts + ' accounts, ' + f.n + ' transfers ' + inWin + ': ' + money + '.';
  }
}
/* ---------- the caught roster: one card per ring as it is caught; the misses stay quiet below ---------- */
const ROSTER = { rings: new Set(), n: 0 };
function ringOfGroup(G) { let best = null, bs = 0; RING_IDS.forEach(r => { const ids = RINGS[r]; let h = 0; ids.forEach(id => { if (G.r.flagged_transfer_ids.includes(id)) h++; }); const sh = h / ids.length; if (sh >= 0.5 && sh > bs) { bs = sh; best = r; } }); return best; }
function rosterReset() { ROSTER.rings = new Set(); ROSTER.n = 0; const box = $('#ringList'); box.innerHTML = '<h3>Caught, ring by ring</h3><p class="note">Each card drops in as the model catches one of IBM\'s rings. Click a card to light that ring on the network.</p><div id="rosterCards"></div><div id="rosterMissed"></div>'; box.hidden = true; }
function rosterCard(r, why, animate, delay) {
  const m = CUR_M; const f = ringFacts(r); const shape = ringShape(r); const p = m.perRing.find(x => x.r === r) || {};
  const others = []; MODELS.forEach(x => { if (x.panel || x.id === m.id) return; const pr = x.perRing.find(y => y.r === r); if (pr && pr.found && !others.includes(x.short)) others.push(x.short); });
  const money = f.curs.length ? Money.fmt(f.byCur[f.curs[0]], f.curs[0]) + (f.curs.length > 1 ? ' +' + (f.curs.length - 1) : '') : '';
  const d = el('div', 'ringrow caught' + (animate ? ' pop' : ''), glyph(shape) + '<div class="t"><b>' + esc(shape) + '</b>, ' + esc(f.when) + ' · ' + f.accounts + ' accounts, ' + f.n + ' transfers · ' + esc(money) + (others.length ? ' · also caught by ' + esc(others.slice(0, 5).join(', ')) + (others.length > 5 ? ' and ' + (others.length - 5) + ' more' : '') : ' · no other model caught it') + '<span class="muted">' + esc(ringWords(shape, f)) + (why ? ' The model: ' + esc(why.length > 170 ? why.slice(0, 167) + '...' : why) : '') + '</span></div><span class="tag ok">caught, ' + (p.hit || 0) + ' of ' + (p.n || f.n) + ' flagged</span>');
  d.dataset.ring = r; d.title = SHAPE_WORDS[shape] || ''; if (delay) d.style.animationDelay = delay + 'ms';
  d.onclick = () => { const es = RINGS[r].map(id => BYID[id]).filter(t => t && t.e >= 0).map(t => t.e); HL.es = es; HL.until = performance.now() + 4000; HL.node = -1; const ns = new Set(); es.forEach(ei => { ns.add(edges[ei].u); ns.add(edges[ei].v); }); if (ns.size) P.tgt = camFor([...ns]); };
  return d;
}
function rosterCatch(G, animate, delay) {
  const r = ringOfGroup(G); if (r == null || ROSTER.rings.has(r)) return; ROSTER.rings.add(r); ROSTER.n++;
  const box = $('#ringList'); box.hidden = false; $('#rosterCards').append(rosterCard(r, G.r.why, animate, delay));
}
function rosterFinish() {
  const m = CUR_M; if (!m) return; let k = 0;
  m.perRing.forEach(p => { if (p.found && !ROSTER.rings.has(p.r)) { ROSTER.rings.add(p.r); ROSTER.n++; $('#ringList').hidden = false; $('#rosterCards').append(rosterCard(p.r, p.run && p.run.why, true, k * 70)); k++; } });
  const missed = m.perRing.filter(p => !p.found);
  $('#rosterMissed').innerHTML = missed.length ? '<details class="more quiet"><summary>Missed ' + missed.length + ' of ' + NRINGS + '</summary>' + missed.map(p => { const f = ringFacts(p.r); return '<div class="ringrow off" data-ring="' + esc(p.r) + '">' + glyph(p.shape) + '<div class="t"><b>' + esc(p.shape) + '</b>, ' + esc(f.when) + '. ' + esc(ringWords(p.shape, f)) + '<span class="muted">' + f.accounts + ' accounts, ' + f.n + ' transfers' + (p.run && p.run.why ? '. The model: ' + esc(p.run.why.length > 160 ? p.run.why.slice(0, 157) + '...' : p.run.why) : '') + '</span></div><span class="tag miss">' + (p.hit ? 'missed, only ' + p.hit + ' of ' + p.n : 'missed') + '</span></div>'; }).join('') + '</details>' : '';
  if (!ROSTER.n && missed.length) $('#ringList').hidden = false;
  $('#rosterMissed').querySelectorAll('.ringrow').forEach(d => d.onclick = () => { const r = d.dataset.ring; const es = RINGS[r].map(id => BYID[id]).filter(t => t && t.e >= 0).map(t => t.e); HL.es = es; HL.until = performance.now() + 4000; HL.node = -1; const ns = new Set(); es.forEach(ei => { ns.add(edges[ei].u); ns.add(edges[ei].v); }); if (ns.size) P.tgt = camFor([...ns]); });
  const h = $('#ringList h3'); if (h) h.textContent = 'Caught, ring by ring: ' + ROSTER.n + ' of ' + NRINGS;
}
function renderRingList() {
  const m = CUR_M; const box = $('#ringList'); if (!m) return;
  const rows = m.perRing.slice().sort((a, b) => (b.found - a.found) || (a.shape < b.shape ? -1 : 1));
  const found = rows.filter(p => p.found).length;
  box.innerHTML = '<h3>Group by group: the ' + NRINGS + ' laundering groups IBM marked, and what ' + esc(m.short) + ' ' + esc(m.version) + ' did with each</h3><p class="note">Found first. Click one to light it on the network.</p>' +
    rows.map(p => { const f = ringFacts(p.r); return '<div class="ringrow' + (p.found ? '' : ' off') + '" data-ring="' + esc(p.r) + '" title="' + esc(SHAPE_WORDS[p.shape] || '') + '">' + glyph(p.shape) +
      '<div class="t"><b>' + esc(p.shape) + '</b>, ' + esc(f.when) + '. ' + esc(ringWords(p.shape, f)) + '<span class="muted">' + f.accounts + ' accounts, ' + f.n + ' transfers' + (p.run && p.run.why ? '. The model: ' + esc(p.run.why.length > 160 ? p.run.why.slice(0, 157) + '...' : p.run.why) : '') + '</span></div>' +
      '<span class="tag ' + (p.found ? 'ok' : 'miss') + '">' + (p.found ? 'found, ' + p.hit + ' of ' + p.n + ' flagged' : (p.hit ? 'missed, only ' + p.hit + ' of ' + p.n : 'missed')) + '</span></div>'; }).join('');
  box.querySelectorAll('.ringrow').forEach(d => d.onclick = () => { const r = d.dataset.ring; const es = RINGS[r].map(id => BYID[id]).filter(t => t && t.e >= 0).map(t => t.e); HL.es = es; HL.until = performance.now() + 4000; HL.node = -1; const ns = new Set(); es.forEach(ei => { ns.add(edges[ei].u); ns.add(edges[ei].v); }); if (ns.size) P.tgt = camFor([...ns]); });
}

/* ---------- one screen at a time, in the judge's order; the network stays beside every screen ---------- */
const SCREENS = [[1, 'The result'], [2, 'Every model'], [3, 'Where they fail'], [4, 'Follow the money'], [5, 'What this is not']];
let CUR_S = 1;
function showScreen(n) {
  CUR_S = n; document.querySelectorAll('.screen').forEach(sec => { sec.hidden = +sec.dataset.screen !== n; });
  document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('on', +b.dataset.n === n));
  if (history.replaceState) history.replaceState(null, '', '#s' + n);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function renderNav() {
  const nav = $('#nav'); nav.innerHTML = '';
  SCREENS.forEach(([n, label]) => { const b = el('button', n === CUR_S ? 'on' : '', '<i>' + n + '</i>' + esc(label)); b.type = 'button'; b.dataset.n = n; b.onclick = () => showScreen(n); nav.append(b); });
  document.querySelectorAll('.screen').forEach(sec => {
    const n = +sec.dataset.screen; const nx = SCREENS.find(x => x[0] === n + 1); let row = sec.querySelector('.nextrow');
    if (!row) { row = el('div', 'nextrow'); sec.append(row); }
    row.innerHTML = nx ? '<button type="button" class="btn">Next: ' + esc(nx[1]) + '</button>' : '<button type="button" class="btn">Back to the result</button>';
    row.querySelector('button').onclick = () => showScreen(nx ? nx[0] : 1);
  });
}
window.ringsShow = showScreen;

/* ---------- build from a bench object (first load and every live re-read) ---------- */
function build(got) {
  BENCH = got.bench; SRC = got.src; IS_SAMPLE = !!got.sample; UNITS = (BENCH.dataset || {}).units || 0;
  MODELS = orderModels((BENCH.models || []).map(m => deriveModel(m)));
  renderBadges(); renderChips(); renderBoard(); renderGrid(); renderPanelRow(); renderHonest(); renderNav();
  $('#what').innerHTML = '<b>Every dot is a bank account. Every line is one transfer between two accounts.</b> Ten days, ' + num(TR.length) + ' transfers, ' + num(nodes.length) + ' accounts. The colors say what the chosen model did with each transfer:';
}
function pickDefault(replay) {
  const strength = m => (m.rings_found || 0) + (m.precision || 0) * NRINGS;
  const top = MODELS.slice().sort((a, b) => strength(b) - strength(a) || (b.recall || 0) - (a.recall || 0))[0];
  if (top) selectModel(top, { replay });
  else { $('#headline').textContent = 'No models in the bench output yet.'; $('#headline').classList.remove('pending'); }
}
/* ---------- the held-out check: on the main slice, read each held-out slice's bench output for the same models ---------- */
let HELD = {};
function sliceNames() { const l = window.SLICES && Array.isArray(window.SLICES) ? window.SLICES : ['heldout_a', 'heldout_b', 'heldout_c']; return l.map(x => typeof x === 'string' ? x : x.name).filter(Boolean); }
async function loadHeldout() {
  if (SLICE_NAME) return; const out = {};
  for (const name of sliceNames()) {
    const dir = '../slices/' + name + '/'; let j = null;
    if (/^https?:/.test(location.protocol)) { try { const r = await fetch(dir + 'bench_results.json', { cache: 'no-store' }); if (r.ok) j = await r.json(); } catch (e) { /* none */ } }
    else { window.BENCH = null; if (await loadScript(dir + 'bench_results.js')) j = window.BENCH; window.BENCH = null; }
    if (j && j.models && j.models.length) out[name] = j;
  }
  HELD = out;
}
function heldoutFor(m) {
  const rows = [];
  Object.keys(HELD).forEach(name => { const ms = (HELD[name].models || []).filter(x => x.id === m.id && x.runs); let hm = ms.find(x => (x.version || 'v1') === m.version); let sub = false;
    if (!hm && ms.length) { hm = ms.slice().sort((x, y) => ((y.rings_found || 0) + (y.precision || 0) * NRINGS) - ((x.rings_found || 0) + (x.precision || 0) * NRINGS))[0]; sub = true; }
    if (hm) rows.push({ name, m: hm, sub, units: (HELD[name].dataset || {}).units || 0 }); });
  return rows;
}
function renderHeldout() {
  const box = $('#heldout'); const m = CUR_M; if (!box || !m || m.panel) { if (box) box.hidden = true; return; }
  const rows = heldoutFor(m); if (!rows.length) { box.hidden = true; return; } box.hidden = false;
  box.innerHTML = '<b>Held-out check.</b> ' + rows.map(r => 'On ' + r.name + ' (no prompt was tuned on it' + (r.units && r.m.runs < r.units ? ', ' + r.m.runs + ' of ' + r.units + ' groups run so far' : '') + ') ' + esc(m.short) + ' ' + esc(r.m.version || 'v1') + (r.sub ? ' (' + esc(m.version) + ' has not run there yet)' : '') + ' found <b>' + r.m.rings_found + ' of ' + (r.m.rings_total || NRINGS) + '</b> and was <b>' + esc(wrongText(r.m.precision)) + '</b>; ' + (function () { const here = r.sub ? MODELS.find(x => x.id === m.id && x.version === (r.m.version || 'v1')) : m; return here ? 'here, the same ' + esc(here.version) + ': ' + here.rings_found + ' of ' + here.ringsTotal + ', ' + esc(wrongText(here.precision)) + '.' : 'no same-version run here to compare.'; })()).join(' ') + ' <a href="?slice=' + esc(rows[0].name) + '">Open ' + esc(rows[0].name) + '</a>';
}
/* ---------- the slice picker: main slice or a held-out cut; switching reloads the page with ?slice= ---------- */
async function renderSlicePick() {
  const sel = $('#slicePick'); let list = null;
  if (!window.SLICES) await loadScript('../slices/slices.js');
  list = window.SLICES && Array.isArray(window.SLICES) ? window.SLICES : [{ name: 'heldout_a' }, { name: 'heldout_b' }, { name: 'heldout_c' }];
  const opts = [{ name: '', label: 'main slice (the working cut)' }].concat(list.map(x => typeof x === 'string' ? { name: x } : x));
  sel.innerHTML = opts.map(o => '<option value="' + esc(o.name) + '"' + (o.name === SLICE_NAME ? ' selected' : '') + '>' + esc(o.label || ('held-out: ' + o.name + ', no prompt was tuned on it')) + '</option>').join('');
  sel.onchange = () => { const u = new URL(location.href); if (sel.value) u.searchParams.set('slice', sel.value); else u.searchParams.delete('slice'); u.hash = ''; location.href = u.toString(); };
}

/* ---------- init ---------- */
function applyTheme(t) { if (t) document.documentElement.setAttribute('data-theme', t); else document.documentElement.removeAttribute('data-theme'); const dark = t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches; $('#theme').textContent = dark ? 'Light' : 'Dark'; }
async function init() {
  const params = new URLSearchParams(location.search);
  let theme = params.get('theme'); try { theme = theme || localStorage.getItem('rings-theme'); } catch (e) { /* no storage */ }
  applyTheme(theme);
  $('#theme').onclick = () => { const dark = document.documentElement.getAttribute('data-theme') === 'dark' || (!document.documentElement.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches); const t = dark ? 'light' : 'dark'; applyTheme(t); try { localStorage.setItem('rings-theme', t); } catch (e) { /* ignore */ } };
  await renderSlicePick(); await loadHeldout();
  const got = await loadBench(); PANEL = await loadPanel(); build(got);
  $('#foot').innerHTML = 'Rings bench, Money Talks 2 build day, 2026-10-17. Pencil, unstamped.';
  $('#boardMore').onchange = e => $('#boardTable').classList.toggle('full', e.target.checked);
  const hs = /^#s(\d)$/.exec(location.hash); if (hs) showScreen(+hs[1]);
  resize(); P.cam = fitCam();
  pickDefault(!(params.has('still') || params.has('end')));
  if (/^https?:/.test(location.protocol) && !IS_SAMPLE) setInterval(async () => {
    try { const r = await fetch(DATA + 'bench_results.json', { cache: 'no-store' }); if (!r.ok) return; const j = await r.json(); if (!j || !j.models) return;
      const pj = await loadPanel(); const pChanged = !!pj && (!PANEL || pj.written !== PANEL.written);
      if (j.written !== BENCH.written || (j.runs || []).length !== (BENCH.runs || []).length || pChanged) { const keep = CUR_M; if (pj) PANEL = pj; build({ bench: j, src: SRC }); if (keep && keep.panel && PANEL && PANEL.versions[keep.version]) pickPanel(keep.k); else { const again = keep && MODELS.find(x => x.id === keep.id && x.version === keep.version); if (again) selectModel(again, { replay: false }); else pickDefault(false); } }
    } catch (e) { /* keep what we have */ }
  }, 20000);
  $('#play').onclick = () => { if (T >= TOTAL) restart(); else { playing = !playing; $('#play').textContent = playing ? 'Pause' : 'Resume'; } };
  $('#skip').onclick = skip;
  $('#truth').onchange = e => showTruth = e.target.checked;
  $('#dClose').onclick = () => { $('#drawer').hidden = true; };
  document.addEventListener('keydown', e => { if (e.key === 'Escape') $('#drawer').hidden = true; });
  cv.addEventListener('mousemove', hover); cv.addEventListener('mouseleave', () => $('#tip').hidden = true);
  cv.addEventListener('click', ev => { const t = nearestEdge(ev); if (t) openAccount(t.from, !!DESK.acct); });
  UNITS_DATA = await loadUnits(); indexUnits(); initDesk();
  window.addEventListener('resize', () => { resize(); if (T >= TOTAL) P.cam = fitCam(); });
  requestAnimationFrame(loop);
}
init();
})();
