/* Rings in time: a three-dimensional variant of the Rings bench graph.
   Accounts sit on a plane (a small force layout written here); the third axis is time.
   Inputs (all optional, a labeled SAMPLE replaces any that is missing):
     window.SLICE  (../../../data/slice.js)  transfers, IBM's labels (key), ring_meta
     window.BENCH  (../../../data/bench_results.js)  models[] and runs[]
     window.UNITS  (../../../data/units.js)  the 60 neighborhoods
   Scoring follows the flat page (ui/app.js): a model's flags are the union of flagged_transfer_ids over its runs;
   an IBM group counts as caught when at least half of its labeled transfers are flagged. */
(function () {
'use strict';

const RM = (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) || /[?&]still/.test(location.search);
const D = ms => (RM ? 0 : ms);
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const easeOut = t => 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 3);
function seeded(seed) { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
const fmtN = n => Number(n).toLocaleString('en-US');
const firstSentence = s => { s = String(s || '').trim(); const m = s.match(/^.*?[.!?](\s|$)/); s = (m ? m[0] : s).trim(); return s.length > 240 ? s.slice(0, 237).replace(/\s+\S*$/, '') + '...' : s; };
const Q = new URLSearchParams(location.search);

/* ---------- SAMPLE fallbacks (only used when a data file is missing) ---------- */
function sampleSlice() {
  const rnd = seeded(7); const T = [], key = {}; let id = 0;
  const acc = i => 'S' + String(i).padStart(4, '0');
  const ts = m => { const d = new Date(Date.UTC(2022, 8, 1) + m * 60000); return d.toISOString().slice(0, 16).replace(/-/g, '/').replace('T', ' '); };
  const add = (f, t, m, ring) => { id++; const tid = 'T' + String(id).padStart(4, '0'); T.push([tid, ts(m), acc(f), acc(t), Math.round(200 + rnd() * 9000), 'US Dollar', 'ACH', '001', '002']); key[tid] = ring >= 0 ? [1, ring] : [0, -1]; };
  for (let i = 0; i < 160; i++) { const a = Math.floor(rnd() * 60), b = Math.floor(rnd() * 60); if (a !== b) add(a, b, Math.floor(rnd() * 14400), -1); }
  [[100, 101, 2], [101, 102, 3], [102, 103, 4], [103, 100, 5]].forEach(r => add(r[0], r[1], r[2] * 1440 + 300, 0));
  for (let k = 0; k < 6; k++) add(110, 111 + k, 6 * 1440 + k * 50, 1);
  add(120, 121, 7 * 1440, 2); add(121, 122, 8 * 1440 + 600, 2);
  T.sort((a, b) => a[1] < b[1] ? -1 : 1);
  return { sample: true, transfers: T, key, ring_meta: { 0: { shape: 'cycle', n: 4 }, 1: { shape: 'fan-out', n: 6 }, 2: { shape: 'chain', n: 2 } } };
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
  const runs = mk('v1', 0.4).concat(mk('v2', 1));
  return { sample: true, versions: { v1: 'SAMPLE', v2: 'SAMPLE' }, models: [{ id: 'sample/model', family: 'sample', version: 'v1' }, { id: 'sample/model', family: 'sample', version: 'v2' }], runs };
}

/* ---------- data ---------- */
const SAMPLE = [];
const SL = window.SLICE && window.SLICE.transfers ? window.SLICE : (SAMPLE.push('transfers'), sampleSlice());
const toMin = s => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10), +s.slice(11, 13), +s.slice(14, 16)) / 60000;
const TR = SL.transfers.map((r, i) => ({ i, id: r[0], ts: r[1], from: r[2], to: r[3], paid: r[4], cur: r[5], fmt: r[6], t: toMin(r[1]),
  label: (SL.key[r[0]] || [0, -1])[0], ring: (SL.key[r[0]] || [0, -1])[1], self: r[2] === r[3] }));
const BYID = {}; TR.forEach(t => (BYID[t.id] = t));
const BENCH = window.BENCH && window.BENCH.models ? window.BENCH : (SAMPLE.push('model results'), sampleBench(TR));
const UNITS = window.UNITS && window.UNITS.units ? window.UNITS.units : [];
const UNIT = {}; UNITS.forEach(u => (UNIT[u.id] = u));
const TRUTH = new Set(TR.filter(t => t.label).map(t => t.id));
const RINGS = {}; TR.forEach(t => { if (t.label) (RINGS[t.ring] = RINGS[t.ring] || []).push(t.id); });
const RING_IDS = Object.keys(RINGS).sort((a, b) => +a - +b);
const NRINGS = RING_IDS.length;
const ringShape = r => (SL.ring_meta && SL.ring_meta[r] && SL.ring_meta[r].shape) || 'other';

/* time: ten days, Sep 1 to Sep 10, at full depth; the few transfers after Sep 10 share one compressed slab */
const DAY = 1440, DZ = 11, TAILZ = 7;
const T0 = Date.UTC(2022, 8, 1) / 60000, TAIL0 = T0 + 10 * DAY;
const TEND = Math.max(TAIL0 + 1, ...TR.map(t => t.t));
const NTAIL = TR.filter(t => t.t >= TAIL0).length;
const zOf = t => { const d = (t - T0) / DAY; return d <= 10 ? Math.max(0, d) * DZ : 10 * DZ + Math.min(1, (t - TAIL0) / (TEND - TAIL0)) * TAILZ; };
const cutToZ = c => (c <= 10 ? c * DZ : 10 * DZ + (c - 10) * TAILZ);
const DEPTH = 10 * DZ + TAILZ;
TR.forEach(t => (t.z = zOf(t.t)));

