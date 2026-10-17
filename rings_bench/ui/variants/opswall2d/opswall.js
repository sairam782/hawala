/* Rings bench, the ops wall. Agreement as the visual language, on the twenty groups IBM labeled.
   Reads window.SLICE, window.UNITS, window.PANEL, window.BENCH (../../../data/*.js). If slice, units or panel is missing,
   a small made-up SAMPLE stands in and the page says so. Canvas 2D, no libraries.
   Each group is laid out once at load and frozen; the canvas only redraws when a control changes. */
(function () {
'use strict';
const C = { ground: '#14181F', surface: '#1C222B', ink: '#E6E9EE', muted: '#A3ABB8', accent: '#7FB7B0', rule: '#2C3440', warn: '#E0A458', ok: '#8FCB8A', bad: '#E5736A' };
const RMQ = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
const reduced = () => RMQ.matches;
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = n => Number(n).toLocaleString('en-US');
const clamp01 = t => Math.max(0, Math.min(1, t));
const easeOut = t => 1 - Math.pow(1 - clamp01(t), 3);
function seeded(seed) { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
const NICE = { 'claude-sonnet-5-5': 'Claude Sonnet 5.5', 'claude-haiku-5-5': 'Claude Haiku 5.5', 'kimi-k3': 'Kimi K3', 'gpt-6-sol': 'GPT-6 Sol', 'gpt-6-luna': 'GPT-6 Luna', 'deepseek-v4-pro': 'DeepSeek V4 Pro', 'mistral-large-4': 'Mistral Large 4', 'grok-4.7': 'Grok 4.7', 'glm-5.3': 'GLM 5.3' };
const shortName = id => { const k = String(id).indexOf('/'); const slug = k >= 0 ? id.slice(k + 1) : String(id); return NICE[slug] || slug; };
const toMin = s => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10), +s.slice(11, 13), +s.slice(14, 16)) / 60000;
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtT = m => { const d = new Date(m * 60000); return MON[d.getUTCMonth()] + ' ' + d.getUTCDate() + ', ' + String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0'); };
const compact = v => v >= 1e9 ? (v / 1e9).toFixed(2) + 'B' : v >= 1e6 ? (v / 1e6).toFixed(2) + 'M' : v >= 1e3 ? (v / 1e3).toFixed(1) + 'K' : v.toFixed(0);
const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);

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

/* ---------- transfers and IBM's groups ---------- */
const TR = SL.transfers.map(r => { const k = SL.key[r[0]] || [0, -1]; return { id: r[0], fmt: r[6], t: toMin(r[1]), from: r[2], to: r[3], paid: +r[4] || 0, cur: r[5], label: k[0], ring: k[1], self: r[2] === r[3] }; });
TR.sort((a, b) => a.t - b.t);
const BYID = {}; TR.forEach(t => { BYID[t.id] = t; });
const T0 = TR[0].t, T1 = TR[TR.length - 1].t;
const TRUTH = TR.filter(t => t.label);
const DEG = {}; TR.forEach(t => { DEG[t.from] = (DEG[t.from] || 0) + 1; if (!t.self) DEG[t.to] = (DEG[t.to] || 0) + 1; });
const RINGS = {};
TRUTH.forEach(t => { const R = RINGS[t.ring] || (RINGS[t.ring] = { r: t.ring, ids: [], acc: [], paid: {}, start: Infinity, end: -Infinity, first: {} });
  R.ids.push(t.id); [t.from, t.to].forEach(a => { if (!R.acc.includes(a)) R.acc.push(a); R.first[a] = Math.min(R.first[a] == null ? Infinity : R.first[a], t.t); });
  R.paid[t.cur] = (R.paid[t.cur] || 0) + t.paid; R.start = Math.min(R.start, t.t); R.end = Math.max(R.end, t.t); });
const RING_IDS = Object.keys(RINGS).map(Number).sort((a, b) => a - b);
RING_IDS.forEach(r => { RINGS[r].shape = (SL.ring_meta && SL.ring_meta[r] && SL.ring_meta[r].shape) || 'other'; });
const NR = RING_IDS.length, NT = TRUTH.length;
const RING_OF_ACC = {}; RING_IDS.forEach(r => RINGS[r].acc.forEach(a => { RING_OF_ACC[a] = r; }));
const UNIT_OF_RING = {}; (UN.units || []).forEach(u => { if (u.ring_id != null) UNIT_OF_RING[u.ring_id] = u.id; });
/* the other traffic of each group's accounts: hidden by default, 10 percent when "show all traffic" is on */
RING_IDS.forEach(r => { RINGS[r].stubs = []; });
TR.forEach(t => { if (t.label || t.self) return; [[t.from, t.to], [t.to, t.from]].forEach(([a, o]) => { const r = RING_OF_ACC[a]; if (r != null && RING_OF_ACC[o] !== r) RINGS[r].stubs.push({ a, o, t: t.t, id: t.id }); }); });

/* ---------- one small force layout per group, run once, frozen ---------- */
RING_IDS.forEach(r => {
  const R = RINGS[r]; const n = R.acc.length; const rnd = seeded(1000 + r); const idx = {}; R.acc.forEach((a, i) => { idx[a] = i; });
  const X = new Float64Array(n), Y = new Float64Array(n);
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + rnd() * 0.3; X[i] = Math.cos(a); Y[i] = Math.sin(a); }
  const S = []; const seen = new Set(); R.ids.forEach(id => { const t = BYID[id]; const a = idx[t.from], b = idx[t.to]; const k = Math.min(a, b) + ':' + Math.max(a, b); if (a !== b && !seen.has(k)) { seen.add(k); S.push([a, b]); } });
  const K = 0.55; let temp = 0.3;
  for (let it = 0; it < 300; it++) {
    const dx = new Float64Array(n), dy = new Float64Array(n);
    for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) { const x = X[a] - X[b], y = Y[a] - Y[b]; const d2 = x * x + y * y + 1e-4; const f = K * K / d2; dx[a] += x * f; dy[a] += y * f; dx[b] -= x * f; dy[b] -= y * f; }
    S.forEach(([a, b]) => { const x = X[a] - X[b], y = Y[a] - Y[b]; const d = Math.sqrt(x * x + y * y) + 1e-4; const f = d / K; dx[a] -= x * f; dy[a] -= y * f; dx[b] += x * f; dy[b] += y * f; });
    for (let a = 0; a < n; a++) { dx[a] -= X[a] * 0.05; dy[a] -= Y[a] * 0.05; const d = Math.sqrt(dx[a] * dx[a] + dy[a] * dy[a]) + 1e-4; const m = Math.min(d, temp); X[a] += dx[a] / d * m; Y[a] += dy[a] / d * m; }
    temp *= 0.985;
  }
  R.lx = {}; R.acc.forEach((a, i) => { R.lx[a] = [X[i], Y[i]]; });
});

