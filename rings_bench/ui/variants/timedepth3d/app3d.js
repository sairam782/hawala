/* Rings in time, loop 2: one IBM group at a time, with time as depth.
   Inputs (all optional, a labeled SAMPLE replaces any that is missing):
     window.SLICE  (../../../data/slice.js)  transfers, IBM's labels (key), ring_meta
     window.BENCH  (../../../data/bench_results.js)  models[] and runs[]
     window.UNITS  (../../../data/units.js)  the 60 neighborhoods (used for the optional neighborhood traffic)
   Scoring follows the flat page (ui/app.js): a model's flags are the union of flagged_transfer_ids over its runs;
   an IBM group counts as caught when at least half of its labeled transfers are flagged. */
(function () {
'use strict';

const Q = new URLSearchParams(location.search);
const RM = (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) || Q.has('still');
const D = ms => (RM ? 0 : ms);
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const clamp01 = t => Math.min(Math.max(t, 0), 1);
const easeOut = t => 1 - Math.pow(1 - clamp01(t), 3);
function seeded(seed) { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
const fmtN = n => Number(n).toLocaleString('en-US');
const firstSentence = (s, max) => { s = String(s || '').replace(/\s*\u2014\s*/g, ', ').trim(); const m = s.match(/^.*?[.!?](\s|$)/); s = (m ? m[0] : s).trim(); max = max || 200; return s.length > max ? s.slice(0, max - 3).replace(/\s+\S*$/, '') + '...' : s; };
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDay = m => { const d = new Date(m * 60000); return MON[d.getUTCMonth()] + ' ' + d.getUTCDate(); };
const fmtTime = m => { const d = new Date(m * 60000); return fmtDay(m) + ', ' + String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0'); };

/* ---------- SAMPLE fallbacks (only used when a data file is missing) ---------- */
function sampleSlice() {
  const rnd = seeded(7); const T = [], key = {}; let id = 0;
  const acc = i => 'S' + String(i).padStart(4, '0');
  const ts = m => new Date(Date.UTC(2022, 8, 1) + m * 60000).toISOString().slice(0, 16).replace(/-/g, '/').replace('T', ' ');
  const add = (f, t, m, ring) => { id++; const tid = 'T' + String(id).padStart(4, '0'); T.push([tid, ts(m), acc(f), acc(t), Math.round(200 + rnd() * 9000), 'US Dollar', 'ACH', '001', '002']); key[tid] = ring >= 0 ? [1, ring] : [0, -1]; };
  for (let i = 0; i < 80; i++) { const a = Math.floor(rnd() * 30), b = Math.floor(rnd() * 30); if (a !== b) add(a, b, Math.floor(rnd() * 14400), -1); }
  [[100, 101, 2], [101, 102, 3], [102, 103, 4], [103, 104, 5], [104, 100, 6]].forEach(r => add(r[0], r[1], r[2] * 1440 + 300, 0));
  for (let k = 0; k < 6; k++) add(110, 111 + k, 6 * 1440 + k * 50, 1);
  add(120, 121, 7 * 1440, 2); add(121, 122, 8 * 1440 + 600, 2);
  T.sort((a, b) => a[1] < b[1] ? -1 : 1);
  return { sample: true, transfers: T, key, ring_meta: { 0: { shape: 'cycle', n: 5 }, 1: { shape: 'fan-out', n: 6 }, 2: { shape: 'chain', n: 2 } } };
}
function sampleBench(TRx) {
  const rings = {}; TRx.forEach(t => { if (t.label) (rings[t.ring] = rings[t.ring] || []).push(t.id); });
  const rk = Object.keys(rings); const ordinary = TRx.filter(t => !t.label && !t.self).map(t => t.id);
  const mk = (ver, frac) => {
    const runs = rk.map((r, i) => ({ model: 'sample/model', family: 'sample', version: ver, unit: 'u' + (i + 1), expected: 'ring', verdict: 'ring', ibm_shape: null,
      flagged_transfer_ids: rings[r].slice(0, Math.ceil(rings[r].length * (i === 0 ? 1 : frac))), ring_accounts_flagged: [], why: 'SAMPLE: a made-up reason so the page can be read without the data files.' }));
    runs.push({ model: 'sample/model', family: 'sample', version: ver, unit: 'u9', expected: 'ordinary', verdict: 'ring', ibm_shape: null, flagged_transfer_ids: ordinary.slice(0, 4), ring_accounts_flagged: [], why: 'SAMPLE: a made-up false alarm.' });
    return runs;
  };
  return { sample: true, versions: { v1: 'SAMPLE', v2: 'SAMPLE' }, models: [{ id: 'sample/model', family: 'sample', version: 'v1' }, { id: 'sample/model', family: 'sample', version: 'v2' }], runs: mk('v1', 0.4).concat(mk('v2', 1)) };
}

/* ---------- data ---------- */
const SAMPLE = [];
const SL = window.SLICE && window.SLICE.transfers ? window.SLICE : (SAMPLE.push('transfers'), sampleSlice());
const toMin = s => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10), +s.slice(11, 13), +s.slice(14, 16)) / 60000;
const mkT = r => ({ id: r[0], ts: r[1], from: r[2], to: r[3], paid: r[4], cur: r[5], fmt: r[6], t: toMin(r[1]),
  label: (SL.key[r[0]] || [0, -1])[0], ring: (SL.key[r[0]] || [0, -1])[1], self: r[2] === r[3] });
const TR = SL.transfers.map(mkT);
const BYID = {}; TR.forEach(t => (BYID[t.id] = t));
const BENCH = window.BENCH && window.BENCH.models ? window.BENCH : (SAMPLE.push('model results'), sampleBench(TR));
const UNITS = window.UNITS && window.UNITS.units ? window.UNITS.units : [];
const TRUTH = new Set(TR.filter(t => t.label).map(t => t.id));
const RINGS = {}; TR.forEach(t => { if (t.label) (RINGS[t.ring] = RINGS[t.ring] || []).push(t.id); });
const NRINGS = Object.keys(RINGS).length;
/* each ring's neighborhood, and IBM's own name for its shape (every run on a unit carries the same ibm_shape) */
const UNIT_OF = {}; UNITS.forEach(u => { if (u.ring_id != null) UNIT_OF[String(u.ring_id)] = u.id; });
const RING_OF_UNIT = {}; Object.keys(UNIT_OF).forEach(r => (RING_OF_UNIT[UNIT_OF[r]] = r));
const IBM_NAME = {}; (BENCH.runs || []).forEach(x => { const r = RING_OF_UNIT[x.unit]; if (r != null && x.ibm_shape && !IBM_NAME[r]) IBM_NAME[r] = x.ibm_shape; });
const ourShape = r => (SL.ring_meta && SL.ring_meta[r] && SL.ring_meta[r].shape) || 'other';
const ibmRaw = r => IBM_NAME[r] || ourShape(r);
/* "GATHER-SCATTER (11 of 12)" reads as "Gather-scatter, 11 of 12" */
const ringName = r => { const m = String(ibmRaw(r)).match(/^([^(]*?)\s*(?:\((.*)\))?$/); const base = (m ? m[1] : String(ibmRaw(r))).toLowerCase(); return base.charAt(0).toUpperCase() + base.slice(1) + (m && m[2] ? ', ' + m[2] : ''); };
const ringBase = r => String(ibmRaw(r)).replace(/\s*\(.*$/, '').toLowerCase();
const ringShape = ringBase;
const SHAPE_ORDER = ['cycle', 'fan-out', 'fan-in', 'scatter-gather', 'gather-scatter', 'stack', 'chain', 'bipartite', 'mesh', 'other', 'no named shape', 'lone'];
const ord = r => { const k = SHAPE_ORDER.indexOf(ringBase(r)); return k < 0 ? 99 : k; };
const RING_IDS = Object.keys(RINGS).sort((a, b) => (ord(a) - ord(b)) || (+a - +b));

/* ---------- models ---------- */
const shortName = id => { const k = id.indexOf('/'); return k >= 0 ? id.slice(k + 1) : id; };
const prettyName = id => shortName(id).replace(/^claude-(\w+)-(\d+)-(\d+)$/, (m, a, b, c) => 'Claude ' + a[0].toUpperCase() + a.slice(1) + ' ' + b + '.' + c);
function derive(m) {
  const ver = m.version || 'v1';
  const R = (BENCH.runs || []).filter(r => r.model === m.id && (r.version || 'v1') === ver);
  const F = new Set(); R.forEach(r => (r.flagged_transfer_ids || []).forEach(id => { if (BYID[id]) F.add(id); }));
  const perRing = {};
  RING_IDS.forEach(r => {
    const ids = RINGS[r]; const hit = ids.filter(id => F.has(id)).length;
    const run = (UNIT_OF[r] && R.find(x => x.unit === UNIT_OF[r])) || R.find(x => x.expected === 'ring' && ids.some(id => (x.flagged_transfer_ids || []).includes(id)));
    /* the engine decides "caught" (half the ring flagged, and no sweep); recount only when a run lacks the field */
    const found = run && typeof run.ring_found === 'boolean' ? run.ring_found : hit / ids.length >= 0.5;
    perRing[r] = { hit, n: ids.length, found, run };
  });
  const found = typeof m.rings_found === 'number' ? m.rings_found : RING_IDS.filter(r => perRing[r].found).length;
  const nOrd = R.filter(r => r.expected === 'ordinary').length;
  let traced = 0; F.forEach(id => { if (TRUTH.has(id)) traced++; });
  const alarms = R.filter(r => r.expected === 'ordinary' && r.verdict === 'ring');
  return Object.assign({}, m, { version: ver, short: shortName(m.id), pretty: prettyName(m.id), R, F, perRing, found, traced, nOrd, alarms: alarms.length, alarmsInRing: alarms.filter(r => (r.ring_accounts_flagged || []).length > 0).length });
}
const MODELS = BenchModels();
function BenchModels() { return BENCH.models.map(derive); }
const MODEL_IDS = []; MODELS.forEach(m => { if (!MODEL_IDS.includes(m.id)) MODEL_IDS.push(m.id); });
const versionsOf = id => MODELS.filter(m => m.id === id).map(m => m.version);

/* ---------- shape icons, drawn from IBM's shape name ---------- */
const GLYPH = {
  cycle: () => { const p = [0, 1, 2, 3, 4].map(k => [22 + 13 * Math.sin(k * 2 * Math.PI / 5), 22 - 13 * Math.cos(k * 2 * Math.PI / 5)]); return { e: p.map((a, k) => [a, p[(k + 1) % 5]]), d: p }; },
  chain: () => { const p = [[6, 30], [17, 16], [28, 28], [39, 14]]; return { e: [[p[0], p[1]], [p[1], p[2]], [p[2], p[3]]], d: p }; },
  'fan-out': () => { const h = [10, 22]; const o = [[36, 6], [38, 16], [38, 28], [36, 38]]; return { e: o.map(x => [h, x]), d: [h].concat(o) }; },
  'fan-in': () => { const h = [34, 22]; const o = [[8, 6], [6, 16], [6, 28], [8, 38]]; return { e: o.map(x => [x, h]), d: [h].concat(o) }; },
  'scatter-gather': () => { const a = [6, 22], b = [38, 22]; const m = [[22, 8], [22, 22], [22, 36]]; return { e: m.map(x => [a, x]).concat(m.map(x => [x, b])), d: [a, b].concat(m) }; },
  mesh: () => { const p = [[10, 10], [34, 10], [34, 34], [10, 34]]; return { e: [[p[0], p[1]], [p[1], p[2]], [p[2], p[3]], [p[3], p[0]], [p[0], p[2]], [p[1], p[3]]], d: p }; },
  lone: () => { const a = [10, 30], b = [34, 14]; return { e: [[a, b]], d: [a, b] }; },
  'gather-scatter': () => { const h = [22, 22]; const i = [[5, 8], [5, 36]], o = [[39, 8], [39, 36]]; return { e: i.map(x => [x, h]).concat(o.map(x => [h, x])), d: [h].concat(i, o) }; },
  stack: () => { const a = [[6, 10], [6, 34]], b = [[22, 10], [22, 34]], c = [[38, 10], [38, 34]]; return { e: [[a[0], b[0]], [a[1], b[1]], [a[0], b[1]], [b[0], c[0]], [b[1], c[1]]], d: a.concat(b, c) }; },
  bipartite: () => { const a = [[8, 10], [8, 34]], b = [[36, 10], [36, 34]]; return { e: [[a[0], b[0]], [a[0], b[1]], [a[1], b[0]], [a[1], b[1]]], d: a.concat(b) }; },
  'no named shape': () => GLYPH.lone(),
  other: () => { const p = [[8, 12], [22, 32], [36, 12]]; return { e: [[p[0], p[1]], [p[2], p[1]]], d: p }; }
};
function glyphSVG(shape, caught, size) {
  const g = (GLYPH[shape] || GLYPH.other)(); const col = caught ? '#2F7A45' : '#9A5B13';
  const sw = caught ? 2.6 : 2.4; const dash = caught ? '' : ' stroke-dasharray="0.1 4.2" stroke-linecap="round"';
  const L = g.e.map(e => { const [a, b] = e; const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy); const ux = dx / l, uy = dy / l; const tip = [b[0] - ux * 3.5, b[1] - uy * 3.5];
    const ah = caught ? '<path d="M' + tip[0].toFixed(1) + ' ' + tip[1].toFixed(1) + ' L' + (tip[0] - ux * 5 - uy * 3).toFixed(1) + ' ' + (tip[1] - uy * 5 + ux * 3).toFixed(1) + ' L' + (tip[0] - ux * 5 + uy * 3).toFixed(1) + ' ' + (tip[1] - uy * 5 - ux * 3).toFixed(1) + 'Z" fill="' + col + '"/>' : '';
    return '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + tip[0].toFixed(1) + '" y2="' + tip[1].toFixed(1) + '" stroke="' + col + '" stroke-width="' + sw + '"' + dash + '/>' + ah; }).join('');
  const P = g.d.map(p => '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="2.6" fill="#1F2A44"/>').join('');
  return '<svg viewBox="0 0 44 44" width="' + size + '" height="' + size + '" aria-hidden="true">' + L + P + '</svg>';
}

/* ---------- one group's own layout: its accounts on the map plane ---------- */
const RADIUS = 10;
function forceLayout(ids, edges, pinned, rnd) {
  const n = ids.length; const x = new Float64Array(n), y = new Float64Array(n); const fixed = new Uint8Array(n);
  ids.forEach((id, i) => { if (pinned && pinned[id]) { x[i] = pinned[id][0]; y[i] = pinned[id][1]; fixed[i] = 1; } else { const a = rnd() * 6.283, r = (pinned ? 1.6 : 0.6) * RADIUS * (0.5 + rnd()); x[i] = Math.cos(a) * r; y[i] = Math.sin(a) * r; } });
  const k = pinned ? RADIUS * 0.55 : RADIUS * 0.8; let temp = RADIUS;
  for (let it = 0; it < 220; it++) {
    const dx = new Float64Array(n), dy = new Float64Array(n);
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const ex = x[i] - x[j], ey = y[i] - y[j]; const d2 = ex * ex + ey * ey + 0.01; const f = k * k / d2; dx[i] += ex * f; dy[i] += ey * f; dx[j] -= ex * f; dy[j] -= ey * f; }
    edges.forEach(([a, b]) => { const ex = x[a] - x[b], ey = y[a] - y[b]; const d = Math.sqrt(ex * ex + ey * ey) + 1e-6; const f = d / k; dx[a] -= ex * f; dy[a] -= ey * f; dx[b] += ex * f; dy[b] += ey * f; });
    for (let i = 0; i < n; i++) { if (fixed[i]) continue; dx[i] -= x[i] * 0.03; dy[i] -= y[i] * 0.03; const m = Math.hypot(dx[i], dy[i]) + 1e-9, st = Math.min(m, temp); x[i] += dx[i] / m * st; y[i] += dy[i] / m * st; }
    temp = Math.max(0.05, temp * 0.97);
  }
  const out = {}; ids.forEach((id, i) => (out[id] = [x[i], y[i]])); return out;
}
function buildGroup(r) {
  const T = RINGS[r].map(id => BYID[id]).filter(t => !t.self).sort((a, b) => a.t - b.t);
  const acc = []; T.forEach(t => [t.from, t.to].forEach(a => { if (!acc.includes(a)) acc.push(a); }));
  const shape = ringShape(r); let pos = {};
  if (shape === 'cycle' && T.length) {
    /* walk the money from the first sender; a cycle sits on a circle in the order the money went round */
    const next = {}; T.forEach(t => { if (!next[t.from]) next[t.from] = t.to; });
    const order = [T[0].from]; while (order.length < acc.length && next[order[order.length - 1]] && !order.includes(next[order[order.length - 1]])) order.push(next[order[order.length - 1]]);
    acc.forEach(a => { if (!order.includes(a)) order.push(a); });
    order.forEach((a, k) => { const ang = Math.PI / 2 - k * 2 * Math.PI / order.length; pos[a] = [Math.cos(ang) * RADIUS, Math.sin(ang) * RADIUS]; });
  } else if (acc.length <= 2) {
    acc.forEach((a, k) => (pos[a] = [(k ? 1 : -1) * RADIUS * 0.7, 0]));
  } else {
    const ix = {}; acc.forEach((a, i) => (ix[a] = i)); const E = T.map(t => [ix[t.from], ix[t.to]]);
    pos = forceLayout(acc, E, null, seeded(+r + 11));
    let m = 0; acc.forEach(a => (m = Math.max(m, Math.hypot(pos[a][0], pos[a][1])))); const s = RADIUS / Math.max(m, 1e-6);
    acc.forEach(a => (pos[a] = [pos[a][0] * s, pos[a][1] * s]));
  }
  /* time window: whole days around the group */
  const t0 = Math.floor(T[0].t / 1440) * 1440, t1 = Math.max(t0 + 1440, Math.ceil((T[T.length - 1].t + 1) / 1440) * 1440);
  /* the neighborhood the bench gave the models, for the optional context traffic */
  const unit = UNITS.find(u => String(u.ring_id) === String(r)) || UNITS.find(u => (u.truth_ids || []).some(id => RINGS[r].includes(id)));
  let ctx = [];
  if (unit) {
    const inRing = new Set(RINGS[r]);
    ctx = (unit.rows || []).map(mkT).filter(t => !inRing.has(t.id) && !t.self && t.t >= t0 && t.t <= t1);
    const others = []; ctx.forEach(t => [t.from, t.to].forEach(a => { if (!(a in pos) && !others.includes(a)) others.push(a); }));
    if (others.length) {
      const all = acc.concat(others); const ix = {}; all.forEach((a, i) => (ix[a] = i));
      const placed = forceLayout(all, ctx.map(t => [ix[t.from], ix[t.to]]), pos, seeded(+r + 99));
      others.forEach(a => { let p = placed[a]; const d = Math.hypot(p[0], p[1]); const lim = RADIUS * 2.2; if (d > lim) p = [p[0] / d * lim, p[1] / d * lim]; pos[a] = p; });
    }
  }
  const DZ = 44 / ((t1 - t0) / 1440);   /* the group's window always spans the same depth */
  const z = t => (t - t0) / 1440 * DZ;
  const start = T[0].from; const ret = T.slice(1).find(t => t.to === start);
  return { r, shape, T, acc, pos, t0, t1, DZ, z, depth: z(t1), ctx, unit, start, ret };
}
const GROUPS = {}; const groupOf = r => (GROUPS[r] = GROUPS[r] || buildGroup(r));

/* ---------- three.js stage ---------- */
const C = { ink: 0x1F2A44, teal: 0x3E6E6A, amber: 0x9A5B13, ok: 0x2F7A45, paper: 0xF6F7F5 };
const stage = $('#stage'), cv = $('#cv');
let renderer = null;
try { if (!window.THREE) throw new Error('three.js did not load'); renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true }); }
catch (e) { $('#noGl').hidden = false; }
if (renderer) renderer.setClearColor(0xF6F7F5, 1);
const scene = renderer ? new THREE.Scene() : null;
const camera = renderer ? new THREE.OrthographicCamera(-1, 1, 1, -1, -2000, 2000) : null;
const TL_YAW = 68, TL_PITCH = 14;
const V = { tilt: TL_YAW, zoom: 1, panX: 0, panY: 0, cut: 1, W: 800, H: 500, upp: 0.05, ctx: false };
let dirty = true;
const S = { g: null, resolve: 0, objs: [] };   /* current group on stage, verdict color mix 0..1 */
const inkC = renderer ? new THREE.Color(C.ink) : null;
const CYL = renderer ? new THREE.CylinderGeometry(1, 1, 1, 8, 1, false) : null;
const CONE = renderer ? new THREE.ConeGeometry(1, 1, 10) : null;
const UP = renderer ? new THREE.Vector3(0, 1, 0) : null;
const tq = renderer ? new THREE.Quaternion() : null, tm = renderer ? new THREE.Matrix4() : null;
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
function setPiece(mesh, i, a, b, rad) {
  const d = v3(b[0] - a[0], b[1] - a[1], b[2] - a[2]); const len = d.length();
  if (len < 1e-6 || rad <= 0) { mesh.setMatrixAt(i, tm.makeScale(0, 0, 0)); return; }
  tq.setFromUnitVectors(UP, d.divideScalar(len));
  mesh.setMatrixAt(i, tm.compose(v3((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), tq, v3(rad, len, rad)));
}
function clearStage() { S.objs.forEach(o => { scene.remove(o); if (o.geometry && o.geometry !== CYL && o.geometry !== CONE) o.geometry.dispose(); if (o.material) o.material.dispose(); }); S.objs = []; }
function add(o) { scene.add(o); S.objs.push(o); o.frustumCulled = false; return o; }
const DOTS_PER = 7;
function stageGroup(r) {
  const g = groupOf(r); S.g = g; if (!renderer) return;
  clearStage();
  const P = a => g.pos[a];
  g.segs = g.T.map(t => ({ t, a: [P(t.from)[0], P(t.from)[1], g.z(t.t)], b: [P(t.to)[0], P(t.to)[1], g.z(t.t)], flagged: CUR.F.has(t.id) }));
  const nOk = g.segs.filter(s => s.flagged).length, nMiss = g.segs.length - nOk;
  /* misses never louder than catches: a third of the opacity, from the first frame */
  const missMat = () => new THREE.MeshBasicMaterial({ color: C.ink, transparent: true, opacity: 0.33, depthWrite: false });
  S.ok = add(new THREE.InstancedMesh(CYL, new THREE.MeshBasicMaterial({ color: C.ink }), Math.max(1, nOk)));
  S.okHead = add(new THREE.InstancedMesh(CONE, new THREE.MeshBasicMaterial({ color: C.ink }), Math.max(1, nOk)));
  S.miss = add(new THREE.InstancedMesh(CYL, missMat(), Math.max(1, nMiss * DOTS_PER)));
  S.missHead = add(new THREE.InstancedMesh(CONE, missMat(), Math.max(1, nMiss)));
  S.ok.count = S.okHead.count = nOk; S.miss.count = nMiss * DOTS_PER; S.missHead.count = nMiss;
  S.life = add(new THREE.InstancedMesh(CYL, new THREE.MeshBasicMaterial({ color: C.ink, transparent: true, opacity: 0.35, depthWrite: false }), 64));
  S.startLife = add(new THREE.InstancedMesh(CYL, new THREE.MeshBasicMaterial({ color: C.teal }), 1));
  /* account dots, one at each end of each transfer */
  S.dots = add(new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color: C.ink }), g.segs.length * 2));
  /* the map plane: a faint disc outline at the group's first day, where the accounts are laid out */
  const ring = []; for (let k = 0; k <= 64; k++) { const a = k / 64 * 6.283; ring.push(Math.cos(a) * RADIUS * 1.35, Math.sin(a) * RADIUS * 1.35, 0); }
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(ring, 3));
  S.plane = add(new THREE.Line(rg, new THREE.LineDashedMaterial({ color: C.ink, transparent: true, opacity: 0.28, dashSize: 0.9, gapSize: 0.9, depthWrite: false }))); S.plane.computeLineDistances();
  /* day ticks along the time axis: a short rule under the group at each midnight */
  const dt = []; for (let m = g.t0; m <= g.t1 + 1; m += 1440) { const z = g.z(m); dt.push(-RADIUS * 1.35, -RADIUS * 1.6, z, RADIUS * 1.35, -RADIUS * 1.6, z); }
  dt.push(0, -RADIUS * 1.6, 0, 0, -RADIUS * 1.6, g.depth);
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.Float32BufferAttribute(dt, 3));
  S.days = add(new THREE.LineSegments(dg, new THREE.LineBasicMaterial({ color: C.ink, transparent: true, opacity: 0.18, depthWrite: false })));
  /* the group's neighborhood traffic, optional, at 10 percent */
  const cp = []; g.ctx.forEach(t => { const a = P(t.from), b = P(t.to); if (a && b) cp.push({ z: g.z(t.t), v: [a[0], a[1], g.z(t.t), b[0], b[1], g.z(t.t)] }); });
  cp.sort((x, y) => x.z - y.z); g.ctxZ = cp.map(c => c.z);
  const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(cp.flatMap(c => c.v), 3));
  S.ctx = add(new THREE.LineSegments(cg, new THREE.LineBasicMaterial({ color: C.ink, transparent: true, opacity: 0.1, depthWrite: false })));
  buildLabels(g);
  dirty = true;
}
/* everything that depends on the pixel size or on the scrub is set here, every frame the stage changes */
function layoutStage() {
  const g = S.g; if (!g || !renderer) return;
  const px = V.upp; const R = 1.9 * px;          /* segments 3.8 px thick on screen, whatever the zoom */
  const cutT = g.t0 + V.cut * (g.t1 - g.t0); const grow = Math.max(30, (g.t1 - g.t0) * 0.04);
  const swept = !CUR.perRing[g.r].found; const colOk = inkC.clone().lerp(new THREE.Color(swept ? 0x8DB49A : C.ok), S.resolve), colMiss = inkC.clone().lerp(new THREE.Color(C.amber), S.resolve);
  S.ok.material.color.copy(colOk); S.okHead.material.color.copy(colOk); S.miss.material.color.copy(colMiss); S.missHead.material.color.copy(colMiss);
  let io = 0, im = 0, imh = 0, id = 0;
  g.segs.forEach(s => {
    s.f = easeOut((cutT - s.t.t) / grow); const f = s.f;
    const len = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]) || 1; const ux = (s.b[0] - s.a[0]) / len, uy = (s.b[1] - s.a[1]) / len;
    const inset = 6 * px;   /* stop short of the receiver's dot so the arrowhead shows */
    const full = [s.b[0] - ux * inset, s.b[1] - uy * inset, s.z0 = s.a[2]];
    const tip = [s.a[0] + (full[0] - s.a[0]) * f, s.a[1] + (full[1] - s.a[1]) * f, s.a[2]];
    const head = (mesh, i) => { if (f <= 0) { mesh.setMatrixAt(i, tm.makeScale(0, 0, 0)); return; } const hl = 11 * px, hr = 4.6 * px; const base = [tip[0] - ux * hl, tip[1] - uy * hl, tip[2]]; setPiece(mesh, i, base, tip, hr); };
    if (s.flagged) { const end = [tip[0] - ux * 8 * px * (f > 0 ? 1 : 0), tip[1] - uy * 8 * px * (f > 0 ? 1 : 0), tip[2]]; setPiece(S.ok, io, s.a, f > 0 ? end : s.a, R); head(S.okHead, io); io++; }
    else {
      for (let k = 0; k < DOTS_PER; k++) { const f0 = k / DOTS_PER, f1 = f0 + 0.32 / DOTS_PER * 2; const vis = f >= f1; const p = q => [s.a[0] + (full[0] - s.a[0]) * q, s.a[1] + (full[1] - s.a[1]) * q, s.a[2]]; setPiece(S.miss, im++, p(f0), p(Math.min(f1, 0.92)), vis ? R : 0); }
      head(S.missHead, imh++);
    }
    const dr = 3.6 * px; [[s.a, f > 0 ? 1 : 0], [s.b, f >= 1 ? 1 : 0]].forEach(([p, on]) => S.dots.setMatrixAt(id++, tm.compose(v3(p[0], p[1], p[2]), tq.identity(), v3(dr * on, dr * on, dr * on))));
  });
  [S.ok, S.okHead, S.miss, S.missHead, S.dots].forEach(m => (m.instanceMatrix.needsUpdate = true));
  /* lifelines: the same account from one transfer to its next, inside the group */
  const byAcc = {}; g.segs.forEach(s => { if (s.f <= 0) return; (byAcc[s.t.from] = byAcc[s.t.from] || []).push(s.a); if (s.f >= 1) (byAcc[s.t.to] = byAcc[s.t.to] || []).push(s.b); });
  let il = 0; S.startLife.setMatrixAt(0, tm.makeScale(0, 0, 0));
  Object.keys(byAcc).forEach(a => {
    const L = byAcc[a].sort((p, q) => p[2] - q[2]);
    if (a === g.start && L.length > 1) { setPiece(S.startLife, 0, L[0], L[L.length - 1], 1.3 * px); return; }
    for (let k = 1; k < L.length && il < 64; k++) if (L[k][2] - L[k - 1][2] > 1e-3) setPiece(S.life, il++, L[k - 1], L[k], 0.6 * px);
  });
  for (; il < 64; il++) S.life.setMatrixAt(il, tm.makeScale(0, 0, 0));
  S.life.instanceMatrix.needsUpdate = true; S.startLife.instanceMatrix.needsUpdate = true;
  S.ctx.visible = V.ctx; if (V.ctx) S.ctx.geometry.setDrawRange(0, ub(g.ctxZ, g.z(cutT)) * 2);
}
const ub = (arr, z) => { let lo = 0, hi = arr.length; while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m] <= z + 1e-6) lo = m + 1; else hi = m; } return lo; };