/* ---------- layout: components, a Fruchterman-Reingold force layout per component, shelf packing ---------- */
const nodeIdx = {}, nodes = [];
const nodeOf = a => { if (!(a in nodeIdx)) { nodeIdx[a] = nodes.length; nodes.push({ a, x: 0, y: 0 }); } return nodeIdx[a]; };
TR.forEach(t => { t.u = nodeOf(t.from); t.v = nodeOf(t.to); });
const adj = nodes.map(() => new Set());
TR.forEach(t => { if (t.u !== t.v) { adj[t.u].add(t.v); adj[t.v].add(t.u); } });
(function layout() {
  const rnd = seeded(20261017); const seen = new Uint8Array(nodes.length); const comps = [];
  for (let s = 0; s < nodes.length; s++) {
    if (seen[s]) continue; const c = [s]; seen[s] = 1;
    for (let q = 0; q < c.length; q++) adj[c[q]].forEach(n => { if (!seen[n]) { seen[n] = 1; c.push(n); } });
    comps.push(c);
  }
  const placed = comps.map(ids => {
    const n = ids.length; const x = new Float64Array(n), y = new Float64Array(n);
    if (n === 1) return { ids, x, y, r: 0.5 };
    const loc = new Map(ids.map((id, i) => [id, i])); const E = [];
    ids.forEach((id, i) => adj[id].forEach(j => { const k = loc.get(j); if (k > i) E.push(i, k); }));
    const s = Math.sqrt(n); for (let i = 0; i < n; i++) { x[i] = (rnd() - 0.5) * s; y[i] = (rnd() - 0.5) * s; }
    const dx = new Float64Array(n), dy = new Float64Array(n); let temp = Math.max(1, s / 3);
    const iters = n > 300 ? 170 : 140;
    for (let it = 0; it < iters; it++) {
      dx.fill(0); dy.fill(0);
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
        const ex = x[i] - x[j], ey = y[i] - y[j]; const d2 = ex * ex + ey * ey + 0.01; const f = 1 / d2;
        dx[i] += ex * f; dy[i] += ey * f; dx[j] -= ex * f; dy[j] -= ey * f;
      }
      for (let e = 0; e < E.length; e += 2) {
        const a = E[e], b = E[e + 1]; const ex = x[a] - x[b], ey = y[a] - y[b]; const d = Math.sqrt(ex * ex + ey * ey) + 1e-6;
        dx[a] -= ex * d; dy[a] -= ey * d; dx[b] += ex * d; dy[b] += ey * d;
      }
      for (let i = 0; i < n; i++) {
        dx[i] -= x[i] * 0.06; dy[i] -= y[i] * 0.06;
        const m = Math.sqrt(dx[i] * dx[i] + dy[i] * dy[i]) + 1e-9; const st = Math.min(m, temp);
        x[i] += dx[i] / m * st; y[i] += dy[i] / m * st;
      }
      temp = Math.max(0.02, temp * 0.965);
    }
    let cx = 0, cy = 0; for (let i = 0; i < n; i++) { cx += x[i]; cy += y[i]; } cx /= n; cy /= n;
    let r = 0; for (let i = 0; i < n; i++) { x[i] -= cx; y[i] -= cy; r = Math.max(r, Math.hypot(x[i], y[i])); }
    return { ids, x, y, r: r + 0.6 };
  }).sort((a, b) => b.r - a.r || b.ids.length - a.ids.length);
  /* place components biggest first on a wide elliptical spiral, nearest free spot to the center */
  const put = []; const ASP = 1.6;
  placed.forEach(c => {
    let px = 0, py = 0;
    if (put.length) {
      for (let k = 0; k < 20000; k++) {
        const ang = k * 0.35, rad = 0.25 * Math.sqrt(k) * 3;
        px = Math.cos(ang) * rad * ASP; py = Math.sin(ang) * rad;
        let ok = true; for (let j = 0; j < put.length; j++) { const q = put[j]; const d = Math.hypot(px - q.x, py - q.y); if (d < c.r + q.r + 0.4) { ok = false; break; } }
        if (ok) break;
      }
    }
    put.push({ x: px, y: py, r: c.r });
    c.ids.forEach((id, i) => { nodes[id].x = px + c.x[i]; nodes[id].y = py + c.y[i]; });
  });
  let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
  nodes.forEach(n => { minx = Math.min(minx, n.x); maxx = Math.max(maxx, n.x); miny = Math.min(miny, n.y); maxy = Math.max(maxy, n.y); });
  const sc = 120 / Math.max(1e-6, maxx - minx);
  nodes.forEach(n => { n.x = (n.x - (minx + maxx) / 2) * sc; n.y = -(n.y - (miny + maxy) / 2) * sc; });
})();
let BX = 0, BY = 0; nodes.forEach(n => { BX = Math.max(BX, Math.abs(n.x)); BY = Math.max(BY, Math.abs(n.y)); });
BX += 2; BY += 2;

/* ---------- models ---------- */
const FAMILY_NAME = { anthropic: 'Anthropic', openai: 'OpenAI', deepseek: 'DeepSeek', mistral: 'Mistral', moonshot: 'Moonshot', xai: 'xAI', 'z-ai': 'Z.ai', sample: 'SAMPLE' };
const famName = f => FAMILY_NAME[f] || f;
const shortName = id => { const k = id.indexOf('/'); return k >= 0 ? id.slice(k + 1) : id; };
function derive(m) {
  const ver = m.version || 'v1';
  const R = (BENCH.runs || []).filter(r => r.model === m.id && (r.version || 'v1') === ver);
  const F = new Set(); const flagRun = {};
  R.forEach(r => (r.flagged_transfer_ids || []).forEach(id => { if (BYID[id]) { F.add(id); if (!flagRun[id]) flagRun[id] = r; } }));
  const perRing = {};
  RING_IDS.forEach(r => {
    const ids = RINGS[r]; const hitIds = ids.filter(id => F.has(id)); const found = hitIds.length / ids.length >= 0.5;
    const need = Math.ceil(ids.length / 2); const hz = hitIds.map(id => BYID[id].z).sort((a, b) => a - b);
    const run = R.find(x => x.expected === 'ring' && ids.some(id => (x.flagged_transfer_ids || []).includes(id))) || R.find(x => x.expected === 'ring' && x.ibm_shape === ringShape(r));
    perRing[r] = { r, ids, hit: hitIds.length, found, caughtZ: found ? hz[need - 1] : Infinity, run };
  });
  const found = RING_IDS.filter(r => perRing[r].found).length;
  let traced = 0; F.forEach(id => { if (TRUTH.has(id)) traced++; });
  const alarms = R.filter(r => r.expected === 'ordinary' && r.verdict === 'ring');
  const alarmsInRing = alarms.filter(r => (r.ring_accounts_flagged || []).length > 0).length;
  return Object.assign({}, m, { version: ver, short: shortName(m.id), R, F, flagRun, perRing, found, traced, alarms: alarms.length, alarmsInRing });
}
const MODELS = BENCH.models.map(derive);
const FAM_CAUGHT = {}; RING_IDS.forEach(r => (FAM_CAUGHT[r] = new Set()));
MODELS.forEach(m => RING_IDS.forEach(r => { if (m.perRing[r].found) FAM_CAUGHT[r].add(m.family); }));
const MODEL_IDS = []; MODELS.forEach(m => { if (!MODEL_IDS.includes(m.id)) MODEL_IDS.push(m.id); });
const versionsOf = id => MODELS.filter(m => m.id === id).map(m => m.version);

