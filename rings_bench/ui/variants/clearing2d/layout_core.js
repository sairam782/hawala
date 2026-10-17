/* Rings bench, the clearing: the layout, written once and shared by the page (fallback) and build_layout.mjs (which bakes layout.js).
   The main mass is a seeded force layout run once; the 13 small islands sit on an orbit around it; the 350 lone account pairs
   and the 60 accounts that only pay themselves are scattered as dust in a wide elliptical ring outside it. Deterministic: same input, same picture. */
(function (root) {
'use strict';
function seeded(seed) { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
/* transfers: [[id, time, from, to, ...]]; ringOf: id -> ring index or -1. Returns { pos: {account: [x, y]}, aspect } */
function computeLayout(transfers, ringOf, aspect) {
  aspect = aspect || 1.55;
  const rnd = seeded(20261017);
  const idx = {}, acc = []; const node = a => (a in idx) ? idx[a] : (idx[a] = acc.push(a) - 1);
  const E = []; const ringNodes = {};
  transfers.forEach(t => { const u = node(t[2]), v = node(t[3]); const r = ringOf(t[0]);
    if (r >= 0) { (ringNodes[r] = ringNodes[r] || new Set()).add(u).add(v); }
    if (u !== v) E.push([u, v, r >= 0]); });
  const N = acc.length; const par = new Int32Array(N); for (let i = 0; i < N; i++) par[i] = i;
  const find = x => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
  E.forEach(e => { const a = find(e[0]), b = find(e[1]); if (a !== b) par[a] = b; });
  const comps = {}; for (let i = 0; i < N; i++) (comps[find(i)] = comps[find(i)] || []).push(i);
  const cedges = {}; E.forEach(e => (cedges[find(e[0])] = cedges[find(e[0])] || []).push(e));
  const X = new Float64Array(N), Y = new Float64Array(N);
  const K = 15;
  function force(c, edges, gx) {
    gx = gx || 0.03;
    const n = c.length; const loc = new Map(); c.forEach((v, i) => loc.set(v, i));
    const x = new Float64Array(n), y = new Float64Array(n); const R0 = Math.sqrt(n) * K * 0.7;
    for (let i = 0; i < n; i++) { const a = rnd() * Math.PI * 2, r = R0 * Math.sqrt(rnd()); x[i] = Math.cos(a) * r; y[i] = Math.sin(a) * r; }
    const springs = new Map();
    edges.forEach(e => { const a = loc.get(e[0]), b = loc.get(e[1]); const k = a < b ? a * n + b : b * n + a; springs.set(k, Math.min(4, (springs.get(k) || 0) + (e[2] ? 2.5 : 1))); });
    Object.keys(ringNodes).forEach(r => { const m = [...ringNodes[r]].filter(v => loc.has(v)).map(v => loc.get(v));
      for (let i = 0; i < m.length; i++) for (let j = i + 1; j < m.length; j++) { const a = m[i], b = m[j]; const k = a < b ? a * n + b : b * n + a; springs.set(k, (springs.get(k) || 0) + 0.18); } });
    const S = [...springs].map(([k, w]) => [Math.floor(k / n), k % n, Math.sqrt(w)]);
    const iters = n > 300 ? 220 : n > 40 ? 160 : 120; let temp = R0 * 0.3;
    const dx = new Float64Array(n), dy = new Float64Array(n);
    for (let it = 0; it < iters; it++) {
      dx.fill(0); dy.fill(0);
      for (let a = 0; a < n; a++) { const xa = x[a], ya = y[a]; for (let b = a + 1; b < n; b++) { const p = xa - x[b], q = ya - y[b]; const d2 = p * p + q * q + 0.01; if (d2 > 14400) continue; const f = K * K / d2; dx[a] += p * f; dy[a] += q * f; dx[b] -= p * f; dy[b] -= q * f; } }
      for (let s = 0; s < S.length; s++) { const a = S[s][0], b = S[s][1], w = S[s][2]; const p = x[a] - x[b], q = y[a] - y[b]; const d = Math.sqrt(p * p + q * q) + 0.01; const f = d / K * w; dx[a] -= p * f; dy[a] -= q * f; dx[b] += p * f; dy[b] += q * f; }
      for (let a = 0; a < n; a++) { dx[a] -= x[a] * gx; dy[a] -= y[a] * 0.03; const d = Math.sqrt(dx[a] * dx[a] + dy[a] * dy[a]) + 0.01; const m = Math.min(d, temp); x[a] += dx[a] / d * m; y[a] += dy[a] / d * m; }
      temp *= 0.975;
    }
    let cx = 0, cy = 0; for (let i = 0; i < n; i++) { cx += x[i]; cy += y[i]; } cx /= n; cy /= n;
    let rad = 0, radY = 0, radX = 0; for (let i = 0; i < n; i++) { x[i] -= cx; y[i] -= cy; rad = Math.max(rad, Math.hypot(x[i], y[i])); radX = Math.max(radX, Math.abs(x[i])); radY = Math.max(radY, Math.abs(y[i])); }
    return { c, x, y, rad: rad + 8, radX: radX + 8, radY: radY + 8 };
  }
  const all = Object.keys(comps).map(k => comps[k]);
  all.sort((a, b) => b.length - a.length);
  const big = force(all[0], cedges[find(all[0][0])] || [], 0.03 / (aspect * aspect));
  big.c.forEach((v, i) => { X[v] = big.x[i]; Y[v] = big.y[i]; });
  const Rb = big.radY, RbX = big.radX;
  /* islands: components of three or more accounts, on an elliptical orbit just outside the main mass */
  const islands = all.slice(1).filter(c => c.length >= 3).map(c => force(c, cedges[find(c[0])] || []));
  const AX = aspect; const orbit = 1.07;
  const placed = [];
  islands.forEach((isl, i) => {
    const a = -Math.PI / 2 + (i + 0.5) / islands.length * Math.PI * 2 + 0.21;
    const cx = Math.cos(a) * (Math.max(RbX, Rb * AX * 0.9) * orbit + isl.rad), cy = Math.sin(a) * (Rb * orbit + isl.rad);
    isl.c.forEach((v, j) => { X[v] = cx + isl.x[j]; Y[v] = cy + isl.y[j]; });
    placed.push([cx, cy, isl.rad + 10]);
  });
  /* dust: the lone pairs and the self-payers, scattered in a wide elliptical ring; never on top of an island */
  const dust = all.slice(1).filter(c => c.length < 3);
  dust.forEach(c => {
    let px = 0, py = 0;
    for (let tries = 0; tries < 40; tries++) {
      const a = rnd() * Math.PI * 2; const rr = Math.sqrt(1.1 * 1.1 + rnd() * (1.34 * 1.34 - 1.1 * 1.1));
      px = Math.cos(a) * rr * Math.max(RbX, Rb * AX * 0.9); py = Math.sin(a) * rr * Rb;
      if (!placed.some(p => Math.hypot(px - p[0], py - p[1]) < p[2])) break;
    }
    X[c[0]] = px; Y[c[0]] = py;
    if (c.length === 2) { const a = rnd() * Math.PI * 2; X[c[1]] = px + Math.cos(a) * 7; Y[c[1]] = py + Math.sin(a) * 7; }
  });
  const pos = {}; for (let i = 0; i < N; i++) pos[acc[i]] = [Math.round(X[i] * 10) / 10, Math.round(Y[i] * 10) / 10];
  return { pos, aspect, mainRadius: Math.round(Rb) };
}
root.RingsLayout = computeLayout;
})(typeof window !== 'undefined' ? window : globalThis);