/* ---------- runs, panel, selections ---------- */
const VERSIONS = Object.keys(PA.versions).filter(v => PA.versions[v].agreement && PA.versions[v].summary && (PA.versions[v].summary.families || []).length);
const AG = {}; VERSIONS.forEach(v => { AG[v] = {}; PA.versions[v].agreement.forEach(u => { AG[v][u.unit] = u; }); });
const RUNS = {}; (BE.runs || []).forEach(r => { const k = r.model + '|' + (r.version || 'v1'); (RUNS[k] = RUNS[k] || []).push(r); });
const STAT = {};
/* caught = the engine's own ring_found on the run for that ring's neighborhood (half the ring flagged, and no sweep) */
const RING_OF_UNIT = {}; Object.keys(UNIT_OF_RING).forEach(r => { RING_OF_UNIT[UNIT_OF_RING[r]] = +r; });
const IBM_SHAPE = {}; (BE.runs || []).forEach(r => { if (r.ibm_shape && !IBM_SHAPE[r.unit]) IBM_SHAPE[r.unit] = r.ibm_shape; });
/* IBM's own pattern name, from the run's ibm_shape; the slice's shape only when the bench has none */
function ringName(r) {
  const raw = IBM_SHAPE[UNIT_OF_RING[r]] || RINGS[r].shape || 'other';
  const t = raw.replace(/[A-Za-z]{2,}(?:-[A-Za-z]{2,})*/g, w => w === w.toUpperCase() ? w.toLowerCase() : w);
  return t.charAt(0).toUpperCase() + t.slice(1);
}
function foundFromRuns(runs) { const out = new Set(); runs.forEach(r => { if (r.ring_found && RING_OF_UNIT[r.unit] != null) out.add(RING_OF_UNIT[r.unit]); }); return [...out].sort((a, b) => a - b); }
function modelStats(id, ver) {
  const key = id + '|' + ver; if (STAT[key]) return STAT[key];
  const runs = RUNS[key] || []; const F = new Set(); const byUnit = {};
  runs.forEach(r => { byUnit[r.unit] = r; (r.flagged_transfer_ids || []).forEach(x => { if (BYID[x]) F.add(x); }); });
  const fa = runs.filter(r => r.expected === 'ordinary' && r.verdict === 'ring');
  return (STAT[key] = { kind: 'model', id, ver, name: shortName(id) + ' ' + ver, runs, F, byUnit, alarmUnits: new Set(fa.map(r => r.unit)), found: foundFromRuns(runs), row: (BE.models || []).find(m => m.id === id && (m.version || 'v1') === ver) || null, caught: (((BE.models || []).find(m => m.id === id && (m.version || 'v1') === ver) || {}).rings_found), traced: TRUTH.filter(t => F.has(t.id)).length, f: fa.length, g: fa.filter(r => (r.ring_accounts_flagged || []).length).length });
}
/* the combined vote, by panel.py's rule: a neighborhood is called a ring when at least k families say so; its flagged transfers are
   the ones at least k of those families flagged; a ring is caught when that covers at least half of its labeled transfers and the
   wrong flags in the neighborhood do not sweep it (no more than the ring's size, and never fewer than 2 allowed).
   The headline's counts come straight from panel.json's vote_table row for k. */
const TRUTH_OF_UNIT = {}; (UN.units || []).forEach(u => { TRUTH_OF_UNIT[u.id] = new Set(u.truth_ids || (u.ring_id != null && RINGS[u.ring_id] ? RINGS[u.ring_id].ids : [])); });
function panelStats(ver, k) {
  const V = PA.versions[ver]; const n = V.summary.families.length; const F = new Set(); let f = 0, g = 0, tp = 0; const byUnit = {}; const alarmUnits = new Set(); const found = [];
  V.agreement.forEach(u => {
    if (u.ring_votes < k) return;
    const runs = (u.said_ring || []).map(fm => modelStats(fm, ver).byUnit[u.unit]).filter(Boolean);
    if (runs[0]) byUnit[u.unit] = runs[0];
    const cnt = {}; runs.forEach(r => (r.flagged_transfer_ids || []).forEach(id => { cnt[id] = (cnt[id] || 0) + 1; }));
    const truth = TRUTH_OF_UNIT[u.unit] || new Set(); let t = 0, wrong = 0;
    Object.keys(cnt).forEach(id => { if (cnt[id] >= k) { if (BYID[id]) F.add(id); if (truth.has(id)) t++; else wrong++; } }); tp += t;
    if (u.expected === 'ordinary') { f++; alarmUnits.add(u.unit); if (runs.some(r => (r.ring_accounts_flagged || []).length)) g++; }
    else if (RING_OF_UNIT[u.unit] != null && truth.size && t >= Math.ceil(truth.size / 2) && wrong <= Math.max(2, truth.size)) found.push(RING_OF_UNIT[u.unit]);
  });
  const row = (V.vote_table || []).find(x => x.votes_needed === k);
  const caught = row ? row.rings_found : found.length, traced = row ? Math.round(row.recall * NT) : tp, alarms = row ? row.false_rings : f;
  return { kind: 'panel', ver, k, n, name: 'The ' + n + '-family vote at ' + k + ' of ' + n, F, byUnit, alarmUnits, found: found.sort((a, b) => a - b), caught, traced, f: alarms, g, fromTable: !!row };
}
const famsOf = ver => PA.versions[ver].summary.families;
/* picker order: the combined vote, then Claude Sonnet v4, then every other model with runs */
function pickerModels() {
  const fams = famsOf(VERSIONS[0]);
  const list = (BE.models || []).filter(m => (RUNS[m.id + '|' + (m.version || 'v1')] || []).length).map(m => ({ id: m.id, ver: m.version || 'v1' }));
  const rank = m => (m.id === 'anthropic/claude-sonnet-5-5' && m.ver === 'v4') ? -1 : 0;
  return list.sort((a, b) => rank(a) - rank(b) || (a.ver < b.ver ? -1 : a.ver > b.ver ? 1 : 0) || fams.indexOf(a.id) - fams.indexOf(b.id));
}

/* ---------- state ---------- */
const ST = { ver: VERSIONS[0] || 'v1', k: 5, n: 9, pick: 'panel', scrub: T1, playing: false, sel: null, hover: null, traffic: 0, trafficTo: 0 };
const CELLS = RING_IDS.map(r => ({ r, unit: UNIT_OF_RING[r] || null, votes: 0, of: 0, said: [], litT: 0, from: 0, to: 0 }));
/* rings sit in agreement order, most families first; the order is fixed at load so nothing moves later */
(function order() { const v0 = VERSIONS[0]; CELLS.forEach(c => { const u = c.unit && AG[v0] ? AG[v0][c.unit] : null; c.v0 = u ? u.ring_votes : 0; }); CELLS.sort((a, b) => b.v0 - a.v0 || a.r - b.r); })();
const CELL_OF = {}; CELLS.forEach(c => { CELL_OF[c.r] = c; });
/* IBM's single-transfer rings ("no named shape") share one tile; the rest get a tile each */
const isSingleRaw = r => RINGS[r].ids.length === 1;
let SINGLES = CELLS.filter(c => isSingleRaw(c.r)).map(c => c.r); if (SINGLES.length < 2) SINGLES = [];
const SINGLE_SET = new Set(SINGLES); const isSingle = r => SINGLE_SET.has(r);
const TILES = CELLS.filter(c => !isSingle(c.r)).map(c => ({ kind: 'ring', r: c.r, c }));
if (SINGLES.length) TILES.push({ kind: 'single', rs: SINGLES });
/* the shared tile's title says what IBM called them: mostly "no named shape", sometimes a named one-row pattern */
function singleTitle() { const nn = SINGLES.filter(r => /no named shape/i.test(IBM_SHAPE[UNIT_OF_RING[r]] || 'no named shape')).length; const rest = SINGLES.filter(r => !/no named shape/i.test(IBM_SHAPE[UNIT_OF_RING[r]] || 'no named shape')).map(r => ringName(r).replace(/\s*\(.*\)$/, '').toLowerCase());
  return 'Single transfers (' + (rest.length ? nn + ' with no named shape, ' + rest.join(', ') : 'no named shape') + ')'; }