/* ---------- three.js scene ---------- */
const C = { ink: 0x1F2A44, teal: 0x3E6E6A, amber: 0x9A5B13, ok: 0x2F7A45, bad: 0xB0322A, paper: 0xF6F7F5 };
const stage = $('#stage'), cv = $('#cv');
let renderer = null;
try { if (!window.THREE) throw new Error('three.js did not load'); renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true }); }
catch (e) { $('#noGl').hidden = false; }
const scene = renderer ? new THREE.Scene() : null;
const camera = renderer ? new THREE.OrthographicCamera(-1, 1, 1, -1, -2000, 2000) : null;
const V = { tilt: 0, zoom: 1, panX: 0, panY: 0, cut: 11, W: 800, H: 500 };
let dirty = true;
const NT = TR.filter(t => !t.self).sort((a, b) => a.z - b.z);
const NTZ = NT.map(t => t.z);
const ub = (arr, z) => { let lo = 0, hi = arr.length; while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m] <= z + 1e-6) lo = m + 1; else hi = m; } return lo; };

let hair, dots, frames, cutFrame;
if (renderer) {
  renderer.setClearColor(C.paper, 1);
  /* ordinary traffic: one merged geometry of hairlines, sorted by time so the scrub is a draw range */
  const hp = new Float32Array(NT.length * 6);
  NT.forEach((t, i) => { const a = nodes[t.u], b = nodes[t.v]; hp.set([a.x, a.y, t.z, b.x, b.y, t.z], i * 6); });
  const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.BufferAttribute(hp, 3));
  hair = new THREE.LineSegments(hg, new THREE.LineBasicMaterial({ color: C.ink, transparent: true, opacity: 0.16, depthWrite: false }));
  scene.add(hair);
  /* accounts on the map plane */
  const dp = new Float32Array(nodes.length * 3); nodes.forEach((n, i) => dp.set([n.x, n.y, -0.2], i * 3));
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  dots = new THREE.Points(dg, new THREE.PointsMaterial({ color: C.ink, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0.4, depthWrite: false }));
  scene.add(dots);
  /* a frame at each day boundary: the ruler for time */
  const fp = []; const rect = z => { const p = [[-BX, -BY], [BX, -BY], [BX, BY], [-BX, BY]]; for (let k = 0; k < 4; k++) { const a = p[k], b = p[(k + 1) % 4]; fp.push(a[0], a[1], z, b[0], b[1], z); } };
  for (let d = 0; d <= 10; d++) rect(d * DZ); if (NTAIL) rect(DEPTH);
  const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3));
  frames = new THREE.LineSegments(fg, new THREE.LineBasicMaterial({ color: C.ink, transparent: true, opacity: 0.1, depthWrite: false }));
  scene.add(frames);
  const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute([-BX, -BY, 0, BX, -BY, 0, BX, BY, 0, -BX, BY, 0], 3));
  cutFrame = new THREE.LineLoop(cg, new THREE.LineBasicMaterial({ color: C.teal, transparent: true, opacity: 0.85, depthWrite: false }));
  scene.add(cutFrame);
}

