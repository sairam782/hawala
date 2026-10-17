/* Rings bench, the ops wall. One network, agreement as the visual language.
   Reads window.SLICE, window.UNITS, window.PANEL, window.BENCH (../../../data/*.js). If the first three are missing,
   a small made-up SAMPLE network stands in and the page says so. Canvas 2D, no libraries.
   Layout runs once at load and freezes; the canvas only redraws when a control changes. */
(function () {
'use strict';
const C = { ground: '#14181F', surface: '#1C222B', ink: '#E6E9EE', muted: '#A3ABB8', accent: '#7FB7B0', rule: '#2C3440', warn: '#E0A458', ok: '#8FCB8A', bad: '#E5736A' };
const RMQ = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
const reduced = () => RMQ.matches;
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = n => Number(n).toLocaleString('en-US');
const easeOut = t => 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3);
const clamp01 = t => Math.max(0, Math.min(1, t));
function seeded(seed) { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
const shortName = id => { const k = String(id).indexOf('/'); return k >= 0 ? id.slice(k + 1) : String(id); };
const toMin = s => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10), +s.slice(11, 13), +s.slice(14, 16)) / 60000;
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtT = m => { const d = new Date(m * 60000); return MON[d.getUTCMonth()] + ' ' + d.getUTCDate() + ', ' + String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0'); };
const compact = v => v >= 1e9 ? (v / 1e9).toFixed(2) + 'B' : v >= 1e6 ? (v / 1e6).toFixed(2) + 'M' : v >= 1e3 ? (v / 1e3).toFixed(1) + 'K' : v.toFixed(0);

/* ---------- data, or a labeled SAMPLE ---------- */
let SAMPLE = false;
let SL = window.SLICE, UN = window.UNITS, PA = window.PANEL, BE = window.BENCH;
if (!SL || !SL.transfers || !UN || !UN.units || !PA || !PA.versions) { const s = makeSample(); SL = s.slice; UN = s.units; PA = s.panel; BE = s.bench; SAMPLE = true; }
const NO_BENCH = !BE || !BE.models;
if (NO_BENCH) BE = { models: [], runs: [] };

function makeSample() {
  const rnd = seeded(7); const tr = []; const key = {}; let n = 0;
  const acct = i => 'S' + String(i).padStart(4, '0');
  const ts = d => '2022/09/' + String(d).padStart(2, '0') + ' ' + String(Math.floor(rnd() * 24)).padStart(2, '0') + ':' + String(Math.floor(rnd() * 60)).padStart(2, '0');
  const add = (f, t, d, ring) => { const id = 'T' + String(++n).padStart(4, '0'); tr.push([id, ts(d), acct(f), acct(t), Math.round(rnd() * 900000) / 100 + 100, 'US Dollar', ring >= 0 ? 'ACH' : 'Cheque', '001', '002']); key[id] = ring >= 0 ? [1, ring] : [0, -1]; return id; };
  for (let i = 0; i < 90; i++) { const f = Math.floor(rnd() * 50); let t = Math.floor(rnd() * 50); if (t === f) t = (t + 1) % 50; add(f, t, 1 + Math.floor(rnd() * 10), -1); }
  [50, 51, 52, 53, 54].forEach((a, i, arr) => add(a, arr[(i + 1) % 5], 3 + i, 0)); add(10, 50, 2, -1);
  [56, 57, 58, 59, 60, 61].forEach((b, i) => add(55, b, 5 + (i % 3), 1)); add(55, 12, 4, -1);
  add(62, 63, 7, 2); add(63, 64, 8, 2); add(64, 20, 9, -1);
  tr.sort((a, b) => a[1] < b[1] ? -1 : 1);
  const A = (lo, hi, extra) => { const o = []; for (let i = lo; i <= hi; i++) o.push(acct(i)); (extra || []).forEach(x => o.push(acct(x))); return o; };
  const units = [
    { id: 'u1', expected: 'ring', ring_id: 0, accounts: A(50, 54, [10]) }, { id: 'u2', expected: 'ring', ring_id: 1, accounts: A(55, 61, [12]) }, { id: 'u3', expected: 'ring', ring_id: 2, accounts: A(62, 64, [20]) },
    { id: 'u4', expected: 'ordinary', ring_id: null, accounts: A(0, 7) }, { id: 'u5', expected: 'ordinary', ring_id: null, accounts: A(8, 15) }, { id: 'u6', expected: 'ordinary', ring_id: null, accounts: A(16, 23) }];
  const fams = ['sample/alpha', 'sample/beta', 'sample/gamma'];
  const said = { u1: fams, u2: fams.slice(0, 2), u3: fams.slice(2), u4: fams.slice(1), u5: [], u6: fams.slice(0, 1) };
  const shape = { 0: 'cycle', 1: 'fan-out', 2: 'chain' };
  const agreement = units.map(u => ({ unit: u.id, expected: u.expected, shape: u.ring_id != null ? shape[u.ring_id] : 'none', ring_votes: said[u.id].length, families: 3, said_ring: said[u.id] }));
  const runs = [];
  units.forEach(u => fams.forEach(f => { const yes = said[u.id].includes(f); const set = new Set(u.accounts);
    const ids = !yes ? [] : u.ring_id != null ? tr.filter(t => key[t[0]][1] === u.ring_id).map(t => t[0]) : tr.filter(t => set.has(t[2]) && set.has(t[3])).slice(0, 3).map(t => t[0]);
    runs.push({ model: f, version: 'v1', unit: u.id, expected: u.expected, verdict: yes ? 'ring' : 'ordinary', flagged_transfer_ids: ids, ring_accounts_flagged: [], why: 'SAMPLE: a made-up reason so the page can be read without the bench file.' }); }));
  return {
    slice: { transfers: tr, key, ring_meta: { 0: { shape: 'cycle', n: 5 }, 1: { shape: 'fan-out', n: 6 }, 2: { shape: 'chain', n: 2 } } },
    units: { units },
    panel: { written: 'SAMPLE', versions: { v1: { summary: { families: fams }, agreement, vote_table: [] } } },
    bench: { written: 'SAMPLE', versions: { v1: 'SAMPLE' }, models: fams.map(f => ({ id: f, version: 'v1' })), runs }
  };
}

/* ---------- transfers, accounts, IBM's groups ---------- */
const TR = SL.transfers.map(r => { const k = SL.key[r[0]] || [0, -1]; return { id: r[0], ts: r[1], t: toMin(r[1]), from: r[2], to: r[3], paid: +r[4] || 0, cur: r[5], label: k[0], ring: k[1], self: r[2] === r[3] }; });
TR.sort((a, b) => a.t - b.t);
const BYID = {}; TR.forEach(t => { BYID[t.id] = t; });
const T0 = TR[0].t, T1 = TR[TR.length - 1].t;
const TRUTH = TR.filter(t => t.label);
const nodes = [], nodeIdx = {};
const nodeOf = a => { if (!(a in nodeIdx)) { nodeIdx[a] = nodes.length; nodes.push({ a, x: 0, y: 0, sx: 0, sy: 0, deg: 0, first: Infinity, r: 1 }); } return nodeIdx[a]; };
const edges = [];
TR.forEach(t => { const u = nodeOf(t.from), v = nodeOf(t.to); nodes[u].deg++; nodes[u].first = Math.min(nodes[u].first, t.t); if (!t.self) { nodes[v].deg++; nodes[v].first = Math.min(nodes[v].first, t.t); t.e = edges.length; edges.push({ u, v, t: t.t, tr: t }); } else t.e = -1; });
nodes.forEach(n => { n.r = Math.min(6.5, 1.1 + Math.sqrt(n.deg) * 0.55); });

const RINGS = {};
TRUTH.forEach(t => { const R = RINGS[t.ring] || (RINGS[t.ring] = { r: t.ring, ids: [], ns: new Set(), paid: {}, start: Infinity, end: -Infinity });
  R.ids.push(t.id); R.ns.add(nodeIdx[t.from]); R.ns.add(nodeIdx[t.to]); R.paid[t.cur] = (R.paid[t.cur] || 0) + t.paid; R.start = Math.min(R.start, t.t); R.end = Math.max(R.end, t.t); });
const RING_IDS = Object.keys(RINGS).map(Number).sort((a, b) => a - b);
RING_IDS.forEach(r => { RINGS[r].nodes = [...RINGS[r].ns]; RINGS[r].shape = (SL.ring_meta && SL.ring_meta[r] && SL.ring_meta[r].shape) || 'other'; });
const NR = RING_IDS.length, NT = TRUTH.length;
const UNIT_OF_RING = {}; (UN.units || []).forEach(u => { if (u.ring_id != null) UNIT_OF_RING[u.ring_id] = u.id; });

/* ---------- force layout: written for this page, run once, then frozen ---------- */
function layout(aspect) {
  const rnd = seeded(20261017); const N = nodes.length;
  const par = new Int32Array(N); for (let i = 0; i < N; i++) par[i] = i;
  const find = x => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
  edges.forEach(e => { const a = find(e.u), b = find(e.v); if (a !== b) par[a] = b; });
  const comps = {}, cedges = {};
  for (let i = 0; i < N; i++) (comps[find(i)] = comps[find(i)] || []).push(i);
  edges.forEach(e => (cedges[find(e.u)] = cedges[find(e.u)] || []).push(e));
  const K = 15; const boxes = [];
  Object.keys(comps).forEach(root => {
    const c = comps[root]; const n = c.length;
    if (n === 1) { nodes[c[0]].x = 0; nodes[c[0]].y = 0; boxes.push({ c, minx: -4, miny: -4, w: 8, h: 8 }); return; }
    const loc = new Map(); c.forEach((v, i) => loc.set(v, i));
    const X = new Float64Array(n), Y = new Float64Array(n);
    const R0 = Math.sqrt(n) * K * 0.7;
    for (let i = 0; i < n; i++) { const a = rnd() * Math.PI * 2, r = R0 * Math.sqrt(rnd()); X[i] = Math.cos(a) * r; Y[i] = Math.sin(a) * r; }
    const springs = new Map();
    (cedges[root] || []).forEach(e => { const a = loc.get(e.u), b = loc.get(e.v); const k = a < b ? a * n + b : b * n + a; springs.set(k, Math.min(4, (springs.get(k) || 0) + (e.tr.label ? 2.5 : 1))); });
    RING_IDS.forEach(r => { const m = RINGS[r].nodes.filter(v => loc.has(v)).map(v => loc.get(v)); for (let i = 0; i < m.length; i++) for (let j = i + 1; j < m.length; j++) { const a = m[i], b = m[j]; const k = a < b ? a * n + b : b * n + a; springs.set(k, (springs.get(k) || 0) + 0.6); } });
    const S = [...springs].map(([k, w]) => [Math.floor(k / n), k % n, w]);
    const iters = n > 300 ? 170 : n > 40 ? 150 : 110; let temp = R0 * 0.3;
    const dx = new Float64Array(n), dy = new Float64Array(n);
    for (let it = 0; it < iters; it++) {
      dx.fill(0); dy.fill(0);
      for (let a = 0; a < n; a++) { const xa = X[a], ya = Y[a]; for (let b = a + 1; b < n; b++) { const x = xa - X[b], y = ya - Y[b]; const d2 = x * x + y * y + 0.01; if (d2 > 14400) continue; const f = K * K / d2; dx[a] += x * f; dy[a] += y * f; dx[b] -= x * f; dy[b] -= y * f; } }
      for (let s = 0; s < S.length; s++) { const a = S[s][0], b = S[s][1], w = S[s][2]; const x = X[a] - X[b], y = Y[a] - Y[b]; const d = Math.sqrt(x * x + y * y) + 0.01; const f = d / K * Math.sqrt(w); dx[a] -= x * f; dy[a] -= y * f; dx[b] += x * f; dy[b] += y * f; }
      for (let a = 0; a < n; a++) { dx[a] -= X[a] * 0.03; dy[a] -= Y[a] * 0.03; const d = Math.sqrt(dx[a] * dx[a] + dy[a] * dy[a]) + 0.01; const m = Math.min(d, temp); X[a] += dx[a] / d * m; Y[a] += dy[a] / d * m; }
      temp *= 0.972;
    }
    let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
    for (let i = 0; i < n; i++) { nodes[c[i]].x = X[i]; nodes[c[i]].y = Y[i]; minx = Math.min(minx, X[i]); maxx = Math.max(maxx, X[i]); miny = Math.min(miny, Y[i]); maxy = Math.max(maxy, Y[i]); }
    const m = n <= 3 ? 5 : 10; boxes.push({ c, minx: minx - m, miny: miny - m, w: maxx - minx + 2 * m, h: maxy - miny + 2 * m });
  });
  /* packing: the big component on the left, the rest shelf-packed into the space to its right, then below it */
  boxes.sort((a, b) => b.c.length - a.c.length);
  const big = boxes.shift(); const rest = boxes.sort((a, b) => (b.c.length > 1) - (a.c.length > 1) || b.h - a.h || b.w - a.w);
  let area = big.w * big.h; rest.forEach(b => { area += b.w * b.h; });
  const W = Math.max(big.w * 1.25, Math.sqrt(area * aspect));
  const place = (b, x, y) => { const ox = x - b.minx, oy = y - b.miny; b.c.forEach(v => { nodes[v].x += ox; nodes[v].y += oy; }); };
  place(big, 0, 0);
  const regions = [{ x0: big.w + 8, x1: W, y0: 0, y1: big.h }, { x0: 0, x1: W, y0: big.h + 8, y1: Infinity }];
  let ri = 0, x = regions[0].x0, y = regions[0].y0, rowH = 0;
  rest.forEach(b => {
    for (;;) {
      const R = regions[ri];
      if (x + b.w > R.x1 && x > R.x0) { x = R.x0; y += rowH; rowH = 0; }
      if ((y + b.h > R.y1 || b.w > R.x1 - R.x0) && ri < regions.length - 1) { ri++; x = regions[ri].x0; y = regions[ri].y0; rowH = 0; continue; }
      break;
    }
    place(b, x, y); x += b.w; rowH = Math.max(rowH, b.h);
  });
}

/* ---------- groups: IBM's 20 (from labels) and the 40 ordinary neighborhoods (from units.js) ---------- */
const GROUPS = [];
RING_IDS.forEach(r => GROUPS.push({ kind: 'ring', r, unit: UNIT_OF_RING[r] || null, nodes: RINGS[r].nodes, start: RINGS[r].start, votes: 0, of: 0, said: [], litT: 0, from: 0, to: 0 }));
(UN.units || []).forEach(u => {
  if (u.expected === 'ring') return;
  const ns = (u.accounts || []).filter(a => a in nodeIdx).map(a => nodeIdx[a]); if (!ns.length) return;
  let start = Infinity; (u.rows || []).forEach(row => { start = Math.min(start, toMin(row[1])); }); if (!isFinite(start)) start = Math.min(...ns.map(v => nodes[v].first));
  GROUPS.push({ kind: 'ord', unit: u.id, nodes: ns, start, votes: 0, of: 0, said: [], litT: 0, from: 0, to: 0, nRows: (u.rows || []).length });
});

/* ---------- runs and selections ---------- */
const VERSIONS = Object.keys(PA.versions).filter(v => PA.versions[v].agreement && PA.versions[v].summary && (PA.versions[v].summary.families || []).length);
const RUNS = {}; (BE.runs || []).forEach(r => { const k = r.model + '|' + (r.version || 'v1'); (RUNS[k] = RUNS[k] || []).push(r); });
const STAT_CACHE = {};
function ringsFoundBy(F) { return RING_IDS.filter(r => { const ids = RINGS[r].ids; let h = 0; ids.forEach(id => { if (F.has(id)) h++; }); return h / ids.length >= 0.5; }); }
function modelStats(id, ver) {
  const key = id + '|' + ver; if (STAT_CACHE[key]) return STAT_CACHE[key];
  const runs = RUNS[key] || []; const F = new Set(); const byUnit = {};
  runs.forEach(r => { byUnit[r.unit] = r; (r.flagged_transfer_ids || []).forEach(id2 => { if (BYID[id2]) F.add(id2); }); });
  const fa = runs.filter(r => r.expected === 'ordinary' && r.verdict === 'ring');
  const s = { kind: 'model', id, ver, name: shortName(id), runs, F, byUnit, found: ringsFoundBy(F), traced: TRUTH.filter(t => F.has(t.id)).length, f: fa.length, g: fa.filter(r => (r.ring_accounts_flagged || []).length).length };
  return (STAT_CACHE[key] = s);
}
function panelStats(ver, k) {
  const V = PA.versions[ver]; const fams = V.summary.families; const F = new Set(); let f = 0, g = 0; const byUnit = {};
  V.agreement.forEach(u => {
    if (u.ring_votes < k) return;
    const runs = (u.said_ring || []).map(fm => modelStats(fm, ver).byUnit[u.unit]).filter(Boolean);
    if (runs[0]) byUnit[u.unit] = runs[0];
    runs.forEach(r => (r.flagged_transfer_ids || []).forEach(id => { if (BYID[id]) F.add(id); }));
    if (u.expected === 'ordinary') { f++; if (runs.some(r => (r.ring_accounts_flagged || []).length)) g++; }
  });
  return { kind: 'panel', ver, k, name: 'The ' + fams.length + '-family panel at ' + k + (k === 1 ? ' vote' : ' votes'), F, byUnit, found: ringsFoundBy(F), traced: TRUTH.filter(t => F.has(t.id)).length, f, g };
}

/* ---------- state ---------- */
const ST = { ver: VERSIONS[0] || 'v1', k: 5, n: 9, model: '', scrub: T1, playing: false, sel: null, hover: null };
const AG = {}; VERSIONS.forEach(v => { AG[v] = {}; PA.versions[v].agreement.forEach(u => { AG[v][u.unit] = u; }); });
function famsOf(ver) { return PA.versions[ver].summary.families; }
function modelsOf(ver) { const fams = famsOf(ver); return (BE.models || []).filter(m => (m.version || 'v1') === ver && (RUNS[m.id + '|' + ver] || []).length).sort((a, b) => fams.indexOf(a.id) - fams.indexOf(b.id)); }

/* ---------- canvas geometry ---------- */
const stage = $('#stage'), cv = $('#cv'), ctx = cv.getContext('2d');
const G = { W: 800, H: 500, dpr: 1 };
let laidOut = false;
function fit() {
  const w = stage.clientWidth || 800, h = stage.clientHeight || 500; const dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); G.W = w; G.H = h; G.dpr = dpr;
  if (!laidOut) { layout(w / h); laidOut = true; }
  let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9; nodes.forEach(n => { minx = Math.min(minx, n.x); maxx = Math.max(maxx, n.x); miny = Math.min(miny, n.y); maxy = Math.max(maxy, n.y); });
  const pad = 22; const s = Math.min((w - 2 * pad) / Math.max(1, maxx - minx), (h - 2 * pad) / Math.max(1, maxy - miny));
  const ox = (w - (maxx - minx) * s) / 2, oy = (h - (maxy - miny) * s) / 2;
  nodes.forEach(n => { n.sx = ox + (n.x - minx) * s; n.sy = oy + (n.y - miny) * s; });
  GROUPS.forEach(g => { g.hull = padHull(g.nodes, g.kind === 'ring' ? 10 : 6); g.area = polyArea(g.hull); let cx = 0, cy = 0; g.nodes.forEach(v => { cx += nodes[v].sx; cy += nodes[v].sy; }); g.cx = cx / g.nodes.length; g.cy = cy / g.nodes.length; });
}
function hull(pts) {
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  up.pop(); lo.pop(); return lo.concat(up);
}
function padHull(ns, pad) { const pts = []; ns.forEach(v => { const n = nodes[v]; for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2; pts.push([n.sx + Math.cos(a) * pad, n.sy + Math.sin(a) * pad]); } }); return hull(pts); }
function polyArea(P) { let a = 0; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; a += p[0] * q[1] - q[0] * p[1]; } return Math.abs(a / 2); }
function inPoly(x, y, P) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if (((a[1] > y) !== (b[1] > y)) && (x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0])) c = !c; } return c; }

