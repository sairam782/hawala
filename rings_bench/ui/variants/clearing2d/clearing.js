/* Rings bench, the clearing. The whole slice starts lit; the selected model works through the 60 neighborhoods in order;
   each one it rules ordinary fades to about 8 percent; each ring it catches resolves in place, in green, inside the graph;
   each false alarm stays at full strength in red dashed; when the pass ends, the rings it missed appear in amber dotted.
   Every frame is a pure function of one clock (0 to END ms), so Play, the scrub and ?t= all show the same picture.
   Reads window.SLICE, UNITS, PANEL, BENCH (../../../data/*.js) and window.RINGS_LAYOUT (layout.js, baked once, frozen).
   If the data is missing a small made-up SAMPLE stands in and the page says so. Canvas 2D, no libraries. */
(function () {
'use strict';
const C = { look: '#B3A68C', ground: '#10152b', surface: '#1a2140', ink: '#E6E9EE', muted: '#A3ABB8', accent: '#7FB7B0', rule: '#2C3440', warn: '#E0A458', ok: '#8FCB8A', bad: '#E5736A' };
// A demo page: the system's reduced-motion setting is honored only when the URL asks for it (?motion=reduced),
// so a laptop with animations switched off still plays the search instead of opening on the finished state.
const RMQ = { matches: /[?&]motion=reduced/.test(location.search) };
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
// Pacing (Alex, 14:44): the search takes about 20 s so people can follow it; Look closer runs at about real time
// (about 1 s a card, 30 cards) so each cleared or flagged verdict is a solid beat.
const HOLD = 700, FADE = 400, STEP = 280, DWELL = 250, CATCH_MS = 600, GAP = 250, REVEAL_MS = 600, ALARM_MS = 200;
const HOP_MS = 320, HOLD_MS = 380, VERDICT_GAP = 300, SNAP_MS = 450, SHRINK_MS = 400, XFADE_MS = 250;
const DIM = 0.08; const SWEEP_MS = 260, LOOK_MS = 300, LOOK_GAP = 50; /* a cleared account ends at 8 percent opacity */

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
  return { id: u.id, seed: u.seed_account || '', expected: u.expected, ring: u.ring_id != null ? +u.ring_id : null, accounts: (u.accounts || []).filter(a => a in nodeIdx).map(a => nodeIdx[a]), rowIds };
});
const NORD = UNITS.filter(u => u.expected !== 'ring').length;
UNITS.forEach(u => { if (!u.seed && u.accounts.length) u.seed = nodes[u.accounts.slice().sort((a, b) => nodes[b].deg - nodes[a].deg)[0]].a; });
const UNITS_OF_TR = TR.map(() => []); UNITS.forEach((u, k) => u.rowIds.forEach(id => UNITS_OF_TR[BYID[id].i].push(k)));
const UNIT_OF_RING = {}; UNITS.forEach((u, k) => { if (u.ring != null) UNIT_OF_RING[u.ring] = k; });
const OUTSIDE = TR.filter(t => !UNITS_OF_TR[t.i].length).length;