/* ---------- the lit layer for one model ---------- */
const CYL = renderer ? new THREE.CylinderGeometry(1, 1, 1, 6, 1, true) : null;
const RAD = 0.16;
let LIT = null;          /* { segs, layers: {g, r, a}, life: [...], ringPieces } */
let litAlpha = 1;
const tmpM = renderer ? new THREE.Matrix4() : null, tmpQ = renderer ? new THREE.Quaternion() : null, UP = renderer ? new THREE.Vector3(0, 1, 0) : null;
function pieceMatrix(p0, p1, r, out) {
  const dx = p1[0] - p0[0], dy = p1[1] - p0[1], dz = p1[2] - p0[2]; const len = Math.hypot(dx, dy, dz);
  if (len < 1e-6) { out.makeScale(0, 0, 0); return out; }
  tmpQ.setFromUnitVectors(UP, new THREE.Vector3(dx / len, dy / len, dz / len));
  return out.compose(new THREE.Vector3((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, (p0[2] + p1[2]) / 2), tmpQ, new THREE.Vector3(r, len, r));
}
function buildLit(m) {
  const segs = [];
  NT.forEach(t => {
    const flagged = m.F.has(t.id); if (!flagged && !t.label) return;
    const kind = flagged ? (t.label ? 'g' : 'r') : 'a';
    const a = nodes[t.u], b = nodes[t.v];
    segs.push({ t, kind, a: [a.x, a.y, t.z], b: [b.x, b.y, t.z], z: t.z, ring: t.label ? String(t.ring) : null, run: flagged ? m.flagRun[t.id] : null });
  });
  const out = { segs, layers: {}, life: [], ringPieces: {} };
  if (!renderer) return out;
  const pieces = { g: [], r: [], a: [] };
  segs.forEach((s, si) => {
    const L = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]);
    const lerp = f => [s.a[0] + (s.b[0] - s.a[0]) * f, s.a[1] + (s.b[1] - s.a[1]) * f, s.z];
    if (s.kind === 'g') pieces.g.push({ p0: s.a, p1: s.b, z: s.z, si });
    else if (s.kind === 'r') { const n = Math.max(2, Math.round(L / 0.9)); for (let k = 0; k < n; k++) pieces.r.push({ p0: lerp(k / n), p1: lerp((k + 0.6) / n), z: s.z, si }); }
    else { const n = Math.max(3, Math.round(L / 0.45)); for (let k = 0; k < n; k++) pieces.a.push({ p0: lerp(k / n), p1: lerp((k + 0.28) / n), z: s.z, si }); }
  });
  const col = { g: C.ok, r: C.bad, a: C.amber }, rad = { g: RAD * 1.5, r: RAD * 0.8, a: RAD * 1.1 }, alpha = { g: 1, r: 0.6, a: 0.85 };
  Object.keys(pieces).forEach(k => {
    const P = pieces[k].sort((x, y) => x.z - y.z); if (!P.length) return;
    const mesh = new THREE.InstancedMesh(CYL, new THREE.MeshBasicMaterial({ color: col[k], transparent: true, opacity: litAlpha * alpha[k], depthWrite: false }), P.length);
    P.forEach((p, i) => { mesh.setMatrixAt(i, pieceMatrix(p.p0, p1Of(p), rad[k], tmpM)); if (k === 'g') { const r = segs[p.si].ring; (out.ringPieces[r] = out.ringPieces[r] || []).push(i); } });
    mesh.instanceMatrix.needsUpdate = true; mesh.frustumCulled = false; mesh.renderOrder = k === 'g' ? 3 : 2;
    scene.add(mesh); out.layers[k] = { mesh, P, Z: P.map(p => p.z), rad: rad[k], alpha: alpha[k] };
  });
  /* lifelines: the same account across time inside one lit group, so a chain reads as a path and a cycle returns to its start */
  const groups = {};
  segs.forEach(s => { if (s.ring == null) return; const g = s.ring != null ? 'ring' + s.ring : 'run' + (s.run ? s.run.unit : '?'); const col2 = s.ring != null ? (m.perRing[s.ring].found ? 'g' : 'a') : 'r'; const G = groups[g] = groups[g] || { col: col2, acc: {} }; [[s.t.u, s.a], [s.t.v, s.b]].forEach(e => (G.acc[e[0]] = G.acc[e[0]] || []).push(e[1])); });
  const lines = { g: [], r: [], a: [] };
  Object.values(groups).forEach(G => Object.values(G.acc).forEach(list => { list.sort((p, q) => p[2] - q[2]); for (let i = 1; i < list.length; i++) if (list[i][2] - list[i - 1][2] > 0.05) lines[G.col].push([list[i - 1], list[i]]); }));
  Object.keys(lines).forEach(k => {
    const L = lines[k].sort((x, y) => x[1][2] - y[1][2]); if (!L.length) return;
    const arr = new Float32Array(L.length * 6); L.forEach((l, i) => arr.set([l[0][0], l[0][1], l[0][2], l[1][0], l[1][1], l[1][2]], i * 6));
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    const mat = new THREE.LineBasicMaterial({ color: col[k], transparent: true, opacity: 0.45 * litAlpha, depthWrite: false });
    const ls = new THREE.LineSegments(g, mat); ls.frustumCulled = false; scene.add(ls); out.life.push({ ls, Z: L.map(l => l[1][2]) });
  });
  return out;
}
function p1Of(p) { return p.p1; }
function disposeLit(L) {
  if (!L || !renderer) return;
  Object.values(L.layers).forEach(l => { scene.remove(l.mesh); l.mesh.material.dispose(); l.mesh.dispose(); });
  L.life.forEach(l => { scene.remove(l.ls); l.ls.geometry.dispose(); l.ls.material.dispose(); });
}
function setLitAlpha(a) {
  litAlpha = a; if (!LIT) return;
  Object.values(LIT.layers).forEach(l => (l.mesh.material.opacity = a * l.alpha));
  LIT.life.forEach(l => (l.ls.material.opacity = 0.45 * a)); dirty = true;
}

/* ---------- catch state: a found ring stays undrawn until the scrub reaches the transfer that makes it caught ---------- */
const CATCH = { state: {}, queue: [], active: [], lastStart: -1e9 };   /* state[r] = 'hidden' | 'animating' | 'shown' */
function ringPieceProgress(r, prog) {
  /* prog: 0..1 trace of the ring in time order; each segment grows from its sender to its receiver */
  const L = LIT && LIT.layers.g; const idx = LIT && LIT.ringPieces[r]; if (!L || !idx) return;
  const n = idx.length;
  idx.forEach((i, k) => {
    const p = L.P[i]; const span = 1 / (n * 0.6 + 0.4); const start = n > 1 ? (k / (n - 1)) * (1 - span) : 0;
    const f = easeOut((prog - start) / span);
    if (f <= 0) L.mesh.setMatrixAt(i, tmpM.makeScale(0, 0, 0));
    else L.mesh.setMatrixAt(i, pieceMatrix(p.p0, [p.p0[0] + (p.p1[0] - p.p0[0]) * f, p.p0[1] + (p.p1[1] - p.p0[1]) * f, p.z], L.rad, tmpM));
  });
  L.mesh.instanceMatrix.needsUpdate = true; dirty = true;
}
function syncCatches(fresh) {
  if (!CUR) return;
  const cz = cutToZ(V.cut);
  RING_IDS.forEach(r => {
    const pr = CUR.perRing[r]; if (!pr.found) return;
    const st = CATCH.state[r] || 'hidden'; const should = pr.caughtZ <= cz + 1e-6;
    if (should && st === 'hidden') { CATCH.state[r] = 'queued'; CATCH.queue.push(r); }
    else if (!should && st !== 'hidden') { CATCH.state[r] = 'hidden'; CATCH.queue = CATCH.queue.filter(x => x !== r); CATCH.active = CATCH.active.filter(a => a.r !== r); ringPieceProgress(r, 0); removeCard(r); }
  });
  CATCH.queue.sort((a, b) => CUR.perRing[a].caughtZ - CUR.perRing[b].caughtZ);
  if (fresh) RING_IDS.forEach(r => { if (CUR.perRing[r].found) ringPieceProgress(r, 0); });
}
const RESOLVE_MS = 450, TRAVEL_MS = 700, STAGGER_MS = 300;
function stepCatches(now) {
  if (RM) { while (CATCH.queue.length) { const r = CATCH.queue.shift(); ringPieceProgress(r, 1); CATCH.state[r] = 'shown'; addCard(r, false); } return; }
  if (CATCH.queue.length && now - CATCH.lastStart >= D(STAGGER_MS)) {
    const r = CATCH.queue.shift(); CATCH.lastStart = now; CATCH.state[r] = 'animating';
    const a = { r, t0: now, flown: false }; CATCH.active.push(a);
    if (RM) { ringPieceProgress(r, 1); CATCH.state[r] = 'shown'; addCard(r, false); CATCH.active.pop(); }
  }
  CATCH.active = CATCH.active.filter(a => {
    const t = now - a.t0; ringPieceProgress(a.r, Math.min(1, t / RESOLVE_MS));
    if (!a.flown && t >= RESOLVE_MS * 0.55) { a.flown = true; addCard(a.r, true); }
    if (t >= RESOLVE_MS) { CATCH.state[a.r] = 'shown'; return false; }
    return true;
  });
}