/* agreement halo: stroke width and brightness both follow the number of families that called it a ring */
const wOf = v => 0.6 + 0.8 * v;
const aOf = v => 0.22 + 0.78 * v / Math.max(1, ST.n);

/* ---------- motion bookkeeping ---------- */
let raf = 0; const DIAL = { t0: 0, dur: 250, on: false };
const CATCH = new Map();   /* ring -> start time of its resolve (400 ms) */
const PENDING = new Set(); /* rings queued for a catch; their green waits for the resolve */
function requestDraw() { if (!raf) raf = requestAnimationFrame(frame); }
/* a timed redraw after each transition, so the last frame is right even where animation frames are paused (background tab) */
function settleAfter(ms) { setTimeout(() => { if (raf) { cancelAnimationFrame(raf); raf = 0; } frame(performance.now()); }, ms); }
function frame(now) {
  raf = 0; let more = false;
  if (DIAL.on) { const p = reduced() ? 1 : easeOut((now - DIAL.t0) / DIAL.dur); GROUPS.forEach(g => { g.litT = g.from + (g.to - g.from) * p; }); if (p >= 1) DIAL.on = false; else more = true; }
  CATCH.forEach((t0, r) => { if (now - t0 >= RESOLVE_MS) CATCH.delete(r); else more = true; });
  draw(now);
  if (more || ST.playing) requestDraw();
}
const RESOLVE_MS = 420;

