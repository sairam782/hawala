/* Rings bench, the clearing. The whole slice starts lit; the selected model works through the 60 neighborhoods in order;
   each one it rules ordinary fades to about 8 percent; each ring it catches resolves in place, in green, inside the graph;
   each false alarm stays at full strength in red dashed; when the pass ends, the rings it missed appear in amber dotted.
   Every frame is a pure function of one clock (0 to END ms), so Play, the scrub and ?t= all show the same picture.
   Reads window.SLICE, UNITS, PANEL, BENCH (../../../data/*.js) and window.RINGS_LAYOUT (layout.js, baked once, frozen).
   If the data is missing a small made-up SAMPLE stands in and the page says so. Canvas 2D, no libraries. */
(function () {
'use strict';
const C = { ground: '#14181F', surface: '#1C222B', ink: '#E6E9EE', muted: '#A3ABB8', accent: '#7FB7B0', rule: '#2C3440', warn: '#E0A458', ok: '#8FCB8A', bad: '#E5736A' };
const RMQ = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
const reduced = () => RMQ.matches;
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = n => Number(n).toLocaleString('en-US');
const clamp01 = t => Math.max(0, Math.min(1, t));
const ease = t => { t = clamp01(t); return t * t * (3 - 2 * t); };
const easeOut = t => 1 - Math.pow(1 - clamp01(t), 3);
const noDash = s => String(s == null ? '' : s).replace(/\s*[—–]\s*/g, ', ');
const sentence = s => { s = String(s || '').trim(); if (!s) return ''; const l = s.toLowerCase(); return l.charAt(0).toUpperCase() + l.slice(1); };
const compact = v => v >= 1e9 ? (v / 1e9).toFixed(2) + 'B' : v >= 1e6 ? (v / 1e6).toFixed(2) + 'M' : v >= 1e3 ? (v / 1e3).toFixed(1) + 'K' : v.toFixed(0);
function seeded(seed) { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }

/* timings, ms: each one is what the README lists */
const HOLD = 700, FADE = 400, STEP = 60, DWELL = 150, CATCH_MS = 450, GAP = 250, REVEAL_MS = 600, ALARM_MS = 200;
const DIM = 0.08; /* a cleared account ends at 8 percent opacity */

/* ---------- data, or a labeled SAMPLE ---------- */
let SAMPLE = false;
let SL = window.SLICE, UN = window.UNITS, PA = window.PANEL, BE = window.BENCH;
if (!SL || !SL.transfers || !UN || !UN.units || !BE || !BE.runs) { const s = makeSample(); SL = s.slice; UN = s.units; PA = s.panel; BE = s.bench; SAMPLE = true; }
if (!PA || !PA.versions) PA = { versions: {} };

function makeSample() {
  const rnd = seeded(7); const tr = []; const key = {}; let n = 0;
  const acct = i => 'S' + String(i).padStart(4, '0');
  const ts = d => '2022/09/' + String(d).padStart(2, '0') + ' 12:00';
  const add = (f, t, d, ring) => { const id = 'T' + String(++n).padStart(4, '0'); tr.push([id, ts(d), acct(f), acct(t), Math.round(rnd() * 900000) / 100 + 100, 'US Dollar', ring >= 0 ? 'ACH' : 'Cheque', '001', '002']); key[id] = ring >= 0 ? [1, ring] : [0, -1]; return id; };
  for (let i = 0; i < 90; i++) { const f = Math.floor(rnd() * 50); let t = Math.floor(rnd() * 50); if (t === f) t = (t + 1) % 50; add(f, t, 1 + Math.floor(rnd() * 9), -1); }
  [50, 51, 52, 53, 54].forEach((a, i, arr) => add(a, arr[(i + 1) % 5], 3 + i, 0)); add(10, 50, 2, -1);
  [56, 57, 58, 59, 60, 61].forEach(b => add(55, b, 5, 1)); add(55, 12, 4, -1);
  add(62, 63, 7, 2); add(63, 64, 8, 2); add(64, 20, 9, -1);
  for (let i = 0; i < 20; i++) add(70 + 2 * i, 71 + 2 * i, 3, -1);
  const A = (lo, hi, extra) => { const o = []; for (let i = lo; i <= hi; i++) o.push(acct(i)); (extra || []).forEach(x => o.push(acct(x))); return o; };
  const mk = (id, exp, ring, accts) => { const S = new Set(accts); return { id, expected: exp, ring_id: ring, accounts: accts, rows: tr.filter(t => S.has(t[2]) && S.has(t[3])) }; };
  const units = [mk('u1', 'ordinary', null, A(0, 7)), mk('u2', 'ring', 0, A(50, 54, [10])), mk('u3', 'ordinary', null, A(8, 15)), mk('u4', 'ring', 1, A(55, 61, [12])), mk('u5', 'ordinary', null, A(16, 23)), mk('u6', 'ring', 2, A(62, 64, [20]))];
  const runs = units.map(u => { const yes = u.id !== 'u5' && u.id !== 'u6' && u.id !== 'u1'; const alarm = u.id === 'u3';
    const ids = u.ring_id != null && yes ? tr.filter(t => key[t[0]][1] === u.ring_id).map(t => t[0]) : alarm ? u.rows.slice(0, 3).map(t => t[0]) : [];
    return { model: 'sample/model', version: 'v1', unit: u.id, expected: u.expected, verdict: (yes || alarm) ? 'ring' : 'ordinary', ring_found: u.ring_id != null && yes, ibm_shape: u.ring_id != null ? ['CYCLE', 'FAN-OUT', 'no named shape'][u.ring_id] : null, flagged_transfer_ids: ids, ring_accounts_flagged: alarm ? [acct(12)] : [], why: 'SAMPLE: a made-up reason so the page reads without the bench file.' }; });
  return {
    slice: { transfers: tr, key, ring_meta: { 0: { shape: 'cycle' }, 1: { shape: 'fan-out' }, 2: { shape: 'chain' } } },
    units: { units }, panel: { versions: {} },
    bench: { written: 'SAMPLE', versions: { v1: 'SAMPLE' }, models: [{ id: 'sample/model', version: 'v1' }], runs }
  };
}

/* ---------- transfers, accounts, IBM's rings ---------- */
const TR = SL.transfers.map(r => { const k = SL.key[r[0]] || [0, -1]; return { id: r[0], from: r[2], to: r[3], paid: +r[4] || 0, cur: r[5], label: !!k[0], ring: k[0] ? k[1] : -1 }; });
const BYID = {}; TR.forEach((t, i) => { BYID[t.id] = t; t.i = i; });
const TRUTH = TR.filter(t => t.label); const NT = TRUTH.length;
const nodes = [], nodeIdx = {};
const nodeOf = a => { if (!(a in nodeIdx)) { nodeIdx[a] = nodes.length; nodes.push({ a, x: 0, y: 0, sx: 0, sy: 0, deg: 0, r: 1 }); } return nodeIdx[a]; };
TR.forEach(t => { t.u = nodeOf(t.from); t.v = nodeOf(t.to); nodes[t.u].deg++; if (t.u !== t.v) nodes[t.v].deg++; });
nodes.forEach(n => { n.r = Math.min(5.5, 1.0 + Math.sqrt(n.deg) * 0.5); });
const RINGS = {};
TRUTH.forEach(t => { const R = RINGS[t.ring] || (RINGS[t.ring] = { r: t.ring, ids: [], ns: new Set(), paid: {} }); R.ids.push(t.id); R.ns.add(t.u); R.ns.add(t.v); R.paid[t.cur] = (R.paid[t.cur] || 0) + t.paid; });
const RING_IDS = Object.keys(RINGS).map(Number).sort((a, b) => a - b); const NR = RING_IDS.length;
RING_IDS.forEach(r => { RINGS[r].nodes = [...RINGS[r].ns]; RINGS[r].meta = (SL.ring_meta && SL.ring_meta[r] && SL.ring_meta[r].shape) || 'other'; });

/* the frozen layout: baked by build_layout.mjs; computed here once only if the bake is missing or stale */
(function place() {
  let L = window.RINGS_LAYOUT;
  if (!L || !L.pos || nodes.some(n => !L.pos[n.a])) L = window.RingsLayout ? window.RingsLayout(SL.transfers, id => { const k = SL.key[id]; return k && k[0] ? k[1] : -1; }, 1.55) : null;
  const rnd = seeded(3);
  nodes.forEach(n => { const p = L && L.pos[n.a]; n.x = p ? p[0] : rnd() * 100; n.y = p ? p[1] : rnd() * 100; });
})();

/* the 60 neighborhoods, in the order the pass reads them */
const UNITS = (UN.units || []).slice().sort((a, b) => String(a.id).localeCompare(String(b.id), 'en', { numeric: true })).map(u => {
  const rowIds = (u.rows || []).map(r => Array.isArray(r) ? r[0] : r).filter(id => BYID[id]);
  return { id: u.id, expected: u.expected, ring: u.ring_id != null ? +u.ring_id : null, accounts: (u.accounts || []).filter(a => a in nodeIdx).map(a => nodeIdx[a]), rowIds };
});
const NORD = UNITS.filter(u => u.expected !== 'ring').length;
const UNITS_OF_TR = TR.map(() => []); UNITS.forEach((u, k) => u.rowIds.forEach(id => UNITS_OF_TR[BYID[id].i].push(k)));
const UNIT_OF_RING = {}; UNITS.forEach((u, k) => { if (u.ring != null) UNIT_OF_RING[u.ring] = k; });
const OUTSIDE = TR.filter(t => !UNITS_OF_TR[t.i].length).length;

/* ---------- runs ---------- */
const truthy = v => v === true || v === 'True' || v === 'true' || v === 1;
const listOf = v => Array.isArray(v) ? v : typeof v === 'string' ? (v.match(/[A-Za-z0-9]+/g) || []).filter(x => x !== 'None') : [];
const RUNS = {}; (BE.runs || []).forEach(r => { const k = r.model + '|' + (r.version || 'v1'); (RUNS[k] = RUNS[k] || []).push(r); });
const NAMES = { 'claude-haiku-5-5': 'Claude Haiku 5.5', 'claude-sonnet-5-5': 'Claude Sonnet 5.5', 'deepseek-v4-pro': 'DeepSeek V4 Pro', 'mistral-large-4': 'Mistral Large 4', 'kimi-k3': 'Kimi K3', 'gpt-6-luna': 'GPT-6 Luna', 'gpt-6-sol': 'GPT-6 Sol', 'grok-4.7': 'Grok 4.7', 'glm-5.3': 'GLM 5.3' };
const prettyName = id => { const s = String(id).split('/').pop(); return NAMES[s] || sentence(s.replace(/-/g, ' ')); };
function stats(mid, ver) {
  const runs = RUNS[mid + '|' + ver] || []; const byUnit = {}; const F = new Set();
  runs.forEach(r => { byUnit[r.unit] = r; listOf(r.flagged_transfer_ids).forEach(id => { if (BYID[id]) F.add(id); }); });
  const caughtRings = new Set(); runs.forEach(r => { if (r.expected === 'ring' && truthy(r.ring_found)) { const u = UNITS.find(x => x.id === r.unit); if (u && u.ring != null) caughtRings.add(u.ring); } });
  const alarms = runs.filter(r => r.expected !== 'ring' && r.verdict === 'ring');
  return { id: mid, ver, name: prettyName(mid), runs, byUnit, F, caught: caughtRings,
    k: runs.filter(r => r.expected === 'ring' && truthy(r.ring_found)).length,
    m: TRUTH.filter(t => F.has(t.id)).length, f: alarms.length, g: alarms.filter(r => listOf(r.ring_accounts_flagged).length).length,
    cleared: runs.filter(r => r.expected !== 'ring' && r.verdict === 'ordinary').length };
}
const MODELS = (BE.models || []).filter(m => (RUNS[m.id + '|' + (m.version || 'v1')] || []).length);
const panelVer = v => PA.versions[v] ? v : PA.versions.v2 ? 'v2' : Object.keys(PA.versions)[0] || null;
function agreement(ver, unitId) { const pv = panelVer(ver); if (!pv) return null; const a = (PA.versions[pv].agreement || []).find(x => x.unit === unitId); return a ? Object.assign({ pv }, a) : null; }

/* ---------- the sequence for one model: a timetable, then every frame is read off it ---------- */
const ST = { sel: null, t: 0, END: 1, playing: false, showAll: false, hover: null, lastT: 0 };
let TL = null;
function buildTimeline(S) {
  const read = [], status = []; let t = HOLD + FADE;
  UNITS.forEach((u, k) => {
    const r = S.byUnit[u.id]; let st;
    if (!r || r.verdict == null || r.verdict === '') st = 'none';
    else if (u.expected === 'ring') st = truthy(r.ring_found) ? 'caught' : r.verdict === 'ring' ? 'called' : 'clear';
    else st = r.verdict === 'ring' ? 'alarm' : 'clear';
    read[k] = t; status[k] = st; t += STEP + (st === 'caught' ? DWELL : 0);
  });
  const passEnd = Math.max(t, (read[read.length - 1] || t) + Math.max(FADE, CATCH_MS));
  const REVEAL = passEnd + GAP, END = REVEAL + REVEAL_MS;
  /* each transfer: when it starts to fade (Infinity = stays lit), and what it turns into, from when */
  const dimAt = new Float64Array(TR.length), style = new Array(TR.length).fill(null), styleT = new Float64Array(TR.length);
  const release = (k, x) => { const s = status[k]; if (s === 'clear') return read[k]; if (s === 'caught') return read[k] + CATCH_MS; if (s === 'called') return REVEAL; return Infinity; };
  TR.forEach(x => {
    const us = UNITS_OF_TR[x.i]; let d = us.length ? 0 : HOLD;
    us.forEach(k => { d = Math.max(d, release(k, x)); }); dimAt[x.i] = d;
    if (x.label) {
      const ku = UNIT_OF_RING[x.ring]; const caught = S.caught.has(x.ring) && ku != null;
      if (S.F.has(x.id)) { style[x.i] = 'ok'; styleT[x.i] = caught ? read[ku] : REVEAL; }
      else { style[x.i] = 'miss'; styleT[x.i] = REVEAL; }
    } else if (S.F.has(x.id)) {
      let first = Infinity; us.forEach(k => { if (status[k] === 'alarm') first = Math.min(first, read[k]); });
      if (isFinite(first)) { style[x.i] = 'bad'; styleT[x.i] = first; }
    }
  });
  const ringCatch = {}; RING_IDS.forEach(r => { const ku = UNIT_OF_RING[r]; ringCatch[r] = S.caught.has(r) && ku != null ? read[ku] : null; });
  return { read, status, dimAt, style, styleT, REVEAL, END, passEnd, ringCatch };
}

/* ---------- canvas geometry ---------- */
const stage = $('#stage'), cv = $('#cv'), ctx = cv.getContext('2d');
const G = { W: 800, H: 500, dpr: 1 };
const GROUPS = [];
function fit() {
  const w = stage.clientWidth || 800, h = stage.clientHeight || 500; const dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); G.W = w; G.H = h; G.dpr = dpr;
  let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9; nodes.forEach(n => { minx = Math.min(minx, n.x); maxx = Math.max(maxx, n.x); miny = Math.min(miny, n.y); maxy = Math.max(maxy, n.y); });
  const pad = 16; const s = Math.min((w - 2 * pad) / Math.max(1, maxx - minx), (h - 2 * pad) / Math.max(1, maxy - miny));
  const ox = (w - (maxx - minx) * s) / 2, oy = (h - (maxy - miny) * s) / 2;
  nodes.forEach(n => { n.sx = ox + (n.x - minx) * s; n.sy = oy + (n.y - miny) * s; });
  GROUPS.length = 0;
  UNITS.forEach((u, k) => {
    const ns = u.ring != null && RINGS[u.ring] ? RINGS[u.ring].nodes : u.accounts; if (!ns.length) return;
    const hullP = padHull(ns, u.ring != null ? 8 : 6);
    GROUPS.push({ k, u, ring: u.ring, ns, hull: hullP, area: polyArea(hullP) });
  });
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
function pathPoly(P) { ctx.beginPath(); P.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); }
const wOf = v => 1 + 0.42 * (v || 0); /* outline width carries the number of families that called it a ring */

/* ---------- draw one frame at clock t ---------- */
const nodeA = new Float32Array(nodes.length);
function draw() {
  const t = ST.t, T = TL, all = ST.showAll;
  ctx.setTransform(G.dpr, 0, 0, G.dpr, 0, 0); ctx.fillStyle = C.ground; ctx.fillRect(0, 0, G.W, G.H);
  if (!T) return;
  nodeA.fill(0);
  const buckets = { n: new Map(), ok: new Map(), bad: new Map(), miss: new Map() };
  const put = (kind, a, x) => { if (a < 0.01) return; const q = Math.round(a * 20) / 20; const m = buckets[kind]; let L = m.get(q); if (!L) m.set(q, L = []); L.push(x); };
  for (let i = 0; i < TR.length; i++) {
    const x = TR[i]; const d = T.dimAt[i];
    let lit = t < d ? 1 : 1 - ease((t - d) / FADE); if (all) lit = 1;
    let sa = 0; const s = T.style[i];
    if (s && t >= T.styleT[i]) sa = s === 'miss' ? ease((t - T.styleT[i]) / REVEAL_MS) : s === 'bad' ? ease((t - T.styleT[i]) / ALARM_MS) : 1;
    if (s === 'ok' && sa && T.ringCatch[x.ring] != null && t < T.ringCatch[x.ring] + CATCH_MS) sa = 0; /* drawn by the catch below */
    if (all && s && t >= T.styleT[i]) sa = 1;
    if (x.u !== x.v) { put('n', 0.06 + 0.32 * lit * (1 - sa), x); if (sa) put(s, sa, x); }
    const nv = Math.max(DIM + (1 - DIM) * lit, sa);
    if (nv > nodeA[x.u]) nodeA[x.u] = nv; if (nv > nodeA[x.v]) nodeA[x.v] = nv;
  }
  const strokeB = (m, color, w, dash) => { ctx.strokeStyle = color; ctx.lineWidth = w; ctx.setLineDash(dash); m.forEach((L, a) => { ctx.globalAlpha = a; ctx.beginPath(); L.forEach(x => { const p = nodes[x.u], q = nodes[x.v]; ctx.moveTo(p.sx, p.sy); ctx.lineTo(q.sx, q.sy); }); ctx.stroke(); }); };
  ctx.lineCap = 'butt'; strokeB(buckets.n, C.muted, 0.7, []);

  /* outlines: caught rings green, alarms red dashed, missed rings amber dotted (after the pass) */
  ctx.lineJoin = 'round';
  GROUPS.forEach(g => {
    const st = T.status[g.k]; const rd = T.read[g.k]; const votes = (agreement(ST.sel.ver, g.u.id) || {}).ring_votes || 0;
    if (g.ring != null && st === 'caught') {
      const p = all ? 1 : clamp01((t - rd) / CATCH_MS); if (p <= 0) return;
      const e = easeOut(p); pathPoly(g.hull); ctx.setLineDash([]); ctx.strokeStyle = C.ok; ctx.globalAlpha = 0.25 + 0.65 * e; ctx.lineWidth = wOf(votes) + 3 * (1 - e); ctx.stroke();
    } else if (g.ring != null) {
      const p = all ? 1 : ease((t - T.REVEAL) / REVEAL_MS); if (p <= 0) return;
      pathPoly(g.hull); ctx.setLineDash([1.5, 3.5]); ctx.lineCap = 'round'; ctx.strokeStyle = C.warn; ctx.globalAlpha = 0.9 * p; ctx.lineWidth = 1.5; ctx.stroke(); ctx.lineCap = 'butt';
    } else if (st === 'alarm') {
      const p = all ? 1 : ease((t - rd) / ALARM_MS); if (p <= 0) return;
      pathPoly(g.hull); ctx.setLineDash([5, 4]); ctx.strokeStyle = C.bad; ctx.globalAlpha = 0.8 * p; ctx.lineWidth = 1.3; ctx.stroke();
    }
  });
  ctx.setLineDash([]); ctx.globalAlpha = 1;

  ctx.lineCap = 'round';
  strokeB(buckets.bad, C.bad, 1.4, [5, 3]);
  strokeB(buckets.miss, C.warn, 1.8, [0.5, 3.5]);
  strokeB(buckets.ok, C.ok, 2, []);
  /* the catch: in place, inside the graph; its flagged laundering transfers trace in green from payer to payee */
  ctx.setLineDash([]); ctx.strokeStyle = C.ok; ctx.lineWidth = 2.6; ctx.globalAlpha = 1;
  RING_IDS.forEach(r => { const c0 = T.ringCatch[r]; if (c0 == null || all || t < c0 || t >= c0 + CATCH_MS) return;
    const q = easeOut((t - c0) / CATCH_MS); ctx.beginPath();
    RINGS[r].ids.forEach(id => { const x = BYID[id]; if (x.u === x.v || !ST.sel.F.has(id)) return; const p = nodes[x.u], b = nodes[x.v]; ctx.moveTo(p.sx, p.sy); ctx.lineTo(p.sx + (b.sx - p.sx) * q, p.sy + (b.sy - p.sy) * q); });
    ctx.stroke();
    RINGS[r].nodes.forEach(v => { nodeA[v] = 1; });
  });
  ctx.lineCap = 'butt'; ctx.globalAlpha = 1;

  /* accounts, bucketed by strength */
  const nb = new Map(); for (let i = 0; i < nodes.length; i++) { const q = Math.round(nodeA[i] * 20) / 20; if (q < 0.01) continue; let L = nb.get(q); if (!L) nb.set(q, L = []); L.push(i); }
  ctx.fillStyle = C.ink; nb.forEach((L, a) => { ctx.globalAlpha = a * 0.85; ctx.beginPath(); L.forEach(i => { const n = nodes[i]; ctx.moveTo(n.sx + n.r, n.sy); ctx.arc(n.sx, n.sy, n.r, 0, Math.PI * 2); }); ctx.fill(); });
  ctx.globalAlpha = 1;

  if (ST.hover) { pathPoly(ST.hover.hull); ctx.strokeStyle = C.ink; ctx.globalAlpha = 0.9; ctx.lineWidth = 1; ctx.setLineDash([]); ctx.stroke(); ctx.globalAlpha = 1; }
}

/* ---------- the clock: play, scrub, reduced motion ---------- */
let raf = 0;
const timeEl = $('#time'), playBtn = $('#play');
function setT(t, fromPlay) {
  ST.t = Math.max(0, Math.min(ST.END, t)); if (!fromPlay) timeEl.value = Math.round(ST.t / ST.END * 1000); else timeEl.value = Math.round(ST.t / ST.END * 1000);
  renderClock(); syncRoster(fromPlay); draw();
}
function stopPlay() { ST.playing = false; if (raf) cancelAnimationFrame(raf); raf = 0; playBtn.textContent = ST.t >= ST.END ? 'Play again' : 'Play the pass'; }
let last = 0;
function tick(now) { if (!ST.playing) return; const dt = Math.min(64, now - last); last = now; setT(ST.t + dt, true); if (ST.t >= ST.END) stopPlay(); else raf = requestAnimationFrame(tick); }
function play() {
  if (ST.playing) { stopPlay(); return; }
  if (reduced()) { setT(ST.END); stopPlay(); return; }
  if (ST.t >= ST.END) { setT(0); }
  ST.playing = true; playBtn.textContent = 'Pause'; last = performance.now(); raf = requestAnimationFrame(tick);
}
playBtn.addEventListener('click', play);
timeEl.addEventListener('input', () => { stopPlay(); setT(+timeEl.value / 1000 * ST.END); playBtn.textContent = ST.t >= ST.END ? 'Play again' : 'Play the pass'; });
$('#all').addEventListener('change', e => { ST.showAll = e.target.checked; draw(); });
function renderClock() {
  const T = TL; if (!T) { $('#clock').textContent = ''; return; }
  let readN = 0, cleared = 0; T.read.forEach((r, k) => { if (ST.t >= r) { readN++; if (T.status[k] === 'clear' && UNITS[k].expected !== 'ring') cleared++; } });
  const phase = ST.t < HOLD ? 'The whole slice, lit' : ST.t < HOLD + FADE ? 'Transfers outside the neighborhoods step back' : ST.t < T.passEnd ? 'Reading ' + (UNITS[Math.max(0, readN - 1)] || {}).id : ST.t < T.REVEAL ? 'Pass over' : 'Missed rings shown';
  $('#clock').innerHTML = esc(phase) + ' · Neighborhoods cleared <b>' + cleared + ' of ' + NORD + '</b>';
}

/* ---------- the caught roster: a copy of each catch drops in, text only; the ring stays in the graph ---------- */
const strip = $('#strip'); const CARDS = new Map();
function moneyLine(r) { const p = RINGS[r].paid; const cur = Object.keys(p).sort((a, b) => p[b] - p[a]); if (!cur.length) return ''; return compact(p[cur[0]]) + ' ' + cur[0] + (cur.length > 1 ? ' +' + (cur.length - 1) : ''); }
function firstSentence(s) { s = noDash(s).trim(); const m = /^(.{20,}?[.;])\s/.exec(s); s = m ? m[1] : s; return s.length > 180 ? s.slice(0, 177) + '...' : s; }
function shapeName(r, run) { const s = run && run.ibm_shape && run.ibm_shape !== 'None' ? run.ibm_shape : RINGS[r].meta; return sentence(s); }
function buildCard(r, pending) {
  const R = RINGS[r]; const u = UNITS[UNIT_OF_RING[r]]; const run = ST.sel.byUnit[u.id]; const ag = agreement(ST.sel.ver, u.id);
  const el = document.createElement('article'); el.className = 'card' + (pending ? ' pending' : ''); el.dataset.ring = r;
  const flagged = R.ids.filter(id => ST.sel.F.has(id)).length;
  el.innerHTML = '<h3>' + esc(shapeName(r, run)) + '</h3><div class="facts"><span class="mono">' + esc(u.id) + '</span> · <span class="mono">' + R.nodes.length + '</span> accounts · <span class="mono">' + flagged + ' of ' + R.ids.length + '</span> traced</div>' +
    '<p class="why" title="' + esc(noDash(run && run.why)) + '">' + esc(firstSentence(run && run.why)) + '</p>';
  el.setAttribute('aria-label', 'Caught: ' + shapeName(r, run) + ' in neighborhood ' + u.id); if (ag) el.title = ag.ring_votes + ' of ' + ag.families + ' model families called it a ring (the ' + ag.pv + ' panel)';
  el.addEventListener('mouseenter', () => { const g = GROUPS.find(x => x.ring === r); if (g) { ST.hover = g; draw(); } });
  el.addEventListener('mouseleave', () => { ST.hover = null; draw(); });
  return el;
}
function syncRoster(live) {
  const T = TL; if (!T) return;
  const want = RING_IDS.filter(r => T.ringCatch[r] != null && (ST.showAll || ST.t >= T.ringCatch[r] + CATCH_MS * 0.6)).sort((a, b) => T.ringCatch[a] - T.ringCatch[b]);
  const W = new Set(want);
  CARDS.forEach((el, r) => { if (!W.has(r)) { el.remove(); CARDS.delete(r); } });
  want.forEach((r, i) => {
    if (CARDS.has(r)) return;
    const drop = live && !reduced(); const el = buildCard(r, drop);
    const after = [...strip.children].find(c => T.ringCatch[+c.dataset.ring] > T.ringCatch[r]); strip.insertBefore(el, after || null); CARDS.set(r, el);
    if (drop) { void el.offsetWidth; requestAnimationFrame(() => el.classList.remove('pending')); setTimeout(() => el.classList.remove('pending'), 260); el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
  });
  $('#rcount').textContent = CARDS.size + ' of ' + NR + ' IBM rings';
  $('#rnote').textContent = 'Caught is the bench\'s own call: the model flagged at least half of a ring\'s labeled transfers.';
}

/* ---------- headline: catch first; one limit line; end on the strongest true number ---------- */
function renderHeadline() {
  const s = ST.sel; if (!s) return;
  const alarms = s.f === 1 ? '1 alarm' : num(s.f) + ' alarms';
  $('#headline').innerHTML = '<em>' + esc(s.name) + '</em> caught <b>' + s.k + ' of IBM\'s ' + NR + '</b> laundering rings and traced <b>' + num(s.m) + ' of ' + num(NT) + '</b> laundering transfers; it raised <i>' + alarms + '</i> on ordinary neighborhoods, ' + num(s.g) + ' of them on accounts that sit inside a ring.';
  const sl = SL.slice || {};
  $('#limit').textContent = SAMPLE ? 'Limit: this is a SAMPLE network made up by the page; no number here is a measurement.' :
    'Limit: one run per neighborhood on synthetic data enriched to ' + (sl.rate ? (sl.rate * 100).toFixed(1) : (NT / TR.length * 100).toFixed(1)) + ' percent laundering, so a live feed would raise more alarms per catch.';
  const rc = s.k / Math.max(1, NR), cl = s.cleared / Math.max(1, NORD);
  $('#closer').innerHTML = cl > rc ? s.cleared + ' of ' + NORD + ' <span>ordinary neighborhoods cleared</span>' : s.k + ' of ' + NR + ' <span>rings caught</span>';
  $('#verNote').textContent = BE.versions && BE.versions[s.ver] ? s.ver + ': ' + noDash(BE.versions[s.ver]) + '.' : '';
  if (sl.rate && sl.full_rows) $('#hEnrich').textContent = 'The slice is enriched (' + (sl.rate * 100).toFixed(1) + ' percent laundering against ' + (sl.full_laundering / sl.full_rows * 100).toFixed(2) + ' in the full file), and its neighborhoods were cut around IBM\'s groups.';
}

/* ---------- hover card per neighborhood ---------- */
const hov = $('#hover');
cv.addEventListener('mousemove', ev => {
  const rect = cv.getBoundingClientRect(); const x = ev.clientX - rect.left, y = ev.clientY - rect.top;
  const weight = g => { const st = TL.status[g.k]; return g.ring != null ? 3 : st === 'alarm' ? 2 : 1; };
  let best = null;
  GROUPS.forEach(g => { if (!inPoly(x, y, g.hull)) return; if (!best || weight(g) > weight(best) || (weight(g) === weight(best) && g.area < best.area)) best = g; });
  if (best !== ST.hover) { ST.hover = best; draw(); }
  if (!best) { hov.hidden = true; return; }
  const h = hoverHtml(best); hov.innerHTML = h.html; hov.className = 'hovercard ' + h.cls; hov.hidden = false;
  const w = hov.offsetWidth, hh = hov.offsetHeight; let lx = x + 16, ly = y + 12; if (lx + w > G.W - 6) lx = x - w - 16; if (ly + hh > G.H - 6) ly = Math.max(6, G.H - hh - 6);
  hov.style.left = Math.max(6, lx) + 'px'; hov.style.top = ly + 'px';
});
cv.addEventListener('mouseleave', () => { hov.hidden = true; if (ST.hover) { ST.hover = null; draw(); } });
function idList(ids, max) { return ids.length ? ids.slice(0, max).join(', ') + (ids.length > max ? ' and ' + (ids.length - max) + ' more' : '') : 'none'; }
function hoverHtml(g) {
  const s = ST.sel; const run = s.byUnit[g.u.id]; const st = TL.status[g.k]; const ag = agreement(s.ver, g.u.id);
  const agree = ag ? '<p><b class="mono">' + ag.ring_votes + ' of ' + ag.families + '</b> model families called it a ring <span class="who">(the ' + esc(ag.pv) + ' panel)</span>.</p>' : '';
  const why = run && run.why ? '<p class="why"><span class="who">' + esc(s.name) + ':</span> ' + esc(firstSentence(run.why)) + '</p>' : '';
  const flagged = listOf(run && run.flagged_transfer_ids).filter(id => BYID[id]);
  if (g.ring != null) {
    const R = RINGS[g.ring]; const traced = R.ids.filter(id => s.F.has(id)).length;
    const verdict = st === 'caught' ? '<b style="color:var(--ok)">caught it</b>' : st === 'called' ? '<span style="color:var(--warn)">called it a ring but flagged under half of its laundering transfers</span>' : st === 'none' ? '<span style="color:var(--warn)">gave no answer here</span>' : '<span style="color:var(--warn)">ruled it ordinary and missed it</span>';
    return { cls: st === 'caught' ? 'ok' : 'miss', html: '<p class="eyebrow">Neighborhood ' + esc(g.u.id) + ' · IBM laundering ring</p><h3>' + esc(shapeName(g.ring, run)) + '</h3>' +
      '<p class="mono">' + R.nodes.length + ' accounts · ' + R.ids.length + (R.ids.length === 1 ? ' laundering transfer · ' : ' laundering transfers · ') + esc(moneyLine(g.ring)) + '</p>' +
      '<p>' + esc(s.name) + ' ' + verdict + '; it traced ' + traced + ' of ' + R.ids.length + '.</p>' + agree + why +
      '<p class="ids">IBM\'s: ' + esc(idList(R.ids, 8)) + '</p>' + (flagged.length ? '<p class="ids">Flagged: ' + esc(idList(flagged, 8)) + '</p>' : '') };
  }
  const verdict = st === 'alarm' ? '<b style="color:var(--bad)">called it a ring: a false alarm</b>' + (listOf(run.ring_accounts_flagged).length ? ', on an account that sits inside a ring' : '') : st === 'none' ? 'gave no answer here' : 'ruled it ordinary, so it fades';
  return { cls: st === 'alarm' ? 'bad' : '', html: '<p class="eyebrow">Neighborhood ' + esc(g.u.id) + ' · ordinary</p><h3>IBM labels nothing here as laundering</h3>' +
    '<p class="mono">' + g.ns.length + ' accounts · ' + g.u.rowIds.length + ' transfers</p><p>' + esc(s.name) + ' ' + verdict + '.</p>' + agree + why +
    (flagged.length ? '<p class="ids">Flagged: ' + esc(idList(flagged, 10)) + '</p>' : '') };
}

/* ---------- picker, badges, start ---------- */
function select(id, ver) {
  ST.sel = stats(id, ver); TL = buildTimeline(ST.sel); ST.END = TL.END;
  CARDS.forEach(el => el.remove()); CARDS.clear();
  renderHeadline(); stopPlay(); setT(reduced() ? ST.END : Math.min(ST.t, ST.END)); playBtn.textContent = ST.t >= ST.END ? 'Play again' : 'Play the pass';
}
function renderPicker() {
  const ms = $('#model');
  const order = m => [prettyName(m.id), m.version];
  ms.innerHTML = MODELS.slice().sort((a, b) => order(a)[0].localeCompare(order(b)[0]) || String(a.version).localeCompare(String(b.version))).map(m => { const s = stats(m.id, m.version);
    return '<option value="' + esc(m.id + '|' + m.version) + '">' + esc(prettyName(m.id)) + ' ' + esc(m.version) + ': ' + s.k + ' caught, ' + s.f + (s.f === 1 ? ' alarm' : ' alarms') + '</option>'; }).join('');
  ms.addEventListener('change', () => { const [id, ver] = ms.value.split('|'); select(id, ver); });
}
function renderBadges() {
  const out = [];
  if (SAMPLE) out.push('<span class="badge warn" title="../../../data/ files were not found">SAMPLE network, made up by the page</span>');
  else out.push('<span class="badge">' + num(TR.length) + ' transfers · ' + num(nodes.length) + ' accounts · ' + UNITS.length + ' neighborhoods</span>');
  if (!SAMPLE && OUTSIDE) out.push('<span class="badge" title="These transfers sit in no neighborhood, so no model read them; they step back before the pass">' + num(OUTSIDE) + ' outside every neighborhood</span>');
  if (BE.written) out.push('<span class="badge">runs written ' + esc(BE.written) + '</span>');
  $('#badges').innerHTML = out.join('');
}
function init() {
  renderBadges(); fit(); renderPicker();
  const q = new URLSearchParams(location.search);
  let pick = MODELS.find(m => /claude-sonnet-5-5$/.test(m.id) && m.version === 'v4') || MODELS[0];
  if (q.get('model')) { const [id, ver] = q.get('model').split('|'); pick = MODELS.find(m => m.id === id && m.version === (ver || m.version)) || pick; }
  if (!pick) { $('#headline').textContent = 'No model runs were found, so there is no pass to play.'; draw(); return; }
  $('#model').value = pick.id + '|' + pick.version;
  ST.t = 0; select(pick.id, pick.version);
  if (q.get('t') != null) setT(clamp01(+q.get('t')) * ST.END);
  if (q.get('all') === '1') { $('#all').checked = true; ST.showAll = true; syncRoster(false); draw(); }
  if (q.get('play') === '1') play();
  if (q.get('hover') != null) { const g = GROUPS.find(x => x.u.id === q.get('hover')); if (g) { const rc = cv.getBoundingClientRect(); let cx = 0, cy = 0; g.ns.forEach(v => { cx += nodes[v].sx; cy += nodes[v].sy; }); cv.dispatchEvent(new MouseEvent('mousemove', { clientX: rc.left + cx / g.ns.length, clientY: rc.top + cy / g.ns.length })); } }
  RMQ.addEventListener && RMQ.addEventListener('change', () => { if (reduced()) { stopPlay(); setT(ST.END); } });
  let rt = 0; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { fit(); draw(); }, 120); });
}
init();
})();