/* ---------- caught roster ---------- */
const cardsEl = $('#cards');
function ringStats(r) {
  const ids = RINGS[r]; const acc = new Set(); const money = {};
  ids.forEach(id => { const t = BYID[id]; acc.add(t.from); acc.add(t.to); money[t.cur] = (money[t.cur] || 0) + (+t.paid || 0); });
  const cur = Object.keys(money).sort((a, b) => money[b] - money[a]);
  const mtxt = cur.length ? fmtN(Math.round(money[cur[0]])) + ' ' + cur[0] + (cur.length > 1 ? ' + ' + (cur.length - 1) + ' more ' + (cur.length > 2 ? 'currencies' : 'currency') : '') : 'n/a';
  return { accounts: acc.size, n: ids.length, money: mtxt };
}
function shapeSVG(r, size) {
  /* the ring drawn as it sits on the map plane, where its shape reads (time flattened) */
  const pts = []; RINGS[r].forEach(id => { const t = BYID[id]; if (t.self) return; pts.push([{ x: nodes[t.u].x, y: -nodes[t.u].y }, { x: nodes[t.v].x, y: -nodes[t.v].y }, CUR && CUR.F.has(id)]); });
  let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9; pts.forEach(p => [p[0], p[1]].forEach(q => { minx = Math.min(minx, q.x); maxx = Math.max(maxx, q.x); miny = Math.min(miny, q.y); maxy = Math.max(maxy, q.y); }));
  if (!pts.length) { minx = miny = 0; maxx = maxy = 1; }
  const w = Math.max(maxx - minx, 0.5), h = Math.max(maxy - miny, 0.5); const s = (size - 14) / Math.max(w, h);
  const ox = size / 2 - (minx + maxx) / 2 * s, oy = size / 2 - (miny + maxy) / 2 * s;
  const P = q => [(q.x * s + ox).toFixed(1), (q.y * s + oy).toFixed(1)];
  const sw = (size / 72).toFixed(2);
  const lines = pts.map(p => { const a = P(p[0]), b = P(p[1]); return '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '" stroke="' + (p[2] ? '#2F7A45' : '#9A5B13') + '" stroke-width="' + (p[2] ? 2.2 * sw : 2 * sw) + '"' + (p[2] ? '' : ' stroke-dasharray="1.5 3" stroke-linecap="round"') + '/>'; }).join('');
  const ends = []; pts.forEach(p => [p[0], p[1]].forEach(q => ends.push(P(q))));
  const dotsS = ends.map(e => '<circle cx="' + e[0] + '" cy="' + e[1] + '" r="' + (1.8 * sw) + '" fill="#1F2A44"/>').join('');
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' + lines + dotsS + '</svg>';
}
function ringScreenBox(r) {
  let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
  RINGS[r].forEach(id => { const t = BYID[id]; [t.u, t.v].forEach(n => { const q = project(nodes[n].x, nodes[n].y, t.z); minx = Math.min(minx, q.x); maxx = Math.max(maxx, q.x); miny = Math.min(miny, q.y); maxy = Math.max(maxy, q.y); }); });
  return { cx: (minx + maxx) / 2, cy: (miny + maxy) / 2, size: Math.max(56, Math.min(240, Math.max(maxx - minx, maxy - miny) + 14)) };
}
function addCard(r, fly) {
  if (cardsEl.querySelector('[data-r="' + r + '"]')) return;
  const pr = CUR.perRing[r]; const st = ringStats(r);
  const others = [...FAM_CAUGHT[r]].filter(f => f !== CUR.family).map(famName);
  const why = pr.run ? firstSentence(pr.run.why) : 'No run of this model names this group directly.';
  const el = document.createElement('article'); el.className = 'ccard'; el.dataset.r = r;
  el.innerHTML = '<div class="thumb' + (fly ? ' pending' : '') + '">' + shapeSVG(r, 72) + '</div>' +
    '<h4>' + esc(ringShape(r)) + '<span class="gid">IBM group ' + esc(r) + '</span></h4>' +
    '<div class="nums">' + st.accounts + ' accounts, ' + pr.hit + ' of ' + st.n + ' transfers traced<br>' + esc(st.money) + ' moved</div>' +
    '<div class="fam">' + (others.length ? 'Also caught by ' + esc(others.join(', ')) : 'No other family caught it') + '</div>' +
    '<p class="why">' + esc(why) + '</p>';
  /* keep the roster in catch order (time order) */
  const after = [...cardsEl.querySelectorAll('.ccard')].find(c => CUR.perRing[c.dataset.r] && CUR.perRing[c.dataset.r].caughtZ > pr.caughtZ);
  const empty = cardsEl.querySelector('.empty'); if (empty) empty.remove();
  cardsEl.insertBefore(el, after || null);
  updateRosterCount();
  if (!fly || !renderer) { el.querySelector('.thumb').classList.remove('pending'); return; }
  const srect = stage.getBoundingClientRect(); const bx = ringScreenBox(r);
  const fl = document.createElement('div'); fl.className = 'flyer'; fl.innerHTML = shapeSVG(r, 160);
  /* the copy starts centered on the ring where it was caught, at the ring's size on screen */
  const sc0 = bx.size / 160; const left = srect.left + bx.cx - bx.size / 2, top = srect.top + bx.cy - bx.size / 2;
  fl.style.transform = 'translate(' + left + 'px,' + top + 'px) scale(' + sc0 + ')';
  document.body.appendChild(fl);
  const tr = el.querySelector('.thumb').getBoundingClientRect();
  const sc1 = 72 / 160;
  const anim = fl.animate([
    { transform: 'translate(' + left + 'px,' + top + 'px) scale(' + sc0 + ')', opacity: 1 },
    { transform: 'translate(' + tr.left + 'px,' + tr.top + 'px) scale(' + sc1 + ')', opacity: 1 }
  ], { duration: TRAVEL_MS, easing: 'cubic-bezier(0.22, 0.7, 0.2, 1)', fill: 'forwards' });
  const done = () => { fl.remove(); const th = el.querySelector('.thumb'); if (th) th.classList.remove('pending'); };
  anim.onfinish = done; anim.oncancel = done;
}
function removeCard(r) { const el = cardsEl.querySelector('[data-r="' + r + '"]'); if (el) el.remove(); updateRosterCount(); }
function clearRoster() { cardsEl.innerHTML = ''; updateRosterCount(); }
function updateRosterCount() {
  const n = cardsEl.querySelectorAll('.ccard').length;
  $('#rosterCount').textContent = CUR ? n + ' of ' + NRINGS + ' IBM rings' : '';
  if (!n) cardsEl.innerHTML = '<p class="empty">' + (CUR && CUR.found ? 'Rings join this list as the day scrub reaches the transfer that completes each catch.' : 'This model caught none of IBM\'s rings in this slice.') + '</p>';
}

/* ---------- camera ---------- */
function resize() {
  if (!renderer) return;
  V.W = stage.clientWidth || 800; V.H = stage.clientHeight || 500;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.setSize(V.W, V.H, false); dirty = true;
}
function placeCamera() {
  const th = V.tilt * Math.PI / 180, s = Math.sin(th), c = Math.cos(th);
  const cx = 0, cy = 0, cz = DEPTH / 2;
  let hw = (BX * Math.abs(c) + (DEPTH / 2) * s) * 1.06 + 3, hh = BY * 1.08 + 4;
  const asp = V.W / V.H; if (hw / hh < asp) hw = hh * asp; else hh = hw / asp;
  hw /= V.zoom; hh /= V.zoom;
  camera.left = -hw; camera.right = hw; camera.top = hh; camera.bottom = -hh;
  /* tilt turns the camera about the vertical axis: 0 looks straight down time (a map), 90 looks across it (a timeline, days run left to right) */
  const dir = new THREE.Vector3(-s, 0, c);
  const right = new THREE.Vector3(c, 0, s);
  const ctr = new THREE.Vector3(cx, cy, cz).addScaledVector(right, V.panX).add(new THREE.Vector3(0, V.panY, 0));
  camera.position.copy(ctr).addScaledVector(dir, 800); camera.up.set(0, 1, 0); camera.lookAt(ctr);
  camera.updateProjectionMatrix(); camera.updateMatrixWorld();
}
const pv = renderer ? new THREE.Vector3() : null;
function project(x, y, z) { pv.set(x, y, z).project(camera); return { x: (pv.x + 1) / 2 * V.W, y: (1 - pv.y) / 2 * V.H }; }

/* ---------- day labels (HTML, placed by projection; they fade in as time comes into view) ---------- */
const dayEl = $('#dayLabels'); const dayLabs = [];
for (let d = 0; d < 10; d++) { const s = document.createElement('span'); s.textContent = 'Sep ' + (d + 1); dayEl.appendChild(s); dayLabs.push({ el: s, z: (d + 0.5) * DZ }); }
if (NTAIL) { const s = document.createElement('span'); s.className = 'tail'; s.textContent = 'Sep 11 to 16'; s.title = NTAIL + ' late transfers, squeezed into one short slab'; dayEl.appendChild(s); dayLabs.push({ el: s, z: 10 * DZ + TAILZ / 2, tail: true }); }
function placeLabels() {
  const vis = Math.max(0, (V.tilt - 25) / 40);
  const gap = Math.abs(project(0, -BY, DZ).x - project(0, -BY, 0).x); const every = gap > 44 ? 1 : gap > 22 ? 2 : 5;
  dayLabs.forEach((l, i) => { const p = project(-BX * 0.0, -BY, l.z); const show = vis > 0 && (l.tail ? gap > 30 : i % every === 0); l.el.style.left = p.x + 'px'; l.el.style.top = p.y + 'px'; l.el.style.opacity = Math.min(1, vis); l.el.style.display = show ? '' : 'none'; });
  if (dots) dots.material.opacity = 0.4 * (1 - 0.6 * Math.sin(V.tilt * Math.PI / 180));
  $('#viewName').textContent = V.tilt < 8 ? 'map view: time runs into the page' : V.tilt > 70 ? 'timeline view: days run left to right' : 'tilted: ' + Math.round(V.tilt) + ' degrees';
}

/* ---------- render loop: draws only when something changed or an animation runs ---------- */
const TW = [];  /* tweens: {t0, ms, from, to, set, done} */
function tween(ms, from, to, set, done) { const now = performance.now(); if (!ms) { set(to); if (done) done(); return; } TW.push({ t0: now, ms, from, to, set, done }); }
function applyCut() {
  if (!renderer) return;
  const cz = cutToZ(V.cut);
  hair.geometry.setDrawRange(0, ub(NTZ, cz) * 2);
  cutFrame.position.z = cz; cutFrame.visible = V.cut < 11 - 1e-6;
  if (LIT) { Object.values(LIT.layers).forEach(l => (l.mesh.count = ub(l.Z, cz))); LIT.life.forEach(l => l.ls.geometry.setDrawRange(0, ub(l.Z, cz) * 2)); }
  dirty = true;
}
function frame(now) {
  for (let i = TW.length - 1; i >= 0; i--) { const w = TW[i]; const k = Math.min(1, (now - w.t0) / w.ms); w.set(w.from + (w.to - w.from) * easeOut(k)); if (k >= 1) { TW.splice(i, 1); if (w.done) w.done(); } }
  if (PLAY.on) { const c = Math.min(11, PLAY.c0 + (now - PLAY.t0) / PLAY.msPerDay); setCut(c, true); if (c >= 11) stopPlay(); }
  stepCatches(now);
  if (renderer && (dirty || TW.length)) { placeCamera(); placeLabels(); renderer.render(scene, camera); dirty = false; }
  requestAnimationFrame(frame);
}

/* ---------- controls ---------- */
const tiltEl = $('#tilt'), cutEl = $('#cut');
function setTilt(t) { V.tilt = t; tiltEl.value = Math.round(t); $('#btnMap').setAttribute('aria-pressed', String(t < 1)); $('#btnTime').setAttribute('aria-pressed', String(t > 70)); dirty = true; }
function tiltTo(t) { TW.splice(0, TW.length, ...TW.filter(w => w.set !== setTilt)); tween(D(400), V.tilt, t, setTilt); }
$('#btnMap').onclick = () => tiltTo(0);
$('#btnTime').onclick = () => tiltTo(76);
tiltEl.oninput = () => setTilt(+tiltEl.value);
const fmtCut = c => {
  if (c >= 11 - 1e-6) return 'all transfers, Sep 1 to 16';
  if (c > 10) return 'through Sep 10, plus the late tail';
  const m = T0 + c * DAY; const d = new Date(m * 60000);
  return 'through Sep ' + d.getUTCDate() + ', ' + String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0');
};
function setCut(c, fromPlay) { V.cut = c; cutEl.value = c; $('#cutRead').textContent = fmtCut(c); applyCut(); syncCatches(false); if (!fromPlay && PLAY.on) stopPlay(); }
cutEl.oninput = () => setCut(+cutEl.value);
const PLAY = { on: false, t0: 0, c0: 0, msPerDay: 600 };
function stopPlay() { PLAY.on = false; $('#btnPlay').textContent = 'Play the ten days'; }
$('#btnPlay').onclick = () => {
  if (PLAY.on) { stopPlay(); return; }
  if (RM) { setCut(11); return; }
  const c0 = V.cut >= 11 - 1e-6 ? 0 : V.cut; setCut(c0); PLAY.on = true; PLAY.t0 = performance.now(); PLAY.c0 = c0; $('#btnPlay').textContent = 'Pause';
};
/* pan and zoom */
let drag = null;
stage.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, px: V.panX, py: V.panY }; stage.classList.add('dragging'); stage.setPointerCapture(e.pointerId); });
stage.addEventListener('pointerup', e => { drag = null; stage.classList.remove('dragging'); });
stage.addEventListener('pointermove', e => {
  if (drag && renderer) { const upp = (camera.right - camera.left) / V.W; V.panX = drag.px - (e.clientX - drag.x) * upp; V.panY = drag.py + (e.clientY - drag.y) * upp; dirty = true; hideHover(); return; }
  hoverAt(e);
});
stage.addEventListener('pointerleave', hideHover);
stage.addEventListener('wheel', e => { e.preventDefault(); V.zoom = Math.min(8, Math.max(0.6, V.zoom * Math.exp(-e.deltaY * 0.0015))); dirty = true; }, { passive: false });
stage.addEventListener('dblclick', () => { V.zoom = 1; V.panX = 0; V.panY = 0; dirty = true; });
window.addEventListener('resize', resize);