/* ---------- camera: yaw turns time from hidden (map) to left-to-right (timeline); a little pitch comes with it so the map plane stays readable ---------- */
function resize() { if (!renderer) return; V.W = stage.clientWidth || 800; V.H = stage.clientHeight || 500; renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.setSize(V.W, V.H, false); dirty = true; }
function placeCamera() {
  const g = S.g; if (!g) return;
  const th = V.tilt * Math.PI / 180, ph = Math.min(1, V.tilt / TL_YAW) * TL_PITCH * Math.PI / 180;
  const dir = v3(-Math.sin(th) * Math.cos(ph), Math.sin(ph), Math.cos(th) * Math.cos(ph));
  const ctr = v3(0, 0, g.depth / 2);
  camera.position.copy(ctr).addScaledVector(dir, 300); camera.up.set(0, 1, 0); camera.lookAt(ctr); camera.updateMatrixWorld();
  const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0), up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
  let hw = 0, hh = 0; const E = RADIUS * (V.ctx ? 2.2 : 1.35);
  [-E, E].forEach(x => [-RADIUS * 1.6, E].forEach(y => [0, g.depth].forEach(z => { const d = v3(x, y, z).sub(ctr); hw = Math.max(hw, Math.abs(d.dot(right))); hh = Math.max(hh, Math.abs(d.dot(up))); })));
  hw = hw * 1.08 + 2; hh = hh * 1.12 + 3;
  const asp = V.W / V.H; if (hw / hh < asp) hw = hh * asp; else hh = hw / asp; hw /= V.zoom; hh /= V.zoom;
  const off = right.clone().multiplyScalar(V.panX).addScaledVector(up, V.panY);
  camera.position.add(off); camera.left = -hw; camera.right = hw; camera.top = hh; camera.bottom = -hh;
  camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  V.upp = 2 * hw / V.W;
}
const pv = renderer ? new THREE.Vector3() : null;
function project(x, y, z) { pv.set(x, y, z).project(camera); return { x: (pv.x + 1) / 2 * V.W, y: (1 - pv.y) / 2 * V.H }; }