/* ---------- draw ---------- */
function pathPoly(P) { ctx.beginPath(); P.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); }
function draw(now) {
  const T = ST.scrub; const sel = ST.sel;
  ctx.setTransform(G.dpr, 0, 0, G.dpr, 0, 0); ctx.fillStyle = C.ground; ctx.fillRect(0, 0, G.W, G.H);
  const anim = new Map(); CATCH.forEach((t0, r) => anim.set(r, reduced() ? 1 : clamp01((now - t0) / RESOLVE_MS)));
  const animNodes = new Set(); anim.forEach((p, r) => RINGS[r].nodes.forEach(v => animNodes.add(v)));
  const hide = r => anim.has(r) || PENDING.has(r);

  /* ordinary transfers: faint hairlines */
  ctx.lineWidth = 0.6; ctx.strokeStyle = 'rgba(163,171,184,0.17)'; ctx.beginPath();
  for (let i = 0; i < edges.length; i++) { const e = edges[i]; if (e.t > T) break; const a = nodes[e.u], b = nodes[e.v]; ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); }
  ctx.stroke();

  /* halos: the 40 ordinary neighborhoods first (red, only where families wrongly called a ring), then IBM's 20 */
  GROUPS.forEach(g => {
    if (g.kind !== 'ord' || g.start > T || g.litT < 0.01 || !g.votes) return;
    pathPoly(g.hull); ctx.setLineDash([]); ctx.lineJoin = 'round'; ctx.strokeStyle = C.bad; ctx.globalAlpha = aOf(g.votes) * 0.7 * g.litT; ctx.lineWidth = wOf(g.votes) * 0.5; ctx.stroke();
  });
  GROUPS.forEach(g => {
    if (g.kind !== 'ring' || g.start > T || anim.has(g.r)) return;
    pathPoly(g.hull); ctx.lineJoin = 'round';
    if (g.litT > 0.01 && g.votes) { ctx.setLineDash([]); ctx.strokeStyle = C.ok; ctx.globalAlpha = aOf(g.votes) * g.litT; ctx.lineWidth = wOf(g.votes); ctx.stroke(); }
    if (g.litT < 0.99) { ctx.setLineDash([1.5, 3.5]); ctx.lineCap = 'round'; ctx.strokeStyle = C.warn; ctx.globalAlpha = 0.85 * (1 - g.litT); ctx.lineWidth = 1.3; ctx.stroke(); ctx.lineCap = 'butt'; }
  });
  ctx.globalAlpha = 1; ctx.setLineDash([]);

  /* accounts */
  ctx.fillStyle = 'rgba(230,233,238,0.62)'; ctx.beginPath();
  nodes.forEach((n, i) => { if (n.first > T || animNodes.has(i)) return; ctx.moveTo(n.sx + n.r, n.sy); ctx.arc(n.sx, n.sy, n.r, 0, Math.PI * 2); });
  ctx.fill();

  /* the model on top: green (IBM agrees), red dashed (IBM says ordinary), amber dotted (labeled, missed) */
  if (sel) {
    const ok = [], bad = [], miss = [];
    for (let i = 0; i < edges.length; i++) { const e = edges[i]; if (e.t > T) break; const t = e.tr; if (t.label && hide(t.ring)) continue;
      if (sel.F.has(t.id)) (t.label ? ok : bad).push(e); else if (t.label) miss.push(e); }
    const stroke = (list, color, w, dash, alpha) => { if (!list.length) return; ctx.beginPath(); list.forEach(e => { const a = nodes[e.u], b = nodes[e.v]; ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); }); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.setLineDash(dash); ctx.globalAlpha = alpha; ctx.stroke(); };
    ctx.lineCap = 'round';
    stroke(bad, C.bad, 1.3, [5, 3], 0.8);
    stroke(miss, C.warn, 1.8, [0.5, 3.5], 0.95);
    stroke(ok, C.ok, 2, [], 1);
    ctx.lineCap = 'butt'; ctx.setLineDash([]); ctx.globalAlpha = 1;
  }

  /* the catch: the group's accounts gather in and spread to their places while its transfers trace in and the outline closes */
  anim.forEach((p, r) => {
    const g = GROUPS.find(x => x.kind === 'ring' && x.r === r); const e = easeOut(p); const s = 0.45 + 0.55 * e;
    const P = v => [g.cx + (nodes[v].sx - g.cx) * s, g.cy + (nodes[v].sy - g.cy) * s];
    ctx.save(); ctx.translate(g.cx, g.cy); ctx.scale(s, s); ctx.translate(-g.cx, -g.cy);
    pathPoly(g.hull); ctx.restore();
    ctx.strokeStyle = C.ok; ctx.lineJoin = 'round'; ctx.globalAlpha = 0.35 + 0.65 * e; ctx.lineWidth = Math.max(wOf(g.votes || 1), 2) + 2.5 * (1 - e); ctx.stroke();
    ctx.globalAlpha = 1; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.beginPath();
    const q = clamp01(e * 1.25);
    RINGS[r].ids.forEach(id => { const t = BYID[id]; if (t.e < 0 || t.t > T) return; const a = P(nodeIdx[t.from]), b = P(nodeIdx[t.to]); ctx.moveTo(a[0], a[1]); ctx.lineTo(a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q); });
    ctx.stroke(); ctx.lineCap = 'butt';
    ctx.fillStyle = C.ink; ctx.beginPath(); RINGS[r].nodes.forEach(v => { const a = P(v); const rr = nodes[v].r + 0.8; ctx.moveTo(a[0] + rr, a[1]); ctx.arc(a[0], a[1], rr, 0, Math.PI * 2); }); ctx.fill();
  });

  /* the group under the pointer: a plain rule, no glow */
  if (ST.hover) { pathPoly(ST.hover.hull); ctx.strokeStyle = C.ink; ctx.globalAlpha = 0.9; ctx.lineWidth = 1; ctx.setLineDash([]); ctx.stroke(); ctx.globalAlpha = 1; }
}