/* ---------- hover card: nearest lit segment on screen ---------- */
const hov = $('#hover');
function hideHover() { hov.hidden = true; }
function hoverAt(e) {
  if (!LIT || !renderer) return;
  const rect = stage.getBoundingClientRect(); const mx = e.clientX - rect.left, my = e.clientY - rect.top; const cz = cutToZ(V.cut);
  let best = null, bd = 9;
  LIT.segs.forEach(s => {
    if (s.z > cz + 1e-6) return; if (s.kind === 'g' && CATCH.state[s.ring] && CATCH.state[s.ring] !== 'shown' && CUR.perRing[s.ring].found) return;
    const a = project(s.a[0], s.a[1], s.a[2]), b = project(s.b[0], s.b[1], s.b[2]);
    const vx = b.x - a.x, vy = b.y - a.y; const l2 = vx * vx + vy * vy; let f = l2 ? ((mx - a.x) * vx + (my - a.y) * vy) / l2 : 0; f = Math.max(0, Math.min(1, f));
    const d = Math.hypot(a.x + vx * f - mx, a.y + vy * f - my); if (d < bd) { bd = d; best = s; }
  });
  if (!best) { hideHover(); return; }
  hov.innerHTML = cardFor(best); hov.hidden = false;
  const w = hov.offsetWidth, h = hov.offsetHeight; let x = e.clientX + 16, y = e.clientY + 14;
  if (x + w > innerWidth - 8) x = e.clientX - w - 16; if (y + h > innerHeight - 8) y = innerHeight - h - 8;
  hov.style.left = x + 'px'; hov.style.top = y + 'px';
}
function cardFor(s) {
  if (s.ring != null) {
    const r = s.ring, pr = CUR.perRing[r]; const ids = RINGS[r];
    const status = pr.found ? 'Caught: the model flagged ' + pr.hit + ' of ' + ids.length + ' labeled transfers' : 'Not caught: the model flagged ' + pr.hit + ' of ' + ids.length + ' labeled transfers (half are needed)';
    const why = pr.run ? firstSentence(pr.run.why) : 'No run of this model flagged this group.';
    return '<div class="t">IBM group ' + esc(r) + ': ' + esc(ringShape(r)) + '</div><div class="s">' + esc(status) + '.</div><div>' + (pr.run ? '<b>Model\'s why</b> (' + esc(pr.run.unit) + '): ' : '') + esc(why) + '</div>' +
      '<div class="ids">' + ids.map(id => '<span class="' + (CUR.F.has(id) ? 'g' : 'm') + '">' + id + '</span>').join(' ') + '</div>';
  }
  const run = s.run || {}; const wrong = (run.flagged_transfer_ids || []).filter(id => BYID[id] && !BYID[id].label);
  const u = UNIT[run.unit];
  return '<div class="t">False alarm in neighborhood ' + esc(run.unit || '?') + '</div><div class="s">IBM\'s shape: none here, IBM labels these transfers ordinary' + (run.expected === 'ring' ? ' (the neighborhood does hold an IBM ring elsewhere)' : '') + '. The model called it ' + esc(run.pattern || 'a ring') + (u ? ', ' + u.accounts.length + ' accounts in the neighborhood' : '') + '.</div><div><b>Model\'s why:</b> ' + esc(firstSentence(run.why)) + '</div>' +
    '<div class="ids">' + wrong.map(id => '<span class="w">' + id + '</span>').join(' ') + '</div>';
}