/* ---------- labels on the stage (HTML, placed by projection) ---------- */
const labEl = $('#dayLabels'); let LABS = [];
function buildLabels(g) {
  labEl.innerHTML = ''; LABS = [];
  for (let m = g.t0; m < g.t1; m += 1440) { const s = document.createElement('span'); s.className = 'day'; s.textContent = fmtDay(m); labEl.appendChild(s); LABS.push({ el: s, p: [0, -RADIUS * 1.6, g.z(m + 720)], day: true }); }
  const pl = document.createElement('span'); pl.className = 'plane'; pl.textContent = 'map plane, ' + fmtDay(g.t0); labEl.appendChild(pl); LABS.push({ el: pl, p: [-RADIUS * 0.95, RADIUS * 0.95, 0], when: -1e12 });
  const st = document.createElement('span'); st.className = 'acct start'; st.innerHTML = 'starts here<br><span class="fig">' + esc(g.start) + '</span>'; labEl.appendChild(st);
  LABS.push({ el: st, p: [g.pos[g.start][0], g.pos[g.start][1], g.z(g.T[0].t)], when: g.T[0].t });
  if (g.ret) { const rt = document.createElement('span'); rt.className = 'acct ret'; rt.innerHTML = 'back at the start<br><span class="fig">' + esc(fmtTime(g.ret.t)) + '</span>'; labEl.appendChild(rt); LABS.push({ el: rt, p: [g.pos[g.start][0], g.pos[g.start][1], g.z(g.ret.t)], when: g.ret.t + 1, ret: true }); }
}
function placeLabels() {
  const g = S.g; if (!g) return; const cutT = g.t0 + V.cut * (g.t1 - g.t0);
  const dayVis = clamp01((V.tilt - 20) / 30);
  const gap = Math.abs(project(0, 0, g.DZ).x - project(0, 0, 0).x); const every = gap > 46 ? 1 : gap > 24 ? 2 : 4;
  let di = 0;
  LABS.forEach(l => {
    const q = project(l.p[0], l.p[1], l.p[2]); l.el.style.left = q.x + 'px'; l.el.style.top = q.y + 'px';
    if (l.day) { const show = dayVis > 0 && di++ % every === 0; l.el.style.display = show ? '' : 'none'; l.el.style.opacity = dayVis; }
    else l.el.style.display = cutT >= l.when ? '' : 'none';
  });
  $('#viewName').textContent = V.tilt < 8 ? 'Map: who paid whom (time hidden)' : V.tilt >= TL_YAW - 2 ? 'Timeline: days run left to right' : 'Tilting';
}