const ORD = (UN.units || []).filter(u => u.expected !== 'ring').map(u => ({ unit: u.id, n: (u.accounts || []).length, rows: (u.rows || []).length, votes: 0, of: 0, said: [] }));

/* ---------- geometry ---------- */
const stage = $('#stage'), cv = $('#cv'), ctx = cv.getContext('2d');
const G = { W: 900, H: 500, dpr: 1 };
function placeRing(c, bx, by, bw, bh, pad) {
  const R = RINGS[c.r];
  let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9; R.acc.forEach(a => { const p = R.lx[a]; minx = Math.min(minx, p[0]); maxx = Math.max(maxx, p[0]); miny = Math.min(miny, p[1]); maxy = Math.max(maxy, p[1]); });
  const s = Math.min(bw / Math.max(1e-3, maxx - minx), bh / Math.max(1e-3, maxy - miny));
  const ox = bx + (bw - (maxx - minx) * s) / 2, oy = by + (bh - (maxy - miny) * s) / 2;
  c.sp = {}; R.acc.forEach(a => { c.sp[a] = [ox + (R.lx[a][0] - minx) * s, oy + (R.lx[a][1] - miny) * s]; });
  c.cx = ox + (maxx - minx) * s / 2; c.cy = oy + (maxy - miny) * s / 2;
  /* the halo is an outline ring (an ellipse) around the shape, not a skin over it */
  c.rx = Math.max((maxx - minx) * s / 2 + pad, pad * 1.6); c.ry = Math.max((maxy - miny) * s / 2 + pad, pad * 1.6);
  const per = {}; R.stubs.forEach(st => { (per[st.a] = per[st.a] || new Map()); if (!per[st.a].has(st.o)) per[st.a].set(st.o, per[st.a].size); });
  c.stubEnd = {};
  Object.keys(per).forEach(a => { const p = c.sp[a]; let ang = Math.atan2(p[1] - c.cy, p[0] - c.cx); if (Math.abs(p[0] - c.cx) < 0.5 && Math.abs(p[1] - c.cy) < 0.5) ang = -Math.PI / 2; const m = per[a].size;
    per[a].forEach((k, o) => { const a2 = ang + (m > 1 ? (k / (m - 1) - 0.5) * Math.min(2.6, 0.25 * m) : 0); const L = pad + 6 + (k % 3) * 4; c.stubEnd[a + '>' + o] = [p[0] + Math.cos(a2) * L, p[1] + Math.sin(a2) * L]; }); });
}
function fit() {
  const w = stage.clientWidth || 900, h = stage.clientHeight || 500; const dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); G.W = w; G.H = h; G.dpr = dpr;
  const named = TILES.filter(t => t.kind === 'ring'); const single = TILES.find(t => t.kind === 'single');
  const cols = named.length > 9 ? 4 : Math.max(1, Math.min(3, named.length)); const rows = Math.max(1, Math.ceil(named.length / cols));
  const stripH = single ? Math.round(Math.min(116, Math.max(92, h * 0.19))) : 0;
  const cw = w / cols, ch = (h - stripH) / rows;
  named.forEach((t, i) => {
    const col = i % cols, row = Math.floor(i / cols); t.x0 = col * cw; t.y0 = row * ch; t.w = cw; t.h = ch;
    const pad = 13; const top = 10, label = 26; const bw = Math.min(cw - 2 * pad - 30, 180), bh = Math.max(40, ch - top - label - 2 * pad - 10);
    placeRing(t.c, t.x0 + (cw - bw) / 2, t.y0 + top + pad + 5, bw, bh, pad);
  });
  if (single) {
    single.x0 = 0; single.y0 = h - stripH; single.w = w; single.h = stripH;
    const n = single.rs.length, sw = w / n;
    single.rs.forEach((r, i) => { const c = CELL_OF[r]; c.mx0 = i * sw; c.mw = sw; const bw = Math.min(sw - 44, 64); placeRing(c, i * sw + (sw - bw) / 2, single.y0 + 40, bw, Math.max(8, stripH - 72), 10); });
  }
}

/* agreement halo: stroke width and brightness both follow the number of families that called it a ring */
const wOf = v => Math.max(1, 1.15 * v);
const aOf = v => 0.14 + 0.86 * Math.pow(v / Math.max(1, ST.n), 1.4);
const rOf = a => Math.min(6, 3 + Math.sqrt(DEG[a] || 1) * 0.35);

/* ---------- motion bookkeeping ---------- */
let raf = 0; const DIAL = { t0: 0, dur: 250, on: false }; const TRAF = { t0: 0, from: 0, on: false };
const RESOLVE_MS = 420;
const CATCH = new Map(); const PENDING = new Set();
function requestDraw() { if (!raf) raf = requestAnimationFrame(frame); }
/* a timed redraw after each transition, so the last frame is right even where animation frames pause (background tab) */
function settleAfter(ms) { setTimeout(() => { if (raf) { cancelAnimationFrame(raf); raf = 0; } frame(performance.now()); }, ms); }
function frame(now) {
  raf = 0; let more = false;
  if (DIAL.on) { const p = reduced() ? 1 : easeOut((now - DIAL.t0) / DIAL.dur); CELLS.forEach(c => { c.litT = c.from + (c.to - c.from) * p; }); if (p >= 1) DIAL.on = false; else more = true; }
  if (TRAF.on) { const p = reduced() ? 1 : easeOut((now - TRAF.t0) / 250); ST.traffic = TRAF.from + (ST.trafficTo - TRAF.from) * p; if (p >= 1) TRAF.on = false; else more = true; }
  CATCH.forEach((t0, r) => { if (now - t0 >= RESOLVE_MS) CATCH.delete(r); else more = true; });
  draw(now);
  if (more) requestDraw();
}

