/* Rings at night: a three-dimensional reading of the Rings bench, loop 1 (clear first).
   By default only IBM's twenty labeled groups are drawn, each laid out by its shape on a sparse grid.
   The 1,797-account crowd is one toggle away, as faint dust behind the groups.
   Inputs (same grammar as ../../app.js): ../../../data/slice.js (window.SLICE), bench_results.js (window.BENCH),
   units.js (window.UNITS). When slice or bench is missing the page builds a small made-up SAMPLE and says so. */
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

/* timings (README lists them); all ease-out, all dropped under prefers-reduced-motion */
const OPEN_MS = 1000;      /* the one opening camera move */
const TAU = 75;            /* model switch and crowd toggle: colors and opacities settle in about 320 ms */
const RESOLVE_MS = 450;    /* the catch: the ring's lines draw from source to target */
const FLY_MS = 620;        /* the catch: a copy of the shape travels into its roster card */
const CATCH_GAP = 120;     /* between consecutive catches */
const PLAY_MS = 14000;     /* ten days of transfers */

const COL = { node: '#A7B2C1', ok: '#63C58D', building: '#3B6E52', pending: '#5E6878', miss: '#E9B44C', bad: '#EE7A72', dust: '#8FA3B8' };
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
  ring.push([add(130, 131, 20000, 9000, 3)]);
  [100, 110, 120, 127, 130, 131].forEach(a => add(a, Math.floor(rnd() * 90), 200 + rnd() * 800, Math.floor(rnd() * SPAN), -1));
  const shapes = ['cycle', 'fan-out', 'fan-in', 'lone'];
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
      runs.push({ run_id: mid + '_' + ver + ':' + u.id, model: mid, family: 'sample', version: ver, unit: u.id, expected: u.expected, shape: u.shape || 'none', ibm_shape: u.shape && u.shape !== 'lone' ? u.shape.toUpperCase() : (u.shape ? 'no named shape' : null), verdict, pattern: verdict === 'ring' ? (u.shape || 'chain') : null, flagged_transfer_ids: ids, ring_accounts_flagged: [], why: 'SAMPLE: a made-up reason so the page renders without the bench file.' });
    });
  });
  return { slice: { transfers: T, key, ring_meta, sample: true }, bench: { models, runs, versions: { v1: 'SAMPLE version one', v2: 'SAMPLE version two' } }, units: { units } };
}

/* ---------- the crowd's layout: grid-hashed repulsion, springs, ring accounts pinned to their groups, crowd kept behind ---------- */
function crowdLayout(N, links, pinned, pinPos) {
  const rnd = seeded(20261017); const P = new Float32Array(N * 3), V = new Float32Array(N * 3), F = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    if (pinned[i]) { P[i * 3] = pinPos[i * 3]; P[i * 3 + 1] = pinPos[i * 3 + 1]; P[i * 3 + 2] = pinPos[i * 3 + 2]; continue; }
    P[i * 3] = (rnd() * 2 - 1) * 200; P[i * 3 + 1] = (rnd() * 2 - 1) * 140; P[i * 3 + 2] = -40 - rnd() * 140;
  }
  const K = 9, CELL = K * 3, C2 = CELL * CELL, IT = 220; const grid = new Map();
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
      const d = Math.sqrt(ex * ex + ey * ey + ez * ez) || 0.01; const f = (d - K) / d * 0.1;
      F[u * 3] += ex * f; F[u * 3 + 1] += ey * f; F[u * 3 + 2] += ez * f; F[v * 3] -= ex * f; F[v * 3 + 1] -= ey * f; F[v * 3 + 2] -= ez * f;
    }
    const maxStep = 0.5 + 6 * alpha;
    for (let i = 0; i < N; i++) {
      if (pinned[i]) continue; const b = i * 3;
      F[b] -= P[b] * 0.004; F[b + 1] -= P[b + 1] * 0.006; F[b + 2] -= (P[b + 2] + 100) * 0.006;
      let vx = (V[b] + F[b]) * 0.55, vy = (V[b + 1] + F[b + 1]) * 0.55, vz = (V[b + 2] + F[b + 2]) * 0.55;
      const len = Math.sqrt(vx * vx + vy * vy + vz * vz); if (len > maxStep) { const s = maxStep / len; vx *= s; vy *= s; vz *= s; }
      V[b] = vx; V[b + 1] = vy; V[b + 2] = vz; P[b] += vx; P[b + 1] += vy; P[b + 2] = Math.min(-30, P[b + 2] + vz);
    }
  }
  return P;
}

/* ---------- boot ---------- */
async function boot() {
  if (!window.THREE) await loadScript('three.min.js');
  if (!window.THREE) { const m = $('#stageMsg'); m.hidden = false; m.textContent = 'three.js did not load: three.min.js is missing from this folder.'; return; }
  await Promise.all([loadScript(DATA + 'slice.js'), loadScript(DATA + 'bench_results.js'), loadScript(DATA + 'units.js')]);
  let sample = false;
  if (!(window.SLICE && window.SLICE.transfers && window.BENCH && window.BENCH.models && window.BENCH.runs)) {
    const s = makeSample(); window.SLICE = s.slice; window.BENCH = s.bench; window.UNITS = s.units; sample = true;
  }
  init(sample);
}