/* ---------- render loop: draws only when something changed or an animation runs ---------- */
const TW = [];
function tween(ms, from, to, set, done, ease) { if (!ms) { set(to); if (done) done(); return; } TW.push({ t0: performance.now(), ms, from, to, set, done, ease: ease || easeOut }); }
function frame(now) {
  for (let i = TW.length - 1; i >= 0; i--) { const w = TW[i]; const k = Math.min(1, (now - w.t0) / w.ms); w.set(w.from + (w.to - w.from) * w.ease(k)); if (k >= 1) { TW.splice(i, 1); if (w.done) w.done(); } }
  if (renderer && S.g && (dirty || TW.length)) { placeCamera(); layoutStage(); placeLabels(); renderer.render(scene, camera); dirty = false; }
  requestAnimationFrame(frame);
}

/* ---------- the run of one group: extrude through its days, then resolve to the model's verdict ---------- */
let RUN = 0;   /* bumps on every new run so stale callbacks stop */
const lin = t => t;
function setCut(c) { V.cut = c; $('#cut').value = c; $('#cutRead').textContent = S.g ? 'through ' + fmtTime(S.g.t0 + c * (S.g.t1 - S.g.t0)) : ''; dirty = true; }
function setResolve(k) { S.resolve = k; dirty = true; }
function runGroup(r, opts) {
  opts = opts || {}; const my = ++RUN; TW.length = 0; if (opts.keepTilt !== false) { /* tilt stays */ }
  selected = r; renderIcons(); stageGroup(r); renderCaption(); setResolve(0);
  const g = S.g; const ms = D(Math.min(3600, 700 + 330 * g.T.length));
  setCut(0);
  tween(ms, 0, 1, setCut, () => { if (my !== RUN) return; resolveGroup(my, opts.done); }, lin);
}
function resolveGroup(my, done) {
  const r = selected; const pr = CUR.perRing[r];
  tween(D(420), 0, 1, setResolve, () => {
    if (my !== RUN) return;
    if (pr.found) addCard(r, !RM, () => { if (my === RUN && done) setTimeout(() => { if (my === RUN) done(); }, D(450)); });
    else if (done) setTimeout(() => { if (my === RUN) done(); }, D(300));
  });
}