/* ---------- small drawing of one group, for the roster card and the copy that travels into it ---------- */
function drawThumb(canvas, r, w, h) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2); canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  const c = canvas.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const ns = RINGS[r].nodes; let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
  ns.forEach(v => { const n = nodes[v]; minx = Math.min(minx, n.x); maxx = Math.max(maxx, n.x); miny = Math.min(miny, n.y); maxy = Math.max(maxy, n.y); });
  const pad = 9; const s = Math.min((w - 2 * pad) / Math.max(1, maxx - minx), (h - 2 * pad) / Math.max(1, maxy - miny), 3);
  const ox = (w - (maxx - minx) * s) / 2, oy = (h - (maxy - miny) * s) / 2;
  const P = v => [ox + (nodes[v].x - minx) * s, oy + (nodes[v].y - miny) * s];
  c.strokeStyle = C.ok; c.lineWidth = 1.6; c.lineCap = 'round'; c.beginPath();
  RINGS[r].ids.forEach(id => { const t = BYID[id]; if (t.e < 0) return; const a = P(nodeIdx[t.from]), b = P(nodeIdx[t.to]); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); }); c.stroke();
  c.fillStyle = C.ink; c.beginPath(); ns.forEach(v => { const a = P(v); c.moveTo(a[0] + 2.2, a[1]); c.arc(a[0], a[1], 2.2, 0, Math.PI * 2); }); c.fill();
}