/* ---------- draw ---------- */
function drawRing(c, now, small) {
  const T = ST.scrub, sel = ST.sel, R = RINGS[c.r];
  const animating = CATCH.has(c.r), pend = PENDING.has(c.r);
  const e = animating ? easeOut(reduced() ? 1 : (now - CATCH.get(c.r)) / RESOLVE_MS) : 1; const s = animating ? 0.45 + 0.55 * e : 1;
  const P = a => [c.cx + (c.sp[a][0] - c.cx) * s, c.cy + (c.sp[a][1] - c.cy) * s];
  /* below the dial the whole ring dims; the dial's effect is on the shape itself, not only the halo */
  const dim = 0.32 + 0.68 * c.litT; const A = x => { ctx.globalAlpha = Math.max(0, Math.min(1, x * dim)); };
  if (R.start > T) { ctx.globalAlpha = 1; ctx.fillStyle = C.rule; ctx.font = '12px "IBM Plex Sans", "Segoe UI", sans-serif'; ctx.textAlign = 'center'; ctx.fillText('starts ' + fmtT(R.start), c.cx, c.cy + 4); return; }
  if (ST.traffic > 0.01) {
    A(0.10 * ST.traffic); ctx.strokeStyle = C.ink; ctx.fillStyle = C.ink; ctx.lineWidth = 1; ctx.setLineDash([]); ctx.beginPath();
    R.stubs.forEach(st => { if (st.t > T) return; const a = P(st.a), b = c.stubEnd[st.a + '>' + st.o]; ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }); ctx.stroke();
  }
  /* the halo: an outline ring; width and brightness = families that called it a ring, at every dial position */
  const k = small ? 0.55 : 1; const w = (c.votes ? wOf(c.votes) : 1.2) * k;
  ctx.beginPath(); ctx.ellipse(c.cx, c.cy, c.rx * s + w / 2, c.ry * s + w / 2, 0, 0, Math.PI * 2);
  if (animating) { ctx.setLineDash([]); ctx.strokeStyle = C.ok; ctx.globalAlpha = 0.35 + 0.65 * e; ctx.lineWidth = w + 2.5 * (1 - e); ctx.stroke(); }
  else {
    if (c.votes && c.litT > 0.01) { ctx.setLineDash([]); ctx.strokeStyle = C.ok; ctx.globalAlpha = aOf(c.votes) * c.litT; ctx.lineWidth = w; ctx.stroke(); }
    if (c.litT < 0.99) { ctx.setLineDash([Math.max(1.5, w * 0.5), Math.max(3.5, w * 1.1)]); ctx.strokeStyle = C.warn; ctx.globalAlpha = Math.max(0.35, aOf(c.votes) * 0.6) * (1 - c.litT); ctx.lineWidth = w; ctx.stroke(); }
  }
  ctx.setLineDash([]);
  /* flags on the ring's accounts that IBM calls ordinary: quiet red dashed spokes */
  if (sel) { ctx.beginPath(); let any = false;
    R.stubs.forEach(st => { if (st.t > T || !sel.F.has(st.id)) return; const a = P(st.a), b = c.stubEnd[st.a + '>' + st.o]; ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); any = true; });
    if (any) { ctx.strokeStyle = C.bad; ctx.lineWidth = 1; ctx.setLineDash([4, 3]); A(0.45); ctx.stroke(); ctx.setLineDash([]); } }
  /* the ring's transfers in the catch color; missed ones amber dotted; grey while a catch waits its turn */
  const q = animating ? clamp01(e * 1.25) : 1; const ok = [], miss = [], wait = [];
  R.ids.forEach(id => { const t = BYID[id]; if (t.t > T || t.self) return; (pend || !sel ? wait : sel.F.has(id) ? ok : miss).push(t); });
  const strokeT = (list, color, lw, dash, alpha) => { if (!list.length) return; ctx.beginPath(); list.forEach(t => { const a = P(t.from), b = P(t.to); ctx.moveTo(a[0], a[1]); ctx.lineTo(a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q); }); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.setLineDash(dash); A(alpha); ctx.stroke(); };
  ctx.lineCap = 'round';
  strokeT(wait, C.muted, small ? 1.4 : 1.8, [], 0.7);
  strokeT(miss, C.warn, small ? 1.4 : 1.8, [0.5, 4], 0.7);
  strokeT(ok, C.ok, small ? 2 : 2.6, [], 1);
  ctx.lineCap = 'butt'; ctx.setLineDash([]);
  /* accounts: clear dots with a dark rim so they separate from the lines */
  ctx.beginPath(); R.acc.forEach(a => { if (R.first[a] > T) return; const p = P(a), rr = small ? 3 : rOf(a); ctx.moveTo(p[0] + rr, p[1]); ctx.arc(p[0], p[1], rr, 0, Math.PI * 2); });
  A(1); ctx.fillStyle = C.ink; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = C.ground; ctx.stroke();
  ctx.globalAlpha = 1;
}
function caughtShown(r) { return !!(ST.sel && ST.sel.found.includes(r) && CARDS.has(r)); }
function draw(now) {
  ctx.setTransform(G.dpr, 0, 0, G.dpr, 0, 0); ctx.fillStyle = C.ground; ctx.fillRect(0, 0, G.W, G.H);
  ctx.textBaseline = 'alphabetic';
  TILES.forEach(t => {
    if (t.kind === 'ring') {
      const c = t.c; const lit = c.to > 0; const dim = 0.32 + 0.68 * c.litT;
      drawRing(c, now, false);
      ctx.textAlign = 'center'; ctx.globalAlpha = dim;
      const nm = ringName(c.r), vt = c.votes + ' of ' + (c.of || ST.n);
      ctx.font = '600 15px "Source Serif 4", Georgia, serif'; const w1 = ctx.measureText(nm).width; ctx.font = '12px "IBM Plex Mono", Consolas, monospace'; const w2 = ctx.measureText(vt).width;
      const lx = t.x0 + (t.w - w1 - 8 - w2) / 2, ly = t.y0 + t.h - 12; ctx.textAlign = 'left';
      ctx.font = '600 15px "Source Serif 4", Georgia, serif'; ctx.fillStyle = C.ink; ctx.fillText(nm, lx, ly);
      ctx.font = '12px "IBM Plex Mono", Consolas, monospace'; ctx.fillStyle = lit ? C.ok : C.warn; ctx.fillText(vt, lx + w1 + 8, ly);
      ctx.globalAlpha = 1;
      if (caughtShown(c.r)) { ctx.font = '600 10.5px "IBM Plex Mono", Consolas, monospace'; ctx.textAlign = 'left'; ctx.fillStyle = C.ok; ctx.fillText('CAUGHT', t.x0 + 12, t.y0 + 16); }
    } else {
      ctx.strokeStyle = C.rule; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, t.y0 + 0.5); ctx.lineTo(G.W, t.y0 + 0.5); ctx.stroke();
      const sel = ST.sel; const caught = t.rs.filter(r => sel && sel.found.includes(r)).length;
      ctx.textAlign = 'left'; ctx.font = '600 15px "Source Serif 4", Georgia, serif'; ctx.fillStyle = C.ink; const ttl = singleTitle(); ctx.fillText(ttl, 14, t.y0 + 22);
      const lead = ctx.measureText(ttl).width;
      ctx.font = '12px "IBM Plex Mono", Consolas, monospace'; ctx.fillStyle = caught ? C.ok : C.warn;
      ctx.fillText(caught + ' of ' + t.rs.length + ' caught' + (sel && sel.kind === 'panel' ? ' at this dial' : sel ? ' by ' + sel.name : ''), 14 + lead + 14, t.y0 + 22);
      t.rs.forEach(r => { const c = CELL_OF[r]; drawRing(c, now, true);
        ctx.textAlign = 'center'; ctx.font = '11px "IBM Plex Mono", Consolas, monospace'; ctx.globalAlpha = 0.32 + 0.68 * c.litT; ctx.fillStyle = c.to ? C.ok : C.warn;
        const nmd = /no named shape/i.test(IBM_SHAPE[UNIT_OF_RING[r]] || 'no named shape') ? '' : ringName(r).replace(/\s*\(.*\)$/, '').toLowerCase() + ' · ';
        ctx.fillText(nmd + c.votes + ' of ' + (c.of || ST.n), c.mx0 + c.mw / 2, t.y0 + t.h - 8); ctx.globalAlpha = 1; });
    }
  });
  const hv = ST.hover; if (hv) { ctx.strokeStyle = C.ink; ctx.globalAlpha = 0.5; ctx.lineWidth = 1; ctx.strokeRect(hv.x0 + 3.5, hv.y0 + 3.5, hv.w - 7, hv.h - 7); ctx.globalAlpha = 1; }
}