/* ---------- roster ---------- */
const cardsEl = $('#cards');
function money(r) {
  const m = {}; RINGS[r].forEach(id => { const t = BYID[id]; m[t.cur] = (m[t.cur] || 0) + (+t.paid || 0); });
  const cur = Object.keys(m).sort((a, b) => m[b] - m[a]);
  if (!cur.length) return '';
  const CODE = { 'US Dollar': 'USD', Euro: 'EUR', 'UK Pound': 'GBP', Yuan: 'CNY', Yen: 'JPY', Ruble: 'RUB', 'Swiss Franc': 'CHF', 'Australian Dollar': 'AUD', 'Canadian Dollar': 'CAD', Rupee: 'INR', 'Mexican Peso': 'MXN', 'Brazil Real': 'BRL', Shekel: 'ILS', 'Saudi Riyal': 'SAR', Bitcoin: 'BTC' };
  return fmtN(Math.round(m[cur[0]])) + ' ' + (CODE[cur[0]] || cur[0]) + (cur.length > 1 ? ' + ' + (cur.length - 1) + (cur.length > 2 ? ' currencies' : ' currency') : '') + ' moved';
}
function addCard(r, fly, done) {
  if (cardsEl.querySelector('[data-r="' + r + '"]')) { if (done) done(); return; }
  const empty = cardsEl.querySelector('.empty'); if (empty) empty.remove();
  const el = document.createElement('button'); el.type = 'button'; el.className = 'ccard'; el.dataset.r = r; el.title = 'Put this group back on the stage';
  el.innerHTML = '<span class="thumb' + (fly ? ' pending' : '') + '">' + glyphSVG(ringShape(r), true, 40) + '</span><span class="cname">' + esc(ringName(r)) + '</span><span class="cmoney">' + esc(money(r)) + '</span>';
  el.onclick = () => { stopTour(); runGroup(r); };
  cardsEl.appendChild(el); updateRoster(); el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  if (!fly || !renderer) { el.querySelector('.thumb').classList.remove('pending'); if (done) done(); return; }
  /* a copy of the shape leaves the stage where the group sits and lands in its card */
  const sr = stage.getBoundingClientRect(); let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
  S.g.segs.forEach(s => [s.a, s.b].forEach(p => { const q = project(p[0], p[1], p[2]); minx = Math.min(minx, q.x); maxx = Math.max(maxx, q.x); miny = Math.min(miny, q.y); maxy = Math.max(maxy, q.y); }));
  const size = Math.max(60, Math.min(260, Math.max(maxx - minx, maxy - miny)));
  const fl = document.createElement('div'); fl.className = 'flyer'; fl.innerHTML = glyphSVG(ringShape(r), true, 100);
  const x0 = sr.left + (minx + maxx) / 2 - size / 2, y0 = sr.top + (miny + maxy) / 2 - size / 2, s0 = size / 100;
  document.body.appendChild(fl);
  const tr = el.querySelector('.thumb').getBoundingClientRect(); const s1 = 40 / 100;
  const anim = fl.animate([{ transform: 'translate(' + x0 + 'px,' + y0 + 'px) scale(' + s0 + ')', opacity: 0.95 }, { transform: 'translate(' + tr.left + 'px,' + tr.top + 'px) scale(' + s1 + ')', opacity: 1 }], { duration: 700, easing: 'cubic-bezier(0.22, 0.7, 0.2, 1)', fill: 'forwards' });
  const fin = () => { fl.remove(); const th = el.querySelector('.thumb'); if (th) th.classList.remove('pending'); if (done) done(); };
  anim.onfinish = fin; anim.oncancel = fin;
}
function updateRoster() {
  const n = cardsEl.querySelectorAll('.ccard').length;
  $('#rosterCount').textContent = n + ' of ' + CUR.found;
  if (!n) cardsEl.innerHTML = '<p class="empty">' + (CUR.found ? 'Each caught ring drops in here after it draws itself. Play walks through all ' + CUR.found + '.' : 'This model caught none of IBM\'s rings in this slice.') + '</p>';
}