/* ---------- the caught roster ---------- */
const strip = $('#strip');
const CARDS = new Map(); const QUEUE = []; let qBusy = false, epoch = 0;
function moneyLine(r) { const p = RINGS[r].paid; const cur = Object.keys(p).sort((a, b) => p[b] - p[a]); if (!cur.length) return ''; return compact(p[cur[0]]) + ' ' + cur[0] + (cur.length > 1 ? ' +' + (cur.length - 1) + ' more' : ''); }
function firstSentence(s) { s = String(s || '').trim(); const m = /^(.{20,}?[.;])\s/.exec(s); s = m ? m[1] : s; return s.length > 170 ? s.slice(0, 167) + '...' : s; }
function alsoCaught(r) {
  const sel = ST.sel; if (!sel) return [];
  if (sel.kind === 'panel') { const u = AG[ST.ver][UNIT_OF_RING[r]]; return (u && u.said_ring || []).map(shortName); }
  return famsOf(ST.ver).filter(f => f !== sel.id && modelStats(f, ST.ver).found.includes(r)).map(shortName);
}
function whyFor(g, sel) {
  if (!g.unit) return null; const u = AG[ST.ver][g.unit];
  if (sel && sel.byUnit[g.unit] && sel.byUnit[g.unit].why) return { who: sel.kind === 'model' ? sel.name : shortName(sel.byUnit[g.unit].model), why: sel.byUnit[g.unit].why };
  const fams = (u && u.said_ring && u.said_ring.length) ? u.said_ring : famsOf(ST.ver);
  for (const f of fams) { const run = modelStats(f, ST.ver).byUnit[g.unit]; if (run && run.why) return { who: shortName(f), why: run.why }; }
  return null;
}
function buildCard(r, pending) {
  const R = RINGS[r]; const g = GROUPS.find(x => x.kind === 'ring' && x.r === r); const also = alsoCaught(r); const w = whyFor(g, ST.sel);
  const el = document.createElement('article'); el.className = 'card' + (pending ? ' pending' : '');
  const cvs = document.createElement('canvas'); drawThumb(cvs, r, 84, 60); el.append(cvs);
  const h = document.createElement('h3'); h.textContent = R.shape; el.append(h);
  const f = document.createElement('div'); f.className = 'facts';
  f.innerHTML = '<span class="mono">' + R.nodes.length + '</span> accounts · <span class="mono">' + R.ids.length + '</span> ' + (R.ids.length === 1 ? 'transfer' : 'transfers') + '<br><span class="mono">' + esc(moneyLine(r)) + '</span> moved';
  el.append(f);
  const a = document.createElement('p'); a.className = 'also';
  a.textContent = ST.sel && ST.sel.kind === 'panel' ? 'Called a ring by ' + also.length + ': ' + (also.join(', ') || 'none') : also.length ? 'Also caught by ' + also.length + ': ' + also.join(', ') : 'No other family caught it';
  a.title = a.textContent; el.append(a);
  const y = document.createElement('p'); y.className = 'why'; y.textContent = w ? w.who + ': ' + firstSentence(w.why) : ''; y.title = w ? w.why : ''; el.append(y);
  el.dataset.ring = r; el.setAttribute('aria-label', 'Caught: IBM group ' + r + ', ' + R.shape);
  return el;
}
function insertCard(r, el) {
  /* cards sit in the order the rings finished, earliest first */
  const after = [...strip.children].find(c => RINGS[+c.dataset.ring].end > RINGS[r].end);
  strip.insertBefore(el, after || null); CARDS.set(r, el);
}
function syncRoster(reset) {
  if (reset) { epoch++; QUEUE.length = 0; PENDING.clear(); CATCH.clear(); CARDS.clear(); strip.innerHTML = ''; document.querySelectorAll('.flyer').forEach(f => f.remove()); qBusy = false; }
  const sel = ST.sel; const want = sel ? sel.found.filter(r => RINGS[r].end <= ST.scrub).sort((a, b) => RINGS[a].end - RINGS[b].end) : [];
  const W = new Set(want);
  CARDS.forEach((el, r) => { if (!W.has(r)) { el.remove(); CARDS.delete(r); } });
  for (let i = QUEUE.length - 1; i >= 0; i--) if (!W.has(QUEUE[i])) { PENDING.delete(QUEUE[i]); QUEUE.splice(i, 1); }
  want.forEach(r => { if (!CARDS.has(r) && !QUEUE.includes(r) && !CATCH.has(r)) { QUEUE.push(r); PENDING.add(r); } });
  renderRosterHead();
  if (!qBusy) nextCatch(epoch);
  requestDraw();
}
function renderRosterHead() {
  const sel = ST.sel; const total = sel ? sel.found.length : 0;
  $('#rcount').textContent = sel ? CARDS.size + ' of ' + NR + ' IBM rings' : '';
  $('#rnote').textContent = !sel ? '' : ST.scrub < T1 && total > CARDS.size + QUEUE.length ? 'More land as the clock reaches the end of each ring.' : (sel.kind === 'panel' ? 'Caught means the panel flagged at least half of a ring\'s labeled transfers.' : 'Caught means ' + sel.name + ' flagged at least half of a ring\'s labeled transfers.');
}
function nextCatch(ep) {
  if (ep !== epoch) return;
  if (!QUEUE.length) { qBusy = false; renderRosterHead(); return; }
  qBusy = true; const r = QUEUE.shift();
  if (reduced()) { PENDING.delete(r); insertCard(r, buildCard(r, false)); renderRosterHead(); requestDraw(); setTimeout(() => nextCatch(ep), 0); return; }
  PENDING.delete(r); CATCH.set(r, performance.now()); requestDraw(); settleAfter(RESOLVE_MS + 40);
  setTimeout(() => fly(r, ep), 300);
  setTimeout(() => nextCatch(ep), 230);
}
function fly(r, ep) {
  if (ep !== epoch) return;
  const g = GROUPS.find(x => x.kind === 'ring' && x.r === r); const card = buildCard(r, true); insertCard(r, card); renderRosterHead();
  const sr = strip.getBoundingClientRect(); const cr = card.getBoundingClientRect();
  if (cr.right > sr.right || cr.left < sr.left) strip.scrollLeft += (cr.left - sr.left) - (sr.width - cr.width) / 2;
  const target = card.querySelector('canvas').getBoundingClientRect();
  let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9; g.nodes.forEach(v => { minx = Math.min(minx, nodes[v].sx); maxx = Math.max(maxx, nodes[v].sx); miny = Math.min(miny, nodes[v].sy); maxy = Math.max(maxy, nodes[v].sy); });
  const st = cv.getBoundingClientRect(); const bw = Math.max(48, maxx - minx + 20), bh = Math.max(34, maxy - miny + 20);
  const sx = st.left + (minx + maxx) / 2 - bw / 2, sy = st.top + (miny + maxy) / 2 - bh / 2;
  const fl = document.createElement('canvas'); fl.className = 'flyer'; drawThumb(fl, r, 84, 60); document.body.append(fl);
  const k0 = Math.max(bw / 84, bh / 60);
  const from = 'translate(' + (sx + bw / 2 - 42 * k0) + 'px,' + (sy + bh / 2 - 30 * k0) + 'px) scale(' + k0 + ')';
  const to = 'translate(' + target.left + 'px,' + target.top + 'px) scale(1)';
  let landed = false; const done = () => { if (landed) return; landed = true; fl.remove(); if (ep === epoch) card.classList.remove('pending'); };
  setTimeout(done, 640); /* the card lands even if the animation is never painted (background tab, headless) */
  if (fl.animate) { const an = fl.animate([{ transform: from, opacity: 0.95 }, { transform: to, opacity: 1 }], { duration: 560, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'forwards' }); an.onfinish = done; an.oncancel = done; }
  else done();
}