/* ---------- model picker and the result copy ---------- */
let CUR = null;
const pickEl = $('#modelPick');
(function fillPicker() {
  const fams = {}; MODEL_IDS.forEach(id => { const m = MODELS.find(x => x.id === id); (fams[m.family] = fams[m.family] || []).push(id); });
  pickEl.innerHTML = Object.keys(fams).map(f => '<optgroup label="' + esc(famName(f)) + '">' + fams[f].map(id => '<option value="' + esc(id) + '">' + esc(shortName(id)) + '</option>').join('') + '</optgroup>').join('');
})();
function renderVersions() {
  const vs = versionsOf(CUR.id);
  $('#versRow').innerHTML = vs.map(v => '<button type="button" class="btn" data-v="' + esc(v) + '" aria-pressed="' + (v === CUR.version) + '">' + esc(v) + '</button>').join('');
  $('#versRow').querySelectorAll('button').forEach(b => (b.onclick = () => selectModel(CUR.id, b.dataset.v)));
  const vn = BENCH.versions || {}; const base = CUR.version.replace(/x$/, '');
  $('#versNote').textContent = vn[CUR.version] ? CUR.version + ': ' + vn[CUR.version] : (vn[base] ? CUR.version + ': a variant of ' + base + ', ' + vn[base] : CUR.version + ': a later prompt version of the same model.');
}
function renderResult() {
  const m = CUR; const nT = TRUTH.size;
  $('#headline').innerHTML = esc(m.short) + ' (' + esc(m.version) + ') caught <b>' + m.found + '</b> of IBM\'s ' + NRINGS + ' laundering rings and traced <b>' + m.traced + '</b> of ' + nT + ' laundering transfers; it raised <b>' + m.alarms + '</b> alarms on ordinary neighborhoods, <b>' + m.alarmsInRing + '</b> of them on accounts that sit inside a ring.';
  $('#limit').textContent = 'Limit: IBM\'s data is synthetic, and a ring counts as caught when the model flags at least half of its labeled transfers in this slice.';
  const pr = m.found / Math.max(1, NRINGS), pt = m.traced / Math.max(1, nT);
  $('#strong').innerHTML = pr >= pt ? 'That is <b>' + Math.round(pr * 100) + '</b> percent of IBM\'s rings, caught.' : 'That is <b>' + Math.round(pt * 100) + '</b> percent of IBM\'s laundering transfers, traced.';
}
function selectModel(id, ver) {
  const m = MODELS.find(x => x.id === id && x.version === ver) || MODELS.find(x => x.id === id);
  if (!m) return;
  pickEl.value = m.id;
  const swap = () => {
    disposeLit(LIT); CUR = m; CATCH.state = {}; CATCH.queue = []; CATCH.active = []; clearRoster();
    LIT = buildLit(m); setLitAlpha(0); applyCut(); syncCatches(true); renderVersions(); renderResult(); updateRosterCount();
    tween(D(200), 0, 1, setLitAlpha);
  };
  if (!LIT) { swap(); return; }
  tween(D(120), litAlpha, 0, setLitAlpha, swap);
}
pickEl.onchange = () => { const vs = versionsOf(pickEl.value); selectModel(pickEl.value, CUR && vs.includes(CUR.version) ? CUR.version : vs[vs.length - 1]); };

