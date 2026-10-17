/* Rings at night: a three-dimensional reading of the Rings bench.
   Inputs (by relative path, same grammar as ../../app.js): ../../../data/slice.js (window.SLICE),
   bench_results.js (window.BENCH), units.js (window.UNITS). When slice or bench is missing the page
   builds a small made-up SAMPLE network and says so in a badge. No libraries besides three.js. */
(function () {
'use strict';
const DATA = '../../../data/';
const MQ = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
const REDUCED = () => !!MQ.matches;
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtN = n => Number(n).toLocaleString('en-US');
function seeded(seed) { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
function loadScript(src) { return new Promise(res => { const t = document.createElement('script'); t.src = src; t.onload = () => res(true); t.onerror = () => res(false); document.head.appendChild(t); }); }
const DAY = 1440, T0 = Date.UTC(2022, 8, 1) / 60000, SPAN = 10 * DAY;
const parseT = s => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10), +s.slice(11, 13), +s.slice(14, 16)) / 60000 - T0;
const easeOut = x => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtWhen(min) { const d = new Date((T0 + min) * 60000); return MONTHS[d.getUTCMonth()] + ' ' + d.getUTCDate() + ', ' + String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0'); }

/* timings (README lists them): every one ease-out, every one dropped under prefers-reduced-motion */
const OPEN_MS = 1600;       /* the one opening camera move */
const FADE_TAU = 75;        /* model switch: layers and sphere colors settle in about 320 ms */
const RESOLVE_MS = 450;     /* the catch: the ring's lines draw from source to target, loop closes / star snaps */
const FLY_MS = 620;         /* the catch: a copy of the shape travels into its roster card */
const CATCH_GAP = 160;      /* between consecutive catches */
const PLAY_MS = 14000;      /* ten days of transfers */

const COL = { base: '#6E7B8D', ok: '#63C58D', bad: '#E07C74', miss: '#D8A64A', hair: '#8FA3B8', focus: '#E6E9EE' };
const FAMILY_NAMES = { anthropic: 'Anthropic', openai: 'OpenAI', deepseek: 'DeepSeek', mistral: 'Mistral', moonshot: 'Moonshot', xai: 'xAI', 'z-ai': 'Z.ai', google: 'Google', meta: 'Meta', qwen: 'Qwen', sample: 'Sample' };
const famName = f => FAMILY_NAMES[f] || (f ? f.charAt(0).toUpperCase() + f.slice(1) : '?');
function prettyModel(id) {
  const s = id.indexOf('/') >= 0 ? id.slice(id.indexOf('/') + 1) : id; const SPECIAL = { gpt: 'GPT', glm: 'GLM', deepseek: 'DeepSeek' };
  const out = []; s.split('-').forEach(w => { if (/^\d+$/.test(w) && out.length && /^\d+(\.\d+)?$/.test(out[out.length - 1])) out[out.length - 1] += '.' + w; else out.push(SPECIAL[w] || (/^[a-z]/.test(w) ? w.charAt(0).toUpperCase() + w.slice(1) : w)); });
  return out.join(' ');
}

/* ---------- SAMPLE: a small made-up network so the page still renders when a data file is missing ---------- */
function makeSample() {
  const rnd = seeded(11); const T = [], key = {}; let id = 0;
  const A = i => 'S' + String(i).padStart(3, '0');
  const ts = mm => { const d = new Date((T0 + mm) * 60000).toISOString(); return d.slice(0, 4) + '/' + d.slice(5, 7) + '/' + d.slice(8, 10) + ' ' + d.slice(11, 16); };
  const add = (f, t, paid, mm, ring) => { id++; const tid = 'T' + String(id).padStart(4, '0'); T.push([tid, ts(mm), A(f), A(t), Math.round(paid * 100) / 100, 'US Dollar', ring >= 0 ? 'ACH' : (rnd() < .5 ? 'Cheque' : 'Credit Card'), '001', '002']); key[tid] = [ring >= 0 ? 1 : 0, ring]; return tid; };
  for (let i = 0; i < 260; i++) { const a = Math.floor(rnd() * 90), b = Math.floor(rnd() * 90); if (a !== b) add(a, b, 50 + rnd() * 4000, Math.floor(rnd() * SPAN), -1); }
  const ring = []; const cyc = [100, 101, 102, 103, 104, 105];
  ring.push(cyc.map((a, i) => add(a, cyc[(i + 1) % cyc.length], 9000 - i * 120, 2000 + i * 300, 0)));
  ring.push([0, 1, 2, 3, 4, 5, 6].map(i => add(110, 111 + i, 4000 + rnd() * 900, 4000 + i * 200, 1)));
  ring.push([0, 1, 2, 3, 4, 5].map(i => add(120 + i, 127, 3000 + rnd() * 500, 6000 + i * 250, 2)));
  const ch = [130, 131, 132, 133]; ring.push(ch.slice(0, 3).map((a, i) => add(a, ch[i + 1], 20000 - i * 400, 9000 + i * 600, 3)));
  [100, 110, 120, 127, 130, 133].forEach(a => add(a, Math.floor(rnd() * 90), 200 + rnd() * 800, Math.floor(rnd() * SPAN), -1));
  const shapes = ['cycle', 'fan-out', 'fan-in', 'chain'];
  const ring_meta = {}; shapes.forEach((s, i) => ring_meta[i] = { shape: s, n: ring[i].length });
  const bg = T.filter(r => !key[r[0]][0]);
  const units = shapes.map((s, i) => ({ id: 'u0' + (i + 1), expected: 'ring', shape: s, ring_id: String(i), truth_ids: ring[i] }))
    .concat([5, 6, 7, 8].map(k => ({ id: 'u0' + k, expected: 'ordinary', shape: null, ring_id: null, truth_ids: [], ids: bg.slice(k * 9, k * 9 + 3).map(r => r[0]) })));
  const plan = { 'sample/alpha|v1': { find: [0, 1, 2], fa: ['u05', 'u06'] }, 'sample/alpha|v2': { find: [0, 1, 2, 3], fa: ['u05'] }, 'sample/beta|v1': { find: [1, 3], fa: [] } };
  const models = [], runs = [];
  Object.keys(plan).forEach(k => {
    const [mid, ver] = k.split('|'); const p = plan[k]; models.push({ id: mid, family: 'sample', version: ver });
    units.forEach(u => {
      let verdict = 'ordinary', ids = [];
      if (u.expected === 'ring' && p.find.includes(+u.ring_id)) { verdict = 'ring'; ids = u.truth_ids.slice(); }
      if (u.expected === 'ordinary' && p.fa.includes(u.id)) { verdict = 'ring'; ids = u.ids; }
      runs.push({ run_id: mid + '_' + ver + ':' + u.id, model: mid, family: 'sample', version: ver, unit: u.id, expected: u.expected, shape: u.shape || 'none', ibm_shape: u.shape ? u.shape.toUpperCase() : null, verdict, pattern: verdict === 'ring' ? (u.shape || 'chain') : null, flagged_transfer_ids: ids, ring_accounts_flagged: [], why: 'SAMPLE: a made-up reason so the page renders without the bench file.' });
    });
  });
  return { slice: { transfers: T, key, ring_meta, sample: true }, bench: { models, runs, versions: { v1: 'SAMPLE version one', v2: 'SAMPLE version two' } }, units: { units } };
}

/* ---------- a small 3D force layout: grid-hashed repulsion, springs on account pairs, weak gravity ---------- */
function layout(N, links) {
  const rnd = seeded(20261017); const P = new Float32Array(N * 3), V = new Float32Array(N * 3), F = new Float32Array(N * 3);
  const R0 = 40 * Math.cbrt(N / 100 + 1);
  for (let i = 0; i < N; i++) { let x, y, z; do { x = rnd() * 2 - 1; y = rnd() * 2 - 1; z = rnd() * 2 - 1; } while (x * x + y * y + z * z > 1); P[i * 3] = x * R0; P[i * 3 + 1] = y * R0; P[i * 3 + 2] = z * R0; }
  const K = 7, CELL = K * 3, C2 = CELL * CELL, IT = 280; const grid = new Map();
  const ck = (x, y, z) => ((x + 512) * 1024 + (y + 512)) * 1024 + (z + 512);
  for (let it = 0; it < IT; it++) {
    const alpha = 1 - it / IT; F.fill(0); grid.clear();
    for (let i = 0; i < N; i++) { const k = ck(Math.floor(P[i * 3] / CELL), Math.floor(P[i * 3 + 1] / CELL), Math.floor(P[i * 3 + 2] / CELL)); let l = grid.get(k); if (!l) { l = []; grid.set(k, l); } l.push(i); }
    for (let i = 0; i < N; i++) {
      const cx = Math.floor(P[i * 3] / CELL), cy = Math.floor(P[i * 3 + 1] / CELL), cz = Math.floor(P[i * 3 + 2] / CELL);
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
        const l = grid.get(ck(cx + dx, cy + dy, cz + dz)); if (!l) continue;
        for (let q = 0; q < l.length; q++) {
          const j = l[q]; if (j <= i) continue;
          let ex = P[i * 3] - P[j * 3], ey = P[i * 3 + 1] - P[j * 3 + 1], ez = P[i * 3 + 2] - P[j * 3 + 2]; let d2 = ex * ex + ey * ey + ez * ez;
          if (d2 > C2) continue; if (d2 < 0.01) { ex = rnd() - .5; ey = rnd() - .5; ez = rnd() - .5; d2 = 0.01; }
          const f = K * K / d2; F[i * 3] += ex * f; F[i * 3 + 1] += ey * f; F[i * 3 + 2] += ez * f; F[j * 3] -= ex * f; F[j * 3 + 1] -= ey * f; F[j * 3 + 2] -= ez * f;
        }
      }
    }
    for (let q = 0; q < links.length; q++) {
      const u = links[q][0], v = links[q][1]; const ex = P[v * 3] - P[u * 3], ey = P[v * 3 + 1] - P[u * 3 + 1], ez = P[v * 3 + 2] - P[u * 3 + 2];
      const d = Math.sqrt(ex * ex + ey * ey + ez * ez) || 0.01; const f = (d - K) / d * 0.12;
      F[u * 3] += ex * f; F[u * 3 + 1] += ey * f; F[u * 3 + 2] += ez * f; F[v * 3] -= ex * f; F[v * 3 + 1] -= ey * f; F[v * 3 + 2] -= ez * f;
    }
    const maxStep = 0.5 + 6 * alpha;
    for (let i = 0; i < N * 3; i += 3) {
      F[i] -= P[i] * 0.006; F[i + 1] -= P[i + 1] * 0.006; F[i + 2] -= P[i + 2] * 0.006;
      let vx = (V[i] + F[i]) * 0.55, vy = (V[i + 1] + F[i + 1]) * 0.55, vz = (V[i + 2] + F[i + 2]) * 0.55;
      const len = Math.sqrt(vx * vx + vy * vy + vz * vz); if (len > maxStep) { const s = maxStep / len; vx *= s; vy *= s; vz *= s; }
      V[i] = vx; V[i + 1] = vy; V[i + 2] = vz; P[i] += vx; P[i + 1] += vy; P[i + 2] += vz;
    }
  }
  /* center, and scale so 95 percent of accounts sit within radius 100 */
  let mx = 0, my = 0, mz = 0; for (let i = 0; i < N; i++) { mx += P[i * 3]; my += P[i * 3 + 1]; mz += P[i * 3 + 2]; } mx /= N || 1; my /= N || 1; mz /= N || 1;
  const rs = []; for (let i = 0; i < N; i++) { P[i * 3] -= mx; P[i * 3 + 1] -= my; P[i * 3 + 2] -= mz; rs.push(Math.hypot(P[i * 3], P[i * 3 + 1], P[i * 3 + 2])); }
  rs.sort((a, b) => a - b); const r95 = rs[Math.floor(rs.length * .95)] || 1; const s = 100 / r95;
  for (let i = 0; i < N * 3; i++) P[i] *= s;
  return P;
}

/* ---------- boot ---------- */
async function boot() {
  if (!window.THREE) await loadScript('three.min.js');
  if (!window.THREE) { const m = $('#stageMsg'); m.hidden = false; m.textContent = 'three.js did not load from the CDN or from the local copy (three.min.js in this folder).'; return; }
  await Promise.all([loadScript(DATA + 'slice.js'), loadScript(DATA + 'bench_results.js'), loadScript(DATA + 'units.js')]);
  let sample = false;
  if (!(window.SLICE && window.SLICE.transfers && window.BENCH && window.BENCH.models && window.BENCH.runs)) {
    const s = makeSample(); window.SLICE = s.slice; window.BENCH = s.bench; window.UNITS = s.units; sample = true;
  }
  try { init(sample); } catch (e) { const m = $('#stageMsg'); m.hidden = false; m.textContent = 'The page could not draw the network: ' + e.message; throw e; }
}

function init(sample) {
  const THREE = window.THREE;
  const SL = window.SLICE, B = window.BENCH, U = window.UNITS && window.UNITS.units ? window.UNITS : null;
  if (sample) { const b = $('#srcBadge'); b.hidden = false; b.textContent = 'SAMPLE: made-up network, a data file was missing'; }

  /* transfers, sorted by time */
  const TR = SL.transfers.map(r => { const k = SL.key[r[0]] || [0, -1]; return { id: r[0], ts: r[1], from: r[2], to: r[3], paid: +r[4] || 0, cur: r[5] || '', t: parseT(r[1]), label: k[0] ? 1 : 0, ring: k[0] ? String(k[1]) : null }; });
  TR.sort((a, b) => a.t - b.t);
  const TR_T = TR.map(t => t.t);
  const BYID = {}; TR.forEach(t => BYID[t.id] = t);
  const RINGS = {}; TR.forEach(t => { if (t.label) (RINGS[t.ring] = RINGS[t.ring] || []).push(t); });
  const RING_IDS = Object.keys(RINGS).sort((a, b) => +a - +b); const NR = RING_IDS.length; const NTRUTH = TR.filter(t => t.label).length;
  const shapeOf = r => (SL.ring_meta && SL.ring_meta[r] && SL.ring_meta[r].shape) || 'other';

  /* accounts */
  const idx = {}, nodes = [];
  const nodeOf = a => { if (!(a in idx)) { idx[a] = nodes.length; nodes.push({ a, deg: 0, t: Infinity, rings: [] }); } return idx[a]; };
  TR.forEach(t => {
    const u = nodeOf(t.from), v = nodeOf(t.to); t.u = u; t.v = v; nodes[u].deg++; if (v !== u) nodes[v].deg++;
    nodes[u].t = Math.min(nodes[u].t, t.t); nodes[v].t = Math.min(nodes[v].t, t.t);
    if (t.label) { [u, v].forEach(n => { if (!nodes[n].rings.includes(t.ring)) nodes[n].rings.push(t.ring); }); }
  });
  const RING_ACCTS = new Set(nodes.filter(n => n.rings.length).map(n => n.a));
  const pairs = new Map(); TR.forEach(t => { if (t.u !== t.v) { const k = t.u < t.v ? t.u * 100000 + t.v : t.v * 100000 + t.u; pairs.set(k, [t.u, t.v]); } });
  const POS = layout(nodes.length, [...pairs.values()]);
  const DE = TR.filter(t => t.u !== t.v);   /* drawable transfers (an account paying itself has no line) */
  const lastTail = TR.length ? TR[TR.length - 1].t : SPAN;
  $('#sub').textContent = 'Accounts are spheres, transfers are lines: ' + fmtN(TR.length) + ' transfers among ' + fmtN(nodes.length) + ' accounts' + (sample ? ' (SAMPLE).' : ' from IBM\'s synthetic AMLworld file, Sep 1 to 10, 2022.');

  /* units: ring index to neighborhood, and IBM's own shape name per neighborhood */
  const RU = {}, UINFO = {};
  if (U) U.units.forEach(u => { if (u.ring_id != null && u.ring_id !== '') RU[String(u.ring_id)] = u.id; });
  B.runs.forEach(r => { if (!UINFO[r.unit]) UINFO[r.unit] = { ibm: r.ibm_shape && r.ibm_shape !== 'None' ? r.ibm_shape : null, shape: r.shape, expected: r.expected }; });
  RING_IDS.forEach(r => { if (RU[r]) return; const ids = new Set(RINGS[r].map(t => t.id)); const run = B.runs.find(x => x.expected === 'ring' && (x.flagged_transfer_ids || []).some(id => ids.has(id))); if (run) RU[r] = run.unit; });
  const ibmName = r => (RU[r] && UINFO[RU[r]] && UINFO[RU[r]].ibm) || shapeOf(r).toUpperCase();

  /* models: every number below is recounted from the runs, the same rule as ../../app.js (a group is found when at least half its labeled transfers are flagged) */
  const MODELS = B.models.map(m => ({ id: m.id, family: m.family || m.id.split('/')[0], version: m.version || 'v1', meta: m }));
  function derive(m) {
    const R = B.runs.filter(r => r.model === m.id && (r.version || 'v1') === m.version);
    const F = new Set(), flagRun = {};
    R.forEach(r => (r.flagged_transfer_ids || []).forEach(id => { if (BYID[id]) { F.add(id); if (!flagRun[id]) flagRun[id] = r; } }));
    const found = new Set(); RING_IDS.forEach(r => { const h = RINGS[r].filter(t => F.has(t.id)).length; if (h / RINGS[r].length >= .5) found.add(r); });
    let tp = 0; F.forEach(id => { if (BYID[id].label) tp++; });
    const falseRuns = R.filter(r => r.expected === 'ordinary' && r.verdict === 'ring' && (r.flagged_transfer_ids || []).length);
    const touches = r => Array.isArray(r.ring_accounts_flagged) ? r.ring_accounts_flagged.length > 0 : (r.flagged_transfer_ids || []).some(id => { const t = BYID[id]; return t && (RING_ACCTS.has(t.from) || RING_ACCTS.has(t.to)); });
    const fa = new Set(); R.filter(r => r.verdict === 'ring').forEach(r => { if (Array.isArray(r.flagged_accounts)) r.flagged_accounts.forEach(a => fa.add(a)); else (r.flagged_transfer_ids || []).forEach(id => { const t = BYID[id]; if (t) { fa.add(t.from); fa.add(t.to); } }); });
    let fin = 0; fa.forEach(a => { if (RING_ACCTS.has(a)) fin++; });
    m.R = R; m.F = F; m.flagRun = flagRun; m.found = found; m.tp = tp; m.falseRuns = falseRuns; m.g = falseRuns.filter(touches).length; m.fa = fa.size; m.fin = fin;
    m.prec = F.size ? tp / F.size : 0; m.label = prettyModel(m.id) + ' ' + m.version;
    return m;
  }
  MODELS.forEach(derive);
  const famCaught = r => [...new Set(MODELS.filter(m => m.found.has(r)).map(m => m.family))];

  /* ---------- three.js scene ---------- */
  const stage = $('#stage'), cv = $('#cv');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' }); }
  catch (e) { const m = $('#stageMsg'); m.hidden = false; m.textContent = 'This browser could not start WebGL, so the 3D network cannot draw. The roster and numbers still read from the data.'; renderer = null; }
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#14181F');
  scene.fog = new THREE.Fog('#14181F', 150, 520);
  const camera = new THREE.PerspectiveCamera(42, 1, 1, 4000);
  scene.add(new THREE.HemisphereLight(0xd6e0ec, 0x1a2130, 2.4));
  const sun = new THREE.DirectionalLight(0xffffff, 1.1); sun.position.set(1, 2, 1.5); scene.add(sun);

  const vec = i => [POS[i * 3], POS[i * 3 + 1], POS[i * 3 + 2]];
  function segGeometry(list) {
    const a = new Float32Array(list.length * 6);
    list.forEach((t, k) => { const p = vec(t.u), q = vec(t.v); a.set(p, k * 6); a.set(q, k * 6 + 3); });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(a, 3)); return g;
  }
  /* all ordinary transfers: one merged hairline geometry, revealed in time order with drawRange */
  const hair = new THREE.LineSegments(segGeometry(DE), new THREE.LineBasicMaterial({ color: COL.hair, transparent: true, opacity: 0.16, depthWrite: false }));
  hair.userData.times = DE.map(t => t.t); scene.add(hair);

  /* accounts: one instanced mesh, instances ordered by first appearance so the scrub reveals them with .count */
  const ORDER = nodes.map((n, i) => i).sort((a, b) => nodes[a].t - nodes[b].t);
  const INST = new Int32Array(nodes.length); ORDER.forEach((n, k) => INST[n] = k);
  const NODE_T = ORDER.map(n => nodes[n].t);
  const spheres = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshLambertMaterial({ color: 0xffffff }), nodes.length);
  const M4 = new THREE.Matrix4(), tmpC = new THREE.Color();
  ORDER.forEach((n, k) => { const r = 0.55 + 0.3 * Math.sqrt(nodes[n].deg); const p = vec(n); M4.makeScale(r, r, r); M4.setPosition(p[0], p[1], p[2]); spheres.setMatrixAt(k, M4); spheres.setColorAt(k, tmpC.set(COL.base)); });
  spheres.instanceMatrix.needsUpdate = true; spheres.computeBoundingSphere(); scene.add(spheres);
  const curCol = new Float32Array(nodes.length * 3), tgtCol = new Float32Array(nodes.length * 3);
  tmpC.set(COL.base); for (let i = 0; i < nodes.length; i++) { curCol.set([tmpC.r, tmpC.g, tmpC.b], i * 3); tgtCol.set([tmpC.r, tmpC.g, tmpC.b], i * 3); }

  const MAT = {
    ok: new THREE.LineBasicMaterial({ color: COL.ok, transparent: true, opacity: 0, depthWrite: false }),
    bad: new THREE.LineDashedMaterial({ color: COL.bad, transparent: true, opacity: 0, dashSize: 2.4, gapSize: 1.6, depthWrite: false }),
    miss: new THREE.LineDashedMaterial({ color: COL.miss, transparent: true, opacity: 0, dashSize: 0.55, gapSize: 1.4, depthWrite: false }),
  };
  const OPAC = { ok: 0.95, bad: 0.85, miss: 0.85, caught: 1 };
  function mkLines(list, kind) {
    const o = new THREE.LineSegments(segGeometry(list), MAT[kind].clone());
    if (kind !== 'ok') o.computeLineDistances();
    o.userData = { list, times: list.map(t => t.t), kind, target: OPAC[kind] }; o.renderOrder = 2; scene.add(o); return o;
  }
  const focus = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: COL.focus, transparent: true, opacity: 0.9, depthTest: false }));
  focus.renderOrder = 5; focus.visible = false; scene.add(focus);

  /* ---------- state ---------- */
  const S = { m: null, layers: [], fading: [], caught: null, rings: [], ringState: {}, queue: [], nextCatch: 0, scrub: Infinity, playing: false, hover: null, openUntil: 0 };
  const upper = (arr, x) => { let lo = 0, hi = arr.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (arr[mid] <= x) lo = mid + 1; else hi = mid; } return lo; };
  function applyScrub() {
    const x = S.scrub;
    hair.geometry.setDrawRange(0, upper(hair.userData.times, x) * 2);
    spheres.count = upper(NODE_T, x);
    S.layers.concat(S.fading).forEach(o => { if (o.userData.times) o.geometry.setDrawRange(0, upper(o.userData.times, x) * 2); });
    $('#when').textContent = x === Infinity ? 'Sep 10, plus the file\'s tail to ' + fmtWhen(lastTail).split(',')[0] : fmtWhen(x);
    $('#count').textContent = fmtN(upper(TR_T, x)) + ' of ' + fmtN(TR.length) + ' transfers shown';
  }

  /* ---------- caught layer: one dynamic geometry holding every found ring's flagged lines ---------- */
  function buildCaught(m) {
    const segs = [], ranges = {};
    S.rings = RING_IDS.filter(r => m.found.has(r)).map(r => {
      const list = RINGS[r].filter(t => t.u !== t.v && m.F.has(t.id)); const tc = Math.max(...RINGS[r].filter(t => m.F.has(t.id)).map(t => t.t));
      ranges[r] = [segs.length, list.length]; list.forEach(t => segs.push(t)); return { r, tc, list };
    }).sort((a, b) => a.tc - b.tc);
    const g = new THREE.BufferGeometry(); const arr = new Float32Array(Math.max(1, segs.length) * 6);
    segs.forEach((t, k) => { const p = vec(t.u); arr.set(p, k * 6); arr.set(p, k * 6 + 3); });
    const attr = new THREE.BufferAttribute(arr, 3); attr.setUsage(THREE.DynamicDrawUsage); g.setAttribute('position', attr); g.setDrawRange(0, segs.length * 2);
    const o = new THREE.LineSegments(g, MAT.ok.clone()); o.userData = { list: segs, kind: 'caught', target: OPAC.caught, ranges }; o.renderOrder = 3; scene.add(o);
    S.ringState = {}; S.rings.forEach(x => S.ringState[x.r] = { start: null, done: false, card: null });
    return o;
  }
  function writeCaught(now) {
    const o = S.caught; if (!o) return false; const arr = o.geometry.attributes.position.array; let busy = false, dirty = false;
    S.rings.forEach(x => {
      const st = S.ringState[x.r]; if (st.done) return;
      const [s0, n] = o.userData.ranges[x.r];
      const p = st.start == null ? 0 : REDUCED() ? 1 : (now - st.start) / RESOLVE_MS;
      for (let k = 0; k < n; k++) {
        const t = o.userData.list[s0 + k]; const d = n > 1 ? 0.4 * k / (n - 1) : 0; const q = easeOut((p - d) / 0.6);
        const a = vec(t.u), b = vec(t.v); arr[(s0 + k) * 6 + 3] = a[0] + (b[0] - a[0]) * q; arr[(s0 + k) * 6 + 4] = a[1] + (b[1] - a[1]) * q; arr[(s0 + k) * 6 + 5] = a[2] + (b[2] - a[2]) * q;
      }
      dirty = true;
      if (st.start != null && p >= 1) st.done = true; else if (st.start != null) busy = true;
      if (st.start == null) st.done = true;   /* collapsed and parked until caught */
    });
    if (dirty) o.geometry.attributes.position.needsUpdate = true;
    return busy;
  }

  /* ---------- sphere colors: caught ring members green, false-alarm endpoints red, missed endpoints amber ---------- */
  let NODE_BAD = new Set(), NODE_MISS = new Set();
  function nodeTargets() {
    const ok = new Set(); S.rings.forEach(x => { const st = S.ringState[x.r]; if (st && st.start != null) RINGS[x.r].forEach(t => { ok.add(t.u); ok.add(t.v); }); });
    const c = new THREE.Color();
    for (let i = 0; i < nodes.length; i++) {
      c.set(ok.has(i) ? COL.ok : NODE_BAD.has(i) ? COL.bad : NODE_MISS.has(i) ? COL.miss : COL.base);
      tgtCol[i * 3] = c.r; tgtCol[i * 3 + 1] = c.g; tgtCol[i * 3 + 2] = c.b;
    }
  }
  function stepColors(dt) {
    const k = REDUCED() ? 1 : 1 - Math.exp(-dt / FADE_TAU); let moved = false;
    for (let i = 0; i < nodes.length; i++) {
      let ch = false;
      for (let c = 0; c < 3; c++) { const j = i * 3 + c; const d = tgtCol[j] - curCol[j]; if (Math.abs(d) > 0.002) { curCol[j] += d * k; ch = true; } else if (d !== 0) { curCol[j] = tgtCol[j]; ch = true; } }
      if (ch) { tmpC.setRGB(curCol[i * 3], curCol[i * 3 + 1], curCol[i * 3 + 2]); spheres.setColorAt(INST[i], tmpC); moved = true; }
    }
    if (moved) spheres.instanceColor.needsUpdate = true;
  }

  /* ---------- select a model: cross-fade the lit layers, reset the roster, queue the catches ---------- */
  function selectModel(m) {
    S.m = m;
    S.layers.forEach(o => { o.userData.target = 0; S.fading.push(o); });
    if (S.caught) { S.caught.userData.target = 0; S.fading.push(S.caught); }
    const ok = [], bad = [], miss = [];
    DE.forEach(t => { const fl = m.F.has(t.id); if (t.label) { if (fl) { if (!m.found.has(t.ring)) ok.push(t); } else miss.push(t); } else if (fl) bad.push(t); });
    NODE_BAD = new Set(); bad.forEach(t => { NODE_BAD.add(t.u); NODE_BAD.add(t.v); });
    NODE_MISS = new Set(); miss.forEach(t => { NODE_MISS.add(t.u); NODE_MISS.add(t.v); });
    S.layers = [mkLines(ok, 'ok'), mkLines(bad, 'bad'), mkLines(miss, 'miss')];
    S.caught = buildCaught(m);
    S.queue = []; clearRoster(); writeCaught(performance.now()); nodeTargets(); applyScrub(); renderResult(); renderPicker(); setHover(null);
  }

  /* ---------- the result copy: lead with what was caught; one limit line; end on the strongest true number ---------- */
  function renderResult() {
    const m = S.m;
    $('#headline').innerHTML = esc(m.label) + ' caught <b class="ok">' + m.found.size + '</b> of ' + (sample ? 'the SAMPLE\'s ' : 'IBM\'s ') + NR + ' laundering rings and traced <b class="ok">' + m.tp + '</b> of ' + NTRUTH + ' laundering transfers; it raised <b>' + m.falseRuns.length + '</b> alarm' + (m.falseRuns.length === 1 ? '' : 's') + ' on ordinary neighborhoods, <b>' + m.g + '</b> of them on accounts that sit inside a ring.';
    $('#limit').textContent = 'One run per model on a ten-day cut of IBM\'s synthetic file; the labels are IBM\'s generator\'s, the shape names are ours.';
    const ringShare = NR ? m.found.size / NR : 0, acctShare = m.fa ? m.fin / m.fa : 0;
    if (m.fa && acctShare > ringShare) $('#strong').innerHTML = '<b>' + Math.round(acctShare * 100) + '%</b>of the accounts it flagged sit inside one of IBM\'s rings (' + fmtN(m.fin) + ' of ' + fmtN(m.fa) + ').';
    else $('#strong').innerHTML = '<b>' + m.found.size + ' of ' + NR + '</b>rings caught, each one carded below.';
    const ver = (B.versions || {})[m.version]; $('#vnote').textContent = ver ? m.version + ': ' + ver : '';
    $('#rosterCount').textContent = '0 of ' + NR;
  }

  /* ---------- picker: model (grouped by family) and version ---------- */
  const pick = $('#modelPick');
  const byName = {}; MODELS.forEach(m => (byName[m.id] = byName[m.id] || []).push(m));
  const fams = [...new Set(MODELS.map(m => m.family))];
  pick.innerHTML = fams.map(f => '<optgroup label="' + esc(famName(f)) + '">' + Object.keys(byName).filter(id => byName[id][0].family === f).map(id => '<option value="' + esc(id) + '">' + esc(prettyModel(id)) + '</option>').join('') + '</optgroup>').join('');
  function renderPicker() {
    pick.value = S.m.id;
    $('#versions').innerHTML = byName[S.m.id].map(m => '<button type="button" data-v="' + esc(m.version) + '" aria-pressed="' + (m === S.m) + '">' + esc(m.version) + '</button>').join('');
  }
  pick.addEventListener('change', () => { const list = byName[pick.value]; selectModel(list.find(m => m.version === S.m.version) || list[0]); });
  $('#versions').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; const m = byName[S.m.id].find(x => x.version === b.dataset.v); if (m && m !== S.m) selectModel(m); });

  /* ---------- the caught roster ---------- */
  const roster = $('#roster');
  function clearRoster() { roster.querySelectorAll('.rcard').forEach(c => c.remove()); document.querySelectorAll('.fly').forEach(f => f.remove()); $('#rosterEmpty').hidden = false; }
  function project(i) { const v = new THREE.Vector3(...vec(i)).project(camera); const r = cv.getBoundingClientRect(); return [(v.x + 1) / 2 * r.width + r.left, (1 - v.y) / 2 * r.height + r.top, v.z]; }
  function miniSvg(r, w, h) {
    const ts = RINGS[r].filter(t => t.u !== t.v); const ns = new Set(); ts.forEach(t => { ns.add(t.u); ns.add(t.v); });
    const P = {}; ns.forEach(n => P[n] = project(n));
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; ns.forEach(n => { x0 = Math.min(x0, P[n][0]); x1 = Math.max(x1, P[n][0]); y0 = Math.min(y0, P[n][1]); y1 = Math.max(y1, P[n][1]); });
    const pad = 5, s = Math.min((w - 2 * pad) / Math.max(x1 - x0, 1), (h - 2 * pad) / Math.max(y1 - y0, 1));
    const ox = (w - (x1 - x0) * s) / 2, oy = (h - (y1 - y0) * s) / 2; const X = n => ((P[n][0] - x0) * s + ox).toFixed(1), Y = n => ((P[n][1] - y0) * s + oy).toFixed(1);
    const F = S.m.F;
    const lines = ts.map(t => F.has(t.id) ? '<line x1="' + X(t.u) + '" y1="' + Y(t.u) + '" x2="' + X(t.v) + '" y2="' + Y(t.v) + '" stroke="' + COL.ok + '" stroke-width="1.6"/>' : '<line x1="' + X(t.u) + '" y1="' + Y(t.u) + '" x2="' + X(t.v) + '" y2="' + Y(t.v) + '" stroke="' + COL.miss + '" stroke-width="1.4" stroke-dasharray="1 3"/>').join('');
    const dots = [...ns].map(n => '<circle cx="' + X(n) + '" cy="' + Y(n) + '" r="1.8" fill="#C9D2DD"/>').join('');
    return { svg: '<svg class="mini" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" aria-hidden="true">' + lines + dots + '</svg>', box: [x0, y0, x1, y1] };
  }
  function money(r) {
    const by = {}; RINGS[r].forEach(t => by[t.cur] = (by[t.cur] || 0) + t.paid); const k = Object.keys(by).sort((a, b) => by[b] - by[a]);
    return k.length ? fmtN(Math.round(by[k[0]])) + ' ' + k[0] + (k.length > 1 ? ' + ' + (k.length - 1) + ' other currenc' + (k.length > 2 ? 'ies' : 'y') : '') : '';
  }
  const oneLine = w => { if (!w) return 'No reason recorded for this run.'; const m = String(w).match(/^.*?[.!?](\s|$)/); return (m ? m[0] : String(w)).trim(); };
  const runFor = (m, r) => m.R.find(x => x.unit === RU[r]);
  function addCard(r, animate) {
    const m = S.m; $('#rosterEmpty').hidden = true;
    const accts = new Set(); RINGS[r].forEach(t => { accts.add(t.from); accts.add(t.to); });
    const others = famCaught(r).filter(f => f !== m.family).map(famName);
    const run = runFor(m, r); const why = run && run.why;
    const mini = miniSvg(r, 64, 44);
    const card = document.createElement('article'); card.className = 'rcard' + (animate ? ' enter' : ''); card.dataset.ring = r;
    card.innerHTML = mini.svg + '<div class="rc-t" title="IBM\'s shape name">' + esc(ibmName(r)) + '</div>' +
      '<div class="rc-m">' + accts.size + ' accounts · ' + RINGS[r].length + ' transfer' + (RINGS[r].length === 1 ? '' : 's') + '</div><div class="rc-m rc-money" title="money moved">' + esc(money(r)) + '</div>' +
      '<div class="rc-b"><div class="rc-fam">' + (others.length ? 'Also caught by ' + esc(others.join(', ')) : 'No other family caught it') + '</div><div class="rc-why" title="' + esc(why || '') + '">' + esc(oneLine(why)) + '</div></div>';
    card.addEventListener('mouseenter', () => setHover({ kind: 'ring', r }, card.getBoundingClientRect()));
    card.addEventListener('mouseleave', () => setHover(null));
    roster.appendChild(card);
    const before = roster.scrollLeft; roster.scrollLeft = roster.scrollWidth;
    if (animate && !REDUCED()) {
      const target = card.querySelector('.mini'); target.classList.add('wait');
      const tr = target.getBoundingClientRect(); const [x0, y0, x1, y1] = mini.box; const sr = stage.getBoundingClientRect();
      const onScreen = x1 > sr.left && x0 < sr.right && y1 > sr.top && y0 < sr.bottom;
      const bw = Math.max(x1 - x0, 48), bh = Math.max(y1 - y0, 34); const bx = onScreen ? (x0 + x1) / 2 - bw / 2 : sr.left + sr.width / 2 - bw / 2, by = onScreen ? (y0 + y1) / 2 - bh / 2 : sr.top + sr.height / 2 - bh / 2;
      const fly = document.createElement('div'); fly.className = 'fly'; fly.innerHTML = mini.svg; fly.style.left = tr.left + 'px'; fly.style.top = tr.top + 'px'; document.body.appendChild(fly);
      const anim = fly.animate([{ transform: 'translate(' + (bx - tr.left) + 'px,' + (by - tr.top) + 'px) scale(' + (bw / 64) + ',' + (bh / 44) + ')', opacity: 0.95 }, { transform: 'none', opacity: 1 }], { duration: FLY_MS, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'both' });
      anim.onfinish = () => { target.classList.remove('wait'); fly.remove(); };
    }
    void before;
    return card;
  }
  function updateRosterCount() { let k = 0; S.rings.forEach(x => { if (S.ringState[x.r].start != null) k++; }); $('#rosterCount').textContent = k + ' of ' + NR; }
  function catchRing(r, now, animate) { const st = S.ringState[r]; st.start = animate ? now : now - RESOLVE_MS; st.done = false; st.card = addCard(r, animate); nodeTargets(); updateRosterCount(); }
  function uncatch(r) { const st = S.ringState[r]; st.start = null; st.done = false; if (st.card) st.card.remove(); st.card = null; if (!roster.querySelector('.rcard')) $('#rosterEmpty').hidden = false; nodeTargets(); updateRosterCount(); }
  function stepCatches(now) {
    S.rings.forEach(x => {
      const st = S.ringState[x.r]; const due = S.scrub >= x.tc;
      if (due && st.start == null && !S.queue.includes(x.r)) S.queue.push(x.r);
      if (!due) { const qi = S.queue.indexOf(x.r); if (qi >= 0) S.queue.splice(qi, 1); if (st.start != null) uncatch(x.r); }
    });
    if (now < S.openUntil - 500) return;   /* let the opening move settle before the first catch */
    while (S.queue.length && (REDUCED() || now >= S.nextCatch)) { catchRing(S.queue.shift(), now, !REDUCED()); S.nextCatch = now + CATCH_GAP; }
  }

  /* ---------- hover card ---------- */
  const hc = $('#hover');
  function idsHtml(list, cls) { const max = 24; return list.slice(0, max).map(x => '<span class="' + cls(x) + '">' + esc(x.id) + '</span>').join(' ') + (list.length > max ? ' <span>+' + (list.length - max) + ' more</span>' : ''); }
  function setHover(h, rect, mx, my) {
    S.hover = h;
    if (!h) { hc.hidden = true; focus.visible = false; return; }
    const m = S.m; let html = '', seg = [];
    if (h.kind === 'ring') {
      const r = h.r; const ids = RINGS[r]; const hit = ids.filter(t => m.F.has(t.id)).length; const st = S.ringState[r];
      const status = m.found.has(r) ? (st && st.start != null ? '<b class="s-ok">caught</b>' : '<b class="s-ok">found</b>, it lands when its last flagged transfer arrives') : hit ? '<b class="s-miss">partly traced</b>, ' + hit + ' of ' + ids.length + ' transfers' : '<b class="s-miss">missed</b>';
      const run = runFor(m, r); const accts = new Set(); ids.forEach(t => { accts.add(t.from); accts.add(t.to); });
      html = '<div class="hc-k">IBM group ' + esc(r) + (RU[r] ? ' · neighborhood ' + esc(RU[r]) : '') + ' · ' + status + '</div><div class="hc-t">' + esc(ibmName(r)) + '</div>' +
        '<div class="hc-s">our shape name: ' + esc(shapeOf(r)) + ' · ' + ids.length + ' transfers among ' + accts.size + ' accounts · ' + esc(money(r)) + '</div>' +
        '<p class="hc-why">' + esc(run && run.why ? oneLine(run.why) : 'No run recorded for this group.') + '</p>' +
        '<div class="hc-ids">' + idsHtml(ids, t => m.F.has(t.id) ? 'i-ok' : 'i-miss') + '</div>';
      seg = ids.filter(t => t.u !== t.v);
    } else {
      const run = h.run; const ids = (run.flagged_transfer_ids || []).filter(id => BYID[id]).map(id => BYID[id]); const lab = ids.filter(t => t.label).length;
      const ra = Array.isArray(run.ring_accounts_flagged) ? run.ring_accounts_flagged.length : 0;
      html = '<div class="hc-k"><b class="s-bad">false alarm</b> · neighborhood ' + esc(run.unit) + '</div><div class="hc-t">' + esc(run.pattern && run.pattern !== 'other' ? 'Called it ' + (/^[aeiou]/i.test(run.pattern) ? 'an ' : 'a ') + run.pattern : 'Called it a ring, no named shape') + '</div>' +
        '<div class="hc-s">IBM labels ' + (ids.length - lab) + ' of these ' + ids.length + ' transfers ordinary' + (ra ? ' · ' + ra + ' of the flagged accounts sit inside an IBM ring' : '') + '</div>' +
        '<p class="hc-why">' + esc(oneLine(run.why)) + '</p><div class="hc-ids">' + idsHtml(ids, t => t.label ? 'i-ok' : 'i-bad') + '</div>';
      seg = ids.filter(t => t.u !== t.v);
    }
    hc.innerHTML = html; hc.hidden = false; placeCard(rect, mx, my);
    focus.geometry.dispose(); focus.geometry = segGeometry(seg); focus.visible = seg.length > 0;
  }
  function placeCard(rect, mx, my) {
    const W = window.innerWidth, H = window.innerHeight, cw = hc.offsetWidth, ch = hc.offsetHeight;
    let x, y; if (rect) { x = rect.left; y = rect.top - ch - 10; } else { x = mx + 16; y = my + 16; if (x + cw > W - 8) x = mx - cw - 16; if (y + ch > H - 8) y = my - ch - 16; }
    hc.style.left = Math.max(8, Math.min(W - cw - 8, x)) + 'px'; hc.style.top = Math.max(8, Math.min(H - ch - 8, y)) + 'px';
  }
  const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2(); let mouse = null, mouseMoved = false;
  function pickAt(mx, my) {
    const r = cv.getBoundingClientRect(); ndc.set((mx - r.left) / r.width * 2 - 1, -(my - r.top) / r.height * 2 + 1);
    ray.setFromCamera(ndc, camera); ray.params.Line.threshold = cam.radius * 0.007;
    const targets = [S.caught].concat(S.layers).filter(Boolean);
    const hits = ray.intersectObjects(targets, false);
    for (const h of hits) {
      const o = h.object; const t = o.userData.list[Math.floor(h.index / 2)]; if (!t) continue;
      if (o === S.caught) { const st = S.ringState[t.ring]; if (!st || st.start == null) continue; }
      if (t.label) return { kind: 'ring', r: t.ring }; const run = S.m.flagRun[t.id]; if (run) return { kind: 'false', run };
    }
    const sh = ray.intersectObject(spheres, false)[0];
    if (sh) { const n = nodes[ORDER[sh.instanceId]]; if (n && n.rings.length) return { kind: 'ring', r: n.rings[0] }; }
    return null;
  }

  /* ---------- orbit camera with damping (no auto moves except the one opening) ---------- */
  const cam = { theta: 0.6, phi: 1.15, radius: 300, target: new THREE.Vector3(), vT: 0, vP: 0, goalR: 300, home: null };
  function fitRadius() { const w = stage.clientWidth || 800, h = stage.clientHeight || 500; const vf = camera.fov * Math.PI / 360; const hf = Math.atan(Math.tan(vf) * (w / h)); return 112 / Math.sin(Math.min(vf, hf)); }
  function resize() { const w = stage.clientWidth || 800, h = stage.clientHeight || 500; if (renderer) { renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.setSize(w, h, false); } camera.aspect = w / h; camera.updateProjectionMatrix(); }
  function placeCamera() {
    const sp = Math.sin(cam.phi); camera.position.set(cam.target.x + cam.radius * sp * Math.sin(cam.theta), cam.target.y + cam.radius * Math.cos(cam.phi), cam.target.z + cam.radius * sp * Math.cos(cam.theta));
    camera.lookAt(cam.target); scene.fog.near = Math.max(10, cam.radius - 90); scene.fog.far = cam.radius + 260;
  }
  let drag = null;
  cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, pan: e.button === 2 || e.shiftKey }; cv.setPointerCapture(e.pointerId); cv.classList.add('dragging'); S.openUntil = 0; cam.open = null; });
  cv.addEventListener('pointermove', e => {
    mouse = [e.clientX, e.clientY]; mouseMoved = true;
    if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
    if (drag.pan) { const k = cam.radius * 0.0012; const right = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0), up = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 1); cam.target.addScaledVector(right, -dx * k).addScaledVector(up, dy * k); }
    else { cam.vT = -dx * 0.0055; cam.vP = -dy * 0.0055; }
  });
  const endDrag = e => { if (!drag) return; drag = null; cv.classList.remove('dragging'); try { cv.releasePointerCapture(e.pointerId); } catch (err) { /* already released */ } };
  cv.addEventListener('pointerup', endDrag); cv.addEventListener('pointercancel', endDrag);
  cv.addEventListener('pointerleave', () => { mouse = null; if (S.hover && !drag) setHover(null); });
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('wheel', e => { e.preventDefault(); cam.goalR = Math.max(30, Math.min(1400, cam.goalR * Math.exp(e.deltaY * 0.0012))); cam.open = null; }, { passive: false });
  cv.addEventListener('dblclick', () => { cam.target.set(0, 0, 0); cam.goalR = cam.home; cam.vT = cam.vP = 0; });

  /* ---------- scrub and play ---------- */
  const scrubEl = $('#scrub'), playBtn = $('#play');
  $('#ticks').innerHTML = Array.from({ length: 10 }, (_, i) => '<span>Sep ' + (i + 1) + '</span>').join('');
  const setScrub = v => { S.scrub = v >= 1000 ? Infinity : v / 1000 * SPAN; applyScrub(); };
  scrubEl.addEventListener('input', () => { stopPlay(); setScrub(+scrubEl.value); });
  function stopPlay() { S.playing = false; playBtn.textContent = S.scrub === Infinity ? 'Play the ten days' : 'Resume'; }
  playBtn.addEventListener('click', () => {
    if (S.playing) { stopPlay(); return; }
    if (S.scrub === Infinity) { S.scrub = 0; scrubEl.value = 0; applyScrub(); }
    S.playing = true; S.lastStep = performance.now(); playBtn.textContent = 'Pause';
  });
  function stepPlay(now, dt) {
    if (!S.playing) return;
    if (REDUCED()) { if (now - S.lastStep < 900) return; S.lastStep = now; S.scrub = Math.floor(S.scrub / DAY + 1) * DAY; }
    else S.scrub += dt * SPAN / PLAY_MS;
    if (S.scrub >= SPAN) { S.scrub = Infinity; S.playing = false; playBtn.textContent = 'Play the ten days'; }
    scrubEl.value = S.scrub === Infinity ? 1000 : Math.round(S.scrub / SPAN * 1000); applyScrub();
  }

  /* ---------- frame loop ---------- */
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(64, now - last); last = now;
    stepPlay(now, dt); stepCatches(now);
    /* camera: the opening move, then damped orbit */
    if (cam.open) { const p = easeOut((now - cam.open.t0) / OPEN_MS); cam.radius = cam.open.r0 + (cam.home - cam.open.r0) * p; cam.goalR = cam.radius; cam.theta = cam.open.th0 + (cam.open.th1 - cam.open.th0) * p; cam.phi = cam.open.ph0 + (cam.open.ph1 - cam.open.ph0) * p; if (p >= 1) cam.open = null; }
    else {
      cam.theta += cam.vT; cam.phi = Math.max(0.15, Math.min(Math.PI - 0.15, cam.phi + cam.vP));
      const decay = Math.pow(0.86, dt / 16.7); cam.vT *= decay; cam.vP *= decay; if (drag && !drag.pan) { cam.vT *= 0.5; cam.vP *= 0.5; }
      cam.radius += (cam.goalR - cam.radius) * (1 - Math.pow(0.82, dt / 16.7));
    }
    placeCamera();
    /* layer opacities: exponential ease-out toward each target */
    const k = REDUCED() ? 1 : 1 - Math.exp(-dt / FADE_TAU);
    S.layers.concat(S.caught ? [S.caught] : [], S.fading).forEach(o => { o.material.opacity += (o.userData.target - o.material.opacity) * k; });
    S.fading = S.fading.filter(o => { if (o.material.opacity < 0.01) { scene.remove(o); o.geometry.dispose(); o.material.dispose(); return false; } return true; });
    writeCaught(now);   /* touches only rings still resolving or not yet parked */
    stepColors(dt);
    if (mouse && mouseMoved && !drag && renderer) { mouseMoved = false; const h = pickAt(mouse[0], mouse[1]); const same = h && S.hover && h.kind === S.hover.kind && h.r === S.hover.r && h.run === S.hover.run; if (!same) setHover(h, null, mouse[0], mouse[1]); else placeCard(null, mouse[0], mouse[1]); }
    if (renderer) renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  /* ---------- start ---------- */
  resize(); cam.home = fitRadius(); cam.radius = cam.goalR = cam.home;
  if ('ResizeObserver' in window) new ResizeObserver(() => { resize(); }).observe(stage); else window.addEventListener('resize', resize);
  const strength = m => m.found.size + m.prec * NR;
  const first = MODELS.slice().sort((a, b) => strength(b) - strength(a))[0];
  if (!REDUCED()) { cam.open = { t0: performance.now(), r0: cam.home * 1.75, th0: cam.theta - 0.7, th1: cam.theta, ph0: 0.55, ph1: cam.phi }; S.openUntil = performance.now() + OPEN_MS; }
  if (first) selectModel(first); else $('#headline').textContent = 'No models in the bench output yet.';
  $('#foot').textContent = (sample ? 'SAMPLE data, made up in the page. ' : 'Data: ' + DATA + 'slice.js, bench_results.js, units.js. ') + 'Numbers are recounted in the page from the runs: a group counts as caught when at least half its labeled transfers are flagged.';
  window.__night3d = { S, MODELS, NR, sample, info: () => renderer ? renderer.info.render.calls : 0 };   /* for inspection and screenshots */
  requestAnimationFrame(frame);
}

/* any uncaught error is written into the page (data-errors on <body>) so a headless check can read it */
window.addEventListener('error', e => { document.body.dataset.errors = (document.body.dataset.errors || '') + ' | ' + (e.message || 'error') + ' @' + (e.lineno || '?'); });
window.addEventListener('unhandledrejection', e => { document.body.dataset.errors = (document.body.dataset.errors || '') + ' | ' + String(e.reason && e.reason.message || e.reason); });
boot();
})();