/* ---------- headline: lead with what was caught; one line of limit; end on the strongest true number ---------- */
function renderHeadline() {
  const s = ST.sel; if (!s) return;
  const alarms = s.f === 1 ? '1 alarm' : num(s.f) + ' alarms';
  $('#headline').innerHTML = '<em>' + esc(s.name) + '</em> caught <b>' + s.found.length + ' of IBM\'s ' + NR + '</b> laundering rings and traced <b>' + num(s.traced) + ' of ' + num(NT) + '</b> laundering transfers; it raised ' + alarms + ' on ordinary neighborhoods, ' + num(s.g) + ' of them on accounts that sit inside a ring.';
  const sl = SL.slice || {};
  $('#limit').textContent = SAMPLE ? 'Limit: this is a SAMPLE network made up by the page; no number here is a measurement.' :
    'Limit: IBM\'s synthetic data, one run per model per neighborhood, in a slice enriched to ' + (sl.rate ? (sl.rate * 100).toFixed(1) : (NT / TR.length * 100).toFixed(1)) + ' percent laundering' + (sl.full_rows ? ' (' + (sl.full_laundering / sl.full_rows * 100).toFixed(2) + ' percent in the full file)' : '') + ', so live alarm counts would run higher.';
  $('#closer').innerHTML = s.found.length + ' of ' + NR + ' <span>rings caught</span>';
}