/* ---------- start ---------- */
(function badges() {
  const b = []; if (SAMPLE.length) b.push('<span class="badge sample" title="A data file was missing; the page made up a small network so it still reads">SAMPLE ' + esc(SAMPLE.join(' and ')) + '</span>');
  b.push('<span class="badge">' + fmtN(TR.length) + ' transfers</span>', '<span class="badge">' + fmtN(nodes.length) + ' accounts</span>', '<span class="badge">' + (UNITS.length || (BENCH.dataset && BENCH.dataset.units) || 60) + ' neighborhoods</span>', '<span class="badge">' + NRINGS + ' IBM rings</span>');
  $('#badges').innerHTML = b.join('');
})();
resize();
if (renderer) placeCamera();
const best = MODELS.slice().sort((a, b) => b.found - a.found || (b.traced - a.traced) || (a.alarms - b.alarms))[0];
const qm = Q.get('model'); const qv = Q.get('v');
const start = (qm && MODELS.find(m => m.id === qm && (!qv || m.version === qv))) || best;
if (Q.has('cut')) setCut(Math.max(0, Math.min(11, +Q.get('cut')))); else setCut(11);
if (Q.get('view') === 'timeline') setTilt(76); else if (Q.has('tilt')) setTilt(+Q.get('tilt'));
selectModel(start.id, start.version);
requestAnimationFrame(frame);
})();