/* ---------- runs ---------- */
const truthy = v => v === true || v === 'True' || v === 'true' || v === 1;
const listOf = v => Array.isArray(v) ? v : typeof v === 'string' ? (v.match(/[A-Za-z0-9]+/g) || []).filter(x => x !== 'None') : [];
const RUNS = {}; (BE.runs || []).forEach(r => { const k = r.model + '|' + (r.version || 'v1'); (RUNS[k] = RUNS[k] || []).push(r); });
const NAMES = { 'claude-haiku-5-5': 'Claude Haiku 5.5', 'claude-sonnet-5-5': 'Claude Sonnet 5.5', 'deepseek-v4-pro': 'DeepSeek V4 Pro', 'mistral-large-4': 'Mistral Large 4', 'kimi-k3': 'Kimi K3', 'gpt-6-luna': 'GPT-6 Luna', 'gpt-6-sol': 'GPT-6 Sol', 'grok-4.7': 'Grok 4.7', 'glm-5.3': 'GLM 5.3', 'claude-opus-5-5': 'Claude Opus 5.5' };
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
const ST = { before: false, lens: null, xfade: null, stage: 0, missedAt: null, dial: 1, dialOn: false, sel: null, t: 0, END: 1, playing: false, showAll: false, hover: null, lastT: 0 };
let TL = null;
/* the "Needs a look" tray: recorded for one first pass (Claude Sonnet 5.5 v4); the investigation verdicts are replayed from investigate.js */
const TRAY_STUB = [{"unit":"u01","expected":"ordinary","shape":null,"first_pass_verdict":"ordinary","first_pass_confidence":"medium","ring_votes":4,"families":8,"reasons":["families split: 4 of 8 called it a ring"]},{"unit":"u03","expected":"ordinary","shape":null,"first_pass_verdict":"ring","first_pass_confidence":"low","ring_votes":6,"families":9,"reasons":["first pass called it a ring at low confidence","families split: 6 of 9 called it a ring"]},{"unit":"u04","expected":"ordinary","shape":null,"first_pass_verdict":"ordinary","first_pass_confidence":"medium","ring_votes":5,"families":9,"reasons":["families split: 5 of 9 called it a ring"]},{"unit":"u05","expected":"ordinary","shape":null,"first_pass_verdict":"ordinary","first_pass_confidence":"low","ring_votes":5,"families":9,"reasons":["families split: 5 of 9 called it a ring"]},{"unit":"u08","expected":"ring","shape":"chain","first_pass_verdict":"ordinary","first_pass_confidence":"medium","ring_votes":5,"families":8,"reasons":["families split: 5 of 8 called it a ring"]},{"unit":"u12","expected":"ordinary","shape":null,"first_pass_verdict":"ordinary","first_pass_confidence":"medium","ring_votes":3,"families":9,"reasons":["families split: 3 of 9 called it a ring"]},{"unit":"u13","expected":"ordinary","shape":null,"first_pass_verdict":"ring","first_pass_confidence":"low","ring_votes":8,"families":9,"reasons":["first pass called it a ring at low confidence"]},{"unit":"u14","expected":"ring","shape":"other","first_pass_verdict":"ordinary","first_pass_confidence":"medium","ring_votes":3,"families":8,"reasons":["families split: 3 of 8 called it a ring"]},{"unit":"u16","expected":"ordinary","shape":null,"first_pass_verdict":"ordinary","first_pass_confidence":"medium","ring_votes":3,"families":9,"reasons":["families split: 3 of 9 called it a ring"]},{"unit":"u17","expected":"ordinary","shape":null,"first_pass_verdict":"ordinary","first_pass_confidence":"low","ring_votes":5,"families":9,"reasons":["families split: 5 of 9 called it a ring"]},{"unit":"u18","expected":"ordinary","shape":null,"first_pass_verdict":"ordinary","first_pass_confidence":"low","ring_votes":3,"families":9,"reasons":["families split: 3 of 9 called it a ring"]},{"unit":"u19","expected":"ring","shape":"lone","first_pass_verdict":"ring","first_pass_confidence":"low","ring_votes":3,"families":9,"reasons":["first pass called it a ring at low confidence","families split: 3 of 9 called it a ring"]},{"unit":"u20","expected":"ring","shape":"lone","first_pass_verdict":"ordinary","first_pass_confidence":"low","ring_votes":6,"families":9,"reasons":["families split: 6 of 9 called it a ring"]},{"unit":"u21","expected":"ordinary","shape":null,"first_pass_verdict":"ordinary","first_pass_confidence":"medium","ring_votes":4,"families":9,"reasons":["families split: 4 of 9 called it a ring"]},{"unit":"u23","expected":"ordinary","shape":null,"first_pass_verdict":"ordinary","first_pass_confidence":"medium","ring_votes":3,"families":9,"reasons":["families split: 3 of 9 called it a ring"]},{"unit":"u24","expected":"ordinary","shape":null,"first_pass_verdict":"ordinary","first_pass_confidence":"medium","ring_votes":3,"families":9,"reasons":["families split: 3 of 9 called it a ring"]},{"unit":"u25","expected":"ordinary","shape":null,"first_pass_verdict":"ordinary","first_pass_confidence":"low","ring_votes":4,"families":9,"reasons":["families split: 4 of 9 called it a ring"]},{"unit":"u28","expected":"ring","shape":"lone","first_pass_verdict":"ordinary","first_pass_confidence":"low","ring_votes":6,"families":9,"reasons":["families split: 6 of 9 called it a ring"]},{"unit":"u33","expected":"ring","shape":"chain","first_pass_verdict":"ordinary","first_pass_confidence":"low","ring_votes":5,"families":9,"reasons":["families split: 5 of 9 called it a ring"]},{"unit":"u36","expected":"ordinary","shape":null,"first_pass_verdict":"ordinary","first_pass_confidence":"low","ring_votes":5,"families":8,"reasons":["families split: 5 of 8 called it a ring"]},{"unit":"u37","expected":"ring","shape":"lone","first_pass_verdict":"ordinary","first_pass_confidence":"low","ring_votes":6,"families":9,"reasons":["families split: 6 of 9 called it a ring"]},{"unit":"u38","expected":"ordinary","shape":null,"first_pass_verdict":"ordinary","first_pass_confidence":"medium","ring_votes":3,"families":8,"reasons":["families split: 3 of 8 called it a ring"]},{"unit":"u40","expected":"ordinary","shape":null,"first_pass_verdict":"ordinary","first_pass_confidence":"medium","ring_votes":5,"families":9,"reasons":["families split: 5 of 9 called it a ring"]},{"unit":"u41","expected":"ordinary","shape":null,"first_pass_verdict":"ring","first_pass_confidence":"low","ring_votes":5,"families":9,"reasons":["first pass called it a ring at low confidence","families split: 5 of 9 called it a ring"]},{"unit":"u45","expected":"ordinary","shape":null,"first_pass_verdict":"ordinary","first_pass_confidence":"medium","ring_votes":3,"families":9,"reasons":["families split: 3 of 9 called it a ring"]},{"unit":"u52","expected":"ordinary","shape":null,"first_pass_verdict":"ordinary","first_pass_confidence":"medium","ring_votes":5,"families":9,"reasons":["families split: 5 of 9 called it a ring"]},{"unit":"u54","expected":"ordinary","shape":null,"first_pass_verdict":"ordinary","first_pass_confidence":"medium","ring_votes":5,"families":9,"reasons":["families split: 5 of 9 called it a ring"]},{"unit":"u55","expected":"ordinary","shape":null,"first_pass_verdict":"ordinary","first_pass_confidence":"low","ring_votes":4,"families":9,"reasons":["families split: 4 of 9 called it a ring"]},{"unit":"u58","expected":"ordinary","shape":null,"first_pass_verdict":"ordinary","first_pass_confidence":"low","ring_votes":6,"families":9,"reasons":["families split: 6 of 9 called it a ring"]},{"unit":"u59","expected":"ordinary","shape":null,"first_pass_verdict":"ordinary","first_pass_confidence":"medium","ring_votes":3,"families":9,"reasons":["families split: 3 of 9 called it a ring"]}];
const INVD = window.INVESTIGATE || null;
const TRAY = (INVD && INVD.tray && INVD.tray.length ? INVD.tray : TRAY_STUB).filter(x => UNITS.some(u => u.id === x.unit));
const TRAY_OF = {}; TRAY.forEach(x => { TRAY_OF[x.unit] = x; });
const INV_MODEL = INVD && INVD.model ? prettyName(INVD.model) : 'Claude Opus 5.5';
const trayApplies = S => !!S && /claude-sonnet-5-5$/.test(S.id) && S.ver === 'v4';
const INV = {}; /* unit -> { start, land } in wall-clock ms; the verdict is INVD.results[unit] */
const INVESTIGATE_MS = 1200;
const invRes = id => INVD && INVD.results ? INVD.results[id] || null : null;
const landed = (id, now) => !ST.before && INV[id] && now >= INV[id].land;
function buildTimeline(S) {
  const read = [], status = []; let t = HOLD + FADE; const useTray = trayApplies(S);
  UNITS.forEach((u, k) => {
    const r = S.byUnit[u.id]; let st;
    if (!r || r.verdict == null || r.verdict === '') st = 'none';
    else if (u.expected === 'ring') st = truthy(r.ring_found) ? 'caught' : r.verdict === 'ring' ? 'called' : 'clear';
    else st = r.verdict === 'ring' ? 'alarm' : 'clear';
    if (useTray && TRAY_OF[u.id] && st !== 'caught' && st !== 'alarm') st = 'look';
    read[k] = t; status[k] = st; t += STEP + (st === 'caught' ? DWELL : 0);
  });
  const passEnd = Math.max(t, (read[read.length - 1] || t) + Math.max(FADE, CATCH_MS));
  const REVEAL = Infinity, END = passEnd; void GAP;
  /* each transfer: when it starts to fade (Infinity = stays lit), and what it turns into, from when */
  const dimAt = new Float64Array(TR.length), style = new Array(TR.length).fill(null), styleT = new Float64Array(TR.length);
  const dimNoLook = new Float64Array(TR.length), lookOf = TR.map(() => null);
  const release = (k, x) => { const s = status[k]; if (s === 'clear') return read[k]; if (s === 'caught') return read[k] + CATCH_MS; if (s === 'called') return passEnd - FADE; return Infinity; };
  TR.forEach(x => {
    const us = UNITS_OF_TR[x.i]; let d = us.length ? 0 : HOLD;
    us.forEach(k => { d = Math.max(d, release(k, x)); }); dimAt[x.i] = d;
    const lk = us.filter(k => status[k] === 'look');
    if (lk.length) { lookOf[x.i] = lk; let d2 = us.length > lk.length ? 0 : HOLD; us.forEach(k => { if (status[k] !== 'look') d2 = Math.max(d2, release(k, x)); }); dimNoLook[x.i] = d2; }
    if (x.label && UNIT_OF_RING[x.ring] != null && status[UNIT_OF_RING[x.ring]] === 'look') { /* its fate waits for the investigation */ }
    else if (x.label) {
      const ku = UNIT_OF_RING[x.ring]; const caught = S.caught.has(x.ring) && ku != null;
      if (S.F.has(x.id)) { style[x.i] = 'ok'; styleT[x.i] = caught ? read[ku] : Infinity; }
      else { style[x.i] = 'miss'; styleT[x.i] = Infinity; }
    } else if (S.F.has(x.id)) {
      let first = Infinity; us.forEach(k => { if (status[k] === 'alarm') first = Math.min(first, read[k]); });
      if (isFinite(first)) { style[x.i] = 'bad'; styleT[x.i] = first; }
    }
  });
  const ringCatch = {}; RING_IDS.forEach(r => { const ku = UNIT_OF_RING[r]; ringCatch[r] = S.caught.has(r) && ku != null ? read[ku] : null; });
  return { read, status, dimAt, dimNoLook, lookOf, style, styleT, REVEAL, END, passEnd, ringCatch };
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
    let cx = 0, cy = 0; ns.forEach(v => { cx += nodes[v].sx; cy += nodes[v].sy; }); cx /= ns.length; cy /= ns.length;
    let rad = 0; hullP.forEach(q => { rad = Math.max(rad, Math.hypot(q[0] - cx, q[1] - cy)); });
    GROUPS.push({ k, u, ring: u.ring, ns, hull: hullP, area: polyArea(hullP), cx, cy, rad });
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
const nodeA = new Float32Array(nodes.length); const LIT = new Float32Array(TR.length);
function draw() {
  const t = ST.t, T = TL, all = ST.showAll; const now = performance.now();
  /* a tray neighborhood lets its traffic fade only once the investigation clears it; a ring verdict holds it lit */
  const invRel = id => { if (!landed(id, now)) return Infinity; const r = invRes(id); if (!r) return Infinity; if (r.verdict === 'ring') return truthy(r.ring_found) ? INV[id].land + SNAP_MS : Infinity; return INV[id].land; };
  ctx.setTransform(G.dpr, 0, 0, G.dpr, 0, 0); ctx.fillStyle = C.ground; ctx.fillRect(0, 0, G.W, G.H);
  if (!T) return;
  nodeA.fill(0);
  const buckets = { n: new Map(), ok: new Map(), bad: new Map(), miss: new Map() };
  const put = (kind, a, x) => { if (a < 0.01) return; const q = Math.round(a * 20) / 20; const m = buckets[kind]; let L = m.get(q); if (!L) m.set(q, L = []); L.push(x); };
  for (let i = 0; i < TR.length; i++) {
    const x = TR[i]; const d = T.dimAt[i];
    let lit = t < d ? 1 : 1 - ease((t - d) / FADE);
    let s = T.style[i], sT = T.styleT[i], wall = false;
    if (T.lookOf[i]) {
      const d0 = T.dimNoLook[i]; const litT = t < d0 ? 1 : 1 - ease((t - d0) / FADE);
      let rel = -Infinity; T.lookOf[i].forEach(k => { rel = Math.max(rel, invRel(UNITS[k].id)); });
      const litL = isFinite(rel) ? 1 - ease((now - rel) / SHRINK_MS) : 1; lit = Math.max(litT, litL);
      T.lookOf[i].forEach(k => { const id = UNITS[k].id; const r = invRes(id); if (!r || !landed(id, now)) return; const fl = listOf(r.flagged_in_unit);
        if (x.label && UNITS[k].ring === x.ring) { s = truthy(r.ring_found) && fl.includes(x.id) ? 'ok' : 'miss'; sT = INV[id].land; wall = true; }
        else if (!x.label && r.verdict === 'ring' && UNITS[k].expected !== 'ring' && fl.includes(x.id)) { s = 'bad'; sT = INV[id].land; wall = true; } });
    }
    if (all) lit = 1; LIT[i] = lit;
    let sa = 0; const tt = wall ? now : t;
    if (wall) { if (s === 'ok') sa = tt >= sT + SNAP_MS ? 1 : 0; else sa = s === 'miss' ? (ST.missedAt != null ? ease((now - Math.max(sT, ST.missedAt)) / REVEAL_MS) : 0) : ease((tt - sT) / ALARM_MS); }
    else
    if (s && sT === Infinity) sa = ST.missedAt != null ? ease((now - ST.missedAt) / REVEAL_MS) : 0;
    else if (s && t >= sT) sa = s === 'miss' ? ease((t - sT) / REVEAL_MS) : s === 'bad' ? ease((t - sT) / ALARM_MS) : 1;
    if (!wall && s === 'ok' && sa && T.ringCatch[x.ring] != null && t < T.ringCatch[x.ring] + CATCH_MS) sa = 0; /* drawn by the catch below */
    if (all && s && (wall || t >= sT || sT === Infinity)) sa = 1;
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
    if (ST.dialOn && votes < ST.dial && st !== 'look') return;
    if (st === 'look') {
      const id = g.u.id; const r = invRes(id);
      if (r && landed(id, now)) {
        const p = clamp01((now - INV[id].land) / SNAP_MS);
        if (r.verdict === 'ring' && truthy(r.ring_found)) { const e = all ? 1 : easeOut(p); pathPoly(g.hull); ctx.setLineDash([]); ctx.strokeStyle = C.ok; ctx.globalAlpha = 0.25 + 0.65 * e; ctx.lineWidth = wOf(votes) + 3 * (1 - e); ctx.stroke();
          if (!all && p < 1) { ctx.strokeStyle = C.ink; ctx.globalAlpha = 0.9 * (1 - p); ctx.lineWidth = wOf(votes) + 4 * (1 - p); ctx.stroke(); } /* the snap: a brief bright flash as the outline closes */ }
        else if (r.verdict === 'ring' && g.ring == null) { pathPoly(g.hull); ctx.setLineDash([5, 4]); ctx.strokeStyle = C.bad; ctx.globalAlpha = 0.8 * ease(p); ctx.lineWidth = 1.3; ctx.stroke(); }
        else if (g.ring != null) { shrinkOut(g, id, now); const m = all ? 1 : ST.missedAt != null ? ease((now - Math.max(INV[id].land, ST.missedAt)) / REVEAL_MS) : 0; if (m > 0) { pathPoly(g.hull); ctx.setLineDash([1.5, 3.5]); ctx.lineCap = 'round'; ctx.strokeStyle = C.warn; ctx.globalAlpha = 0.9 * m; ctx.lineWidth = 1.5; ctx.stroke(); ctx.lineCap = 'butt'; } }
        else shrinkOut(g, id, now);
        return;
      }
      const p = all ? 1 : ease((t - rd) / ALARM_MS); if (p <= 0) return;
      pathPoly(g.hull); ctx.setLineDash([]); const pulse = (ST.stage === 2 || ST.before) && !reduced() ? 0.55 + 0.45 * Math.sin(now / 520) : 0; ctx.strokeStyle = pulse ? C.warn : C.look; const busy = INV[id] && !ST.before; ctx.globalAlpha = (busy ? 1 : 0.6 + 0.35 * pulse) * p; ctx.lineWidth = busy ? 2 : 1.1 + 0.9 * pulse; ctx.stroke();
    } else if (g.ring != null && st === 'caught') {
      const p = all ? 1 : clamp01((t - rd) / CATCH_MS); if (p <= 0) return;
      const e = easeOut(p); pathPoly(g.hull); ctx.setLineDash([]); ctx.strokeStyle = C.ok; ctx.globalAlpha = 0.25 + 0.65 * e; ctx.lineWidth = wOf(votes) + 3 * (1 - e); ctx.stroke();
    } else if (g.ring != null) {
      const p = all ? 1 : ST.missedAt != null ? ease((now - ST.missedAt) / REVEAL_MS) : 0; if (p <= 0) return;
      pathPoly(g.hull); ctx.setLineDash([1.5, 3.5]); ctx.lineCap = 'round'; ctx.strokeStyle = C.warn; ctx.globalAlpha = 0.9 * p; ctx.lineWidth = 1.5; ctx.stroke(); ctx.lineCap = 'butt';
    } else if (st === 'alarm') {
      const p = all ? 1 : ease((t - rd) / ALARM_MS); if (p <= 0) return;
      pathPoly(g.hull); ctx.setLineDash([5, 4]); ctx.strokeStyle = C.bad; ctx.globalAlpha = 0.8 * p; ctx.lineWidth = 1.3; ctx.stroke();
    }
  });
  ctx.setLineDash([]); ctx.globalAlpha = 1;
  if (ST.stage === 1 && !all) GROUPS.forEach(g => { const d = t - T.read[g.k]; if (d < 0 || d > SWEEP_MS) return; pathPoly(g.hull); ctx.fillStyle = C.ink; ctx.globalAlpha = 0.10 * (1 - d / SWEEP_MS); ctx.fill(); ctx.strokeStyle = C.ink; ctx.globalAlpha = 1 - 0.7 * d / SWEEP_MS; ctx.lineWidth = 2.2; ctx.stroke(); });
  ctx.globalAlpha = 1;

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
  /* an investigation that lands on a ring traces it the same way, on the wall clock */
  Object.keys(INV).forEach(id => { const r = invRes(id); const k = UNITS.findIndex(u => u.id === id); if (!r || k < 0 || !truthy(r.ring_found) || all) return;
    if (ST.before) return; const p = (now - INV[id].land) / SNAP_MS; if (p < 0 || p >= 1) return; const q = easeOut(p); const fl = listOf(r.flagged_in_unit); const ring = UNITS[k].ring; if (ring == null) return;
    ctx.beginPath(); RINGS[ring].ids.forEach(tid => { const x = BYID[tid]; if (x.u === x.v || !fl.includes(tid)) return; const a = nodes[x.u], b = nodes[x.v]; ctx.moveTo(a.sx, a.sy); ctx.lineTo(a.sx + (b.sx - a.sx) * q, a.sy + (b.sy - a.sy) * q); }); ctx.stroke();
    RINGS[ring].nodes.forEach(v => { nodeA[v] = 1; }); });
  ctx.lineCap = 'butt'; ctx.globalAlpha = 1;

  /* accounts, bucketed by strength */
  const nb = new Map(); for (let i = 0; i < nodes.length; i++) { const q = Math.round(nodeA[i] * 20) / 20; if (q < 0.01) continue; let L = nb.get(q); if (!L) nb.set(q, L = []); L.push(i); }
  ctx.fillStyle = C.ink; nb.forEach((L, a) => { ctx.globalAlpha = a * 0.85; ctx.beginPath(); L.forEach(i => { const n = nodes[i]; ctx.moveTo(n.sx + n.r, n.sy); ctx.arc(n.sx, n.sy, n.r, 0, Math.PI * 2); }); ctx.fill(); });
  ctx.globalAlpha = 1;

  const L = lensAt(now);
  if (L) { ctx.beginPath(); ctx.arc(L.x, L.y, L.r, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.globalAlpha = 0.07 * L.a; ctx.fill(); ctx.strokeStyle = C.accent; ctx.globalAlpha = 0.9 * L.a; ctx.lineWidth = 1.2; ctx.setLineDash([]); ctx.stroke(); ctx.globalAlpha = 1; }
  if (ST.xfade) { const p = (now - ST.xfade.t0) / XFADE_MS; if (p >= 1) ST.xfade = null; else { ctx.globalAlpha = 1 - ease(p); ctx.drawImage(ST.xfade.img, 0, 0, G.W, G.H); ctx.globalAlpha = 1; } }
  if (ST.hover) { pathPoly(ST.hover.hull); ctx.strokeStyle = C.ink; ctx.globalAlpha = 0.9; ctx.lineWidth = 1; ctx.setLineDash([]); ctx.stroke(); ctx.globalAlpha = 1; }
}

/* a cleared neighborhood: its outline shrinks inward as it fades */
function shrinkOut(g, id, now) {
  const p = clamp01((now - INV[id].land) / SHRINK_MS); if (p >= 1) return; const e = easeOut(p); const k = 1 - 0.45 * e;
  ctx.save(); ctx.translate(g.cx, g.cy); ctx.scale(k, k); ctx.translate(-g.cx, -g.cy); pathPoly(g.hull); ctx.restore();
  ctx.setLineDash([]); ctx.strokeStyle = C.look; ctx.globalAlpha = 0.9 * (1 - e); ctx.lineWidth = 1.6; ctx.stroke();
}
/* the lens: a soft circle that glides from one tray neighborhood to the next */
function lensAt(now) {
  const L = ST.lens; if (!L || ST.before) return null;
  const p = ease((now - L.t0) / HOP_MS); const a = L.out != null ? 1 - clamp01((now - L.out) / 250) : 1; if (a <= 0) { ST.lens = null; return null; }
  return { x: L.x0 + (L.x1 - L.x0) * p, y: L.y0 + (L.y1 - L.y0) * p, r: L.r0 + (L.r1 - L.r0) * p, a };
}
function moveLens(k) {
  const g = GROUPS.find(gg => gg.k === k); if (!g) return; const now = performance.now(); const c = lensAt(now);
  const r1 = Math.max(16, Math.min(g.rad + 8, 160));
  ST.lens = c ? { x0: c.x, y0: c.y, r0: c.r, x1: g.cx, y1: g.cy, r1, t0: now } : { x0: g.cx, y0: g.cy, r0: r1 * 1.4, x1: g.cx, y1: g.cy, r1, t0: now };
}

/* ---------- the four stages: Search, Ambiguous, Look closer, Settled; the button always names the next one ---------- */
let raf = 0, pulseRaf = 0;
const timeEl = $('#time'), playBtn = $('#play');
const STAGES = ['Search', 'Ambiguous', 'Look closer', 'Settled'];
function setT(t, fromPlay) {
  ST.t = Math.max(0, Math.min(ST.END, t)); timeEl.value = Math.round(ST.t / ST.END * 1000);
  renderClock(); syncTray(fromPlay); draw();
}
function pulseLoop() { pulseRaf = 0; if ((ST.stage !== 2 && !ST.before) || reduced()) return; draw(); pulseRaf = requestAnimationFrame(pulseLoop); }
function setStage(n) {
  ST.stage = n; timeEl.style.visibility = n >= 2 ? 'hidden' : '';
  const box = Math.max(1, n); document.querySelectorAll('#funnel .fbox').forEach((li, i) => { li.classList.toggle('on', i + 1 === box); li.classList.toggle('done', i + 1 < box); li.setAttribute('aria-current', i + 1 === box ? 'step' : 'false'); });
  if (n === 2 && !pulseRaf) pulseRaf = requestAnimationFrame(pulseLoop);
  renderButton(); renderClock(); draw();
}
function renderButton() {
  const n = ST.stage; playBtn.disabled = false;
  renderFunnel();
  if (n === 0) playBtn.textContent = 'Start the search';
  else if (n === 1) playBtn.textContent = ST.playing ? 'Skip to the end of the search' : 'Continue the search';
  else if (n === 2) { playBtn.textContent = 'Look closer at all ' + CARDS.size; playBtn.disabled = !trayApplies(ST.sel) || !CARDS.size; }
  else if (n === 3) { playBtn.textContent = trayDone() ? 'Settle' : 'Investigating...'; playBtn.disabled = !trayDone(); }
  else playBtn.textContent = ST.missedAt == null ? 'Show what was missed' : 'Start over';
}
function stopPlay() { ST.playing = false; if (raf) cancelAnimationFrame(raf); raf = 0; renderButton(); }
let last = 0;
function tick(now) { if (!ST.playing) return; const dt = Math.min(64, now - last); last = now; setT(ST.t + dt, true); if (ST.t >= ST.END) { stopPlay(); setStage(2); } else raf = requestAnimationFrame(tick); }
function startSearch() {
  resetLater(); if (ST.t >= ST.END) setT(0);
  setStage(1);
  if (reduced()) { setT(ST.END); stopPlay(); setStage(2); return; }
  ST.playing = true; last = performance.now(); renderButton(); raf = requestAnimationFrame(tick);
}
function resetLater() { setView(false, true); ST.lens = null; lookRun++; Object.keys(INV).forEach(k => delete INV[k]); ST.missedAt = null; CARDS.forEach((el, k) => cardState(el, k)); }
function showMissed() { ST.missedAt = performance.now(); CARDS.forEach((el, k) => cardState(el, k)); animate(REVEAL_MS + 100); renderButton(); renderClock(); }
playBtn.addEventListener('click', () => {
  const n = ST.stage;
  if (n === 0) startSearch();
  else if (n === 1) { if (ST.playing) { stopPlay(); setT(ST.END); setStage(2); } else { ST.playing = true; last = performance.now(); renderButton(); raf = requestAnimationFrame(tick); } }
  else if (n === 2) lookCloser();
  else if (n === 3) checkSettled();
  else if (ST.missedAt == null) showMissed();
  else { stopPlay(); resetLater(); setT(0); setStage(0); }
});
/* each stage label jumps to the end of that stage (as ?stage=1..4 does) */
function jumpTo(n) {
  stopPlay(); lookRun++;
  if (n <= 0) { resetLater(); setT(0); setStage(0); return; }
  if (n <= 2) { resetLater(); setT(ST.END); setStage(n === 1 ? 1 : 2); if (n === 1) { ST.stage = 1; renderButton(); } return; }
  setT(ST.END); const past = performance.now() - 10000;
  CARDS.forEach((el, k) => { INV[UNITS[k].id] = { start: past, land: past }; });
  ST.missedAt = n >= 4 ? past : null; CARDS.forEach((el, k) => cardState(el, k)); renderTrayHead();
  setStage(n >= 4 ? 4 : 3); if (n === 3) { ST.stage = 3; renderButton(); } renderTrayHead();
}
document.querySelectorAll('#funnel .fbox').forEach((li, i) => { li.addEventListener('click', () => jumpTo(i + 1)); li.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); jumpTo(i + 1); } }); });
timeEl.addEventListener('input', () => { stopPlay(); if (ST.stage !== 1) { resetLater(); setStage(1); } setT(+timeEl.value / 1000 * ST.END); if (ST.t >= ST.END) setStage(2); });
$('#all').addEventListener('change', e => { ST.showAll = e.target.checked; draw(); });
function renderClock() {
  const T = TL; if (!T) { $('#clock').textContent = ''; return; }
  const now = performance.now(); let readN = 0; T.read.forEach(r => { if (ST.t >= r) readN++; });
  const lookN = T.status.filter(x => x === 'look').length; const inv = Object.keys(INV).filter(id => landed(id, now)).length;
  let html;
  if (ST.stage <= 1) html = 'read <b>' + readN + ' of ' + UNITS.length + '</b>' + (ST.stage === 1 ? ' · ' + esc(speedLine(1)) : '');
  else if (ST.stage === 3) html = 'checked <b>' + inv + ' of ' + lookN + '</b> · ' + esc(speedLine(3));
  else html = 'read <b>' + UNITS.length + ' of ' + UNITS.length + '</b>' + (ST.stage === 4 && !ST.before && inv ? ' · checked <b>' + inv + ' of ' + lookN + '</b>' : '');
  $('#clock').innerHTML = html;
  renderFunnel();
}
/* the funnel: each step's live count, from the data; blank until the step is reached */
function renderFunnel() {
  const T = TL, s = ST.sel; if (!T || !s) return; const now = performance.now(); const tray = trayApplies(s);
  const box = Math.max(1, ST.stage);
  let caught = 0, alarms = 0, cleared = 0, unsettled = 0;
  T.read.forEach((r, k) => { if (ST.t < r) return; const st = T.status[k]; if (st === 'caught') caught++; else if (st === 'alarm') alarms++; else if (st === 'clear') cleared++; else if (st === 'look') unsettled++; });
  const lookN = T.status.filter(x => x === 'look').length;
  $('#fc1').textContent = ST.stage === 0 || (ST.stage === 1 && ST.t < HOLD + FADE) ? UNITS.length + ' to read' : caught + ' rings caught · ' + alarms + (alarms === 1 ? ' alarm' : ' alarms') + ' · ' + cleared + ' cleared' + (tray ? ' · ' + unsettled + ' unsettled' : '');
  $('#fc2').textContent = box >= 2 ? (tray ? lookN + ' the first pass could not settle' : 'no tray for this model') : '';
  let inv = 0, icl = 0, ifound = 0; Object.keys(INV).forEach(id => { if (!landed(id, now)) return; inv++; const r = invRes(id); if (!r) return; if (truthy(r.ring_found)) ifound++; else if (r.verdict !== 'ring' && (UNITS.find(u => u.id === id) || {}).expected !== 'ring') icl++; });
  $('#fc3').textContent = box >= 3 && tray ? 'investigated ' + inv + ' of ' + lookN + ' · ' + icl + ' cleared · ' + ifound + (ifound === 1 ? ' ring' : ' rings') + ' found' : '';
  const human = s.k + (tray && INVD ? TRAY.filter(x => INVD.results && INVD.results[x.unit] && truthy(INVD.results[x.unit].ring_found)).length : 0);
  $('#fc4').textContent = box >= 4 ? human + ' rings for a human · ' + s.f + (s.f === 1 ? ' alarm' : ' alarms') + ' · ' + (NR - human) + ' missed' : '';
  $('#caption').textContent = captionText(lookN, human);
  renderRail(lookN, human, caught, alarms, cleared, inv);
}
/* the side rail: what this is, what it is doing now, what it means for you, what to press next */
function renderRail(lookN, human, caught, alarms, cleared, inv) {
  const s = ST.sel; const tray = trayApplies(s); const n = ST.before ? 2 : ST.stage;
  const fa = tray && INVD && INVD.results ? TRAY.filter(x => x.expected !== 'ring' && INVD.results[x.unit] && INVD.results[x.unit].verdict === 'ring').length : 0;
  let readN = 0; TL.read.forEach(r => { if (ST.t >= r) readN++; });
  let big = '', now = '', you = '', next = '';
  if (n === 0) { big = UNITS.length + ' to read'; now = 'Nothing read yet: ' + num(TR.length) + ' transfers, all lit.'; you = 'Without this you would read all ' + UNITS.length + '.'; next = 'Press Start the search.'; }
  else if (n === 1) { big = caught + (caught === 1 ? ' ring' : ' rings') + ' caught · ' + alarms + (alarms === 1 ? ' alarm' : ' alarms'); now = 'Reading neighborhood ' + Math.max(1, readN) + ' of ' + UNITS.length + '. Ordinary ones fade; rings trace green.'; you = 'Without this you would read all ' + UNITS.length + '.'; next = ST.playing ? 'Watch it read.' : 'Press Continue the search.'; }
  else if (n === 2) {
    big = tray ? lookN + ' unsettled' : s.k + (s.k === 1 ? ' ring' : ' rings') + ' caught · ' + s.f + (s.f === 1 ? ' alarm' : ' alarms');
    now = 'Done reading: ' + s.k + (s.k === 1 ? ' ring' : ' rings') + ' caught, ' + s.f + (s.f === 1 ? ' alarm' : ' alarms') + '.' + (tray ? ' The ' + lookN + ' it was unsure about pulse amber.' : '');
    you = tray ? 'The ' + lookN + ' in the tray are the ones worth your time; the rest are cleared.' : 'The closer look is recorded for Claude Sonnet 5.5 v4 only.';
    next = ST.before ? 'Switch to After to see them settled.' : tray ? 'Press Look closer at all ' + lookN + '.' : 'Pick Claude Sonnet 5.5 v4 under Details.';
  }
  else if (n === 3) { big = inv + ' of ' + lookN + ' checked'; now = 'A stronger model checks each one: cleared, or confirmed as a ring.'; you = 'Watch your list shrink: cleared ones leave, confirmed ones join the rings.'; next = 'It settles by itself.'; }
  else {
    const al = s.f + fa; big = human + ' rings for a human';
    now = 'Plus ' + al + (al === 1 ? ' alarm' : ' alarms') + '. ' + (NR - human) + ' rings were never found' + (ST.missedAt != null ? '; they show dotted.' : '.');
    you = 'Your morning: ' + human + ' rings with reasons and ' + al + (al === 1 ? ' alarm' : ' alarms') + ' to dismiss, nothing else.';
    next = ST.missedAt == null ? 'Press Show what was missed.' : 'Start over, or pick another model under Details.';
  }
  $('#nowBig').textContent = big; $('#nowText').textContent = now; $('#youText').textContent = you; $('#nextText').textContent = 'Next: ' + next;
  const hl = honestLine(); $('#honestText').textContent = hl.short; $('#honestText').title = hl.full;
}
/* how much faster than a live run the playback is: live = 20 parallel calls, bounded by 60 calls a minute */
const msOf = r => { const v = parseFloat(r && r.latency_ms); return isFinite(v) ? v : 0; };
function liveSeconds(runs) { const sum = runs.reduce((a, r) => a + msOf(r), 0); return Math.max(sum / 20 / 1000, runs.length); }
const fmtX = x => x < 10 ? x.toFixed(1) : String(Math.round(x));
const fmtDur = sec => sec < 120 ? Math.round(sec) + ' s' : Math.round(sec / 60) + ' min';
function speedLine(pass) {
  const s = ST.sel; if (!s || !TL) return '';
  if (pass === 1) { const live = liveSeconds(s.runs); const play = TL.passEnd / 1000; return 'Playback at about ' + fmtX(live / play) + 'x real time (a live run on 20 workers takes about ' + fmtDur(live) + ')'; }
  if (pass === 3 && INVD && INVD.results) { const R = Object.values(INVD.results); const live = liveSeconds(R); const play = R.length * (HOP_MS + HOLD_MS + VERDICT_GAP) / 1000; return 'Playback at about ' + fmtX(live / play) + 'x real time (live about ' + fmtDur(live) + ')'; }
  return '';
}
function voteClause() {
  const pv = panelVer(ST.sel.ver); const V = pv && PA.versions[pv]; if (!V || !V.summary) return '';
  const fams = V.summary.families || []; const runs = (BE.runs || []).filter(r => (r.version || 'v1') === pv && fams.includes(r.model) && r.verdict != null && r.verdict !== '');
  if (!runs.length) return '';
  const lo = runs.length, hi = Math.max(lo, runs.reduce((a, r) => a + (parseFloat(r.latency_ms) || 0), 0) / 1000 / 20);  /* 60 calls a minute, or 20 workers on the slow families */
  const dur = Math.round(hi) > Math.round(lo) + 30 ? fmtDur(lo) + ' to ' + fmtDur(hi) : fmtDur(liveSeconds(runs));
  return ' The ' + fams.length + '-family vote behind the tray is not replayed at all: live it is ' + runs.length + ' calls, about ' + dur + '.';
}
let HONEST = null;
function honestLine() {
  if (HONEST != null) return HONEST;
  const sl = SL.slice || {};
  const s = ST.sel; const ms = r => { const v = parseFloat(r && r.latency_ms); return isFinite(v) ? v : 0; };
  let calls = s.runs.length, total = s.runs.reduce((a, r) => a + ms(r), 0); void msOf;
  if (trayApplies(s) && INVD && INVD.results) { const R = Object.values(INVD.results); calls += R.length; total += R.reduce((a, r) => a + ms(r), 0); }
  const one = Math.round(total / 60000), par = fmtDur(Math.max(total / 20 / 1000, calls));
  const full = SAMPLE ? 'A SAMPLE network made up by the page; nothing here is a measurement.' : 'A recorded run on IBM\'s synthetic data, replayed. Live, these ' + calls + ' calls take about ' + one + (one === 1 ? ' minute' : ' minutes') + ' one at a time, about ' + par + ' on 20 workers.' + (trayApplies(s) ? voteClause() : '') + (sl.rate ? ' The slice is enriched to ' + (sl.rate * 100).toFixed(1) + ' percent laundering and every laundering transfer in it is ACH.' : '');
  HONEST = { full, short: SAMPLE ? 'SAMPLE network, not a measurement.' : 'Recorded run, replayed. Live: about ' + par + ' on 20 workers.' };
  return HONEST;
}
function captionText(lookN, human) {
  const s = ST.sel; const tray = trayApplies(s);
  if (ST.stage === 0) return UNITS.length + ' neighborhoods, ' + num(TR.length) + ' transfers. Step 1 of 4: the first pass reads every neighborhood.';
  if (ST.stage === 1) return 'Step 1 of 4: ' + s.name + ' ' + s.ver + ' reads each neighborhood. Ordinary ones fade, rings it catches turn green, the ones it is unsure about stay lit.';
  if (ST.before) return 'Before the closer look: ' + lookN + ' neighborhoods the first pass could not settle. Switch to After to see them settled.';
  if (ST.stage === 2) return tray ? 'Step 2 of 4: these ' + lookN + ' pulsing neighborhoods are the ones the first pass was unsure about. Next: a stronger model looks closer at each one.' : 'Step 2 of 4: the closer look is recorded for Claude Sonnet 5.5 v4 only; pick it in the side panel to continue.';
  if (ST.stage === 3) return 'Step 3 of 4: ' + INV_MODEL + ' looks closer at each unsure neighborhood. Cleared ones fade; rings close in green.';
  if (ST.missedAt == null) return 'Step 4 of 4: what is left lit is what a human should look at. Next: show what both passes missed.';
  return 'Amber dotted: the ' + (NR - human) + ' rings both passes missed. Next: start over from the beginning.';
}
function closingLine() {
  const s = ST.sel; let out = 'First pass <b>' + s.k + ' of ' + NR + '</b> rings, <b>' + s.f + '</b> ' + (s.f === 1 ? 'alarm' : 'alarms');
  if (trayApplies(s) && INVD && INVD.results) {
    const R = TRAY.map(x => Object.assign({ expected: x.expected }, INVD.results[x.unit] || {}));
    const cl = R.filter(r => r.verdict === 'ordinary' && r.expected !== 'ring').length, found = R.filter(r => truthy(r.ring_found)).length, fa = R.filter(r => r.verdict === 'ring' && r.expected !== 'ring').length;
    out += ' · investigator <b>' + cl + '</b> cleared, <b>' + found + '</b> ' + (found === 1 ? 'ring' : 'rings') + ' found, <b>' + fa + '</b> false ' + (fa === 1 ? 'alarm' : 'alarms');
  }
  return out;
}