/* ---------- icon row: IBM's 20 groups ---------- */
let selected = null;
function renderIcons() {
  const row = $('#icons'); const n = CUR.found;
  $('#iconHead').innerHTML = 'IBM\'s ' + NRINGS + ' laundering groups: <b class="okc">' + n + ' caught</b> <span class="missc">' + (NRINGS - n) + ' missed</span>';
  const single = RING_IDS.filter(r => ringBase(r) === 'no named shape' || RINGS[r].length === 1); const shaped = RING_IDS.filter(r => !single.includes(r));
  const tip = r => esc(ringName(r)) + ': ' + (CUR.perRing[r].found ? 'caught' : 'missed') + ', ' + CUR.perRing[r].hit + ' of ' + CUR.perRing[r].n + ' transfers flagged';
  let html = shaped.map(r => { const pr = CUR.perRing[r]; return '<button type="button" class="icon' + (pr.found ? ' ok' : ' miss') + (r === selected ? ' sel' : '') + '" data-r="' + r + '" aria-pressed="' + (r === selected) + '" title="' + tip(r) + '">' + glyphSVG(ringShape(r), pr.found, 40) + '<span>' + esc(ringName(r).replace(/,.*$/, '')) + '</span></button>'; }).join('');
  if (single.length) {
    const k = single.filter(r => CUR.perRing[r].found).length;
    html += '<div class="icon singles"><div class="marks">' + single.map(r => { const pr = CUR.perRing[r]; return '<button type="button" class="mark' + (r === selected ? ' sel' : '') + '" data-r="' + r + '" aria-pressed="' + (r === selected) + '" title="' + tip(r) + '"><svg viewBox="0 0 14 30" width="14" height="30"><line x1="7" y1="4" x2="7" y2="26" stroke="' + (pr.found ? '#2F7A45' : '#9A5B13') + '" stroke-width="' + (pr.found ? 3 : 2.6) + '"' + (pr.found ? '' : ' stroke-dasharray="0.1 4.4" stroke-linecap="round"') + '/></svg></button>'; }).join('') + '</div><span>Single transfers: ' + k + ' of ' + single.length + ' caught</span></div>';
  }
  row.innerHTML = html;
  row.querySelectorAll('[data-r]').forEach(b => (b.onclick = () => { stopTour(); runGroup(b.dataset.r); }));
}
function renderCaption() {
  const g = S.g, pr = CUR.perRing[g.r];
  $('#capShape').textContent = ringName(g.r);
  $('#capFacts').innerHTML = g.T.length + ' transfer' + (g.T.length > 1 ? 's' : '') + ' among ' + g.acc.length + ' accounts, ' + esc(fmtDay(g.T[0].t)) + (fmtDay(g.T[0].t) !== fmtDay(g.T[g.T.length - 1].t) ? ' to ' + esc(fmtDay(g.T[g.T.length - 1].t)) : '') +
    '. <b class="' + (pr.found ? 'okc' : 'missc') + '">' + (pr.found ? 'Caught' : 'Missed') + '</b>: ' + pr.hit + ' of ' + pr.n + ' flagged.';
  const note = !pr.found && pr.hit / pr.n >= 0.5 ? 'Flagged, but with too many wrong flags around it to count as caught. ' : !pr.found && pr.hit ? 'Partly flagged: fewer than half of its transfers. ' : '';
  $('#capWhy').textContent = note + (pr.run ? 'Model\'s why: ' + firstSentence(pr.run.why, 170) : '');
  $('#ctxToggle').disabled = !g.ctx.length;
}