/* ---------- the forty ordinary neighborhoods: one quiet row of squares ---------- */
const ordRow = $('#ordRow');
ORD.forEach(o => { const i = document.createElement('i'); i.dataset.unit = o.unit; i.tabIndex = 0; i.setAttribute('role', 'img'); o.el = i; ordRow.append(i); });
function paintOrd() {
  const sel = ST.sel; let lit = 0;
  ORD.forEach(o => { const on = o.votes >= ST.k && o.votes > 0; if (on) lit++;
    const a = o.votes ? aOf(o.votes) * (on ? 1 : 0.22) : 0; o.el.style.backgroundColor = o.votes ? 'rgba(229,115,106,' + (a * 0.55).toFixed(3) + ')' : 'transparent';
    o.el.style.boxShadow = o.votes ? 'inset 0 0 0 ' + Math.min(7, wOf(o.votes) * 0.6).toFixed(1) + 'px rgba(229,115,106,' + a.toFixed(3) + ')' : 'inset 0 0 0 1px ' + C.rule;
    o.el.classList.toggle('mine', !!(sel && sel.kind === 'model' && sel.alarmUnits.has(o.unit)));
    o.el.setAttribute('aria-label', 'Ordinary neighborhood ' + o.unit + ': ' + o.votes + ' of ' + (o.of || ST.n) + ' families called it a ring'); });
  $('#ordCap').innerHTML = '<b class="mono" style="color:var(--bad)">' + lit + ' of ' + ORD.length + '</b> ordinary neighborhoods light red at this dial: families wrongly called them rings. Deeper red, more families.' + (sel && sel.kind === 'model' ? ' Underlined: ' + esc(sel.name) + ' raised the alarm.' : '');
}

/* ---------- small drawing of one ring, for the caught list and the copy that travels into it ---------- */
function drawThumb(canvas, r, w, h) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2); canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  const c = canvas.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); const R = RINGS[r];
  let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9; R.acc.forEach(a => { const p = R.lx[a]; minx = Math.min(minx, p[0]); maxx = Math.max(maxx, p[0]); miny = Math.min(miny, p[1]); maxy = Math.max(maxy, p[1]); });
  const pad = 5; const s = Math.min((w - 2 * pad) / Math.max(1e-3, maxx - minx), (h - 2 * pad) / Math.max(1e-3, maxy - miny));
  const ox = (w - (maxx - minx) * s) / 2, oy = (h - (maxy - miny) * s) / 2; const P = a => [ox + (R.lx[a][0] - minx) * s, oy + (R.lx[a][1] - miny) * s];
  c.strokeStyle = C.ok; c.lineWidth = 1.5; c.lineCap = 'round'; c.beginPath(); R.ids.forEach(id => { const t = BYID[id]; if (t.self) return; const a = P(t.from), b = P(t.to); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); }); c.stroke();
  c.fillStyle = C.ink; c.beginPath(); R.acc.forEach(a => { const p = P(a); c.moveTo(p[0] + 1.8, p[1]); c.arc(p[0], p[1], 1.8, 0, Math.PI * 2); }); c.fill();
}

