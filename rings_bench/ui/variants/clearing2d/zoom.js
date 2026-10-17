/* Rings bench, the clearing: cluster zoom.
   window.openClusterZoom(unitId, origin?) opens a full-stage overlay over #stage showing one neighborhood fit to the screen,
   every transfer as its own line, hover cards for accounts and transfers, a header with the calls, and a time scrub.
   origin (optional): {x, y} in client (viewport) pixels, where the neighborhood sits on the main graph; the zoom grows from there.
   window.closeClusterZoom() closes it. Reads window.UNITS, SLICE, BENCH, INVESTIGATE; no network, no libraries. */
(function () {
  'use strict';
  const SVGNS = 'http://www.w3.org/2000/svg';
  const RM = { matches: /[?&]motion=reduced/.test(location.search) };  // demo page: reduced motion only on request
  const C = { ibm: '#D2C46A', model: '#8FCB8A', inv: '#4DB89A', plain: '#A3ABB8' };
  const NAMES = { 'claude-haiku-5-5': 'Claude Haiku 5.5', 'claude-sonnet-5-5': 'Claude Sonnet 5.5', 'claude-opus-5-5': 'Claude Opus 5.5', 'deepseek-v4-pro': 'DeepSeek V4 Pro', 'mistral-large-4': 'Mistral Large 4', 'kimi-k3': 'Kimi K3', 'gpt-6-luna': 'GPT-6 Luna', 'gpt-6-sol': 'GPT-6 Sol', 'grok-4.7': 'Grok 4.7', 'glm-5.3': 'GLM 5.3' };
  let cur = null; /* { root, onKey, closing } */

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clean = s => String(s == null ? '' : s).replace(/\s*—\s*/g, ', ');
  const sentence = s => { s = String(s || ''); return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; };
  const pretty = id => { if (!id) return ''; const s = String(id).split('/').pop(); if (NAMES[s]) return NAMES[s]; try { if (typeof prettyName === 'function') return prettyName(id); } catch (e) { /* not exposed */ } return sentence(s.replace(/-/g, ' ')); };
  const listOf = v => Array.isArray(v) ? v.map(String) : typeof v === 'string' ? (v.match(/[A-Za-z0-9]+/g) || []).filter(x => x !== 'None') : [];
  const money = n => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');

  function selectedModel() {
    const sel = document.getElementById('model');
    if (sel && sel.value && sel.value.indexOf('|') > 0) { const p = sel.value.split('|'); return { id: p[0], ver: p[1] }; }
    try { if (typeof ST !== 'undefined' && ST && ST.sel && ST.sel.id) return { id: ST.sel.id, ver: ST.sel.ver }; } catch (e) { /* not exposed */ }
    return { id: 'anthropic/claude-sonnet-5-5', ver: 'v4' };
  }
  function findRun(unitId, m) {
    const runs = (window.BENCH && window.BENCH.runs) || [];
    return runs.find(r => r.unit === unitId && r.model === m.id && (r.version || 'v1') === m.ver) || null;
  }
  let RING_ACCTS = null;
  function ringAccounts() {
    if (RING_ACCTS) return RING_ACCTS;
    RING_ACCTS = new Set(); const S = window.SLICE;
    if (S && S.transfers && S.key) S.transfers.forEach(t => { const k = S.key[t[0]]; if (k && k[0]) { RING_ACCTS.add(t[2]); RING_ACCTS.add(t[3]); } });
    return RING_ACCTS;
  }

  /* ---------- layout: a small deterministic force layout over this neighborhood only ---------- */
  function layout(accounts, pairs, seed) {
    const n = accounts.length, idx = {}; accounts.forEach((a, i) => { idx[a] = i; });
    const P = accounts.map((a, i) => { const ang = 2 * Math.PI * i / Math.max(n, 1); return { x: Math.cos(ang) * 100, y: Math.sin(ang) * 100 }; });
    if (seed != null && idx[seed] != null) { P[idx[seed]].x = 0; P[idx[seed]].y = 0; }
    const E = pairs.map(p => [idx[p[0]], idx[p[1]]]).filter(e => e[0] != null && e[1] != null && e[0] !== e[1]);
    const k = 200 / Math.sqrt(Math.max(n, 1)) + 20; let temp = 60;
    for (let it = 0; it < 400; it++) {
      const D = P.map(() => ({ x: 0, y: 0 }));
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
        let dx = P[i].x - P[j].x, dy = P[i].y - P[j].y; let d2 = dx * dx + dy * dy; if (d2 < 0.01) { dx = 0.1 * (i - j); dy = 0.1; d2 = dx * dx + dy * dy; }
        const d = Math.sqrt(d2), f = k * k / d; D[i].x += dx / d * f; D[i].y += dy / d * f; D[j].x -= dx / d * f; D[j].y -= dy / d * f;
      }
      E.forEach(e => { const a = P[e[0]], b = P[e[1]]; const dx = a.x - b.x, dy = a.y - b.y; const d = Math.sqrt(dx * dx + dy * dy) || 0.01; const f = d * d / k;
        D[e[0]].x -= dx / d * f; D[e[0]].y -= dy / d * f; D[e[1]].x += dx / d * f; D[e[1]].y += dy / d * f; });
      for (let i = 0; i < n; i++) { D[i].x -= P[i].x * 0.04 * k / 10; D[i].y -= P[i].y * 0.04 * k / 10;
        const dl = Math.sqrt(D[i].x * D[i].x + D[i].y * D[i].y) || 1; const s = Math.min(dl, temp) / dl; P[i].x += D[i].x * s; P[i].y += D[i].y * s; }
      temp = Math.max(1, temp * 0.985);
    }
    const out = {}; accounts.forEach((a, i) => { out[a] = P[i]; }); return out;
  }
  function fitTo(pos, w, h, pad) {
    const ks = Object.keys(pos); let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    ks.forEach(a => { const p = pos[a]; x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); });
    const bw = Math.max(x1 - x0, 1), bh = Math.max(y1 - y0, 1); const s = Math.min((w - 2 * pad) / bw, (h - 2 * pad) / bh, ks.length <= 2 ? 1.2 : 6); const sx = Math.min((w - 2 * pad) / bw, s * 1.45);
    const ox = (w - bw * sx) / 2, oy = (h - bh * s) / 2; const o = {};
    ks.forEach(a => { o[a] = { x: ox + (pos[a].x - x0) * sx, y: oy + (pos[a].y - y0) * s }; }); return o;
  }

  function el(tag, attrs, parent) { const e = document.createElementNS(SVGNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }

  function close(instant) {
    if (!cur || cur.closing) return; const c = cur; c.closing = true;
    document.removeEventListener('keydown', c.onKey, true); if (c.stop) c.stop();
    const done = () => { if (c.root.parentNode) c.root.parentNode.removeChild(c.root); if (cur === c) cur = null; };
    if (instant || RM.matches) { done(); return; }
    c.root.classList.remove('zm-in'); c.root.classList.add('zm-out'); setTimeout(done, 210);
  }

  function open(unitId, origin) {
    if (cur) close(true);
    const U = window.UNITS && window.UNITS.units ? window.UNITS.units.find(u => u.id === unitId) : null;
    if (!U) { console.warn('openClusterZoom: no neighborhood ' + unitId); return; }
    const host = document.getElementById('stage') || document.body;
    const model = selectedModel(); const run = findRun(unitId, model);
    const INV = window.INVESTIGATE && window.INVESTIGATE.results ? window.INVESTIGATE.results[unitId] || null : null;
    const invName = window.INVESTIGATE && window.INVESTIGATE.model ? pretty(window.INVESTIGATE.model) : 'Claude Opus 5.5';
    const SK = (window.SLICE && window.SLICE.key) || {};
    const truth = new Set(listOf(U.truth_ids)); (U.rows || []).forEach(r => { const k = SK[r[0]]; if (k && k[0]) truth.add(r[0]); });
    const mflag = new Set(run ? listOf(run.flagged_transfer_ids) : []);
    const iflag = new Set(INV ? listOf(INV.flagged_in_unit) : []);
    const rows = (U.rows || []).slice().sort((a, b) => a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0);
    const accts = (U.accounts && U.accounts.length ? U.accounts.slice() : []);
    rows.forEach(r => { if (accts.indexOf(r[2]) < 0) accts.push(r[2]); if (accts.indexOf(r[3]) < 0) accts.push(r[3]); });
    const RA = ringAccounts();

    /* per-account stats inside this neighborhood */
    const A = {}; accts.forEach(a => { A[a] = { id: a, bank: null, inN: 0, outN: 0, inT: {}, outT: {}, deg: 0, ringHere: false }; });
    rows.forEach(r => { const f = A[r[2]], t = A[r[3]]; f.bank = f.bank || r[7]; t.bank = t.bank || r[8];
      f.outN++; f.outT[r[5]] = (f.outT[r[5]] || 0) + Number(r[4]); t.inN++; t.inT[r[5]] = (t.inT[r[5]] || 0) + Number(r[4]);
      f.deg++; t.deg++; if (truth.has(r[0])) { f.ringHere = true; t.ringHere = true; } });
    let seed = U.seed_account && A[U.seed_account] ? U.seed_account : null; let seedLabel = 'seed account';
    if (!seed) { /* rings carry no seed: center on the account most of IBM's labeled transfers touch */
      const c = {}; rows.forEach(r => { if (truth.has(r[0])) { c[r[2]] = (c[r[2]] || 0) + 1; c[r[3]] = (c[r[3]] || 0) + 1; } });
      seed = Object.keys(c).sort((a, b) => c[b] - c[a])[0] || accts.slice().sort((a, b) => A[b].deg - A[a].deg)[0]; seedLabel = 'hub account';
    }

    /* ---------- DOM ---------- */
    const root = document.createElement('div'); root.className = 'zm-root'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Close-up of the neighborhood around ' + seed);
    if (host === document.body) root.classList.add('zm-fixed');
    const panel = document.createElement('div'); panel.className = 'zm-panel'; root.appendChild(panel);

    const shapeRaw = (run && run.ibm_shape) || (U.expected === 'ring' ? U.shape : null);
    const isRing = U.expected === 'ring';
    const caughtN = rows.filter(r => truth.has(r[0]) && mflag.has(r[0])).length; const invCaught = rows.filter(r => truth.has(r[0]) && iflag.has(r[0])).length;
    const head = document.createElement('div'); head.className = 'zm-head';
    const lead = isRing
      ? '<span class="zm-tag ibm">IBM ring' + (shapeRaw ? ', ' + esc(String(shapeRaw).toLowerCase()) : '') + '</span>' + (caughtN ? '<span class="zm-tag ok">' + esc(pretty(model.id)) + ' flagged ' + caughtN + ' of ' + truth.size + ' laundering transfers</span>' : '') +
        (INV && (INV.ring_found || invCaught) ? '<span class="zm-tag inv">' + esc(invName) + ' found it on investigation' + (invCaught ? ', flagging ' + invCaught + ' of ' + truth.size : '') + '</span>' : '')
      : '<span class="zm-tag">No IBM laundering here</span>';
    const fp = run ? '<p class="zm-call"><b>First pass, ' + esc(pretty(model.id)) + ' ' + esc(model.ver) + ':</b> ' + esc(run.verdict === 'ring' ? 'ring' : run.verdict || 'no answer') +
      (run.confidence ? ', ' + esc(run.confidence) + ' confidence' : '') + (run.ring_found === true || run.ring_found === 'True' ? ' <span class="zm-ok">found the ring</span>' : '') +
      (run.why ? '<span class="zm-why" title="' + esc(clean(run.why)) + '"> ' + esc(clean(run.why)) + '</span>' : '') + '</p>'
      : '<p class="zm-call muted">No first-pass run recorded for ' + esc(pretty(model.id)) + ' ' + esc(model.ver) + ' here.</p>';
    const inv = INV ? '<p class="zm-call"><b>Investigator, ' + esc(invName) + ':</b> ' + esc(INV.verdict) + (INV.confidence ? ', ' + esc(INV.confidence) + ' confidence' : '') +
      (INV.ring_found ? ' <span class="zm-ok">found the ring</span>' : '') + (INV.why ? '<span class="zm-why" title="' + esc(clean(INV.why)) + '"> ' + esc(clean(INV.why)) + '</span>' : '') + '</p>' : '';
    head.innerHTML = '<div class="zm-title"><h3>Neighborhood around <span class="mono">' + esc(seed) + '</span></h3>' +
      '<span class="zm-count mono">' + esc(unitId) + ' · ' + plural(accts.length, 'account') + ' · ' + plural(rows.length, 'transfer') + '</span>' + lead +
      '<button type="button" class="zm-follow" aria-pressed="false" title="Pick one account, then a second, to trace money between them">Follow the money</button>' +
      '<button type="button" class="zm-close" aria-label="Close the close-up">Close <span aria-hidden="true">✕</span></button></div>' +
      '<p class="zm-pathline" hidden></p>' + fp + inv;
    panel.appendChild(head);

    const legend = document.createElement('div'); legend.className = 'zm-legend';
    const sw = (c, extra) => '<svg width="26" height="10" aria-hidden="true">' + (extra || '') + '<line x1="2" y1="5" x2="24" y2="5" stroke="' + c + '" stroke-width="2"/></svg>';
    legend.innerHTML = '<span>' + sw(C.plain) + 'ordinary transfer</span><span><svg width="26" height="10" aria-hidden="true"><line x1="2" y1="5" x2="24" y2="5" stroke="' + C.ibm + '" stroke-width="6" stroke-opacity=".45"/></svg>IBM labeled laundering</span>' +
      '<span>' + sw(C.model) + esc(pretty(model.id)) + ' flagged</span>' + (INV ? '<span>' + sw(C.inv) + esc(invName) + ' flagged</span>' : '') +
      '<span><svg width="14" height="14" aria-hidden="true"><circle cx="7" cy="7" r="4" fill="#E6E9EE"/><circle cx="7" cy="7" r="6.2" fill="none" stroke="#7FB7B0" stroke-width="1.5"/></svg>' + seedLabel + '</span>' +
      '<span><svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="4" fill="' + C.ibm + '"/></svg>account in an IBM ring</span>';

    const gwrap = document.createElement('div'); gwrap.className = 'zm-graph'; panel.appendChild(gwrap); panel.appendChild(legend);
    const svg = el('svg', { class: 'zm-svg', role: 'img', 'aria-label': plural(rows.length, 'transfer') + ' between ' + plural(accts.length, 'account') });
    gwrap.appendChild(svg);
    const flow = document.createElement('canvas'); flow.className = 'zm-flow'; flow.setAttribute('aria-hidden', 'true'); gwrap.appendChild(flow);
    const side = document.createElement('div'); side.className = 'zm-side'; side.hidden = true; gwrap.appendChild(side);
    const card = document.createElement('div'); card.className = 'zm-card'; card.hidden = true; gwrap.appendChild(card);

    const scrub = document.createElement('div'); scrub.className = 'zm-scrub';
    const times = Array.from(new Set(rows.map(r => r[1]))).sort();
    scrub.innerHTML = '<label class="small muted" for="zmTime">Up to</label><input type="range" id="zmTime" min="0" max="' + Math.max(times.length - 1, 0) + '" step="1" value="' + Math.max(times.length - 1, 0) + '" aria-label="Show transfers up to a time"' + (times.length < 2 ? ' disabled' : '') + '>' +
      '<span class="zm-clock mono"></span>';
    panel.appendChild(scrub);
    host.appendChild(root);

    /* ---------- draw ---------- */
    const W = gwrap.clientWidth || 800, H = gwrap.clientHeight || 420;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('width', W); svg.setAttribute('height', H);
    const defs = el('defs', {}, svg);
    Object.keys(C).forEach(k => { const m = el('marker', { id: 'zm-ar-' + k, viewBox: '0 0 10 10', refX: '9', refY: '5', markerWidth: '7', markerHeight: '7', markerUnits: 'userSpaceOnUse', orient: 'auto' }, defs);
      el('path', { d: 'M0,1 L10,5 L0,9 z', fill: C[k] }, m); });
    const pairSet = {}; rows.forEach(r => { if (r[2] !== r[3]) pairSet[r[2] < r[3] ? r[2] + '|' + r[3] : r[3] + '|' + r[2]] = 1; });
    const pairs = Object.keys(pairSet).map(s => s.split('|'));
    const pos = fitTo(layout(accts, pairs, seed), W, H, 46);
    const rad = a => Math.min(12, 4 + Math.sqrt(A[a].deg) * 1.4);

    const gE = el('g', { class: 'zm-edges' }, svg), gN = el('g', { class: 'zm-nodes' }, svg);
    const groups = {}; rows.forEach(r => { const key = r[2] === r[3] ? 'self|' + r[2] : (r[2] < r[3] ? r[2] + '|' + r[3] : r[3] + '|' + r[2]); (groups[key] = groups[key] || []).push(r); });
    const edgeEls = [];
    Object.keys(groups).forEach(key => {
      const g = groups[key];
      g.forEach((r, i) => {
        const a = pos[r[2]], b = pos[r[3]]; let d;
        let geom;
        if (r[2] === r[3]) { const R = rad(r[2]); const s = 16 + i * 7; d = 'M' + (a.x - 4) + ',' + (a.y - R) + ' C' + (a.x - s) + ',' + (a.y - R - 2.2 * s) + ' ' + (a.x + s) + ',' + (a.y - R - 2.2 * s) + ' ' + (a.x + 4) + ',' + (a.y - R - 1);
          geom = { c: [{ x: a.x - 4, y: a.y - R }, { x: a.x - s, y: a.y - R - 2.2 * s }, { x: a.x + s, y: a.y - R - 2.2 * s }, { x: a.x + 4, y: a.y - R - 1 }] }; }
        else {
          const lo = r[2] < r[3] ? a : b, hi = r[2] < r[3] ? b : a; const dx = hi.x - lo.x, dy = hi.y - lo.y; const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const nx = -dy / dist, ny = dx / dist; const n = g.length; const step = n > 1 ? Math.min(16, 1.2 * dist / n) : 0; const off = (i - (n - 1) / 2) * step * 2;
          const cx = (a.x + b.x) / 2 + nx * off, cy = (a.y + b.y) / 2 + ny * off;
          const sh = (p, R) => { const vx = p.x - cx, vy = p.y - cy; const l = Math.sqrt(vx * vx + vy * vy) || 1; return { x: p.x - vx / l * R, y: p.y - vy / l * R }; };
          const s0 = sh(a, rad(r[2]) + 1), e0 = sh(b, rad(r[3]) + 2.5);
          d = 'M' + s0.x.toFixed(1) + ',' + s0.y.toFixed(1) + ' Q' + cx.toFixed(1) + ',' + cy.toFixed(1) + ' ' + e0.x.toFixed(1) + ',' + e0.y.toFixed(1);
          geom = { q: [s0, { x: cx, y: cy }, e0] };
        }
        const lab = truth.has(r[0]), mf = mflag.has(r[0]), inf = iflag.has(r[0]);
        const kind = mf ? 'model' : inf ? 'inv' : lab ? 'ibm' : 'plain';
        const grp = el('g', { class: 'zm-e zm-' + kind + (lab ? ' zm-lab' : ''), 'data-id': r[0], 'data-from': r[2], 'data-to': r[3] }, gE);
        if (lab) el('path', { d, class: 'zm-halo', stroke: C.ibm }, grp);
        el('path', { d, class: 'zm-line', stroke: C[kind], 'marker-end': 'url(#zm-ar-' + kind + ')' }, grp);
        if (mf && inf) el('path', { d, class: 'zm-both', stroke: C.inv }, grp);
        const hit = el('path', { d, class: 'zm-hit' }, grp);
        hit.addEventListener('mouseenter', ev => showEdge(r, grp, ev)); hit.addEventListener('mousemove', ev => place(ev)); hit.addEventListener('mouseleave', hide);
        edgeEls.push({ r, grp, geom, dot: lab ? C.ibm : (mf || inf) ? C.model : C.plain });
      });
    });
    /* draw flagged lines last so they sit on top */
    Array.from(gE.querySelectorAll('.zm-plain')).forEach(n => gE.insertBefore(n, gE.firstChild));
    accts.forEach(a => {
      const p = pos[a]; const R = rad(a); const inRing = RA.has(a) || A[a].ringHere;
      const g = el('g', { class: 'zm-n' + (a === seed ? ' zm-seed' : '') + (inRing ? ' zm-ringacct' : ''), transform: 'translate(' + p.x.toFixed(1) + ',' + p.y.toFixed(1) + ')', 'data-acct': a }, gN);
      if (a === seed) el('circle', { r: R + 4.5, class: 'zm-seedring' }, g);
      el('circle', { r: R, class: 'zm-dot', fill: inRing ? C.ibm : '#E6E9EE' }, g);
      if (a === seed || A[a].ringHere) { const t = el('text', { y: -(R + (a === seed ? 8 : 5)), class: 'zm-lbl' }, g); t.textContent = a; }
      el('circle', { r: Math.max(R + 4, 9), class: 'zm-nhit' }, g).addEventListener('mouseenter', ev => showNode(a, g, ev));
      g.lastChild.addEventListener('mousemove', ev => place(ev)); g.lastChild.addEventListener('mouseleave', hide);
      g.lastChild.addEventListener('click', ev => { ev.stopPropagation(); pickAccount(a); });
    });

    /* ---------- hover cards ---------- */
    const tot = o => { const k = Object.keys(o); if (!k.length) return 'none'; return k.slice(0, 3).map(c => money(o[c]) + ' ' + esc(c)).join('<br>') + (k.length > 3 ? '<br>and ' + (k.length - 3) + ' more currencies' : ''); };
    function showNode(a, g, ev) {
      const s = A[a]; const inRing = RA.has(a) || s.ringHere;
      card.className = 'zm-card' + (inRing ? ' ibm' : '');
      card.innerHTML = '<h4 class="mono">' + esc(a) + (a === seed ? ' <span class="zm-pill">' + seedLabel + '</span>' : '') + '</h4>' +
        '<p>Bank <span class="mono">' + esc(s.bank || 'not recorded') + '</span></p>' +
        '<p><b>In:</b> ' + plural(s.inN, 'transfer') + '<br><span class="mono small">' + tot(s.inT) + '</span></p>' +
        '<p><b>Out:</b> ' + plural(s.outN, 'transfer') + '<br><span class="mono small">' + tot(s.outT) + '</span></p>' +
        '<p class="zm-sep">' + (s.ringHere ? 'Sits in an IBM ring: it sends or receives laundering transfers in this neighborhood.' : RA.has(a) ? 'Sits in an IBM ring elsewhere in the slice.' : 'Not in any IBM ring.') + '</p>';
      root.classList.add('zm-focus'); g.classList.add('zm-hot');
      edgeEls.forEach(e => { if (e.r[2] === a || e.r[3] === a) e.grp.classList.add('zm-hot'); });
      card.hidden = false; place(ev);
    }
    function showEdge(r, grp, ev) {
      const lab = truth.has(r[0]), mf = mflag.has(r[0]), inf = iflag.has(r[0]);
      card.className = 'zm-card' + (mf ? ' model' : inf ? ' inv' : lab ? ' ibm' : '');
      card.innerHTML = '<h4 class="mono">' + esc(r[0]) + '</h4><p class="mono small">' + esc(r[1]) + '</p>' +
        '<p><span class="mono">' + esc(r[2]) + '</span> to <span class="mono">' + esc(r[3]) + '</span></p>' +
        '<p><b class="mono">' + money(r[4]) + '</b> ' + esc(r[5]) + ' by ' + esc(r[6]) + '</p>' +
        '<p class="zm-sep"><b>IBM label:</b> ' + (lab ? '<span class="zm-ibm">laundering</span>' : 'ordinary') + '</p>' +
        '<p><b>' + esc(pretty(model.id)) + ':</b> ' + (run ? (mf ? '<span class="zm-ok">flagged</span>' : 'not flagged') : 'no run here') + '</p>' +
        (INV ? '<p><b>' + esc(invName) + ':</b> ' + (inf ? '<span class="zm-inv">flagged</span>' : 'not flagged') + '</p>' : '');
      root.classList.add('zm-focus'); grp.classList.add('zm-hot'); pos[r[2]] && gN.querySelector('[data-acct="' + r[2] + '"]').classList.add('zm-hot'); gN.querySelector('[data-acct="' + r[3] + '"]').classList.add('zm-hot');
      card.hidden = false; place(ev);
    }
    function place(ev) {
      if (card.hidden) return; const b = gwrap.getBoundingClientRect(); const cw = card.offsetWidth, ch = card.offsetHeight;
      let x = ev.clientX - b.left + 14, y = ev.clientY - b.top + 14;
      if (x + cw > b.width - 6) x = ev.clientX - b.left - cw - 14; if (y + ch > b.height - 6) y = b.height - ch - 6;
      card.style.left = Math.max(6, x) + 'px'; card.style.top = Math.max(6, y) + 'px';
    }
    function hide() { card.hidden = true; root.classList.remove('zm-focus'); svg.querySelectorAll('.zm-hot').forEach(n => n.classList.remove('zm-hot')); }

    /* ---------- time scrub ---------- */
    const rng = scrub.querySelector('input'), clock = scrub.querySelector('.zm-clock');
    const applyT = () => { const t = times[+rng.value] || ''; let shown = 0;
      edgeEls.forEach(e => { const on = !t || e.r[1] <= t; e.grp.classList.toggle('zm-later', !on); e.later = !on; if (on) shown++; });
      clock.textContent = (t || 'no transfers') + ' · ' + shown + ' of ' + rows.length + ' shown'; };
    rng.addEventListener('input', applyT); applyT();

    /* ---------- money movement: one canvas layer, dots travel payer to payee and loop ---------- */
    const dpr = Math.min(window.devicePixelRatio || 1, 2); flow.width = Math.round(W * dpr); flow.height = Math.round(H * dpr); flow.style.width = W + 'px'; flow.style.height = H + 'px';
    const fx = flow.getContext('2d');
    const amts = rows.map(r => Math.log(Math.max(Number(r[4]), 0.01))); const lo = amts.length ? Math.min.apply(null, amts) : 0, hi = amts.length ? Math.max.apply(null, amts) : 1;
    edgeEls.forEach((e, i) => { e.size = 2 + 3 * (hi > lo ? (Math.log(Math.max(Number(e.r[4]), 0.01)) - lo) / (hi - lo) : 0.5); e.phase = (i * 0.618034) % 1; });
    const at = (g, t) => { if (g.q) { const p0 = g.q[0], p1 = g.q[1], p2 = g.q[2], u = 1 - t; return { x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x, y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y }; }
      const p0 = g.c[0], p1 = g.c[1], p2 = g.c[2], p3 = g.c[3], u = 1 - t; return { x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x, y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y }; };
    const TRIP = 1600; let running = !RM.matches, raf = 0;
    function frame(now) {
      if (!running) return;
      fx.setTransform(dpr, 0, 0, dpr, 0, 0); fx.clearRect(0, 0, W, H);
      const onPath = !!PS.path; const list = onPath ? PS.path : edgeEls; const focus = root.classList.contains('zm-focus');
      for (let i = 0; i < list.length; i++) {
        const e = list[i]; if (!onPath && e.later) continue;
        /* along a path the dots relay: hop i starts when hop i-1 lands */
        let t;
        if (onPath) { const cyc = ((now / TRIP) % list.length); if (cyc < i || cyc >= i + 1) continue; t = cyc - i; }
        else t = ((now / TRIP) + e.phase) % 1;
        const p = at(e.geom, t);
        fx.globalAlpha = onPath ? 1 : (focus && !e.grp.classList.contains('zm-hot') ? 0.15 : 0.95);
        fx.beginPath(); fx.arc(p.x, p.y, onPath ? e.size + 1 : e.size, 0, 6.2832); fx.fillStyle = e.dot; fx.fill();
      }
      raf = requestAnimationFrame(frame);
    }
    if (running) raf = requestAnimationFrame(frame);

    /* ---------- follow the money: pick two accounts, find directed paths in time order (up to 4 hops) ---------- */
    const PS = { on: false, from: null, to: null, path: null, paths: [], k: 0, ordered: true };
    const followBtn = head.querySelector('.zm-follow'), pathline = head.querySelector('.zm-pathline');
    const gPath = el('g', { class: 'zm-pathg' }); svg.appendChild(gPath);
    const outE = {}; edgeEls.forEach(e => { if (e.r[2] !== e.r[3]) (outE[e.r[2]] = outE[e.r[2]] || []).push(e); });
    function findPaths(a, b, timed) {
      const found = []; let budget = 60000;
      const walk = (node, hops, seen) => {
        const es = outE[node] || [];
        for (let j = 0; j < es.length; j++) {
          if (--budget < 0 || found.length >= 400) return;
          const e = es[j], nx = e.r[3]; if (seen.has(nx)) continue;
          if (timed && hops.length && e.r[1] < hops[hops.length - 1].r[1]) continue;
          const h2 = hops.concat([e]);
          if (nx === b) { found.push(h2); continue; }
          if (h2.length < 4) { seen.add(nx); walk(nx, h2, seen); seen.delete(nx); }
        }
      };
      walk(a, [], new Set([a]));
      found.sort((x, y) => { const tx = x[x.length - 1].r[1], ty = y[y.length - 1].r[1]; return tx < ty ? -1 : tx > ty ? 1 : x.length - y.length; });
      return found;
    }
    const sumCur = hs => { const o = {}; hs.forEach(e => { o[e.r[5]] = (o[e.r[5]] || 0) + Number(e.r[4]); }); const k = Object.keys(o);
      return k.slice(0, 2).map(c => money(o[c]) + ' ' + esc(c)).join(' and ') + (k.length > 2 ? ' and more' : '') + ' moved'; };
    const nodeEl = a => gN.querySelector('[data-acct="' + a + '"]');
    function clearPath() {
      PS.from = null; PS.to = null; PS.path = null; PS.paths = []; PS.k = 0; while (gPath.firstChild) gPath.removeChild(gPath.firstChild);
      root.classList.remove('zm-pathon'); svg.querySelectorAll('.zm-onpath, .zm-pick').forEach(n => n.classList.remove('zm-onpath', 'zm-pick')); side.hidden = true;
    }
    function setFollow(on) {
      PS.on = on; followBtn.setAttribute('aria-pressed', on ? 'true' : 'false'); followBtn.classList.toggle('on', on); root.classList.toggle('zm-picking', on);
      clearPath(); pathline.hidden = !on; pathline.innerHTML = on ? 'Follow the money: click the account the money leaves from.' : '';
    }
    followBtn.addEventListener('click', () => setFollow(!PS.on));
    function pickAccount(a) {
      if (!PS.on) return;
      if (!PS.from || PS.path) { clearPath(); PS.from = a; nodeEl(a).classList.add('zm-pick');
        pathline.innerHTML = 'From <span class="mono">' + esc(a) + '</span>. Now click the account the money goes to.'; return; }
      if (a === PS.from) return;
      nodeEl(a).classList.add('zm-pick');
      let paths = findPaths(PS.from, a, true); PS.ordered = true;
      if (!paths.length) { paths = findPaths(PS.from, a, false); PS.ordered = false; }
      PS.paths = paths; PS.k = 0; PS.to = a;
      if (!paths.length) {
        pathline.innerHTML = 'No directed path from <span class="mono">' + esc(PS.from) + '</span> to <span class="mono">' + esc(a) + '</span> within 4 hops here. Click an account to start again.';
        PS.from = null; return; }
      showPath();
    }
    function showPath() {
      const hops = PS.paths[PS.k]; PS.path = hops;
      svg.querySelectorAll('.zm-onpath').forEach(n => n.classList.remove('zm-onpath')); while (gPath.firstChild) gPath.removeChild(gPath.firstChild);
      root.classList.add('zm-pathon'); hide();
      hops.forEach((e, i) => {
        e.grp.classList.add('zm-onpath'); nodeEl(e.r[2]).classList.add('zm-onpath'); nodeEl(e.r[3]).classList.add('zm-onpath');
        e.grp.parentNode.appendChild(e.grp);
        const m = at(e.geom, 0.5); const bg = el('g', { class: 'zm-badge', transform: 'translate(' + m.x.toFixed(1) + ',' + m.y.toFixed(1) + ')' }, gPath);
        el('circle', { r: 9 }, bg); const tx = el('text', { y: 3.8 }, bg); tx.textContent = String(i + 1);
      });
      const n = PS.paths.length;
      pathline.innerHTML = '<b>Path: <span class="mono">' + esc(PS.from) + '</span> to <span class="mono">' + esc(PS.to) + '</span>, ' + plural(hops.length, 'hop') + ', ' + sumCur(hops) + '</b>' +
        (n > 1 ? ' <span class="muted">· ' + (PS.k + 1) + ' of ' + n + ' paths' + (n >= 400 ? ' (first 400 found)' : '') + '</span> <button type="button" class="zm-next">Next path</button>' : '') +
        (PS.ordered ? '' : ' <span class="zm-warnnote">No path runs in time order, so this one ignores timing.</span>');
      const nb = pathline.querySelector('.zm-next'); if (nb) nb.addEventListener('click', () => { PS.k = (PS.k + 1) % PS.paths.length; showPath(); });
      side.innerHTML = '<h4>Hops in order</h4>' + hops.map((e, i) => {
        const r = e.r, lab = truth.has(r[0]), mf = mflag.has(r[0]);
        return '<div class="zm-hop"><span class="zm-hopn">' + (i + 1) + '</span><div><p class="mono small">' + esc(r[1]) + ' · ' + esc(r[0]) + '</p>' +
          '<p><b class="mono">' + money(r[4]) + '</b> ' + esc(r[5]) + ' by ' + esc(r[6]) + '</p>' +
          '<p class="small"><span class="mono">' + esc(r[2]) + '</span> to <span class="mono">' + esc(r[3]) + '</span></p>' +
          '<p class="small">IBM: ' + (lab ? '<span class="zm-ibm">laundering</span>' : 'ordinary') + ' · ' + esc(pretty(model.id)) + ': ' + (run ? (mf ? '<span class="zm-ok">flagged</span>' : 'not flagged') : 'no run') + '</p></div></div>';
      }).join('');
      side.hidden = false;
    }

    /* ---------- open / close wiring ---------- */
    head.querySelector('.zm-close').addEventListener('click', () => close());
    root.addEventListener('click', ev => { if (ev.target === root) close(); });
    const onKey = ev => { if (ev.key === 'Escape') { ev.stopPropagation(); ev.preventDefault(); if (PS.on) setFollow(false); else close(); } };
    document.addEventListener('keydown', onKey, true);
    cur = { root, onKey, closing: false, stop: () => { running = false; cancelAnimationFrame(raf); } };

    /* grow from the neighborhood's spot on the main graph (or the stage center) */
    const rb = root.getBoundingClientRect();
    let ox = gwrap.clientWidth / 2, oy = gwrap.clientHeight / 2;
    if (origin && isFinite(origin.x) && isFinite(origin.y)) { ox = origin.x - rb.left - gwrap.offsetLeft; oy = origin.y - rb.top - gwrap.offsetTop; }
    gwrap.style.transformOrigin = ox.toFixed(0) + 'px ' + oy.toFixed(0) + 'px';
    if (RM.matches) root.classList.add('zm-in', 'zm-still');
    else { void rb.width; requestAnimationFrame(() => requestAnimationFrame(() => { if (cur && cur.root === root && !cur.closing) root.classList.add('zm-in'); })); }
    const cb = head.querySelector('.zm-close'); try { cb.focus({ preventScroll: true }); } catch (e) { /* older engines */ }
  }

  window.openClusterZoom = open;
  window.closeClusterZoom = () => close();
})();