/* ---------- model picker and the result copy ---------- */
let CUR = null;
const pickEl = $('#modelPick');
(function fillPicker() {
  const fams = {}; MODEL_IDS.forEach(id => { const m = MODELS.find(x => x.id === id); (fams[m.family] = fams[m.family] || []).push(id); });
  const FN = { anthropic: 'Anthropic', openai: 'OpenAI', deepseek: 'DeepSeek', mistral: 'Mistral', moonshot: 'Moonshot', xai: 'xAI', 'z-ai': 'Z.ai' };
  pickEl.innerHTML = Object.keys(fams).map(f => '<optgroup label="' + esc(FN[f] || f) + '">' + fams[f].map(id => '<option value="' + esc(id) + '">' + esc(prettyName(id)) + '</option>').join('') + '</optgroup>').join('');
})();
function renderVersions() {
  $('#versRow').innerHTML = versionsOf(CUR.id).map(v => '<button type="button" class="chip" data-v="' + esc(v) + '" aria-pressed="' + (v === CUR.version) + '">' + esc(v) + '</button>').join('');
  $('#versRow').querySelectorAll('button').forEach(b => (b.onclick = () => selectModel(CUR.id, b.dataset.v)));
}
function renderResult() {
  const m = CUR, nT = TRUTH.size;
  $('#headline').innerHTML = esc(m.pretty) + ' ' + esc(m.version) + ' caught <b>' + m.found + '</b> of IBM\'s ' + NRINGS + ' laundering rings and traced <b>' + m.traced + '</b> of ' + nT + ' laundering transfers; it raised <b>' + m.alarms + '</b> alarm' + (m.alarms === 1 ? '' : 's') + ' on ' + (m.nOrd ? m.nOrd + ' ' : '') + 'ordinary neighborhoods, <b>' + m.alarmsInRing + '</b> of them on accounts that sit inside a ring.';
  /* the closing figure is the bench's own account-level count (models[].account_level), the definition every page shares */
  const al = m.account_level;
  if (al && al.flagged_accounts) $('#strong').innerHTML = '<b>' + fmtN(al.flagged_accounts_in_a_ring) + '</b> of the ' + fmtN(al.flagged_accounts) + ' accounts it flagged sit inside an IBM ring.';
  else { const pt = m.traced / Math.max(1, nT); $('#strong').innerHTML = '<b>' + Math.round(pt * 100) + '</b> percent of IBM\'s laundering transfers, traced.'; }
}
function selectModel(id, ver, first) {
  const m = MODELS.find(x => x.id === id && x.version === ver) || MODELS.find(x => x.id === id); if (!m) return;
  stopTour(); CUR = m; pickEl.value = m.id; cardsEl.innerHTML = '';
  renderVersions(); renderResult(); updateRoster();
  if (first || selected == null) { selected = first; }
  runGroup(selected);
}
pickEl.onchange = () => { const vs = versionsOf(pickEl.value); selectModel(pickEl.value, CUR && vs.includes(CUR.version) ? CUR.version : vs[vs.length - 1]); };