/* ---------- controls ---------- */
function setVotes(animate) {
  GROUPS.forEach(g => { const u = g.unit ? AG[ST.ver][g.unit] : null; g.votes = u ? u.ring_votes : 0; g.of = u ? u.families : 0; g.said = u ? (u.said_ring || []) : []; });
  GROUPS.forEach(g => { g.from = g.litT; g.to = g.votes >= ST.k && g.votes > 0 ? 1 : 0; if (!animate) g.litT = g.to; });
  if (animate && !reduced()) { DIAL.t0 = performance.now(); DIAL.on = true; settleAfter(DIAL.dur + 40); } else GROUPS.forEach(g => { g.litT = g.to; });
  const lr = GROUPS.filter(g => g.kind === 'ring' && g.to).length, lo = GROUPS.filter(g => g.kind === 'ord' && g.to).length;
  const nOrd = GROUPS.filter(g => g.kind === 'ord').length;
  $('#dialVal').textContent = ST.k + ' of ' + ST.n;
  $('#dialNote').innerHTML = 'At this dial <span class="mono" style="color:var(--ok)">' + lr + ' of ' + NR + '</span> IBM groups light green and <span class="mono" style="color:var(--bad)">' + lo + ' of ' + nOrd + '</span> ordinary neighborhoods light red.';
  requestDraw();
}
function select(reset) {
  ST.sel = ST.model ? modelStats(ST.model, ST.ver) : panelStats(ST.ver, ST.k);
  renderHeadline(); syncRoster(reset);
}
function renderControls() {
  const n = famsOf(ST.ver).length; ST.n = n; ST.k = Math.min(ST.k, n);
  const dial = $('#dial'); dial.max = n; dial.value = ST.k;
  $('#ticks').innerHTML = Array.from({ length: n }, (_, i) => '<span>' + (i + 1) + '</span>').join('');
  const seg = $('#verSeg'); seg.innerHTML = '';
  VERSIONS.forEach(v => { const b = document.createElement('button'); b.type = 'button'; b.textContent = v; b.className = v === ST.ver ? 'on' : ''; b.setAttribute('aria-pressed', v === ST.ver); b.onclick = () => { if (ST.ver === v) return; const keep = ST.model; ST.ver = v; renderControls(); if (keep && modelsOf(v).some(m => m.id === keep)) ST.model = keep; $('#model').value = ST.model; setVotes(true); select(true); }; seg.append(b); });
  $('#verNote').textContent = (BE.versions && BE.versions[ST.ver]) ? ST.ver + ': ' + BE.versions[ST.ver] + '.' : '';
  const ms = $('#model'); const list = modelsOf(ST.ver);
  ms.innerHTML = '<option value="">No single model: the panel at the dial</option>' + list.map(m => '<option value="' + esc(m.id) + '">' + esc(shortName(m.id)) + ' (' + esc(ST.ver) + ')</option>').join('');
  if (!list.some(m => m.id === ST.model)) ST.model = ''; ms.value = ST.model;
}
$('#dial').addEventListener('input', e => { ST.k = +e.target.value; setVotes(true); if (!ST.model) select(false); });
$('#model').addEventListener('change', e => { ST.model = e.target.value; select(true); });

/* ten-day scrub: transfers appear in the order they happened */
const timeEl = $('#time'), playBtn = $('#play'); let playT0 = 0, playFrom = 0, stepTimer = 0;
const PLAY_MS = 9000;
function setScrub(T) { ST.scrub = Math.max(T0, Math.min(T1, T)); timeEl.value = Math.round((ST.scrub - T0) / Math.max(1, T1 - T0) * 1000); renderClock(); syncRoster(false); requestDraw(); }
function renderClock() { let n = 0; for (let i = 0; i < TR.length && TR[i].t <= ST.scrub; i++) n++; $('#clock').innerHTML = '<b>' + fmtT(ST.scrub) + '</b> · ' + num(n) + ' of ' + num(TR.length) + ' transfers · ' + fmtT(T0) + ' to ' + fmtT(T1); }
timeEl.addEventListener('input', () => { stopPlay(); setScrub(T0 + (T1 - T0) * (+timeEl.value / 1000)); });
function stopPlay() { ST.playing = false; clearInterval(stepTimer); playBtn.textContent = 'Play the ten days'; }
function playTick(now) { if (!ST.playing) return; const p = clamp01((now - playT0) / (PLAY_MS * (1 - playFrom))); setScrub(T0 + (T1 - T0) * (playFrom + (1 - playFrom) * p)); if (p >= 1) stopPlay(); else requestAnimationFrame(playTick); }
playBtn.addEventListener('click', () => {
  if (ST.playing) { stopPlay(); return; }
  if (ST.scrub >= T1) setScrub(T0);
  ST.playing = true; playBtn.textContent = 'Pause';
  if (reduced()) { stepTimer = setInterval(() => { const next = ST.scrub + 1440; setScrub(next); if (next >= T1) stopPlay(); }, 450); return; }
  playFrom = (ST.scrub - T0) / Math.max(1, T1 - T0); playT0 = performance.now(); requestAnimationFrame(playTick);
});