function init(sample) {
  const THREE = window.THREE;
  const SL = window.SLICE, B = window.BENCH, U = window.UNITS && window.UNITS.units ? window.UNITS : null;
  if (sample) { const b = $('#srcBadge'); b.hidden = false; b.textContent = 'SAMPLE: made-up network, a data file was missing'; }

  /* transfers sorted by time; labeled groups; accounts */
  const TR = SL.transfers.map(r => { const k = SL.key[r[0]] || [0, -1]; return { id: r[0], from: r[2], to: r[3], paid: +r[4] || 0, cur: r[5] || '', t: parseT(r[1]), label: k[0] ? 1 : 0, ring: k[0] ? String(k[1]) : null }; });
  TR.sort((a, b) => a.t - b.t);
  const BYID = {}; TR.forEach(t => BYID[t.id] = t);
  const RINGS = {}; TR.forEach(t => { if (t.label) (RINGS[t.ring] = RINGS[t.ring] || []).push(t); });
  const RING_IDS = Object.keys(RINGS).sort((a, b) => +a - +b); const NR = RING_IDS.length; const NTRUTH = TR.filter(t => t.label).length;
  const shapeOf = r => (SL.ring_meta && SL.ring_meta[r] && SL.ring_meta[r].shape) || 'other';
  const idx = {}, nodes = [];
  const nodeOf = a => { if (!(a in idx)) { idx[a] = nodes.length; nodes.push({ a, t: Infinity, ring: null }); } return idx[a]; };
  TR.forEach(t => { t.u = nodeOf(t.from); t.v = nodeOf(t.to); nodes[t.u].t = Math.min(nodes[t.u].t, t.t); nodes[t.v].t = Math.min(nodes[t.v].t, t.t); if (t.label) { if (nodes[t.u].ring == null) nodes[t.u].ring = t.ring; if (nodes[t.v].ring == null) nodes[t.v].ring = t.ring; } });
  const RING_ACCTS = new Set(nodes.filter(n => n.ring != null).map(n => n.a));
  const lastTail = TR.length ? TR[TR.length - 1].t : SPAN;

  /* units: ring index to neighborhood; IBM's own shape name per neighborhood */
  const RU = {}, UINFO = {};
  if (U) U.units.forEach(u => { if (u.ring_id != null && u.ring_id !== '') RU[String(u.ring_id)] = u.id; });
  B.runs.forEach(r => { if (!UINFO[r.unit]) UINFO[r.unit] = { ibm: r.ibm_shape && r.ibm_shape !== 'None' ? r.ibm_shape : null }; });
  RING_IDS.forEach(r => { if (RU[r]) return; const ids = new Set(RINGS[r].map(t => t.id)); const run = B.runs.find(x => x.expected === 'ring' && (x.flagged_transfer_ids || []).some(id => ids.has(id))); if (run) RU[r] = run.unit; });
  const ibmRaw = r => (RU[r] && UINFO[RU[r]] && UINFO[RU[r]].ibm) || null;
  const sentence = s => { s = String(s || '').toLowerCase(); return s.charAt(0).toUpperCase() + s.slice(1); };
  const ibmName = r => sentence(ibmRaw(r) || shapeOf(r));   /* IBM's own name from the run's ibm_shape, in sentence case */
  const cardName = r => ibmName(r);

  /* models, recounted from the runs with the flat page's rule: a group is found when at least half its labeled transfers are flagged */
  const MODELS = B.models.map(m => ({ id: m.id, family: m.family || m.id.split('/')[0], version: m.version || 'v1', row: m }));
  const UR = {}; Object.keys(RU).forEach(r => UR[RU[r]] = r);
  MODELS.forEach(m => {
    const R = B.runs.filter(r => r.model === m.id && (r.version || 'v1') === m.version);
    const F = new Set(), flagRun = {};
    R.forEach(r => (r.flagged_transfer_ids || []).forEach(id => { if (BYID[id]) { F.add(id); if (!flagRun[id]) flagRun[id] = r; } }));
    /* caught = the engine's own ring_found per run (it also rules out sweeps); recount only when the field is absent */
    const found = new Set(); const hasRF = R.some(r => typeof r.ring_found === 'boolean');
    if (hasRF) R.forEach(r => { if (r.ring_found === true && UR[r.unit] != null) found.add(UR[r.unit]); });
    else RING_IDS.forEach(r => { const h = RINGS[r].filter(t => F.has(t.id)).length; if (h / RINGS[r].length >= .5) found.add(r); });
    let tp = 0; F.forEach(id => { if (BYID[id].label) tp++; });
    if (m.row && typeof m.row.tp === 'number' && m.row.tp <= NTRUTH) tp = m.row.tp;
    m.rowFound = m.row && typeof m.row.rings_found === 'number' ? m.row.rings_found : null;
    const falseRuns = R.filter(r => r.expected === 'ordinary' && r.verdict === 'ring' && (r.flagged_transfer_ids || []).length);
    const touches = r => Array.isArray(r.ring_accounts_flagged) ? r.ring_accounts_flagged.length > 0 : (r.flagged_transfer_ids || []).some(id => { const t = BYID[id]; return t && (RING_ACCTS.has(t.from) || RING_ACCTS.has(t.to)); });
    const fa = new Set(); R.filter(r => r.verdict === 'ring').forEach(r => { if (Array.isArray(r.flagged_accounts)) r.flagged_accounts.forEach(a => fa.add(a)); else (r.flagged_transfer_ids || []).forEach(id => { const t = BYID[id]; if (t) { fa.add(t.from); fa.add(t.to); } }); });
    let fin = 0; fa.forEach(a => { if (RING_ACCTS.has(a)) fin++; });
    const al = m.row && m.row.account_level; let faN = fa.size; if (al && al.flagged_accounts) { faN = al.flagged_accounts; fin = al.flagged_accounts_in_a_ring; }
    Object.assign(m, { R, F, flagRun, found, tp, falseRuns, g: falseRuns.filter(touches).length, fa: faN, fin, prec: F.size ? tp / F.size : 0, label: prettyModel(m.id) + ' ' + m.version });
  });
  const famCaught = r => [...new Set(MODELS.filter(m => m.found.has(r)).map(m => m.family))];

  /* ---------- per-group layout by IBM's shape name: star, ring, columns, layers ---------- */
  function shapeKind(r, ts) {
    const n = String(ibmRaw(r) || shapeOf(r)).toUpperCase();
    if (ts.length <= 1) return 'single';
    if (/FAN/.test(n)) return 'star';
    if (/CYCLE/.test(n)) return 'ring';
    if (/SCATTER|GATHER/.test(n)) return 'columns';
    if (/STACK|BIPARTITE|CHAIN/.test(n)) return 'layers';
    return 'columns';
  }
  function localLayout(r) {
    const ts = RINGS[r].filter(t => t.u !== t.v);
    const ns = []; ts.forEach(t => { if (!ns.includes(t.u)) ns.push(t.u); if (!ns.includes(t.v)) ns.push(t.v); });
    const out = {}, inn = {}; ns.forEach(n => { out[n] = 0; inn[n] = 0; }); ts.forEach(t => { out[t.u]++; inn[t.v]++; });
    const kind = shapeKind(r, ts); const P = {}; const R = 17;
    const role = n => out[n] > 0 && inn[n] === 0 ? 0 : inn[n] > 0 && out[n] === 0 ? 2 : 1;
    const spread = (list, gap, max) => { const k = list.length; const s = k > 1 ? Math.min(gap, max / (k - 1)) : 0; return list.map((n, i) => (i - (k - 1) / 2) * s); };
    if (kind === 'single') { const t = ts[0]; P[t.u] = [0, 5]; P[t.v] = [0, -5]; }
    else if (kind === 'star') {
      const hub = ns.slice().sort((a, b) => (out[b] + inn[b]) - (out[a] + inn[a]))[0]; P[hub] = [0, 0];
      const rest = ns.filter(n => n !== hub); rest.forEach((n, i) => { const a = -Math.PI / 2 + i / rest.length * Math.PI * 2; P[n] = [Math.cos(a) * R, Math.sin(a) * R]; });
    } else if (kind === 'ring') {
      const order = []; const seen = new Set(); let cur = ns[0];
      while (cur != null && !seen.has(cur)) { order.push(cur); seen.add(cur); const nx = ts.find(t => t.u === cur && !seen.has(t.v)); cur = nx ? nx.v : null; }
      ns.forEach(n => { if (!seen.has(n)) order.push(n); });
      order.forEach((n, i) => { const a = -Math.PI / 2 + i / order.length * Math.PI * 2; P[n] = [Math.cos(a) * R * 0.9, Math.sin(a) * R * 0.9]; });
    } else if (kind === 'columns') {
      [0, 1, 2].forEach(c => { const col = ns.filter(n => role(n) === c); const ys = spread(col, 6, 2 * R); col.forEach((n, i) => P[n] = [(c - 1) * R, -ys[i]]); });
    } else {
      const rows = [0, 1, 2].map(c => ns.filter(n => role(n) === c)).filter(l => l.length);
      rows.forEach((row, ri) => { const xs = spread(row, 9, 2 * R); const y = rows.length > 1 ? (rows.length - 1) / 2 * 14 - ri * 14 : 0; row.forEach((n, i) => P[n] = [xs[i], y]); });
    }
    return { r, ts, ns, P, kind };
  }
  const SHAPE_ORDER = ['FAN-OUT', 'FAN-IN', 'CYCLE', 'SCATTER-GATHER', 'GATHER-SCATTER', 'STACK', 'BIPARTITE'];
  const rank = r => { const n = ibmName(r).toUpperCase(); const i = SHAPE_ORDER.findIndex(s => n.indexOf(s) === 0); return i < 0 ? SHAPE_ORDER.length : i; };
  const GROUPS = RING_IDS.map(localLayout);
  const shaped = GROUPS.filter(g => g.kind !== 'single').sort((a, b) => rank(a.r) - rank(b.r) || +a.r - +b.r);
  const singles = GROUPS.filter(g => g.kind === 'single');
  const COLS = Math.min(4, Math.max(1, shaped.length)), ROWS = Math.ceil(shaped.length / COLS), CW = 68, CH = 58;
  const top = ((ROWS - 1) * CH + (singles.length ? 46 : 0)) / 2;
  shaped.forEach((g, i) => { const c = i % COLS, row = Math.floor(i / COLS); g.c = [(c - (COLS - 1) / 2) * CW, top - row * CH, (row - (ROWS - 1) / 2) * 10]; });
  const singleY = top - (ROWS - 1) * CH - 50, SW = Math.min(24, (COLS * CW) / Math.max(1, singles.length));
  singles.forEach((g, i) => { g.c = [(i - (singles.length - 1) / 2) * SW, singleY, ((ROWS - 1) / 2 + 0.6) * 10]; });
  GROUPS.forEach(g => { g.W = {}; g.ns.forEach(n => g.W[n] = [g.c[0] + g.P[n][0], g.c[1] + g.P[n][1], g.c[2]]); });
  const GBY = {}; GROUPS.forEach(g => GBY[g.r] = g);

  /* ---------- three.js scene ---------- */
  const stage = $('#stage'), cv = $('#cv');
  let renderer = null;
  try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' }); }
  catch (e) { const m = $('#stageMsg'); m.hidden = false; m.textContent = 'This browser could not start WebGL, so the 3D groups cannot draw. The roster and numbers still read from the data.'; }
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#14181F');
  const camera = new THREE.PerspectiveCamera(38, 1, 1, 4000);
  scene.add(new THREE.HemisphereLight(0xdfe6ef, 0x1a2130, 2.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.2); sun.position.set(0.6, 1, 1.4); scene.add(sun);
  const tmpC = new THREE.Color(), M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), V1 = new THREE.Vector3(), V2 = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0), SC = new THREE.Vector3();

  /* group accounts: one instanced sphere mesh */
  const GN = []; GROUPS.forEach(g => g.ns.forEach(n => GN.push({ g, n, p: g.W[n] })));
  const gSph = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshLambertMaterial({ color: 0xffffff }), Math.max(1, GN.length));
  GN.forEach((x, i) => { M4.makeScale(1.7, 1.7, 1.7); M4.setPosition(x.p[0], x.p[1], x.p[2]); gSph.setMatrixAt(i, M4); gSph.setColorAt(i, tmpC.set(COL.node)); });
  gSph.count = GN.length; gSph.computeBoundingSphere(); scene.add(gSph);
  /* group transfers: instanced tubes (cylinders) with arrowheads (cones); missed transfers as instanced dots */
  const NFAM = new Set(MODELS.map(m => m.family)).size || 1;
  GROUPS.forEach(g => { g.agree = famCaught(g.r).length; g.w = 0.75 + 0.75 * g.agree / NFAM; });   /* 0.75x to 1.5x */
  const GE = []; GROUPS.forEach(g => g.ts.forEach(t => GE.push({ g, t, a: g.W[t.u], b: g.W[t.v] })));
  const TUBE_R = 0.6, NODE_R = 1.7, CONE_H = 2.8;
  const tube = new THREE.InstancedMesh(new THREE.CylinderGeometry(TUBE_R, TUBE_R, 1, 8, 1), new THREE.MeshLambertMaterial({ color: 0xffffff }), Math.max(1, GE.length));
  const cone = new THREE.InstancedMesh(new THREE.ConeGeometry(1.3, CONE_H, 12), new THREE.MeshLambertMaterial({ color: 0xffffff }), Math.max(1, GE.length));
  const DOTS = []; GE.forEach((e, k) => { const L = Math.hypot(e.b[0] - e.a[0], e.b[1] - e.a[1], e.b[2] - e.a[2]) - 2 * NODE_R; const n = Math.max(1, Math.floor(L / 2.2)); for (let i = 1; i <= n; i++) { const f = (NODE_R + L * i / (n + 1)) / (L + 2 * NODE_R); DOTS.push({ k, p: [e.a[0] + (e.b[0] - e.a[0]) * f, e.a[1] + (e.b[1] - e.a[1]) * f, e.a[2] + (e.b[2] - e.a[2]) * f] }); } });
  const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.55, 8, 6), new THREE.MeshBasicMaterial({ color: COL.miss, transparent: true, opacity: 0.38, depthWrite: false }), Math.max(1, DOTS.length));
  function setEdge(k, q) {   /* q: 0 hidden, 1 full length */
    const e = GE[k]; V1.set(e.a[0], e.a[1], e.a[2]); V2.set(e.b[0], e.b[1], e.b[2]); const dir = V2.clone().sub(V1); const L = dir.length(); dir.normalize();
    const full = Math.max(0.01, L - NODE_R - CONE_H - NODE_R * 0.4); const len = Math.max(0.0001, full * q);
    const start = V1.clone().addScaledVector(dir, NODE_R * 0.8);
    Q.setFromUnitVectors(UP, dir);
    M4.compose(start.clone().addScaledVector(dir, len / 2), Q, SC.set(e.g.w, len, e.g.w)); tube.setMatrixAt(k, M4);
    const s = q > 0.02 ? 1 : 0.0001; M4.compose(start.clone().addScaledVector(dir, len + CONE_H / 2), Q, SC.set(s, s, s)); cone.setMatrixAt(k, M4);
  }
  GE.forEach((e, k) => { setEdge(k, 1); tube.setColorAt(k, tmpC.set(COL.pending)); cone.setColorAt(k, tmpC.set(COL.pending)); });
  tube.computeBoundingSphere(); cone.computeBoundingSphere(); scene.add(tube); scene.add(cone);
  DOTS.forEach((d, i) => { M4.makeTranslation(d.p[0], d.p[1], d.p[2]); dots.setMatrixAt(i, M4); }); dots.computeBoundingSphere(); scene.add(dots);

  /* the crowd: off by default; faint dust behind the groups, ring accounts pinned where their group sits */
  const pinned = new Uint8Array(nodes.length), pinPos = new Float32Array(nodes.length * 3);
  GN.forEach(x => { if (!pinned[x.n]) { pinned[x.n] = 1; pinPos.set(x.p, x.n * 3); } });
  const pairs = new Map(); TR.forEach(t => { if (t.u !== t.v) { const k = t.u < t.v ? t.u * 100000 + t.v : t.v * 100000 + t.u; pairs.set(k, [t.u, t.v]); } });
  let CP = null, crowd = null;
  function buildCrowd() {
    CP = crowdLayout(nodes.length, [...pairs.values()], pinned, pinPos);
    const vec = i => [CP[i * 3], CP[i * 3 + 1], CP[i * 3 + 2]];
    const lineObj = (list, mat) => { const a = new Float32Array(Math.max(1, list.length) * 6); list.forEach((t, k) => { a.set(vec(t.u), k * 6); a.set(vec(t.v), k * 6 + 3); }); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(a, 3)); g.setDrawRange(0, list.length * 2); const o = new THREE.LineSegments(g, mat); o.userData = { list, times: list.map(t => t.t) }; return o; };
    const hairList = TR.filter(t => t.u !== t.v && !t.label);
    const hair = lineObj(hairList, new THREE.LineBasicMaterial({ color: COL.dust, transparent: true, opacity: 0, depthWrite: false }));
    const free = nodes.map((n, i) => i).filter(i => !pinned[i]).sort((a, b) => nodes[a].t - nodes[b].t);
    const dust = new THREE.InstancedMesh(new THREE.SphereGeometry(0.9, 6, 4), new THREE.MeshBasicMaterial({ color: COL.dust, transparent: true, opacity: 0, depthWrite: false }), Math.max(1, free.length));
    free.forEach((n, i) => { M4.makeTranslation(CP[n * 3], CP[n * 3 + 1], CP[n * 3 + 2]); dust.setMatrixAt(i, M4); }); dust.count = free.length; dust.userData.times = free.map(n => nodes[n].t);
    crowd = { hair, dust, red: null, vec, lineObj, target: 0 };
    scene.add(hair); scene.add(dust); buildRed();
  }
  function buildRed() {
    if (!crowd) return; if (crowd.red) { scene.remove(crowd.red); crowd.red.geometry.dispose(); crowd.red.material.dispose(); }
    const list = TR.filter(t => t.u !== t.v && !t.label && S.m && S.m.F.has(t.id));
    crowd.red = crowd.lineObj(list, new THREE.LineDashedMaterial({ color: COL.bad, transparent: true, opacity: crowd.hair.material.opacity * 7, dashSize: 2.4, gapSize: 1.6, depthWrite: false }));
    crowd.red.computeLineDistances(); scene.add(crowd.red); applyScrub();
  }

  /* ---------- state ---------- */
  const S = { m: null, scrub: Infinity, playing: false, rings: [], st: {}, queue: [], nextCatch: 0, hover: null, openUntil: 0, crowdOn: false };
  const upper = (arr, x) => { let lo = 0, hi = arr.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (arr[mid] <= x) lo = mid + 1; else hi = mid; } return lo; };
  const TR_T = TR.map(t => t.t);
  function applyScrub() {
    const x = S.scrub;
    if (crowd) { [crowd.hair, crowd.red].forEach(o => o && o.geometry.setDrawRange(0, upper(o.userData.times, x) * 2)); crowd.dust.count = upper(crowd.dust.userData.times, x); }
    $('#when').textContent = (x === Infinity ? 'Sep 10 + tail to ' + fmtWhen(lastTail).split(',')[0] : fmtWhen(x)) + ' · ' + fmtN(upper(TR_T, x)) + ' transfers';
    if (S.m) updateRosterCount();
  }

  /* per-edge and per-node targets, recomputed every frame (113 tubes, a few hundred dots: cheap) */
  const eCur = new Float32Array(GE.length * 3).fill(0.5), nCur = new Float32Array(GN.length * 3).fill(0.65);
  const dotScale = new Float32Array(DOTS.length);
  function stepGroups(now, dt) {
    const k = REDUCED() ? 1 : 1 - Math.exp(-dt / TAU); const m = S.m; const c = new THREE.Color();
    GE.forEach((e, i) => {
      const t = e.t, shown = t.t <= S.scrub, fl = m.F.has(t.id), found = m.found.has(t.ring), st = S.st[t.ring];
      let q = 0, col = COL.pending;
      if (shown && fl) {
        if (found && st && st.start != null) { col = COL.ok; const p = REDUCED() ? 1 : (now - st.start) / RESOLVE_MS; const order = e.g.ts.indexOf(t); const n = e.g.ts.length; const d = n > 1 ? 0.4 * order / (n - 1) : 0; q = easeOut((p - d) / 0.6); }
        else { q = 1; col = found ? COL.building : COL.pending; }
      }
      e.miss = shown && !fl;
      setEdge(i, q); c.set(col);
      eCur[i * 3] += (c.r - eCur[i * 3]) * k; eCur[i * 3 + 1] += (c.g - eCur[i * 3 + 1]) * k; eCur[i * 3 + 2] += (c.b - eCur[i * 3 + 2]) * k;
      tmpC.setRGB(eCur[i * 3], eCur[i * 3 + 1], eCur[i * 3 + 2]); tube.setColorAt(i, tmpC); cone.setColorAt(i, tmpC);
    });
    tube.instanceMatrix.needsUpdate = true; cone.instanceMatrix.needsUpdate = true; tube.instanceColor.needsUpdate = true; cone.instanceColor.needsUpdate = true;
    let dMoved = false;
    DOTS.forEach((d, i) => { const tg = GE[d.k].miss ? 1 : 0; const v = dotScale[i] + (tg - dotScale[i]) * k; if (Math.abs(v - dotScale[i]) > 1e-4 || (v !== tg && Math.abs(v - tg) < 1e-3)) { dotScale[i] = Math.abs(v - tg) < 1e-3 ? tg : v; const s = Math.max(0.0001, dotScale[i]); M4.makeScale(s, s, s); M4.setPosition(d.p[0], d.p[1], d.p[2]); dots.setMatrixAt(i, M4); dMoved = true; } });
    if (dMoved) dots.instanceMatrix.needsUpdate = true;
    GN.forEach((x, i) => { const st = S.st[x.g.r]; c.set(st && st.start != null ? COL.ok : COL.node); nCur[i * 3] += (c.r - nCur[i * 3]) * k; nCur[i * 3 + 1] += (c.g - nCur[i * 3 + 1]) * k; nCur[i * 3 + 2] += (c.b - nCur[i * 3 + 2]) * k; tmpC.setRGB(nCur[i * 3], nCur[i * 3 + 1], nCur[i * 3 + 2]); gSph.setColorAt(i, tmpC); });
    gSph.instanceColor.needsUpdate = true;
    if (crowd) {
      const tg = S.crowdOn ? 1 : 0; crowd.target += (tg - crowd.target) * k; const o = crowd.target;
      crowd.hair.material.opacity = 0.10 * o; crowd.dust.material.opacity = 0.10 * o; if (crowd.red) crowd.red.material.opacity = 0.33 * o;
      const vis = o > 0.005; crowd.hair.visible = crowd.dust.visible = vis; if (crowd.red) crowd.red.visible = vis;
    }
  }

  /* ---------- labels under each group ---------- */
  const labelsEl = $('#labels'); const LABELS = [];
  shaped.forEach(g => { const el = document.createElement('div'); el.className = 'glabel'; el.innerHTML = '<div class="n">' + esc(ibmName(g.r)) + '</div><div class="s"></div>'; labelsEl.appendChild(el); el.addEventListener('mouseenter', () => setHover({ r: g.r }, el.getBoundingClientRect())); el.addEventListener('mouseleave', () => setHover(null)); const lo = Math.min(...g.ns.map(n => g.P[n][1])); LABELS.push({ el, g, anchor: [g.c[0], g.c[1] + lo - 4, g.c[2]] }); });
  if (singles.length) { const el = document.createElement('div'); el.className = 'glabel'; el.innerHTML = '<div class="n">' + singles.length + ' single transfers</div><div class="s">IBM gives these no shape name</div>'; labelsEl.appendChild(el); LABELS.push({ el, g: null, anchor: [0, singleY - 13, singles[0].c[2]] }); }
  function statusOf(r) { const m = S.m, st = S.st[r]; if (m.found.has(r)) return st && st.start != null ? ['caught', 'caught'] : ['', '']; if (S.scrub !== Infinity) return ['', '']; const hit = RINGS[r].filter(t => m.F.has(t.id)).length; const n = RINGS[r].length; if (hit && hit / n >= .5) return ['partial', 'missed: too broad']; return hit ? ['partial', 'partly, ' + hit + ' of ' + n] : ['missed', 'missed']; }
  function placeLabels() {
    const rect = cv.getBoundingClientRect(), srect = stage.getBoundingClientRect();
    LABELS.forEach(L => {
      const v = V1.set(L.anchor[0], L.anchor[1], L.anchor[2]).project(camera);
      L.el.style.left = ((v.x + 1) / 2 * rect.width + rect.left - srect.left) + 'px'; L.el.style.top = ((1 - v.y) / 2 * rect.height + rect.top - srect.top) + 'px';
      if (L.g) { const [cls, text] = statusOf(L.g.r); L.el.className = 'glabel ' + cls; const s = L.el.lastChild; if (s.textContent !== text) s.textContent = text; }
    });
  }

  /* ---------- select a model ---------- */
  function selectModel(m) {
    S.m = m; S.queue = []; clearRoster();
    S.rings = RING_IDS.filter(r => m.found.has(r)).map(r => ({ r, tc: Math.max(0, ...RINGS[r].filter(t => m.F.has(t.id)).map(t => t.t)) })).sort((a, b) => a.tc - b.tc);
    S.st = {}; S.rings.forEach(x => S.st[x.r] = { start: null, card: null });
    buildRed(); renderResult(); pick.value = m.id + '|' + m.version; setHover(null); applyScrub();
  }

  /* ---------- result copy: lead with what was caught; one limit line; end on the strongest true number ---------- */
  function renderResult() {
    const m = S.m; const whose = sample ? 'the SAMPLE\'s ' : 'IBM\'s ';
    $('#sub').textContent = whose.charAt(0).toUpperCase() + whose.slice(1) + NR + ' labeled laundering rings, each drawn by its shape. Green: caught. Amber dots: missed.';
    $('#headline').innerHTML = esc(m.label) + ' caught <b class="ok">' + m.found.size + '</b> of ' + whose + NR + ' laundering rings and traced <b class="ok">' + m.tp + '</b> of ' + NTRUTH + ' laundering transfers; it raised <b>' + m.falseRuns.length + '</b> alarm' + (m.falseRuns.length === 1 ? '' : 's') + ' on ordinary neighborhoods, <b>' + m.g + '</b> of them on accounts that sit inside a ring.';
    $('#limit').innerHTML = ['The data is synthetic (IBM AMLworld) and the labels are IBM\'s generator\'s; one run per model.',
      'The slice is enriched: ' + (sample ? 'SAMPLE' : '4 percent laundering against 0.1 percent in the file') + ', and its neighborhoods were cut around IBM\'s groups.',
      'Every laundering transfer in the slice is ACH, which is a tell.'].map(x => '<li>' + esc(x) + '</li>').join('');
    const ringShare = NR ? m.found.size / NR : 0, acctShare = m.fa ? m.fin / m.fa : 0;
    if (m.fa && acctShare > ringShare) $('#strong').innerHTML = '<b>' + Math.round(acctShare * 100) + '%</b>of the accounts it flagged sit inside one of IBM\'s rings (' + fmtN(m.fin) + ' of ' + fmtN(m.fa) + ').';
    else $('#strong').innerHTML = '<b>' + m.found.size + ' of ' + NR + '</b>rings caught, each one carded below.';
    updateRosterCount();
  }

  /* ---------- picker: one list, model and version together (the version chips live behind it) ---------- */
  const pick = $('#modelPick'); const fams = [...new Set(MODELS.map(m => m.family))];
  pick.innerHTML = fams.map(f => '<optgroup label="' + esc(famName(f)) + '">' + MODELS.filter(m => m.family === f).map(m => '<option value="' + esc(m.id + '|' + m.version) + '" title="' + esc((B.versions || {})[m.version] || '') + '">' + esc(prettyModel(m.id) + ' · ' + m.version) + '</option>').join('') + '</optgroup>').join('');
  pick.addEventListener('change', () => { const m = MODELS.find(x => x.id + '|' + x.version === pick.value); if (m) selectModel(m); });

  /* ---------- the caught roster ---------- */
  const roster = $('#roster');
  function clearRoster() { roster.querySelectorAll('.rcard').forEach(c => c.remove()); document.querySelectorAll('.fly').forEach(f => f.remove()); $('#rosterEmpty').hidden = false; }
  function miniSvg(g, w, h) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; g.ns.forEach(n => { const p = g.P[n]; x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, -p[1]); y1 = Math.max(y1, -p[1]); });
    const pad = 5, s = Math.min((w - 2 * pad) / Math.max(x1 - x0, 1), (h - 2 * pad) / Math.max(y1 - y0, 1), 2);
    const ox = (w - (x1 - x0) * s) / 2, oy = (h - (y1 - y0) * s) / 2; const X = n => ((g.P[n][0] - x0) * s + ox).toFixed(1), Y = n => ((-g.P[n][1] - y0) * s + oy).toFixed(1);
    const F = S.m.F;
    const lines = g.ts.map(t => '<line x1="' + X(t.u) + '" y1="' + Y(t.u) + '" x2="' + X(t.v) + '" y2="' + Y(t.v) + '" stroke="' + (F.has(t.id) ? COL.ok : COL.miss) + '" stroke-width="1.6"' + (F.has(t.id) ? '' : ' stroke-dasharray="1 2.5"') + ' stroke-linecap="round"/>').join('');
    return '<svg class="mini" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" aria-hidden="true">' + lines + g.ns.map(n => '<circle cx="' + X(n) + '" cy="' + Y(n) + '" r="2" fill="#C9D2DD"/>').join('') + '</svg>';
  }
  /* rough Sep 2022 US dollar rates, used only to choose which currency to print, never to convert */
  const CODE = { 'US Dollar': 'USD', Euro: 'EUR', 'UK Pound': 'GBP', 'Swiss Franc': 'CHF', 'Canadian Dollar': 'CAD', 'Australian Dollar': 'AUD', Yuan: 'CNY', Yen: 'JPY', Rupee: 'INR', Ruble: 'RUB', 'Mexican Peso': 'MXN', Shekel: 'ILS', 'Brazil Real': 'BRL', 'Saudi Riyal': 'SAR', Bitcoin: 'BTC' };
  const USD = { 'US Dollar': 1, Euro: 1, 'UK Pound': 1.15, 'Swiss Franc': 1.03, 'Canadian Dollar': 0.76, 'Australian Dollar': 0.68, Yuan: 0.145, Yen: 0.007, Rupee: 0.0125, Ruble: 0.016, 'Mexican Peso': 0.05, Shekel: 0.29, 'Brazil Real': 0.19, 'Saudi Riyal': 0.27, Bitcoin: 20000 };
  function money(r) { const by = {}; RINGS[r].forEach(t => by[t.cur] = (by[t.cur] || 0) + t.paid); const k = Object.keys(by).sort((a, b) => by[b] * (USD[b] || 1) - by[a] * (USD[a] || 1)); return k.length ? fmtN(Math.round(by[k[0]])) + ' ' + (CODE[k[0]] || k[0]) + (k.length > 1 ? ' +' + (k.length - 1) : '') : ''; }
  const oneLine = w0 => { if (!w0) return 'No reason recorded for this run.'; const w = String(w0).replace(/\s*\u2014\s*/g, ', '); const m = String(w).match(/^.*?[.!?](\s|$)/); return (m ? m[0] : String(w)).trim(); };
  const runFor = (m, r) => m.R.find(x => x.unit === RU[r]);
  function project(p) { const v = V1.set(p[0], p[1], p[2]).project(camera); const r = cv.getBoundingClientRect(); return [(v.x + 1) / 2 * r.width + r.left, (1 - v.y) / 2 * r.height + r.top]; }
  function addCard(r, animate) {
    const g = GBY[r]; $('#rosterEmpty').hidden = true;
    const card = document.createElement('article'); card.className = 'rcard' + (animate ? ' enter' : '');
    card.innerHTML = miniSvg(g, 44, 40) + '<div><div class="rc-t">' + esc(cardName(r)) + '</div><div class="rc-m" title="money moved">' + esc((RINGS[r].length === 1 ? '1 transfer · ' : '') + money(r)) + '</div></div>';
    card.addEventListener('mouseenter', () => setHover({ r }, card.getBoundingClientRect()));
    card.addEventListener('mouseleave', () => setHover(null));
    roster.appendChild(card); roster.scrollTop = roster.scrollHeight;
    if (animate && !REDUCED()) {
      const target = card.querySelector('.mini'); target.classList.add('wait'); const tr = target.getBoundingClientRect();
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; g.ns.forEach(n => { const p = project(g.W[n]); x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); });
      const bw = Math.max(x1 - x0, 30), bh = Math.max(y1 - y0, 28), bx = (x0 + x1) / 2 - bw / 2, by = (y0 + y1) / 2 - bh / 2;
      const fly = document.createElement('div'); fly.className = 'fly'; fly.innerHTML = miniSvg(g, 44, 40); fly.style.left = tr.left + 'px'; fly.style.top = tr.top + 'px'; document.body.appendChild(fly);
      const anim = fly.animate([{ transform: 'translate(' + (bx - tr.left) + 'px,' + (by - tr.top) + 'px) scale(' + (bw / 44) + ',' + (bh / 40) + ')' }, { transform: 'none' }], { duration: FLY_MS, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'both' });
      anim.onfinish = () => { target.classList.remove('wait'); fly.remove(); };
    }
    return card;
  }
  function updateRosterCount() {
    let k = 0; S.rings.forEach(x => { if (S.st[x.r].start != null) k++; }); $('#rosterCount').textContent = k + ' of ' + NR;
    const done = S.scrub === Infinity, n = done ? S.m.found.size : k;
    $('#punch').innerHTML = esc(S.m.label) + ' caught <span class="ok">' + n + ' of ' + NR + '</span> rings' + (done ? '' : ' by ' + esc(fmtWhen(S.scrub).split(',')[0]));
  }
  function catchRing(r, now, animate) { const st = S.st[r]; st.start = animate ? now : now - RESOLVE_MS; st.card = addCard(r, animate); updateRosterCount(); }
  function uncatch(r) { const st = S.st[r]; st.start = null; if (st.card) st.card.remove(); st.card = null; if (!roster.querySelector('.rcard')) $('#rosterEmpty').hidden = false; updateRosterCount(); }
  function stepCatches(now) {
    S.rings.forEach(x => {
      const st = S.st[x.r], due = S.scrub >= x.tc;
      if (due && st.start == null && !S.queue.includes(x.r)) S.queue.push(x.r);
      if (!due) { const qi = S.queue.indexOf(x.r); if (qi >= 0) S.queue.splice(qi, 1); if (st.start != null) uncatch(x.r); }
    });
    if (now < S.openUntil - 300) return;
    while (S.queue.length && (REDUCED() || now >= S.nextCatch)) { catchRing(S.queue.shift(), now, !REDUCED()); S.nextCatch = now + CATCH_GAP; }
  }

  /* ---------- hover card ---------- */
  const hc = $('#hover');
  const idsHtml = (list, cls) => list.slice(0, 24).map(x => '<span class="' + cls(x) + '">' + esc(x.id) + '</span>').join(' ') + (list.length > 24 ? ' +' + (list.length - 24) + ' more' : '');
  function setHover(h, rect, mx, my) {
    S.hover = h; if (!h) { hc.hidden = true; return; }
    const m = S.m; let html;
    if (h.r != null) {
      const r = h.r, ids = RINGS[r], accts = new Set(); ids.forEach(t => { accts.add(t.from); accts.add(t.to); });
      const [cls, text] = statusOf(r); const run = runFor(m, r); const others = famCaught(r).filter(f => f !== m.family).map(famName);
      html = '<div class="hc-k"><b class="' + (cls === 'caught' ? 's-ok' : cls ? 's-miss' : '') + '">' + esc(text) + '</b></div>' +
        '<div class="hc-t">' + esc(ibmName(r)) + '</div><div class="hc-s">' + ids.length + ' transfer' + (ids.length === 1 ? '' : 's') + ' among ' + accts.size + ' accounts · ' + esc(money(r)) + '<br>' + (others.length ? 'Also caught by ' + esc(others.join(', ')) : 'No other family caught it') + '</div>' +
        '<p class="hc-why">' + esc(run && run.why ? oneLine(run.why) : 'No run recorded for this group.') + '</p><div class="hc-ids">' + idsHtml(ids, t => m.F.has(t.id) ? 'i-ok' : 'i-miss') + (RU[r] ? ' <span class="muted">(IBM group ' + esc(r) + ', neighborhood ' + esc(RU[r]) + ')</span>' : '') + '</div>';
    } else {
      const run = h.run, ids = (run.flagged_transfer_ids || []).filter(id => BYID[id]).map(id => BYID[id]); const lab = ids.filter(t => t.label).length; const ra = Array.isArray(run.ring_accounts_flagged) ? run.ring_accounts_flagged.length : 0;
      const pat = run.pattern && run.pattern !== 'other' ? 'Called it ' + (/^[aeiou]/i.test(run.pattern) ? 'an ' : 'a ') + run.pattern : 'Called it a ring, no named shape';
      html = '<div class="hc-k"><b class="s-bad">false alarm</b> on an ordinary neighborhood</div><div class="hc-t">' + esc(pat) + '</div><div class="hc-s">IBM labels ' + (ids.length - lab) + ' of these ' + ids.length + ' transfers ordinary' + (ra ? ' · ' + ra + ' of the flagged accounts sit inside an IBM ring' : '') + '</div><p class="hc-why">' + esc(oneLine(run.why)) + '</p><div class="hc-ids">' + idsHtml(ids, t => t.label ? 'i-ok' : 'i-bad') + ' <span class="muted">(neighborhood ' + esc(run.unit) + ')</span></div>';
    }
    hc.innerHTML = html; hc.hidden = false; placeCard(rect, mx, my);
  }
  function placeCard(rect, mx, my) {
    const W = window.innerWidth, H = window.innerHeight, cw = hc.offsetWidth, ch = hc.offsetHeight; let x, y;
    if (rect) { x = rect.left; y = rect.top - ch - 10; if (y < 8) y = rect.bottom + 10; } else { x = mx + 16; y = my + 16; if (x + cw > W - 8) x = mx - cw - 16; if (y + ch > H - 8) y = my - ch - 16; }
    hc.style.left = Math.max(8, Math.min(W - cw - 8, x)) + 'px'; hc.style.top = Math.max(8, Math.min(H - ch - 8, y)) + 'px';
  }
  const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2(); let mouse = null, mouseMoved = false;
  function pickAt(mx, my) {
    const r = cv.getBoundingClientRect(); ndc.set((mx - r.left) / r.width * 2 - 1, -(my - r.top) / r.height * 2 + 1); ray.setFromCamera(ndc, camera);
    const h = ray.intersectObjects([gSph, tube, cone], false)[0];
    if (h) { if (h.object === gSph) return { r: GN[h.instanceId].g.r }; return { r: GE[h.instanceId].g.r }; }
    if (S.crowdOn && crowd && crowd.red) { ray.params.Line.threshold = cam.radius * 0.006; const l = ray.intersectObject(crowd.red, false)[0]; if (l) { const t = crowd.red.userData.list[Math.floor(l.index / 2)]; const run = t && S.m.flagRun[t.id]; if (run) return { run }; } }
    return null;
  }

  /* ---------- camera: one opening move, then a held three-quarter view; orbit with damping ---------- */
  const cam = { theta: 0.22, phi: 1.36, radius: 300, goalR: 300, target: new THREE.Vector3(0, 0, 0), vT: 0, vP: 0, home: 300, open: null };
  let ext = [0, 0]; GROUPS.forEach(g => g.ns.forEach(n => { ext[0] = Math.max(ext[0], Math.abs(g.W[n][0])); ext[1] = Math.max(ext[1], Math.abs(g.W[n][1])); }));
  function fitRadius() { const w = stage.clientWidth || 800, h = stage.clientHeight || 500; const vf = camera.fov * Math.PI / 360; const hf = Math.atan(Math.tan(vf) * (w / h)); return Math.max((ext[0] + 14) / Math.tan(hf), (ext[1] + 30) / Math.tan(vf)) * 1.02 + 24; }
  function resize() { const w = stage.clientWidth || 800, h = stage.clientHeight || 500; if (renderer) { renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.setSize(w, h, false); } camera.aspect = w / h; camera.updateProjectionMatrix(); const old = cam.home; cam.home = fitRadius(); if (Math.abs(cam.goalR - old) < 1) { cam.goalR = cam.home; cam.radius = cam.home; } }
  function placeCamera() { const sp = Math.sin(cam.phi); camera.position.set(cam.target.x + cam.radius * sp * Math.sin(cam.theta), cam.target.y + cam.radius * Math.cos(cam.phi), cam.target.z + cam.radius * sp * Math.cos(cam.theta)); camera.lookAt(cam.target); }
  let drag = null;
  cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, pan: e.button === 2 || e.shiftKey }; cv.setPointerCapture(e.pointerId); cv.classList.add('dragging'); cam.open = null; });
  cv.addEventListener('pointermove', e => {
    mouse = [e.clientX, e.clientY]; mouseMoved = true; if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
    if (drag.pan) { const k = cam.radius * 0.0012; cam.target.addScaledVector(V1.setFromMatrixColumn(camera.matrix, 0), -dx * k).addScaledVector(V2.setFromMatrixColumn(camera.matrix, 1), dy * k); }
    else { cam.vT = -dx * 0.005; cam.vP = -dy * 0.005; }
  });
  const endDrag = e => { if (!drag) return; drag = null; cv.classList.remove('dragging'); try { cv.releasePointerCapture(e.pointerId); } catch (err) { /* released */ } };
  cv.addEventListener('pointerup', endDrag); cv.addEventListener('pointercancel', endDrag);
  cv.addEventListener('pointerleave', () => { mouse = null; if (S.hover && !drag) setHover(null); });
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('wheel', e => { e.preventDefault(); cam.goalR = Math.max(60, Math.min(1400, cam.goalR * Math.exp(e.deltaY * 0.0012))); cam.open = null; }, { passive: false });
  cv.addEventListener('dblclick', () => { cam.target.set(0, 0, 0); cam.goalR = cam.home; cam.theta = 0.22; cam.phi = 1.36; cam.vT = cam.vP = 0; });

  /* ---------- crowd toggle, scrub and play ---------- */
  const crowdBtn = $('#crowd');
  crowdBtn.addEventListener('click', () => { if (!crowd) buildCrowd(); S.crowdOn = !S.crowdOn; crowdBtn.setAttribute('aria-pressed', String(S.crowdOn)); crowdBtn.textContent = S.crowdOn ? 'Hide the crowd' : 'Show the crowd'; });
  const scrubEl = $('#scrub'), playBtn = $('#play');
  $('#ticks').innerHTML = Array.from({ length: 10 }, (_, i) => '<span>Sep ' + (i + 1) + '</span>').join('');
  scrubEl.addEventListener('input', () => { stopPlay(); const v = +scrubEl.value; S.scrub = v >= 1000 ? Infinity : v / 1000 * SPAN; applyScrub(); });
  function stopPlay() { S.playing = false; playBtn.textContent = S.scrub === Infinity ? 'Play the ten days' : 'Resume'; }
  playBtn.addEventListener('click', () => { if (S.playing) { stopPlay(); return; } if (S.scrub === Infinity) { S.scrub = 0; scrubEl.value = 0; applyScrub(); } S.playing = true; S.lastStep = performance.now(); playBtn.textContent = 'Pause'; });
  function stepPlay(now, dt) {
    if (!S.playing) return;
    if (REDUCED()) { if (now - S.lastStep < 900) return; S.lastStep = now; S.scrub = Math.floor(S.scrub / DAY + 1) * DAY; } else S.scrub += dt * SPAN / PLAY_MS;
    if (S.scrub >= SPAN) { S.scrub = Infinity; S.playing = false; playBtn.textContent = 'Play the ten days'; }
    scrubEl.value = S.scrub === Infinity ? 1000 : Math.round(S.scrub / SPAN * 1000); applyScrub();
  }

  /* ---------- frame loop ---------- */
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(64, now - last); last = now;
    stepPlay(now, dt); stepCatches(now);
    if (cam.open) { const p = easeOut((now - cam.open.t0) / OPEN_MS); cam.radius = cam.goalR = cam.open.r0 + (cam.home - cam.open.r0) * p; cam.theta = cam.open.th0 + (0.22 - cam.open.th0) * p; cam.phi = cam.open.ph0 + (1.36 - cam.open.ph0) * p; if (p >= 1) cam.open = null; }
    else { cam.theta += cam.vT; cam.phi = Math.max(0.2, Math.min(Math.PI - 0.2, cam.phi + cam.vP)); const d = Math.pow(0.86, dt / 16.7); cam.vT *= d; cam.vP *= d; if (drag && !drag.pan) { cam.vT *= 0.5; cam.vP *= 0.5; } cam.radius += (cam.goalR - cam.radius) * (1 - Math.pow(0.82, dt / 16.7)); }
    placeCamera(); stepGroups(now, dt); placeLabels();
    if (mouse && mouseMoved && !drag && renderer) { mouseMoved = false; const h = pickAt(mouse[0], mouse[1]); const same = h && S.hover && h.r === S.hover.r && h.run === S.hover.run; if (!same) setHover(h, null, mouse[0], mouse[1]); else placeCard(null, mouse[0], mouse[1]); }
    if (renderer) renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  /* ---------- start: default model Claude Sonnet v4 when present, else the strongest ---------- */
  resize(); cam.radius = cam.goalR = cam.home;
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(stage); else window.addEventListener('resize', resize);
  const strength = m => m.found.size + m.prec * NR;
  const first = MODELS.find(m => /claude-sonnet/.test(m.id) && m.version === 'v4') || MODELS.slice().sort((a, b) => strength(b) - strength(a))[0];
  if (!REDUCED()) { cam.open = { t0: performance.now(), r0: cam.home * 1.3, th0: 0.7, ph0: 1.15 }; S.openUntil = performance.now() + OPEN_MS; }
  if (first) selectModel(first); else $('#headline').textContent = 'No models in the bench output yet.';
  window.__night3d = { S, MODELS, NR, sample, calls: () => renderer ? renderer.info.render.calls : 0, toggleCrowd: () => crowdBtn.click() };
  requestAnimationFrame(frame);
}

/* any uncaught error is written onto <body data-errors> so a headless check can read it */
window.addEventListener('error', e => { document.body.dataset.errors = (document.body.dataset.errors || '') + ' | ' + (e.message || 'error') + ' @' + (e.lineno || '?'); });
window.addEventListener('unhandledrejection', e => { document.body.dataset.errors = (document.body.dataset.errors || '') + ' | ' + String(e.reason && e.reason.message || e.reason); });
boot().catch(e => { const m = $('#stageMsg'); m.hidden = false; m.textContent = 'The page could not draw: ' + e.message; throw e; });
})();