/* ---------- the families dial: how many model families must agree (panel.js vote table) ---------- */
function voteRow(k) { const pv = panelVer(ST.sel.ver); const V = pv && PA.versions[pv]; return V && (V.vote_table || []).find(r => r.votes_needed === k) ? Object.assign({ pv }, (V.vote_table || []).find(r => r.votes_needed === k)) : null; }
function renderDial() {
  const pv = panelVer(ST.sel && ST.sel.ver); const V = pv && PA.versions[pv]; const n = V && V.summary && V.summary.families ? V.summary.families.length : 9;
  const dial = $('#dial'); dial.max = n; dial.value = ST.dial;
  $('#dialVal').textContent = ST.dial + ' of ' + n;
  const row = voteRow(ST.dial);
  $('#dialNote').innerHTML = !row ? 'No vote table in panel.js.' : ST.dialOn ? 'Outlines show only where at least ' + ST.dial + ' families called it a ring (the ' + esc(row.pv) + ' panel). The tray stays as it is.' : 'Move it to require more families to agree.';
}
$('#dial').addEventListener('input', e => { ST.dial = +e.target.value; ST.dialOn = true; renderDial(); renderHeadline(); draw(); });

/* ---------- the "Needs a look" tray: where the first pass was unsure; click to replay the stronger model's recorded verdict ---------- */
const strip = $('#strip'); const CARDS = new Map();
function moneyLine(r) { const p = RINGS[r].paid; const cur = Object.keys(p).sort((a, b) => p[b] - p[a]); if (!cur.length) return ''; return compact(p[cur[0]]) + ' ' + cur[0] + (cur.length > 1 ? ' +' + (cur.length - 1) : ''); }
function firstSentence(s) { s = noDash(s).trim(); const m = /^(.{20,}?[.;])\s/.exec(s); s = m ? m[1] : s; return s.length > 180 ? s.slice(0, 177) + '...' : s; }
function shapeName(r, run) { const s = run && run.ibm_shape && run.ibm_shape !== 'None' ? run.ibm_shape : RINGS[r].meta; return sentence(s); }
/* the neighborhood's own sub-graph, as the graph draws it, scaled into a small square */
function drawUnitThumb(canvas, k, w, h) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2); canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  const c = canvas.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const u = UNITS[k]; const ns = new Set(u.accounts); u.rowIds.forEach(id => { ns.add(BYID[id].u); ns.add(BYID[id].v); });
  let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9; ns.forEach(v => { const n = nodes[v]; minx = Math.min(minx, n.sx); maxx = Math.max(maxx, n.sx); miny = Math.min(miny, n.sy); maxy = Math.max(maxy, n.sy); });
  const pad = 6; const s = Math.min((w - 2 * pad) / Math.max(1, maxx - minx), (h - 2 * pad) / Math.max(1, maxy - miny), 4);
  const ox = (w - (maxx - minx) * s) / 2, oy = (h - (maxy - miny) * s) / 2; const P = v => [ox + (nodes[v].sx - minx) * s, oy + (nodes[v].sy - miny) * s];
  c.strokeStyle = C.look; c.globalAlpha = 0.8; c.lineWidth = 1; c.beginPath();
  u.rowIds.forEach(id => { const x = BYID[id]; if (x.u === x.v) return; const a = P(x.u), b = P(x.v); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); }); c.stroke();
  c.globalAlpha = 1; c.fillStyle = C.ink; c.beginPath(); ns.forEach(v => { const a = P(v); c.moveTo(a[0] + 1.6, a[1]); c.arc(a[0], a[1], 1.6, 0, Math.PI * 2); }); c.fill();
  return { minx, miny, maxx, maxy };
}
/* reaching a tray neighborhood: a copy of its sub-graph lifts off the graph at its real size and settles into the card */
function fly(k, card) {
  const target = card.querySelector('canvas'); const tr = target.getBoundingClientRect(); const st = cv.getBoundingClientRect();
  const fl = document.createElement('canvas'); fl.className = 'flyer'; const b = drawUnitThumb(fl, k, 54, 54); document.body.append(fl);
  const bw = Math.max(30, b.maxx - b.minx + 12), bh = Math.max(30, b.maxy - b.miny + 12); const k0 = Math.max(bw, bh) / 54;
  const cx = st.left + (b.minx + b.maxx) / 2, cy = st.top + (b.miny + b.maxy) / 2;
  const from = 'translate(' + (cx - 27 * k0) + 'px,' + (cy - 27 * k0) + 'px) scale(' + k0 + ')', to = 'translate(' + tr.left + 'px,' + tr.top + 'px) scale(1)';
  target.style.visibility = 'hidden';
  let done = false; const land = () => { if (done) return; done = true; fl.remove(); target.style.visibility = ''; };
  setTimeout(land, 640);
  if (fl.animate) { const an = fl.animate([{ transform: from, opacity: 0.9 }, { transform: to, opacity: 1 }], { duration: 560, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'forwards' }); an.onfinish = land; an.oncancel = land; } else land();
}
function reasonLine(x) { return (x.reasons || []).map(r => sentence(noDash(r))).join('; '); }
function cardState(el, k) {
  const u = UNITS[k]; const x = TRAY_OF[u.id]; const now = performance.now(); const r = invRes(u.id); const inv = ST.before ? null : INV[u.id];
  const head = el.querySelector('h3'), body = el.querySelector('.why');
  el.classList.remove('busy', 'ring', 'cleared', 'alarm', 'missed');
  if (!inv) { head.innerHTML = '<span class="mono">' + esc(u.seed || u.id) + '</span>'; body.textContent = reasonLine(x); body.title = body.textContent; return; }
  if (now < inv.land) { el.classList.add('busy'); head.textContent = 'Investigating with ' + INV_MODEL; body.textContent = reasonLine(x); return; }
  if (!r) { head.textContent = 'No recorded verdict yet'; body.textContent = 'investigate.js has not been loaded, so there is nothing to replay.'; return; }
  const why = firstSentence(r.why); body.title = noDash(r.why);
  const ibm = r.ibm_shape && r.ibm_shape !== 'None' ? sentence(r.ibm_shape) : u.ring != null ? shapeName(u.ring, ST.sel.byUnit[u.id]) : '';
  if (r.verdict === 'ring' && truthy(r.ring_found)) { el.classList.add('ring'); head.textContent = 'Ring: ' + ibm; body.textContent = why; }
  else if (r.verdict === 'ring' && u.ring == null) { el.classList.add('alarm'); head.textContent = 'Called a ring; IBM labels it ordinary'; body.textContent = why; }
  else if (r.verdict === 'ring') { el.classList.add('alarm'); head.textContent = 'Ring, but under half its laundering transfers flagged'; body.textContent = why; }
  else { el.classList.add('cleared'); const missed = u.ring != null && ST.missedAt != null; if (missed) el.classList.add('missed'); head.innerHTML = 'Cleared' + (missed ? ' <span class="tag">missed: IBM labels it ' + esc(ibm ? ibm.toLowerCase() : 'a ring') + '</span>' : ''); body.textContent = why; }
}
let animUntil = 0, animRaf = 0;
function animate(ms) { animUntil = Math.max(animUntil, performance.now() + ms); if (!animRaf) animRaf = requestAnimationFrame(animStep); }
function animStep() { animRaf = 0; draw(); renderClock(); if (performance.now() < animUntil) animRaf = requestAnimationFrame(animStep); }
function investigate(k, ms, lens) {
  const id = UNITS[k].id; if (INV[id]) return Promise.resolve();
  if (lens && !reduced()) moveLens(k);
  const busy = reduced() ? 1 : ms || INVESTIGATE_MS; const start = performance.now();
  if (ST.stage < 3) setStage(3);
  INV[id] = { start, land: start + busy }; const el = CARDS.get(k); if (el) { el.style.setProperty('--sweep', busy + 'ms'); cardState(el, k); el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
  animate(busy + Math.max(SNAP_MS, SHRINK_MS, REVEAL_MS) + 100);
  return new Promise(res => setTimeout(() => { const e = CARDS.get(k); if (e) cardState(e, k); renderTrayHead(); draw(); renderClock(); checkSettled(); setTimeout(() => { draw(); renderClock(); }, Math.max(CATCH_MS, FADE, REVEAL_MS) + 40); res(); }, busy + 10));
}
let lookRun = 0;
async function lookCloser() {
  const run = ++lookRun; setStage(3);
  const ks = [...CARDS.keys()].sort((x, y) => x - y).filter(k => !INV[UNITS[k].id]);
  if (reduced()) { jumpTo(4); return; }
  for (let i = 0; i < ks.length; i++) { if (run !== lookRun) return; if (i) await new Promise(r => setTimeout(r, VERDICT_GAP)); if (CARDS.has(ks[i])) await investigate(ks[i], HOP_MS + HOLD_MS, true); }
  if (ST.lens) { ST.lens.out = performance.now(); animate(300); }
  checkSettled();
}
function trayDone() { const ks = [...CARDS.keys()]; return ks.length > 0 && ks.every(k => landed(UNITS[k].id, performance.now())); }
function checkSettled() { if (ST.stage === 3 && trayDone()) { setStage(4); renderTrayHead(); } }
function buildCard(k, pending) {
  const u = UNITS[k]; const x = TRAY_OF[u.id];
  const el = document.createElement('article'); el.className = 'card' + (pending ? ' pending' : ''); el.dataset.k = k; el.tabIndex = 0; el.setAttribute('role', 'button');
  el.innerHTML = '<canvas class="thumb" aria-hidden="true"></canvas><div class="txt"><h3></h3><div class="facts"><span class="mono">' + u.accounts.length + '</span> accounts · ' + esc(u.id) + '</div><p class="why"></p></div><div class="sweep" aria-hidden="true"></div>';
  drawUnitThumb(el.querySelector('canvas'), k, 54, 54); cardState(el, k);
  el.setAttribute('aria-label', 'Needs a look: neighborhood ' + u.id + ', ' + reasonLine(x) + '. Click to investigate.');
  el.addEventListener('click', () => { const id = UNITS[k].id; if (INV[id] && landed(id, performance.now()) && typeof window.openClusterZoom === 'function') { const g = GROUPS.find(gg => gg.k === k); const rc = cv.getBoundingClientRect(); let cx = 0, cy = 0; if (g) g.ns.forEach(v => { cx += nodes[v].sx; cy += nodes[v].sy; }); window.openClusterZoom(id, g ? { x: rc.left + cx / g.ns.length, y: rc.top + cy / g.ns.length } : undefined); } else investigate(k, INVESTIGATE_MS); });
  el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); investigate(k); } });
  el.addEventListener('mouseenter', () => { const g = GROUPS.find(gg => gg.k === k); if (g) { ST.hover = g; draw(); } });
  el.addEventListener('mouseleave', () => { ST.hover = null; draw(); });
  return el;
}
/* before and after the investigator: one toggle above the tray, one tally line from the data */
const BA = document.createElement('div'); BA.className = 'ba'; BA.hidden = true;
BA.innerHTML = '<div class="seg" role="group" aria-label="Before or after the investigator"><button type="button" data-v="before">Before</button><button type="button" data-v="after" class="on">After</button></div><span class="tally"></span>';
document.querySelector('.rhead').append(BA);
BA.querySelectorAll('button').forEach(b => b.addEventListener('click', () => setView(b.dataset.v === 'before')));
function setView(before, silent) {
  if (ST.before === before) return;
  if (!silent && !reduced()) { const img = document.createElement('canvas'); img.width = cv.width; img.height = cv.height; img.getContext('2d').drawImage(cv, 0, 0); ST.xfade = { img, t0: performance.now() }; }
  ST.before = before;
  if (before) { ST.savedMissed = ST.missedAt; ST.missedAt = null; } else if (ST.savedMissed !== undefined) { ST.missedAt = ST.savedMissed; ST.savedMissed = undefined; }
  BA.querySelectorAll('button').forEach(b => { const on = (b.dataset.v === 'before') === before; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
  CARDS.forEach((el, k) => cardState(el, k)); renderClock();
  if (before && !pulseRaf) pulseRaf = requestAnimationFrame(pulseLoop);
  if (!silent) { animate(XFADE_MS + 40); renderTrayHead(); }
}
function tallyLine() {
  const s = ST.sel; const R = TRAY.map(x => Object.assign({ expected: x.expected }, (INVD && INVD.results && INVD.results[x.unit]) || {}));
  const cl = R.filter(r => r.verdict === 'ordinary' && r.expected !== 'ring').length, found = R.filter(r => truthy(r.ring_found)).length, fa = R.filter(r => r.verdict === 'ring' && r.expected !== 'ring').length;
  const trayMiss = R.filter(r => r.expected === 'ring' && !truthy(r.ring_found)).length; const after = s.k + found;
  return 'Before: ' + s.k + ' rings caught, ' + R.length + ' neighborhoods unsettled. After: ' + after + ' rings caught, ' + cl + ' cleared, ' + fa + ' false ' + (fa === 1 ? 'alarm' : 'alarms') + ' from the investigator, ' + (NR - after) + ' rings still missed (' + trayMiss + ' of them in the tray).';
}
function renderTrayHead() {
  const n = CARDS.size, done = [...CARDS.keys()].filter(k => landed(UNITS[k].id, performance.now())).length;
  $('#rcount').textContent = trayApplies(ST.sel) ? n + (n === 1 ? ' neighborhood' : ' neighborhoods') + (done ? ' · ' + done + ' investigated' : '') : '';

  let note = '';
  if (!trayApplies(ST.sel)) note = 'The tray is recorded for the Claude Sonnet 5.5 v4 first pass; pick it to see it.';
  else if (INVD && INVD.results && n && done === n && n === TRAY.length) {
    const R = TRAY.map(x => Object.assign({ unit: x.unit, expected: x.expected }, INVD.results[x.unit] || {}));
    const cl = R.filter(r => r.verdict === 'ordinary' && r.expected !== 'ring').length, found = R.filter(r => truthy(r.ring_found)).length, fa = R.filter(r => r.verdict === 'ring' && r.expected !== 'ring').length;
    note = 'Investigator: ' + R.length + ' looked at, ' + cl + ' cleared, ' + found + (found === 1 ? ' ring' : ' rings') + ' found, ' + fa + (fa === 1 ? ' false alarm' : ' false alarms');
  } else note = '';
  const showBA = ST.stage === 4 && trayApplies(ST.sel) && !!INVD && (ST.before || trayDone());
  BA.hidden = !showBA; $('#rnote').hidden = showBA; $('#rcount').hidden = showBA;
  if (showBA) { const tl = BA.querySelector('.tally'); tl.textContent = tallyLine(); tl.title = tl.textContent; }
  $('#rnote').textContent = note;
}
function syncTray(live) {
  const T = TL; if (!T) return;
  const want = trayApplies(ST.sel) ? UNITS.map((u, k) => k).filter(k => T.status[k] === 'look' && (ST.showAll || ST.t >= T.read[k])) : [];
  const W = new Set(want);
  CARDS.forEach((el, k) => { if (!W.has(k)) { el.remove(); CARDS.delete(k); } });
  want.forEach(k => {
    if (CARDS.has(k)) return;
    const drop = live && !reduced(); const el = buildCard(k, drop);
    const after = [...strip.children].find(c => +c.dataset.k > k); strip.insertBefore(el, after || null); CARDS.set(k, el);
    if (drop) { void el.offsetWidth; requestAnimationFrame(() => el.classList.remove('pending')); setTimeout(() => el.classList.remove('pending'), 260); el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); fly(k, el); }
  });
  CARDS.forEach((el, k) => { if (INV[UNITS[k].id] && performance.now() >= INV[UNITS[k].id].land) { const has = el.classList.contains('missed'); const want = UNITS[k].ring != null && ST.missedAt != null && el.classList.contains('cleared'); if (has !== want) cardState(el, k); } });
  renderTrayHead();
}

/* ---------- headline: catch first; one limit line; end on the strongest true number ---------- */
function renderHeadline() {
  const s = ST.sel; if (!s) return;
  const alarms = s.f === 1 ? '1 alarm' : num(s.f) + ' alarms';
  const row = ST.dialOn ? voteRow(ST.dial) : null;
  if (row) {
    $('#headline').innerHTML = 'When at least <em>' + row.votes_needed + ' of ' + row.of + '</em> model families must agree, the panel catches <b>' + row.rings_found + ' of ' + (row.rings_total || NR) + '</b> laundering rings and raises <i>' + row.false_rings + ' false ' + (row.false_rings === 1 ? 'ring' : 'rings') + '</i> on ordinary neighborhoods.';
    $('#closer').innerHTML = row.rings_found + ' of ' + (row.rings_total || NR) + ' <span>rings at this dial (the ' + esc(row.pv) + ' panel)</span>';
    return;
  }
  $('#headline').innerHTML = '<em>' + esc(s.name) + '</em> caught <b>' + s.k + ' of IBM\'s ' + NR + '</b> laundering rings and traced <b>' + num(s.m) + ' of ' + num(NT) + '</b> laundering transfers; it raised <i>' + alarms + '</i> on ordinary neighborhoods, ' + num(s.g) + ' of them on accounts that sit inside a ring.';
  const sl = SL.slice || {};
  $('#limit').textContent = SAMPLE ? 'Limit: this is a SAMPLE network made up by the page; no number here is a measurement.' :
    'Limit: one run per neighborhood on synthetic data enriched to ' + (sl.rate ? (sl.rate * 100).toFixed(1) : (NT / TR.length * 100).toFixed(1)) + ' percent laundering, so a live feed would raise more alarms per catch.';
  const rc = s.k / Math.max(1, NR), cl = s.cleared / Math.max(1, NORD);
  void rc; void cl; $('#closer').innerHTML = s.k + ' of ' + NR + ' <span>rings caught on the first pass</span>';
  $('#verNote').textContent = BE.versions && BE.versions[s.ver] ? s.ver + ': ' + noDash(BE.versions[s.ver]) + '.' : '';
  if (sl.rate && sl.full_rows && document.getElementById('hEnrich')) $('#hEnrich').textContent = 'The slice is enriched (' + (sl.rate * 100).toFixed(1) + ' percent laundering against ' + (sl.full_laundering / sl.full_rows * 100).toFixed(2) + ' in the full file), and its neighborhoods were cut around IBM\'s groups.';
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
  placeHover(x, y);
});
let hovAt = [0, 0];
/* the card always sits inside the graph area: flipped left of the pointer near the right edge, pushed up near the bottom */
function placeHover(x, y) {
  hovAt = [x, y]; const w = hov.offsetWidth, hh = hov.offsetHeight;
  let lx = x + 16, ly = y + 12; if (lx + w > G.W - 6) lx = x - w - 16;
  lx = Math.max(6, Math.min(lx, G.W - w - 6)); ly = Math.max(6, Math.min(ly, G.H - hh - 6));
  hov.style.left = lx + 'px'; hov.style.top = ly + 'px';
}
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!hov.hidden) placeHover(hovAt[0], hovAt[1]); });
cv.addEventListener('click', ev => { const rect = cv.getBoundingClientRect(); const x = ev.clientX - rect.left, y = ev.clientY - rect.top; const g = ST.hover && inPoly(x, y, ST.hover.hull) ? ST.hover : null; if (g && typeof window.openClusterZoom === 'function') window.openClusterZoom(g.u.id, { x: ev.clientX, y: ev.clientY }); });
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
  ST.sel = stats(id, ver); HONEST = null; TL = buildTimeline(ST.sel); ST.END = TL.END; ST.dialOn = false;
  CARDS.forEach(el => el.remove()); CARDS.clear();
  renderHeadline(); renderDial(); const keep = ST.stage; stopPlay(); jumpTo(reduced() ? 4 : keep);
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
  if (!INVD) out.push('<span class="badge warn" title="../../../data/investigate.js was not found">investigate.js not loaded: no recorded verdicts yet</span>');
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
  ST.t = 0; ST.stage = 0; select(pick.id, pick.version);
  if (q.get('stage') != null) jumpTo(Math.max(0, Math.min(4, +q.get('stage') || 0)));
  else if (q.get('t') != null) { setStage(1); setT(clamp01(+q.get('t')) * ST.END); if (ST.t >= ST.END) setStage(2); }
  if (q.get('missed') === '0' && ST.stage === 4) { ST.missedAt = null; CARDS.forEach((el, k) => cardState(el, k)); renderButton(); renderClock(); draw(); }
  if (q.get('view') === 'before' && ST.stage === 4) setView(true, true);
  if (q.get('dial') != null) { ST.dial = +q.get('dial'); ST.dialOn = true; renderDial(); renderHeadline(); draw(); }
  if (q.get('all') === '1') { $('#all').checked = true; ST.showAll = true; syncTray(false); draw(); }
  if (q.get('play') === '1') startSearch();
  if (q.get('hover') != null) { const g = GROUPS.find(x => x.u.id === q.get('hover')); if (g) { const rc = cv.getBoundingClientRect(); let cx = 0, cy = 0; g.ns.forEach(v => { cx += nodes[v].sx; cy += nodes[v].sy; }); cv.dispatchEvent(new MouseEvent('mousemove', { clientX: rc.left + cx / g.ns.length, clientY: rc.top + cy / g.ns.length })); } }
  RMQ.addEventListener && RMQ.addEventListener('change', () => { if (reduced()) jumpTo(4); });
  let rt = 0; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { fit(); draw(); }, 120); });
}
init();
window.__clearing = { get TL() { return TL; }, get hovAt() { return hovAt; }, INV, UNITS, TR, ST, LIT, UNITS_OF_TR };
})();