/* ---------- hover card per group ---------- */
const hov = $('#hover');
cv.addEventListener('mousemove', ev => {
  const rect = cv.getBoundingClientRect(); const x = ev.clientX - rect.left, y = ev.clientY - rect.top;
  let best = null;
  GROUPS.forEach(g => { if (g.start > ST.scrub || !g.hull || !g.hull.length) return; if (g.kind === 'ord' && g.litT < 0.05) return; if (!inPoly(x, y, g.hull)) return;
    if (!best || (g.kind === 'ring' && best.kind !== 'ring') || (g.kind === best.kind && g.area < best.area)) best = g; });
  if (best !== ST.hover) { ST.hover = best; requestDraw(); }
  if (!best) { hov.hidden = true; return; }
  hov.innerHTML = hoverHtml(best); hov.className = 'hovercard' + (best.kind === 'ord' ? ' ord' : ''); hov.hidden = false;
  const w = hov.offsetWidth, h = hov.offsetHeight; let lx = x + 16, ly = y + 12; if (lx + w > G.W - 6) lx = x - w - 16; if (ly + h > G.H - 6) ly = Math.max(6, G.H - h - 6);
  hov.style.left = Math.max(6, lx) + 'px'; hov.style.top = ly + 'px';
});
cv.addEventListener('mouseleave', () => { hov.hidden = true; if (ST.hover) { ST.hover = null; requestDraw(); } });
function hoverHtml(g) {
  const fams = famsOf(ST.ver); const said = g.said.map(shortName); const not = fams.filter(f => !g.said.includes(f)).map(shortName);
  const agree = '<b class="mono">' + g.votes + ' of ' + (g.of || fams.length) + '</b> families called it a ring' + (said.length ? ': ' + esc(said.join(', ')) : '') + '.';
  const w = whyFor(g, ST.sel); const sel = ST.sel;
  if (g.kind === 'ring') {
    const R = RINGS[g.r]; const caught = sel && sel.found.includes(g.r);
    return '<p class="eyebrow">IBM laundering group ' + g.r + (g.unit ? ' · neighborhood ' + esc(g.unit) : '') + '</p><h3 style="text-transform:capitalize">' + esc(R.shape) + '</h3>' +
      '<p class="mono">' + R.nodes.length + ' accounts · ' + R.ids.length + (R.ids.length === 1 ? ' transfer · ' : ' transfers · ') + esc(moneyLine(g.r)) + '</p>' +
      '<p>' + agree + (not.length && said.length ? ' <span class="who">Not: ' + esc(not.join(', ')) + '.</span>' : '') + '</p>' +
      (sel ? '<p>' + esc(sel.name) + (caught ? ' <b style="color:var(--ok)">caught it</b>.' : ' <span style="color:var(--warn)">did not reach half of its labeled transfers</span>.') + '</p>' : '') +
      (w ? '<p class="why"><span class="who">' + esc(w.who) + ':</span> ' + esc(firstSentence(w.why)) + '</p>' : '');
  }
  return '<p class="eyebrow">Ordinary neighborhood ' + esc(g.unit) + '</p><h3>IBM labels nothing here as laundering</h3>' +
    '<p class="mono">' + g.nodes.length + ' accounts' + (g.nRows ? ' · ' + g.nRows + ' transfers' : '') + '</p><p>' + agree + '</p>' +
    (w ? '<p class="why"><span class="who">' + esc(w.who) + ', the false alarm in its words:</span> ' + esc(firstSentence(w.why)) + '</p>' : '');
}

/* ---------- badges, start ---------- */
function renderBadges() {
  const b = $('#badges'); const out = [];
  if (SAMPLE) out.push('<span class="badge warn" title="../../../data/ slice.js, units.js or panel.js was not found">SAMPLE network, made up by the page</span>');
  else out.push('<span class="badge">' + num(TR.length) + ' transfers · ' + num(nodes.length) + ' accounts · ' + NR + ' IBM groups</span>');
  if (NO_BENCH) out.push('<span class="badge warn">bench_results.js not found: no model runs</span>');
  else out.push('<span class="badge">runs written ' + esc(BE.written || '?') + '</span>');
  if (PA.written) out.push('<span class="badge">panel written ' + esc(PA.written) + '</span>');
  b.innerHTML = out.join('');
}
function defaultModel() {
  const list = modelsOf(ST.ver); if (!list.length) return '';
  return list.map(m => modelStats(m.id, ST.ver)).sort((a, b) => b.found.length - a.found.length || a.f - b.f)[0].id;
}
function init() {
  renderBadges(); fit();
  ST.n = famsOf(ST.ver).length; ST.k = Math.max(1, Math.ceil(ST.n / 2));
  const qm = /[?&]model=([^&]+)/.exec(location.search); const qk = /[?&]k=(\d+)/.exec(location.search);
  if (qk) ST.k = Math.max(1, Math.min(ST.n, +qk[1]));
  ST.model = qm ? decodeURIComponent(qm[1]) === 'panel' ? '' : decodeURIComponent(qm[1]) : defaultModel();
  const qt = /[?&]t=([\d.]+)/.exec(location.search); if (qt) { ST.scrub = T0 + (T1 - T0) * clamp01(+qt[1]); timeEl.value = Math.round(clamp01(+qt[1]) * 1000); }
  renderControls(); setVotes(false); renderClock(); select(true);
  const qh = /[?&]hover=(\d+)/.exec(location.search); if (qh) { const g = GROUPS.find(x => x.kind === 'ring' && x.r === +qh[1]); if (g) { const rc = cv.getBoundingClientRect(); cv.dispatchEvent(new MouseEvent('mousemove', { clientX: rc.left + g.cx, clientY: rc.top + g.cy })); } }
  let rt = 0; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { fit(); requestDraw(); }, 120); });
}
init();
})();