/* ---------- hover cards: per ring tile, the single-transfer tile, each ordinary square, each caught card ---------- */
const hov = $('#hover');
function moneyLine(r) { const p = RINGS[r].paid; const cur = Object.keys(p).sort((a, b) => p[b] - p[a]); if (!cur.length) return ''; return compact(p[cur[0]]) + ' ' + cur[0] + (cur.length > 1 ? ' +' + (cur.length - 1) + (cur.length > 2 ? ' more currencies' : ' more currency') : ''); }
function firstSentence(s) { s = String(s || '').trim(); const m = /^(.{20,}?[.;])\s/.exec(s); s = m ? m[1] : s; return s.length > 170 ? s.slice(0, 167) + '...' : s; }
function whyFor(unit) {
  if (!unit) return null; const sel = ST.sel; const u = AG[ST.ver][unit];
  if (sel && sel.byUnit[unit] && sel.byUnit[unit].why) return { who: sel.kind === 'model' ? sel.name : shortName(sel.byUnit[unit].model), why: sel.byUnit[unit].why };
  const fams = (u && u.said_ring && u.said_ring.length) ? u.said_ring : famsOf(ST.ver);
  for (const f of fams) { const run = modelStats(f, ST.ver).byUnit[unit]; if (run && run.why) return { who: shortName(f), why: run.why }; }
  return null;
}
function alsoCaught(r) { const sel = ST.sel; if (!sel) return []; if (sel.kind === 'panel') { const u = AG[ST.ver][UNIT_OF_RING[r]]; return (u && u.said_ring || []).map(shortName); } return famsOf(ST.ver).filter(f => f !== sel.id && modelStats(f, ST.ver).found.includes(r)).map(shortName); }
function ringCard(c) {
  const R = RINGS[c.r]; const fams = famsOf(ST.ver); const said = c.said.map(shortName); const not = fams.filter(f => !c.said.includes(f)).map(shortName); const sel = ST.sel; const caught = sel && sel.found.includes(c.r); const w = whyFor(c.unit); const also = alsoCaught(c.r);
  return '<p class="eyebrow">IBM laundering group ' + c.r + (c.unit ? ' · neighborhood ' + esc(c.unit) : '') + '</p><h3>' + esc(ringName(c.r)) + '</h3>' +
    '<p class="mono">' + plural(R.acc.length, 'account', 'accounts') + ' · ' + plural(R.ids.length, 'transfer', 'transfers') + ' · ' + esc(moneyLine(c.r)) + '</p>' +
    '<p><b class="mono">' + c.votes + ' of ' + (c.of || fams.length) + '</b> families called it a ring' + (said.length ? ': ' + esc(said.join(', ')) : '') + '.' + (not.length && said.length ? ' <span class="who">Not: ' + esc(not.join(', ')) + '.</span>' : '') + '</p>' +
    (sel ? '<p>' + esc(sel.name) + (caught ? ' <b style="color:var(--ok)">caught it</b>' + (sel.kind === 'model' ? (also.length ? '; also caught by ' + esc(also.join(', ')) : '; no other family did') : '') + '.' : ' <span style="color:var(--warn)">did not catch it</span>.') + '</p>' : '') +
    (w ? '<p class="why"><span class="who">' + esc(w.who) + ':</span> ' + esc(firstSentence(w.why)) + '</p>' : '');
}
function singleCard() {
  const sel = ST.sel; const caught = SINGLES.filter(r => sel && sel.found.includes(r)).length; const fams = famsOf(ST.ver);
  const rows = fams.map(f => { const n = SINGLES.filter(r => modelStats(f, ST.ver).found.includes(r)).length; return '<tr><td>' + esc(shortName(f)) + '</td><td class="mono">' + n + ' of ' + SINGLES.length + '</td></tr>'; }).join('');
  return '<p class="eyebrow">' + SINGLES.length + ' IBM groups of one transfer each</p><h3>' + esc(singleTitle()) + '</h3>' +
    '<p>' + (sel ? esc(sel.name) + ' caught <b class="mono" style="color:var(--ok)">' + caught + ' of ' + SINGLES.length + '</b>.' : '') + ' Each mark is one IBM group: two accounts and one transfer.</p>' +
    '<p class="who">Caught by each family on ' + esc(ST.ver) + ':</p><table class="fam">' + rows + '</table>';
}
function ordCard(o) {
  const said = o.said.map(shortName); const w = whyFor(o.unit);
  return '<p class="eyebrow">Ordinary neighborhood ' + esc(o.unit) + '</p><h3>IBM labels nothing here as laundering</h3><p class="mono">' + plural(o.n, 'account', 'accounts') + (o.rows ? ' · ' + plural(o.rows, 'transfer', 'transfers') : '') + '</p>' +
    '<p><b class="mono">' + o.votes + ' of ' + (o.of || ST.n) + '</b> families called it a ring' + (said.length ? ': ' + esc(said.join(', ')) : '') + '.</p>' +
    (o.votes && w ? '<p class="why"><span class="who">' + esc(w.who) + ', the false alarm in its words:</span> ' + esc(firstSentence(w.why)) + '</p>' : '');
}
function showHover(html, x, y, cls) {
  hov.innerHTML = html; hov.className = 'hovercard' + (cls ? ' ' + cls : ''); hov.hidden = false;
  const w = hov.offsetWidth, h = hov.offsetHeight; let lx = x + 16, ly = y + 12;
  if (lx + w > innerWidth - 8) lx = x - w - 16; if (ly + h > innerHeight - 8) ly = Math.max(8, y - h - 12);
  hov.style.left = Math.max(8, lx) + 'px'; hov.style.top = ly + 'px';
}
function hideHover() { hov.hidden = true; if (ST.hover) { ST.hover = null; requestDraw(); } }
function tileAt(x, y) { return TILES.find(t => x >= t.x0 && x < t.x0 + t.w && y >= t.y0 && y < t.y0 + t.h); }
cv.addEventListener('mousemove', ev => {
  const rc = cv.getBoundingClientRect(); const t = tileAt(ev.clientX - rc.left, ev.clientY - rc.top);
  if (!t) { hideHover(); return; }
  if (ST.hover !== t) { ST.hover = t; requestDraw(); }
  showHover(t.kind === 'ring' ? ringCard(t.c) : singleCard(), ev.clientX, ev.clientY);
});
cv.addEventListener('mouseleave', hideHover);
ORD.forEach(o => { const on = ev => { const r = o.el.getBoundingClientRect(); showHover(ordCard(o), ev && ev.clientX != null ? ev.clientX : r.right, ev && ev.clientY != null ? ev.clientY : r.top, 'ord'); };
  o.el.addEventListener('mouseenter', on); o.el.addEventListener('focus', () => on()); o.el.addEventListener('mouseleave', () => { hov.hidden = true; }); o.el.addEventListener('blur', () => { hov.hidden = true; }); });