/* ---------- Play: walk through the caught groups one by one ---------- */
const TOUR = { on: false };
function stopTour() { TOUR.on = false; $('#btnPlay').textContent = 'Play the caught rings'; }
$('#btnPlay').onclick = () => {
  if (TOUR.on) { stopTour(); return; }
  const list = RING_IDS.filter(r => CUR.perRing[r].found); if (!list.length) return;
  if (RM) { list.forEach(r => addCard(r, false)); runGroup(list[list.length - 1]); return; }
  TOUR.on = true; $('#btnPlay').textContent = 'Stop';
  const shown = new Set([...cardsEl.querySelectorAll('.ccard')].map(c => c.dataset.r));
  const todo = list.filter(r => !shown.has(r)); if (!todo.length) { cardsEl.innerHTML = ''; updateRoster(); todo.push(...list); }
  const step = () => { if (!TOUR.on) return; const r = todo.shift(); if (r == null) { stopTour(); return; } runGroup(r, { done: step }); };
  step();
};

/* ---------- controls ---------- */
const tiltEl = $('#tilt'), cutEl = $('#cut');
function setTilt(t) { V.tilt = t; tiltEl.value = Math.round(t); $('#btnMap').setAttribute('aria-pressed', String(t < 1)); $('#btnTime').setAttribute('aria-pressed', String(t >= TL_YAW - 1)); dirty = true; }
function tiltTo(t) { for (let i = TW.length - 1; i >= 0; i--) if (TW[i].set === setTilt) TW.splice(i, 1); tween(D(400), V.tilt, t, setTilt); }
$('#btnMap').onclick = () => tiltTo(0);
$('#btnTime').onclick = () => tiltTo(TL_YAW);
tiltEl.max = TL_YAW; tiltEl.oninput = () => setTilt(+tiltEl.value);
cutEl.oninput = () => { stopTour(); RUN++; for (let i = TW.length - 1; i >= 0; i--) if (TW[i].set === setCut || TW[i].set === setResolve) TW.splice(i, 1); setCut(+cutEl.value); setResolve(V.cut >= 0.999 ? 1 : 0); };
$('#ctxToggle').onchange = e => { V.ctx = e.target.checked; dirty = true; };
let drag = null;
stage.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, px: V.panX, py: V.panY }; stage.classList.add('dragging'); stage.setPointerCapture(e.pointerId); });
stage.addEventListener('pointerup', () => { drag = null; stage.classList.remove('dragging'); });
stage.addEventListener('pointermove', e => { if (drag) { V.panX = drag.px - (e.clientX - drag.x) * V.upp; V.panY = drag.py + (e.clientY - drag.y) * V.upp; dirty = true; hideHover(); return; } hoverAt(e); });
stage.addEventListener('pointerleave', hideHover);
stage.addEventListener('wheel', e => { e.preventDefault(); V.zoom = Math.min(6, Math.max(0.6, V.zoom * Math.exp(-e.deltaY * 0.0015))); dirty = true; }, { passive: false });
stage.addEventListener('dblclick', () => { V.zoom = 1; V.panX = 0; V.panY = 0; dirty = true; });
window.addEventListener('resize', resize);

/* ---------- hover: one transfer of the group ---------- */
const hov = $('#hover');
function hideHover() { hov.hidden = true; }
function hoverAt(e) {
  if (!S.g || !S.g.segs || !renderer) return;
  const rect = stage.getBoundingClientRect(); const mx = e.clientX - rect.left, my = e.clientY - rect.top;
  let best = null, bd = 10;
  S.g.segs.forEach(s => { if (!(s.f > 0)) return; const a = project(...s.a), b = project(...s.b); const vx = b.x - a.x, vy = b.y - a.y, l2 = vx * vx + vy * vy; const f = l2 ? clamp01(((mx - a.x) * vx + (my - a.y) * vy) / l2) : 0; const d = Math.hypot(a.x + vx * f - mx, a.y + vy * f - my); if (d < bd) { bd = d; best = s; } });
  if (!best) { hideHover(); return; }
  const t = best.t;
  hov.innerHTML = '<div class="t fig">' + esc(t.id) + '</div><div>' + esc(fmtTime(t.t)) + ', ' + esc(t.fmt) + '</div><div class="fig">' + esc(t.from) + ' to ' + esc(t.to) + '</div><div class="fig">' + esc(fmtN(t.paid)) + ' ' + esc(t.cur) + '</div><div class="' + (best.flagged ? 'okc' : 'missc') + '">' + (best.flagged ? 'Flagged by the model; IBM labels it laundering.' : 'IBM labels it laundering; the model did not flag it.') + '</div>';
  hov.hidden = false; const w = hov.offsetWidth, h = hov.offsetHeight; let x = e.clientX + 16, y = e.clientY + 14;
  if (x + w > innerWidth - 8) x = e.clientX - w - 16; if (y + h > innerHeight - 8) y = innerHeight - h - 8;
  hov.style.left = x + 'px'; hov.style.top = y + 'px';
}

/* ---------- start ---------- */
if (SAMPLE.length) $('#badges').innerHTML = '<span class="badge sample" title="A data file was missing; the page made up a small network so it still reads">SAMPLE ' + esc(SAMPLE.join(' and ')) + '</span>';
resize();
const qm = Q.get('model'), qv = Q.get('v');
const def = (qm && MODELS.find(m => m.id === qm && (!qv || m.version === qv))) || MODELS.find(m => m.id === 'anthropic/claude-sonnet-5-5' && m.version === 'v4') || MODELS.slice().sort((a, b) => b.found - a.found)[0];
/* first group on stage: a cycle this model caught, the one whose hops follow each other most closely in time */
const chrono = r => { const T = groupOf(r).T; let k = 0; for (let i = 1; i < T.length; i++) if (T[i].from === T[i - 1].to) k++; return k + (groupOf(r).ret ? 5 : 0); };
const cycles = RING_IDS.filter(r => ringShape(r) === 'cycle' && def.perRing[r].found).sort((a, b) => chrono(b) - chrono(a));
const firstGroup = Q.get('group') && RINGS[Q.get('group')] ? Q.get('group') : (cycles[0] || RING_IDS.find(r => def.perRing[r].found) || RING_IDS[0]);
if (Q.get('view') === 'map') setTilt(0); else if (Q.has('tilt')) setTilt(Math.min(TL_YAW, +Q.get('tilt'))); else setTilt(TL_YAW);
selectModel(def.id, def.version, firstGroup);
requestAnimationFrame(frame);
})();