/* ---------- the caught list: the landing target for each catch; single transfers share one card ---------- */
const strip = $('#strip');
const CARDS = new Map(); const QUEUE = []; let qBusy = false, epoch = 0; let SINGLE_EL = null; const SINGLE_LANDED = new Set();
function hoverable(el, html) {
  const on = ev => { const b = el.getBoundingClientRect(); showHover(html(), ev && ev.clientX != null ? ev.clientX : b.left, ev && ev.clientY != null ? ev.clientY : b.top); };
  el.addEventListener('mouseenter', on); el.addEventListener('focus', () => on()); el.addEventListener('mouseleave', () => { hov.hidden = true; }); el.addEventListener('blur', () => { hov.hidden = true; });
}
function buildCard(r, pending) {
  const el = document.createElement('article'); el.className = 'card' + (pending ? ' pending' : ''); el.tabIndex = 0;
  const cvs = document.createElement('canvas'); drawThumb(cvs, r, 34, 22); el.append(cvs);
  const t = document.createElement('div'); t.innerHTML = '<h3>' + esc(ringName(r)) + '</h3><p class="mono">' + esc(moneyLine(r)) + '</p>'; el.append(t);
  el.dataset.ring = r; el.setAttribute('aria-label', 'Caught: ' + ringName(r) + ', ' + moneyLine(r) + ' moved'); hoverable(el, () => ringCard(CELL_OF[r]));
  return el;
}
function singleEl(pending) {
  if (!SINGLE_EL) {
    const el = document.createElement('article'); el.className = 'card single' + (pending ? ' pending' : ''); el.tabIndex = 0; el.dataset.ring = 'single';
    const cvs = document.createElement('canvas'); drawThumb(cvs, SINGLES[0], 34, 22); el.append(cvs);
    const t = document.createElement('div'); t.innerHTML = '<h3>Single transfers</h3><p class="mono"></p>'; el.append(t);
    hoverable(el, singleCard); strip.append(el); SINGLE_EL = el;
  }
  return SINGLE_EL;
}
function paintSingle() { if (!SINGLE_EL) return; const n = SINGLE_LANDED.size; SINGLE_EL.querySelector('p').textContent = n + ' of ' + SINGLES.length + ' caught'; SINGLE_EL.setAttribute('aria-label', 'Caught: ' + n + ' of ' + SINGLES.length + ' single transfers'); }
function insertCard(r, el) {
  if (isSingle(r)) { CARDS.set(r, el); return; }
  const after = [...strip.children].find(c => c.dataset.ring === 'single' || RINGS[+c.dataset.ring].end > RINGS[r].end); strip.insertBefore(el, after || null); CARDS.set(r, el);
}
function landSingle(r) { SINGLE_LANDED.add(r); paintSingle(); }
function dropCard(r) {
  const el = CARDS.get(r); CARDS.delete(r);
  if (isSingle(r)) { SINGLE_LANDED.delete(r); if (![...CARDS.keys()].some(isSingle) && SINGLE_EL) { SINGLE_EL.remove(); SINGLE_EL = null; } else paintSingle(); }
  else if (el) el.remove();
}
let OPENING = true;
function syncRoster(reset) {
  if (reset) { epoch++; QUEUE.length = 0; PENDING.clear(); CATCH.clear(); CARDS.clear(); SINGLE_LANDED.clear(); SINGLE_EL = null; strip.innerHTML = ''; document.querySelectorAll('.flyer').forEach(f => f.remove()); qBusy = false; }
  const sel = ST.sel; const want = sel ? sel.found.filter(r => RINGS[r].end <= ST.scrub).sort((a, b) => RINGS[a].end - RINGS[b].end) : [];
  const W = new Set(want);
  [...CARDS.keys()].forEach(r => { if (!W.has(r)) dropCard(r); });
  for (let i = QUEUE.length - 1; i >= 0; i--) if (!W.has(QUEUE[i])) { PENDING.delete(QUEUE[i]); QUEUE.splice(i, 1); }
  want.forEach(r => { if (!CARDS.has(r) && !QUEUE.includes(r) && !CATCH.has(r)) { QUEUE.push(r); PENDING.add(r); } });
  /* the opening frame: one reveal under half a second, cards already in place; no flights until a control is touched */
  if (OPENING) { OPENING = false; const now = performance.now();
    QUEUE.splice(0).forEach(r => { PENDING.delete(r); if (isSingle(r)) { insertCard(r, singleEl(false)); landSingle(r); } else insertCard(r, buildCard(r, false)); if (!reduced()) CATCH.set(r, now); });
    if (!reduced()) settleAfter(RESOLVE_MS + 40); }
  renderRosterHead(); if (!qBusy) nextCatch(epoch); requestDraw();
}
function renderRosterHead() {
  const sel = ST.sel; $('#rcount').textContent = sel ? CARDS.size + ' of ' + NR : '';
  $('#rnote').textContent = !sel ? '' : ST.scrub < T1 && sel.found.length > CARDS.size + QUEUE.length ? 'More land as the clock reaches the end of each ring.' : (sel.kind === 'panel' ? 'Caught by the vote: at least ' + sel.k + ' families called it a ring, at least ' + sel.k + ' of them flagged half of it, and the agreed flags did not sweep the neighborhood.' : 'Caught by the engine rule: at least half of the ring flagged, without sweeping its neighborhood.');
}
function nextCatch(ep) {
  if (ep !== epoch) return;
  if (!QUEUE.length) { qBusy = false; renderRosterHead(); return; }
  qBusy = true; const r = QUEUE.shift();
  if (reduced()) { PENDING.delete(r); if (isSingle(r)) { insertCard(r, singleEl(false)); landSingle(r); } else insertCard(r, buildCard(r, false)); renderRosterHead(); requestDraw(); setTimeout(() => nextCatch(ep), 0); return; }
  PENDING.delete(r); CATCH.set(r, performance.now()); requestDraw(); settleAfter(RESOLVE_MS + 40);
  setTimeout(() => fly(r, ep), 300); setTimeout(() => nextCatch(ep), 230);
}
function fly(r, ep) {
  if (ep !== epoch) return;
  const c = CELL_OF[r]; const single = isSingle(r); const fresh = single && !SINGLE_EL;
  const card = single ? singleEl(true) : buildCard(r, true); insertCard(r, card); renderRosterHead();
  const target = card.querySelector('canvas').getBoundingClientRect();
  let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9; RINGS[r].acc.forEach(a => { const p = c.sp[a]; minx = Math.min(minx, p[0]); maxx = Math.max(maxx, p[0]); miny = Math.min(miny, p[1]); maxy = Math.max(maxy, p[1]); });
  const st = cv.getBoundingClientRect(); const bw = Math.max(40, maxx - minx + 14), bh = Math.max(26, maxy - miny + 14);
  const fl = document.createElement('canvas'); fl.className = 'flyer'; drawThumb(fl, r, 34, 22); document.body.append(fl);
  const k0 = Math.max(bw / 34, bh / 22);
  const from = 'translate(' + (st.left + (minx + maxx) / 2 - 17 * k0) + 'px,' + (st.top + (miny + maxy) / 2 - 11 * k0) + 'px) scale(' + k0 + ')';
  const to = 'translate(' + target.left + 'px,' + target.top + 'px) scale(1)';
  let landed = false; const done = () => { if (landed) return; landed = true; fl.remove(); if (ep !== epoch) return; card.classList.remove('pending'); if (single) landSingle(r); if (fresh || !single) requestDraw(); else requestDraw(); };
  setTimeout(done, 640); /* the card lands even if the animation is never painted (background tab, headless) */
  if (fl.animate) { const an = fl.animate([{ transform: from, opacity: 0.95 }, { transform: to, opacity: 1 }], { duration: 560, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'forwards' }); an.onfinish = done; an.oncancel = done; } else done();
}

/* ---------- headline: lead with what was caught; one line of limit; end on the strongest true number ---------- */
function renderHeadline() {
  const s = ST.sel; if (!s) return; const caught = s.caught != null ? s.caught : s.found.length;
  $('#headline').innerHTML = '<em>' + esc(s.name) + '</em> caught <b>' + caught + ' of IBM\'s ' + NR + '</b> laundering rings and traced <b>' + num(s.traced) + ' of ' + num(NT) + '</b> laundering transfers; it raised ' + (s.f === 1 ? '1 alarm' : num(s.f) + ' alarms') + ' on ordinary neighborhoods, ' + num(s.g) + ' of them on accounts that sit inside a ring.';
  const sl = SL.slice || {};
  const rate = sl.rate ? (sl.rate * 100).toFixed(1) : (NT / TR.length * 100).toFixed(1); const full = sl.full_rows ? (sl.full_laundering / sl.full_rows * 100).toFixed(2) : null;
  const ach = TRUTH.length && TRUTH.every(t => t.fmt === 'ACH');
  $('#limit').innerHTML = SAMPLE ? '<li>This is a SAMPLE network made up by the page; no number here is a measurement.</li>' :
    '<li>Synthetic data from IBM&#39;s AMLworld; the labels are IBM&#39;s.</li>' +
    '<li>The slice is enriched (' + rate + ' percent laundering' + (full ? ' vs ' + full + ' in the full file' : '') + '), and its neighborhoods were cut around IBM&#39;s groups.</li>' +
    '<li>' + (ach ? 'Every laundering transfer in the slice is ACH, a tell a model can use.' : 'Payment format is a strong tell in this slice.') + '</li>';
  const al = s.kind === 'model' && s.row && s.row.account_level;
  $('#closer').innerHTML = caught + ' of ' + NR + ' <span>rings caught</span>' + (al && al.flagged_accounts ? '<br><small>' + num(al.flagged_accounts_in_a_ring) + ' of ' + num(al.flagged_accounts) + ' <span>accounts it flagged sit inside an IBM ring</span></small>' : '');
}

/* ---------- controls ---------- */
function setVotes(animate) {
  CELLS.forEach(c => { const u = c.unit ? AG[ST.ver][c.unit] : null; c.votes = u ? u.ring_votes : 0; c.of = u ? u.families : 0; c.said = u ? (u.said_ring || []) : []; c.from = c.litT; c.pass = c.votes >= ST.k && c.votes > 0; /* the dial acts on the tiles only in the combined-vote view; with one model on top every tile shows at full strength */ c.to = ST.pick !== 'panel' || c.pass ? 1 : 0; });
  ORD.forEach(o => { const u = AG[ST.ver][o.unit]; o.votes = u ? u.ring_votes : 0; o.of = u ? u.families : 0; o.said = u ? (u.said_ring || []) : []; });
  if (animate && !reduced()) { DIAL.t0 = performance.now(); DIAL.on = true; settleAfter(DIAL.dur + 40); } else CELLS.forEach(c => { c.litT = c.to; });
  const lr = CELLS.filter(c => c.pass).length;
  $('#dialVal').textContent = ST.k + ' of ' + ST.n;
  $('#dialNote').innerHTML = ST.pick === 'panel' ? 'At this dial <span class="mono" style="color:var(--ok)">' + lr + ' of ' + NR + '</span> IBM groups lit; the rest dim to amber dashes, same weight.' : 'With one model on top the dial moves only the squares; every tile shows the model catch or miss, and the halo still counts the families (' + lr + ' of ' + NR + ' groups reach ' + ST.k + ').';
  requestDraw();
}
function select(reset) {
  if (ST.pick === 'panel') ST.sel = panelStats(ST.ver, ST.k); else { const [id, ver] = ST.pick.split('|'); ST.sel = modelStats(id, ver); }
  renderHeadline(); paintOrd(); syncRoster(reset);
}
function renderControls() {
  const n = famsOf(ST.ver).length; ST.n = n; ST.k = Math.min(ST.k, n);
  const dial = $('#dial'); dial.max = n; dial.value = ST.k;
  $('#ticks').innerHTML = Array.from({ length: n }, (_, i) => '<span>' + (i + 1) + '</span>').join('');
  const seg = $('#verSeg'); seg.innerHTML = '';
  VERSIONS.forEach(v => { const b = document.createElement('button'); b.type = 'button'; b.textContent = v; b.className = v === ST.ver ? 'on' : ''; b.setAttribute('aria-pressed', v === ST.ver);
    b.onclick = () => { if (ST.ver === v) return; ST.ver = v; renderControls(); setVotes(true); select(ST.pick === 'panel'); }; seg.append(b); });
  $('#verNote').textContent = 'Halos and squares count the families on ' + ST.ver + (BE.versions && BE.versions[ST.ver] ? ': ' + BE.versions[ST.ver] : '') + '.';
}
function renderPicker() {
  const ms = $('#model'); const list = pickerModels();
  ms.innerHTML = '<option value="panel">The families\' combined vote, at the dial</option>' + list.map(m => '<option value="' + esc(m.id + '|' + m.ver) + '">' + esc(shortName(m.id) + ' ' + m.ver) + '</option>').join('');
  if (![...ms.options].some(o => o.value === ST.pick)) ST.pick = 'panel'; ms.value = ST.pick;
}
$('#dial').addEventListener('input', e => { ST.k = +e.target.value; setVotes(true); if (ST.pick === 'panel') select(false); else paintOrd(); });
$('#model').addEventListener('change', e => { ST.pick = e.target.value; setVotes(true); select(true); });
$('#traffic').addEventListener('change', e => { TRAF.from = ST.traffic; ST.trafficTo = e.target.checked ? 1 : 0; TRAF.t0 = performance.now(); TRAF.on = true; settleAfter(290); requestDraw(); });

/* ten-day scrub: transfers appear in the order they happened */
const timeEl = $('#time'), playBtn = $('#play'); let playT0 = 0, playFrom = 0, stepTimer = 0;
const PLAY_MS = 9000;
function setScrub(T) { ST.scrub = Math.max(T0, Math.min(T1, T)); timeEl.value = Math.round((ST.scrub - T0) / Math.max(1, T1 - T0) * 1000); renderClock(); syncRoster(false); requestDraw(); }
function renderClock() { let n = 0; TRUTH.forEach(t => { if (t.t <= ST.scrub) n++; }); $('#clock').innerHTML = '<b>' + fmtT(ST.scrub) + '</b> · ' + num(n) + ' of ' + num(NT) + ' laundering transfers so far'; }
timeEl.addEventListener('input', () => { stopPlay(); setScrub(T0 + (T1 - T0) * (+timeEl.value / 1000)); });
function stopPlay() { ST.playing = false; clearInterval(stepTimer); playBtn.textContent = 'Play Sep 1 to 16'; }
function playTick(now) { if (!ST.playing) return; const p = clamp01((now - playT0) / (PLAY_MS * (1 - playFrom))); setScrub(T0 + (T1 - T0) * (playFrom + (1 - playFrom) * p)); if (p >= 1) stopPlay(); else requestAnimationFrame(playTick); }
playBtn.addEventListener('click', () => {
  if (ST.playing) { stopPlay(); return; }
  if (ST.scrub >= T1) setScrub(T0);
  ST.playing = true; playBtn.textContent = 'Pause';
  if (reduced()) { stepTimer = setInterval(() => { const next = ST.scrub + 1440; setScrub(next); if (next >= T1) stopPlay(); }, 450); return; }
  playFrom = (ST.scrub - T0) / Math.max(1, T1 - T0); playT0 = performance.now(); requestAnimationFrame(playTick);
});

/* ---------- badges, start ---------- */
function renderBadges() {
  const out = [];
  if (SAMPLE) out.push('<span class="badge warn" title="../../../data/ slice.js, units.js or panel.js was not found">SAMPLE network, made up by the page</span>');
  else out.push('<span class="badge">' + NR + ' IBM groups · ' + num(NT) + ' laundering transfers · ' + num(TR.length) + ' in the slice</span>');
  if (NO_BENCH) out.push('<span class="badge warn">bench_results.js not found: no model runs</span>');
  else out.push('<span class="badge">runs written ' + esc(BE.written || '?') + '</span>');
  $('#badges').innerHTML = out.join('');
}
function init() {
  renderBadges(); fit();
  ST.n = famsOf(ST.ver).length; ST.k = Math.max(1, Math.ceil(ST.n / 2));
  const qs = location.search;
  const qk = /[?&]k=(\d+)/.exec(qs); if (qk) ST.k = Math.max(1, Math.min(ST.n, +qk[1]));
  const qm = /[?&]model=([^&]+)/.exec(qs);
  renderPicker();
  if (qm) { const v = decodeURIComponent(qm[1]); if (v === 'panel') ST.pick = 'panel'; else { const hit = pickerModels().find(m => m.id + '|' + m.ver === v || m.id === v || shortName(m.id) + '|' + m.ver === v); if (hit) ST.pick = hit.id + '|' + hit.ver; } }
  $('#model').value = ST.pick;
  if (/[?&]traffic=1/.test(qs)) { $('#traffic').checked = true; ST.traffic = ST.trafficTo = 1; }
  const qt = /[?&]t=([\d.]+)/.exec(qs); if (qt) { ST.scrub = T0 + (T1 - T0) * clamp01(+qt[1]); timeEl.value = Math.round(clamp01(+qt[1]) * 1000); }
  renderControls(); setVotes(false); renderClock(); select(true);
  const qh = /[?&]hover=(\d+)/.exec(qs); if (qh && CELL_OF[+qh[1]]) { const c = CELL_OF[+qh[1]]; const rc = cv.getBoundingClientRect(); cv.dispatchEvent(new MouseEvent('mousemove', { clientX: rc.left + c.cx, clientY: rc.top + c.cy })); }
  let rt = 0; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { fit(); requestDraw(); }, 120); });
}
init();
})();
