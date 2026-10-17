/* Rings bench, evidence board variant. Pure SVG and vanilla JS.
   Reads window.SLICE, window.UNITS, window.BENCH from ../../../data/*.js (loaded by index.html).
   If any of the three is missing, it builds a small SAMPLE in the page and labels it SAMPLE. */
(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const NS = 'http://www.w3.org/2000/svg';
  const Q = new URLSearchParams(location.search);
  const RM = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => RM.matches || Q.get('motion') === 'off' || !!Q.get('open');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function S(tag, attrs, parent) { const e = document.createElementNS(NS, tag); if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function H(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function parseT(s) { const m = /(\d+)\/(\d+)\/(\d+) (\d+):(\d+)/.exec(s || ''); return m ? Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5]) : 0; }
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function fmtDay(ms) { const d = new Date(ms); return MON[d.getUTCMonth()] + ' ' + d.getUTCDate(); }
  function fmtTime(ms) { const d = new Date(ms); return fmtDay(ms) + ', ' + String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0'); }
  function compact(v) { const a = Math.abs(v); return a >= 1e9 ? (v / 1e9).toFixed(1) + 'B' : a >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : a >= 1e3 ? (v / 1e3).toFixed(1) + 'k' : a >= 10 ? v.toFixed(0) : v.toFixed(2); }
  function firstSentence(s) { if (!s) return ''; const m = /^(.+?[.!?])(\s+[A-Z(]|$)/.exec(String(s).trim()); return m ? m[1] : String(s).trim(); }
  const CUR3 = { 'US Dollar': 'USD', 'Euro': 'EUR', 'Yuan': 'CNY', 'Rupee': 'INR', 'Yen': 'JPY', 'Swiss Franc': 'CHF', 'Canadian Dollar': 'CAD', 'Australian Dollar': 'AUD', 'UK Pound': 'GBP', 'Ruble': 'RUB', 'Brazil Real': 'BRL', 'Mexican Peso': 'MXN', 'Shekel': 'ILS', 'Saudi Riyal': 'SAR', 'Bitcoin': 'BTC' };
  function curCode(c) { return CUR3[c] || String(c || '').slice(0, 3).toUpperCase(); }
  function seeded(seed) { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }

  /* ---------- data ---------- */
  let SL = window.SLICE, UN = window.UNITS, BE = window.BENCH, SAMPLE = false;
  const missing = [];
  if (!SL || !SL.transfers) missing.push('slice.js');
  if (!UN || !UN.units) missing.push('units.js');
  if (!BE || !BE.models || !BE.runs) missing.push('bench_results.js');
  if (missing.length) { const s = makeSample(); SL = s.slice; UN = s.units; BE = s.bench; SAMPLE = true; }

  const TX = {};
  function addTx(r, key) { if (TX[r[0]]) return; const k = key[r[0]] || [0, -1]; TX[r[0]] = { id: r[0], time: r[1], ms: parseT(r[1]), from: r[2], to: r[3], paid: +r[4], cur: r[5], fmt: r[6], label: k[0] === 1, ring: k[1] }; }
  const KEY = SL.key || {};
  SL.transfers.forEach(r => addTx(r, KEY));
  UN.units.forEach(u => (u.rows || []).forEach(r => addTx(r, KEY)));
  const RINGS = {};
  Object.values(TX).forEach(t => { if (t.ring >= 0) (RINGS[t.ring] = RINGS[t.ring] || []).push(t.id); });
  Object.values(RINGS).forEach(a => a.sort((x, y) => TX[x].ms - TX[y].ms));
  const NTRUTH = Object.values(TX).filter(t => t.label).length;
  const ringShape = r => (SL.ring_meta && SL.ring_meta[r] && SL.ring_meta[r].shape) || 'other';
  const ringAccts = {};
  Object.keys(RINGS).forEach(r => { const s = new Set(); RINGS[r].forEach(id => { s.add(TX[id].from); s.add(TX[id].to); }); ringAccts[r] = s; });
  const ALL_RING_ACCTS = new Set(); Object.values(ringAccts).forEach(s => s.forEach(a => ALL_RING_ACCTS.add(a)));

  const SHAPE_ORDER = ['cycle', 'fan-in', 'fan-out', 'scatter-gather', 'gather-scatter', 'stack', 'chain', 'bipartite', 'mesh', 'other', 'lone'];
  const SHAPE_WORDS = {
    'cycle': 'Cycle: money goes around a loop and returns to where it started.',
    'fan-in': 'Fan-in: many accounts pay one account in a short window.',
    'fan-out': 'Fan-out: one account pays many accounts in a short window.',
    'scatter-gather': 'Scatter-gather: one account splits money out, the middle accounts send it on to one collector.',
    'chain': 'Chain (stack): money passed along account to account, each forwarding soon after receiving.',
    'stack': 'Stack: money passed along in layers, each forwarding soon after receiving.',
    'gather-scatter': 'Gather-scatter: many accounts pay one account, which then pays many.',
    'bipartite': 'Bipartite: one set of accounts pays another set; IBM labels only part of it here.',
    'mesh': 'Mesh: a group trades back and forth among itself more than customers would.',
    'other': 'Other: a planted group that fits none of the named shapes.',
    'lone': 'No named shape: IBM labels a single transfer here, with no visible structure around it.'
  };
  const IBM_SHAPE = {};
  (BE.runs || []).forEach(r => { if (r.ibm_shape && !IBM_SHAPE[r.unit || r.group_id]) IBM_SHAPE[r.unit || r.group_id] = r.ibm_shape; });
  function ibmRaw(u) { return IBM_SHAPE[u.id] || (u.ring_id != null ? ringShape(u.ring_id) : ''); }
  function ibmName(u) {
    const raw = String(ibmRaw(u) || '');
    if (/^no named shape/i.test(raw) || raw === 'lone') return 'No named shape';
    return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  }
  function layoutShapeOf(u) {
    const w = String(ibmRaw(u) || '').toLowerCase();
    if (/^cycle/.test(w)) return 'cycle';
    if (/^fan-in/.test(w)) return 'fan-in';
    if (/^fan-out/.test(w)) return 'fan-out';
    if (/^scatter-gather/.test(w)) return 'scatter-gather';
    if (/^gather-scatter/.test(w)) return 'gather-scatter';
    if (/^stack/.test(w)) return 'stack';
    if (/^bipartite/.test(w)) return 'bipartite';
    if (/^no named|^lone/.test(w)) return 'lone';
    return u.ring_id != null ? ringShape(u.ring_id) : 'ordinary';
  }
  const ringUnits = UN.units.filter(u => u.expected === 'ring' && u.ring_id != null && RINGS[u.ring_id]);
  const ord = u => { const i = SHAPE_ORDER.indexOf(layoutShapeOf(u)); return i < 0 ? 99 : i; };
  ringUnits.sort((a, b) => (ord(a) - ord(b)) || (a.id < b.id ? -1 : 1));
  const ordUnits = UN.units.filter(u => u.expected !== 'ring').sort((a, b) => a.id < b.id ? -1 : 1);
  const NR = ringUnits.length, NO = ordUnits.length;

  const gid = r => r.unit || r.group_id;
  const mkey = m => m.id + '@' + (m.version || 'v1');
  const RUNS = {};
  (BE.runs || []).forEach(r => { const k = r.model + '@' + (r.version || 'v1'); (RUNS[k] = RUNS[k] || {})[gid(r)] = r; });
  const famOf = id => { const m = (BE.models || []).find(x => x.id === id); return (m && m.family) || String(id).split('/')[0]; };
  const shortName = id => { const k = String(id).indexOf('/'); return k >= 0 ? id.slice(k + 1) : id; };
  function ringFound(run, u) {
    if (!run) return false;
    if (typeof run.ring_found === 'boolean') return run.ring_found;
    const ids = RINGS[u.ring_id] || []; const f = new Set(run.flagged_transfer_ids || []);
    return ids.length > 0 && ids.filter(i => f.has(i)).length / ids.length >= 0.5;
  }
  const FAM_CAUGHT = {};
  (BE.runs || []).forEach(r => { const u = UN.units.find(x => x.id === gid(r)); if (u && u.expected === 'ring' && ringFound(r, u)) (FAM_CAUGHT[u.id] = FAM_CAUGHT[u.id] || new Set()).add(r.family || famOf(r.model)); });
  const ALL_FAMS = [...new Set((BE.models || []).map(m => m.family || famOf(m.id)))];

  function stats(m) {
    const R = RUNS[mkey(m)] || {};
    let k = 0, f = 0, g = 0; const flagged = new Set();
    ringUnits.forEach(u => { if (ringFound(R[u.id], u)) k++; });
    ordUnits.forEach(u => { const r = R[u.id]; if (r && r.verdict === 'ring') { f++; const acc = r.ring_accounts_flagged || (r.flagged_accounts || []).filter(a => ALL_RING_ACCTS.has(a)); const touch = acc.length || (r.flagged_transfer_ids || []).some(id => TX[id] && (ALL_RING_ACCTS.has(TX[id].from) || ALL_RING_ACCTS.has(TX[id].to))); if (touch) g++; } });
    Object.values(R).forEach(r => (r.flagged_transfer_ids || []).forEach(id => flagged.add(id)));
    let tp = 0; flagged.forEach(id => { if (TX[id] && TX[id].label) tp++; });
    return { k: m.rings_found != null ? m.rings_found : k, f: m.false_rings != null ? m.false_rings : f, g, tp: m.tp != null ? m.tp : tp };
  }

  /* ---------- layout (per unit, model independent) ---------- */
  const LC = {};
  function unitRowIds(u) { return (u.rows || []).map(r => r[0]).filter(id => TX[id]); }
  function layoutUnit(u) {
    if (LC[u.id]) return LC[u.id];
    const pos = {}; const r = u.expected === 'ring' ? u.ring_id : -1;
    const ids = r >= 0 ? RINGS[r] : [];
    const E = ids.map(id => TX[id]).filter(t => t.from !== t.to);
    const ra = r >= 0 ? [...ringAccts[r]] : [];
    const shape = r >= 0 ? layoutShapeOf(u) : 'ordinary';
    const C = [0.5, 0.5], RX = 0.21, RY = 0.3;
    const ell = (list, rx, ry, a0) => list.forEach((a, i) => { const th = (a0 == null ? -Math.PI / 2 : a0) + i * 2 * Math.PI / list.length; pos[a] = [C[0] + rx * Math.cos(th), C[1] + ry * Math.sin(th)]; });
    const outN = {}, inN = {};
    E.forEach(t => { (outN[t.from] = outN[t.from] || new Set()).add(t.to); (inN[t.to] = inN[t.to] || new Set()).add(t.from); });
    if (r >= 0) {
      if (shape === 'cycle') {
        const sorted = E.slice().sort((a, b) => a.ms - b.ms); const order = []; const seen = new Set();
        let cur = sorted.length ? sorted[0].from : ra[0];
        while (cur && !seen.has(cur)) { seen.add(cur); order.push(cur); const nx = sorted.find(t => t.from === cur && !seen.has(t.to)); cur = nx ? nx.to : null; }
        ra.forEach(a => { if (!seen.has(a)) order.push(a); });
        ell(order, RX, RY);
      } else if (shape === 'fan-in' || shape === 'fan-out') {
        const deg = a => ((shape === 'fan-out' ? outN : inN)[a] || new Set()).size;
        const hub = ra.slice().sort((a, b) => deg(b) - deg(a))[0];
        pos[hub] = C.slice();
        const rest = ra.filter(a => a !== hub);
        rest.sort((a, b) => ((outN[hub] && outN[hub].has(a)) ? 0 : 1) - ((outN[hub] && outN[hub].has(b)) ? 0 : 1));
        ell(rest, RX, RY);
      } else {
        /* layered: chain, stack, scatter-gather, mesh, other, lone */
        const d = {}; ra.forEach(a => d[a] = 0);
        for (let it = 0; it < ra.length; it++) { let ch = false; E.forEach(t => { if (d[t.to] < d[t.from] + 1 && d[t.from] + 1 < ra.length) { d[t.to] = d[t.from] + 1; ch = true; } }); if (!ch) break; }
        if (shape === 'mesh' || shape === 'bipartite') ra.forEach(a => { d[a] = (outN[a] ? outN[a].size : 0) >= (inN[a] ? inN[a].size : 0) ? 0 : 1; });
        const maxd = Math.max(0, ...ra.map(a => d[a]));
        const cols = {}; ra.forEach(a => (cols[d[a]] = cols[d[a]] || []).push(a));
        const span = shape === 'lone' ? 0.32 : Math.min(0.56, 0.2 * maxd + 0.16);
        Object.keys(cols).forEach(c => { const list = cols[c].sort(); const n = list.length; const gap = n > 1 ? Math.min(0.6 / (n - 1), 0.2) : 0;
          list.forEach((a, i) => { pos[a] = [maxd ? 0.5 - span / 2 + span * (+c) / maxd : 0.5, 0.5 + (i - (n - 1) / 2) * gap]; }); });
      }
    }
    /* everything else in the neighborhood */
    const acc = new Set(u.accounts || []); unitRowIds(u).forEach(id => { acc.add(TX[id].from); acc.add(TX[id].to); });
    let rest = [...acc].filter(a => !pos[a]);
    if (r < 0) {
      const deg = {}; unitRowIds(u).forEach(id => { const t = TX[id]; if (t.from === t.to) return; deg[t.from] = (deg[t.from] || 0) + 1; deg[t.to] = (deg[t.to] || 0) + 1; });
      rest.sort((a, b) => (deg[b] || 0) - (deg[a] || 0) || (a < b ? -1 : 1));
      if (rest.length) { pos[rest[0]] = C.slice(); rest = rest.slice(1); }
      ell(rest, 0.36, 0.36);
    } else if (rest.length) {
      const nb = {}; unitRowIds(u).forEach(id => { const t = TX[id]; if (pos[t.from] && !pos[t.to]) (nb[t.to] = nb[t.to] || []).push(pos[t.from]); if (pos[t.to] && !pos[t.from]) (nb[t.from] = nb[t.from] || []).push(pos[t.to]); });
      const ang = {}; rest.forEach((a, i) => { const L = nb[a]; if (L) { const x = L.reduce((s, p) => s + p[0], 0) / L.length - 0.5, y = L.reduce((s, p) => s + p[1], 0) / L.length - 0.5; ang[a] = (x || y) ? Math.atan2(y, x) : i * 2.39996; } else ang[a] = i * 2.39996; ang[a] = ((ang[a] % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); });
      rest.sort((a, b) => ang[a] - ang[b]);
      ell(rest, 0.46, 0.44, ang[rest[0]]);
    }
    return (LC[u.id] = { pos, ring: new Set(ra), shape });
  }

  /* ---------- drawing ---------- */
  function cats(u, run) {
    const fl = new Set((run && run.flagged_transfer_ids) || []);
    const r = u.expected === 'ring' ? u.ring_id : -1;
    const out = {};
    unitRowIds(u).forEach(id => { const t = TX[id]; const truth = t.label; const f = fl.has(id); out[id] = truth ? (f ? 'ok' : 'miss') : (f ? 'bad' : 'bg'); if (r >= 0 && t.ring === r && !truth) out[id] = f ? 'ok' : 'miss'; });
    return out;
  }
  /* opt: W, H, pad, big, ringOnly */
  function drawUnit(u, run, opt) {
    const W = opt.W, H0 = opt.H, pad = opt.pad;
    const L = layoutUnit(u);
    let P = a => { const p = L.pos[a] || [0.5, 0.5]; return [pad + p[0] * (W - 2 * pad), pad + p[1] * (H0 - 2 * pad)]; };
    if (opt.ringOnly && L.ring.size) {
      /* shape only: lay out on a fixed 180 x 112 base so circles stay round, then scale it up to fill the box */
      const base = a => { const p = L.pos[a] || [0.5, 0.5]; return [8 + p[0] * 164, 8 + p[1] * 96]; };
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; L.ring.forEach(a => { const [x, y] = base(a); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); });
      const bw = Math.max(x1 - x0, 1), bh = Math.max(y1 - y0, 1);
      const s = Math.min((W - 2 * pad) / bw, (H0 - 2 * pad) / bh, (W - 2 * pad) / 40);
      const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
      P = a => { const [x, y] = base(a); return [W / 2 + (x - mx) * s, H0 / 2 + (y - my) * s]; };
    }
    const svg = S('svg', { viewBox: '0 0 ' + W + ' ' + H0, role: 'img' });
    if (opt.big) {
      const defs = S('defs', null, svg);
      ['ok', 'bad', 'miss', 'bg'].forEach(c => { const m = S('marker', { id: 'mk-' + c, viewBox: '0 0 10 10', refX: '17', refY: '5', markerWidth: '7', markerHeight: '7', orient: 'auto-start-reverse', markerUnits: 'userSpaceOnUse' }, defs); S('path', { d: 'M0,1 L10,5 L0,9 z', class: 'mk-' + c }, m); });
    }
    const gBg = S('g', { class: 'bg' }, svg), gR = S('g', { class: 'ring' }, svg);
    const C = cats(u, run);
    const pairs = {};
    Object.keys(C).forEach(id => { const t = TX[id]; if (t.from === t.to) return; if (opt.ringOnly && !(C[id] === 'ok' || C[id] === 'miss')) return; const k = t.from + '>' + t.to; const pk = k + '|' + C[id]; (pairs[pk] = pairs[pk] || { from: t.from, to: t.to, cat: C[id], ids: [], ms: Infinity }); pairs[pk].ids.push(id); pairs[pk].ms = Math.min(pairs[pk].ms, t.ms); });
    const byPair = {}; Object.values(pairs).forEach(p => (byPair[p.from + '>' + p.to] = byPair[p.from + '>' + p.to] || []).push(p));
    const ORDER = { bg: 0, bad: 1, miss: 2, ok: 3 };
    const all = Object.values(pairs).sort((a, b) => ORDER[a.cat] - ORDER[b.cat]);
    const edges = [];
    all.forEach(p => {
      const sib = byPair[p.from + '>' + p.to]; const i = sib.indexOf(p); const rev = byPair[p.to + '>' + p.from];
      const [x1, y1] = P(p.from), [x2, y2] = P(p.to);
      const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
      const unit = opt.big ? 9 : 4;
      const off = (rev ? unit : 0) + (i - (sib.length - 1) / 2) * unit;
      const cx = (x1 + x2) / 2 - dy / len * off, cy = (y1 + y2) / 2 + dx / len * off;
      const path = S('path', { d: 'M' + x1.toFixed(1) + ',' + y1.toFixed(1) + ' Q' + cx.toFixed(1) + ',' + cy.toFixed(1) + ' ' + x2.toFixed(1) + ',' + y2.toFixed(1), class: 'e e-' + p.cat }, p.cat === 'bg' ? gBg : gR);
      if (opt.big) path.setAttribute('marker-end', 'url(#mk-' + p.cat + ')');
      edges.push({ el: path, p });
    });
    const nodes = [];
    const flaggedAcc = new Set(); Object.keys(C).forEach(id => { if (C[id] === 'bad' || C[id] === 'ok') { flaggedAcc.add(TX[id].from); flaggedAcc.add(TX[id].to); } });
    Object.keys(L.pos).forEach(a => {
      const inRing = L.ring.has(a); if (opt.ringOnly && !inRing) return;
      const [x, y] = P(a);
      const cls = inRing ? 'n n-ring' : (flaggedAcc.has(a) ? 'n n-flag' : 'n n-bg');
      const rr = opt.big ? (inRing ? 5 : 3) : opt.nodeR && inRing ? opt.nodeR : (inRing ? (opt.small ? 2.2 : 3) : (opt.small ? 1.4 : 1.6));
      const c = S('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: rr, class: cls }, inRing ? gR : gBg);
      nodes.push({ el: c, a, x, y, ring: inRing });
      if (opt.big && (inRing || flaggedAcc.has(a))) { const tx = S('text', { x: (x + 7).toFixed(1), y: (y - 6).toFixed(1), class: 'lbl' }, gR); tx.textContent = a; }
    });
    return { svg, edges, nodes, cats: C };
  }

  /* ---------- state ---------- */
  const MODELS = (BE.models || []).slice();
  const ST = {}; MODELS.forEach(m => ST[mkey(m)] = stats(m));
  let CUR = null;
  const TILES = []; let GROUP = null;
  let SEQ = 0; const timers = []; let caughtN = 0;
  function clearTimers() { while (timers.length) clearTimeout(timers.pop()); document.querySelectorAll('.fly').forEach(e => e.remove()); }
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }

  const FAM_NAMES = { anthropic: 'Anthropic', openai: 'OpenAI', deepseek: 'DeepSeek', mistral: 'Mistral', moonshot: 'Moonshot', xai: 'xAI', 'z-ai': 'Z.ai' };
  function prettyName(m) {
    let n = shortName(m.id);
    const c = /^claude-(\w+)-(\d+)-(\d+)$/.exec(n);
    if (c) n = 'Claude ' + c[1][0].toUpperCase() + c[1].slice(1) + ' ' + c[2] + '.' + c[3];
    return n + ' ' + (m.version || 'v1');
  }
  function renderModels() {
    const sel = $('#pick'); sel.innerHTML = '';
    const groups = {};
    MODELS.forEach(m => { const f = m.family || famOf(m.id); (groups[f] = groups[f] || []).push(m); });
    Object.keys(groups).forEach(f => {
      const og = document.createElement('optgroup'); og.label = FAM_NAMES[f] || f;
      groups[f].forEach(m => { const s = ST[mkey(m)]; const o = document.createElement('option'); o.value = mkey(m); o.textContent = prettyName(m) + ': ' + s.k + ' caught, ' + s.f + ' alarm' + (s.f === 1 ? '' : 's'); og.appendChild(o); });
      sel.appendChild(og);
    });
    sel.onchange = () => { const m = MODELS.find(x => mkey(x) === sel.value); if (m) select(m); };
  }

  function pickDefault() {
    const want = Q.get('model');
    if (want) { const m = MODELS.find(x => mkey(x) === want || x.id === want); if (m) return m; }
    const dflt = MODELS.find(x => mkey(x) === 'anthropic/claude-sonnet-5-5@v4');
    if (dflt) return dflt;
    return MODELS.slice().sort((a, b) => (ST[mkey(b)].k - ST[mkey(a)].k) || (ST[mkey(a)].f - ST[mkey(b)].f))[0];
  }

  function stripHtml(s) {
    const more = '<span class="more">' + ($('#ordWrap').hidden ? 'Show the ' + NO : 'Hide') + '</span>';
    return s.f === 0 ? '<span><b>No</b> alarms on the ' + NO + ' ordinary neighborhoods.</span>' + more
      : '<span><b>' + s.f + '</b> alarm' + (s.f === 1 ? '' : 's') + ' on ordinary neighborhoods, <b>' + s.g + '</b> on accounts inside a ring.</span>' + more;
  }
  function renderHeadline(m) {
    const s = ST[mkey(m)]; const name = prettyName(m);
    const alarms = s.f === 0 ? 'it raised no alarms on ordinary neighborhoods.' : 'it raised <b>' + s.f + '</b> alarm' + (s.f === 1 ? '' : 's') + ' on ordinary neighborhoods, <b>' + s.g + '</b> of them on accounts that sit inside a ring.';
    $('#headline').innerHTML = esc(name) + ' caught <b>' + s.k + '</b> of IBM\'s ' + NR + ' laundering rings and traced <b>' + s.tp + '</b> of ' + NTRUTH + ' laundering transfers; ' + alarms;
    const ds = BE.dataset || {}; const rate = ds.slice_transfers ? (NTRUTH / ds.slice_transfers * 100).toFixed(1) : (NTRUTH / Object.keys(TX).length * 100).toFixed(1);
    const pr = s.k / (NR || 1), pt = s.tp / (NTRUTH || 1);
    const strong = pt >= pr ? 'It traced <b>' + Math.round(pt * 100) + '</b> percent of IBM\'s laundering transfers.' : 'It caught <b>' + Math.round(pr * 100) + '</b> percent of IBM\'s laundering rings.';
    $('#limit').innerHTML = (SAMPLE ? 'Limit: a SAMPLE the page made up because ' + esc(missing.join(', ')) + ' did not load; nothing here is a measurement. '
      : 'Limit: IBM\'s synthetic data, a slice enriched to ' + rate + ' percent laundering, one run per neighborhood. ') + strong;
    $('#nCaughtOf').textContent = 'of ' + NR; $('#trayOf').textContent = ' of ' + NR;
    $('#rosterH').textContent = 'The rings ' + name + ' caught, as cards';
    const strip = $('#strip'); strip.classList.toggle('quiet', s.f === 0); strip.innerHTML = stripHtml(s);
  }
  $('#strip').onclick = () => { const w = $('#ordWrap'); w.hidden = !w.hidden; $('#strip').setAttribute('aria-expanded', w.hidden ? 'false' : 'true'); if (CUR) $('#strip').innerHTML = stripHtml(ST[mkey(CUR)]); };

  function buildTiles(m) {
    const R = RUNS[mkey(m)] || {};
    TILES.length = 0;
    const rg = $('#ringGrid'), og = $('#ordGrid'); rg.innerHTML = ''; og.innerHTML = '';
    /* shaped rings, caught first so the green shapes lead the frame; single transfers collapse into one tile at the end */
    const shaped = ringUnits.filter(u => RINGS[u.ring_id].length > 1);
    const singles = ringUnits.filter(u => RINGS[u.ring_id].length === 1).map((u, i) => ({ u, i, f: ringFound(R[u.id], u) })).sort((a, b) => (b.f - a.f) || (a.i - b.i)).map(x => x.u);
    const caughtFirst = shaped.map((u, i) => ({ u, i, f: ringFound(R[u.id], u) })).sort((a, b) => (b.f - a.f) || (a.i - b.i)).map(x => x.u);
    caughtFirst.forEach(u => {
      const run = R[u.id];
      const d = drawUnit(u, run, { W: 240, H: 120, pad: 14, ringOnly: true, nodeR: 4 });
      const t = H('div', 'tile rt'); t.tabIndex = 0;
      const found = ringFound(run, u);
      t.appendChild(H('div', 'th', '<span class="sh">' + esc(ibmName(u).replace(/\s*\(.*\)$/, '')) + '</span><span class="st"></span>'));
      t.appendChild(d.svg);
      if (!run || !run.verdict) t.classList.add('noans');
      const T = { el: t, u, run, ring: true, found, d, alarm: false };
      wireTile(T); rg.appendChild(t); TILES.push(T);
    });
    GROUP = null;
    if (singles.length) {
      const g = H('div', 'tile rt gt'); g.tabIndex = 0;
      g.appendChild(H('div', 'th', '<span class="sh">Single transfers (no named shape)</span><span class="st"><b class="gk">0</b> of ' + singles.length + ' caught</span>'));
      const marks = H('div', 'marks'); g.appendChild(marks);
      GROUP = { el: g, n: singles.length, k: 0, items: [] };
      singles.forEach(u => {
        const run = R[u.id];
        const d = drawUnit(u, run, { W: 120, H: 40, pad: 10, ringOnly: true, nodeR: 3.5 });
        const mk = H('div', 'mark'); mk.tabIndex = 0; mk.appendChild(d.svg);
        if (!run || !run.verdict) mk.classList.add('noans');
        const T = { el: mk, u, run, ring: true, found: ringFound(run, u), d, alarm: false, mark: true };
        wireTile(T); marks.appendChild(mk); TILES.push(T); GROUP.items.push(T);
      });
      const raw = singles.map(u => String(ibmRaw(u) || '').toLowerCase());
      const nNo = raw.filter(w => /^no named|^lone/.test(w)).length, nBi = raw.filter(w => /^bipartite/.test(w)).length;
      const gtip = '<h4>Single transfers (no named shape)</h4><p>' + singles.length + ' of IBM\'s laundering groups are one transfer each, with no visible structure around it. IBM\'s pattern file names ' + nNo + ' of them "no named shape"' + (nBi ? ' and ' + nBi + ' "bipartite" (only one of its rows is in this slice)' : '') + '. From the rows alone a single transfer looks like ordinary traffic, so this is the part detectors find least.</p><p>Each mark is one of them: green caught, amber dotted missed. Hover a mark for its counts and reason; click it to open it.</p>';
      GROUP.tip = gtip;
      g.addEventListener('mouseenter', () => { tip.innerHTML = gtip; tip.hidden = false; });
      g.addEventListener('mousemove', moveTip);
      g.addEventListener('mouseleave', () => { tip.hidden = true; });
      const openFirst = () => { const T = GROUP.items.find(x => x.found) || GROUP.items[0]; openDlg(T); };
      g.addEventListener('click', openFirst);
      g.addEventListener('keydown', ev => { if (ev.target === g && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); openFirst(); } });
      rg.appendChild(g);
    }
    ordUnits.forEach(u => {
      const run = R[u.id];
      const d = drawUnit(u, run, { W: 96, H: 64, pad: 6, small: true });
      const t = H('div', 'tile ot'); t.tabIndex = 0;
      t.appendChild(d.svg);
      if (!run || !run.verdict) t.classList.add('noans');
      const T = { el: t, u, run, ring: false, found: false, d, alarm: !!(run && run.verdict === 'ring') };
      wireTile(T); og.appendChild(t); TILES.push(T);
    });
  }

  function setStatus(T) {
    const st = T.el.querySelector('.st');
    if (T.mark) {
      T.el.classList.toggle('caught', T.found); T.el.classList.toggle('missed', !T.found);
      if (T.found && GROUP) { GROUP.k++; const gk = GROUP.el.querySelector('.gk'); if (gk) gk.textContent = GROUP.k; }
      if (GROUP && GROUP.items.every(x => x === T || x.el.classList.contains('lit'))) GROUP.el.classList.add('lit', GROUP.k ? 'some' : 'none');
    } else if (T.ring) {
      T.el.classList.toggle('caught', T.found); T.el.classList.toggle('missed', !T.found);
      if (st) st.textContent = !T.run || !T.run.verdict ? 'no answer' : T.found ? 'caught' : 'missed';
    } else T.el.classList.toggle('alarm', T.alarm);
    T.el.classList.add('lit');
  }

  function select(m) {
    CUR = m; const my = ++SEQ; clearTimers(); tip.hidden = true;
    $('#pick').value = mkey(m);
    renderHeadline(m); buildTiles(m);
    caughtN = 0; $('#nCaught').textContent = '0';
    resetRoster();
    TILES.filter(T => !T.ring).forEach(setStatus); /* ordinary tiles sit behind the strip; they need no sequence */
    const rings = TILES.filter(T => T.ring);
    if (reduced()) {
      rings.forEach(T => { setStatus(T); if (T.found) { caughtN++; addCaught(T, null); } });
      $('#nCaught').textContent = caughtN; return;
    }
    /* misses light together in one quiet beat; then the catches, 60 ms apart, so the sequence ends on the last catch */
    later(() => { if (my === SEQ) rings.filter(T => !T.found).forEach(setStatus); }, 120);
    rings.filter(T => T.found).forEach((T, i) => {
      later(() => {
        if (my !== SEQ) return;
        setStatus(T);
        caughtN++; $('#nCaught').textContent = caughtN; catchMoment(T, my);
      }, 300 + i * 60);
    });
  }

  /* ---------- the catch moment ---------- */
  function catchMoment(T, my) {
    const svg = T.d.svg; const ease = 'cubic-bezier(.2,.7,.2,1)';
    const vb = svg.viewBox.baseVal; const cx = vb.width / 2, cy = vb.height / 2;
    T.d.nodes.filter(n => n.ring).forEach(n => {
      n.el.animate([{ transform: 'translate(' + (cx - n.x).toFixed(1) + 'px,' + (cy - n.y).toFixed(1) + 'px)' }, { transform: 'translate(0px,0px)' }], { duration: 300, easing: ease });
    });
    T.d.edges.filter(e => e.p.cat === 'ok').forEach(e => {
      e.el.setAttribute('pathLength', '1');
      const a = e.el.animate([{ strokeDasharray: '0 1' }, { strokeDasharray: '0 1', offset: 0.3 }, { strokeDasharray: '1 0' }], { duration: 440, easing: ease });
      a.onfinish = () => e.el.removeAttribute('pathLength');
    });
    later(() => { if (my === SEQ) fly(T, my); }, 380);
  }
  function miniShape(T) { return drawUnit(T.u, T.run, { W: 180, H: 112, pad: 10, ringOnly: true }).svg; }
  function fly(T, my) {
    const slot = nextSlot(); if (!slot) { addCaught(T, null); return; }
    const from = T.d.svg.getBoundingClientRect(); const to = slot.getBoundingClientRect();
    const ghost = H('div', 'fly'); ghost.style.left = from.left + 'px'; ghost.style.top = from.top + 'px'; ghost.style.width = from.width + 'px'; ghost.style.height = from.height + 'px';
    ghost.appendChild(miniShape(T)); document.body.appendChild(ghost);
    const sc = Math.min(to.width / from.width, to.height / from.height);
    const dx = to.left + (to.width - from.width * sc) / 2 - from.left, dy = to.top + (to.height - from.height * sc) / 2 - from.top;
    const a = ghost.animate([{ transform: 'translate(0px,0px) scale(1)', opacity: 1 }, { transform: 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px) scale(' + sc.toFixed(3) + ')', opacity: 0.9 }], { duration: 520, easing: 'cubic-bezier(.45,0,.2,1)', fill: 'forwards' });
    slot.dataset.reserved = '1';
    const land = () => { ghost.remove(); if (my === SEQ) addCaught(T, slot); };
    a.onfinish = land;
    later(land, 700); /* if the browser never finishes the animation (hidden tab), the card still lands */
  }

  /* ---------- tray and roster ---------- */
  function resetRoster() {
    const sl = $('#slots'); sl.innerHTML = '';
    for (let i = 0; i < NR; i++) { const b = H('button', 'slot'); b.type = 'button'; b.tabIndex = -1; b.setAttribute('aria-label', 'empty'); sl.appendChild(b); }
    $('#trayN').textContent = '0';
    $('#cards').innerHTML = '<p class="empty" id="noCards">Nothing caught yet. Cards land here as the model catches IBM\'s rings.</p>';
  }
  function nextSlot() { return [...document.querySelectorAll('.slot')].find(s => !s.classList.contains('full') && !s.dataset.reserved); }
  function moneyLine(ids) {
    const by = {}; ids.forEach(id => { const t = TX[id]; by[t.cur] = (by[t.cur] || 0) + t.paid; });
    const cs = Object.keys(by).sort((a, b) => by[b] - by[a]);
    return cs.slice(0, 2).map(c => compact(by[c]) + ' ' + curCode(c)).join(' + ') + (cs.length > 2 ? ' + ' + (cs.length - 2) + ' more' : '');
  }
  function isSwept(T) {
    if (!T.ring || T.found || !T.run) return false;
    const fl = new Set(T.run.flagged_transfer_ids || []); const ids = RINGS[T.u.ring_id];
    return ids.filter(i => fl.has(i)).length / ids.length >= 0.5;
  }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
  function flagLine(T) {
    const fl = (T.run && T.run.flagged_transfer_ids) || []; const truth = new Set(RINGS[T.u.ring_id]);
    const hit = fl.filter(i => truth.has(i)).length; const other = fl.filter(i => TX[i] && !TX[i].label).length;
    return 'Flagged ' + plural(fl.length, 'transfer') + ': ' + hit + ' of IBM\'s ' + truth.size + ', ' + other + ' ordinary';
  }
  function alsoLine(T) {
    const fam = CUR ? (CUR.family || famOf(CUR.id)) : '';
    const others = [...(FAM_CAUGHT[T.u.id] || [])].filter(f => f !== fam).sort().map(f => FAM_NAMES[f] || f);
    return others.length ? 'Also caught by ' + others.length + ' of ' + (ALL_FAMS.length - 1) + ' other families: ' + esc(others.join(', ')) : 'No other family caught this one.';
  }
  function addCaught(T, slot) {
    slot = slot || nextSlot(); const id = 'card-' + T.u.id;
    if (document.getElementById(id)) return;
    if (slot) { slot.innerHTML = ''; slot.appendChild(miniShape(T)); slot.classList.add('full'); slot.tabIndex = 0; slot.setAttribute('aria-label', ibmName(T.u) + ', caught'); slot.title = ibmName(T.u) + ': open it'; slot.onclick = () => openDlg(T); }
    const n = document.querySelectorAll('.slot.full').length; $('#trayN').textContent = n;
    const nc = $('#noCards'); if (nc) nc.remove();
    const r = T.u.ring_id, ids = RINGS[r];
    const c = H('div', 'card'); c.id = id;
    c.appendChild(miniShape(T));
    c.appendChild(H('h3', null, esc(ibmName(T.u))));
    c.appendChild(H('div', 'cm', plural(ringAccts[r].size, 'account') + ' · ' + plural(ids.length, 'transfer')));
    c.appendChild(H('div', 'cm', esc(moneyLine(ids)) + ' moved'));
    c.appendChild(H('div', 'cm', esc(flagLine(T))));
    c.appendChild(H('div', 'also', alsoLine(T)));
    c.appendChild(H('div', 'why', esc(firstSentence(T.run && T.run.why))));
    $('#cards').appendChild(c);
  }

  /* ---------- hover ---------- */
  const tip = $('#tip');
  function idList(ids, cls, max) { const a = ids.slice(0, max).map(i => '<span class="' + cls + '">' + esc(i) + '</span>').join(' '); return a + (ids.length > max ? ' +' + (ids.length - max) + ' more' : ''); }
  function tipHtml(T) {
    const run = T.run; const C = T.d.cats; const byCat = { ok: [], bad: [], miss: [] };
    Object.keys(C).forEach(id => { if (byCat[C[id]]) byCat[C[id]].push(id); });
    Object.values(byCat).forEach(a => a.sort());
    let h;
    if (T.ring) {
      const ids = RINGS[T.u.ring_id];
      h = '<h4>IBM\'s shape: ' + esc(ibmName(T.u)) + '</h4><p>' + esc(SHAPE_WORDS[layoutShapeOf(T.u)] || '') + '</p><p class="cnt">' + plural(ids.length, 'laundering transfer') + ', ' + plural(ringAccts[T.u.ring_id].size, 'account') + '</p>' + (run && run.verdict ? '<p class="cnt">' + esc(flagLine(T)) + '</p>' : '') + (isSwept(T) ? '<p>It flagged IBM\'s transfers here, but inside a sweep: more wrong flags in this neighborhood than the ring has transfers, so the engine does not count it as caught.</p>' : '');
    } else h = '<h4>Ordinary neighborhood ' + esc(T.u.id) + '</h4><p>IBM labels none of these transfers as laundering.</p>';
    if (!run) h += '<p><i>No run for this model here.</i></p>';
    else if (!run.verdict) h += '<p><i>No answer: ' + esc(firstSentence(run.error || 'the model returned nothing usable')).slice(0, 140) + '</i></p>';
    else h += '<p><b>Model said: ' + esc(run.verdict) + (run.pattern ? ', ' + esc(run.pattern) : '') + '.</b> ' + esc(firstSentence(run.why)) + '</p>';
    if (byCat.ok.length) h += '<div class="ids">Flagged, IBM agrees: ' + idList(byCat.ok, 'g', 10) + '</div>';
    if (byCat.bad.length) h += '<div class="ids">Flagged, IBM says ordinary: ' + idList(byCat.bad, 'r', 10) + '</div>';
    if (byCat.miss.length) h += '<div class="ids">Missed: ' + idList(byCat.miss, 'y', 10) + '</div>';
    if (!byCat.ok.length && !byCat.bad.length && !byCat.miss.length) h += '<div class="ids">No transfers flagged.</div>';
    return h;
  }
  function moveTip(ev) { const w = tip.offsetWidth, h = tip.offsetHeight; let x = ev.clientX + 14, y = ev.clientY + 14; if (x + w > innerWidth - 8) x = ev.clientX - w - 14; if (y + h > innerHeight - 40) y = Math.max(8, ev.clientY - h - 14); tip.style.left = x + 'px'; tip.style.top = y + 'px'; }
  function wireTile(T) {
    T.el.addEventListener('mouseenter', () => { tip.innerHTML = tipHtml(T); tip.hidden = false; });
    T.el.addEventListener('mousemove', moveTip);
    T.el.addEventListener('mouseleave', () => { if (T.mark && GROUP) tip.innerHTML = GROUP.tip; else tip.hidden = true; });
    T.el.addEventListener('click', ev => { ev.stopPropagation(); openDlg(T); });
    T.el.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); openDlg(T); } });
  }

  /* ---------- expanded view with the time scrub ---------- */
  let DLG = null, playTimer = null;
  function openDlg(T) {
    tip.hidden = true;
    const u = T.u;
    $('#dCtx').checked = !T.ring; $('#dCtxWrap').hidden = !T.ring;
    const big = drawUnit(u, T.run, { W: 720, H: 440, pad: 34, big: true, ringOnly: T.ring });
    const box = $('#dSvg'); box.innerHTML = ''; box.appendChild(big.svg);
    $('#dCard').innerHTML = T.ring ? '<div class="cm">' + plural(ringAccts[u.ring_id].size, 'account') + ' · ' + plural(RINGS[u.ring_id].length, 'laundering transfer') + ' · ' + esc(moneyLine(RINGS[u.ring_id])) + ' moved</div>' + (T.run && T.run.verdict ? '<div class="cm">' + esc(flagLine(T)) + '</div>' : '') + '<div class="cm">' + alsoLine(T) + '</div>' : '';
    const ids = unitRowIds(u).sort((a, b) => TX[a].ms - TX[b].ms);
    /* the scrub belongs to the group: it starts on the first day of IBM's group (or of the neighborhood, for ordinary ones) */
    const gids = T.ring ? RINGS[u.ring_id].slice().sort((a, b) => TX[a].ms - TX[b].ms) : ids;
    const t0d = new Date(TX[gids[0]].ms); const start = Date.UTC(t0d.getUTCFullYear(), t0d.getUTCMonth(), t0d.getUTCDate());
    const last = TX[gids[gids.length - 1]].ms; const days = Math.max(10, Math.ceil((last - start + 1) / 864e5));
    const hours = days * 24; const rng = $('#dRange'); rng.max = hours; rng.value = hours;
    $('#dTicks').innerHTML = [0, Math.round(days / 2), days].map(d => '<span>' + fmtDay(start + d * 864e5) + '</span>').join('');
    const shape = T.ring ? ibmName(u) : 'ordinary neighborhood';
    $('#dTitle').textContent = T.ring ? shape + ', one of IBM\'s laundering rings' : 'Ordinary neighborhood';
    const stat = T.ring ? (T.found ? 'caught' : (T.run && T.run.verdict ? 'missed' : 'no answer')) : (T.alarm ? 'called a ring: a false alarm' : (T.run && T.run.verdict ? 'left alone' : 'no answer'));
    $('#dSub').textContent = prettyName(CUR) + ': ' + stat + ' · ' + ids.length + ' transfers among ' + Object.keys(layoutUnit(u).pos).length + ' accounts · scrub ' + days + ' days for this group only';
    $('#dWhy').innerHTML = T.run ? ('<b>The model\'s reason.</b> ' + esc(T.run.why || T.run.error || 'none given')) : 'No run for this model here.';
    const L = $('#dList'); L.innerHTML = '';
    const rows = ids.map(id => { const t = TX[id]; const c = big.cats[id]; const row = H('div', 'row c-' + c, '<span class="dot"></span><span>' + esc(id) + '</span><span>' + esc(fmtTime(t.ms)) + '</span><span>' + esc(t.from) + ' to ' + esc(t.to) + '</span><span class="amt">' + esc(compact(t.paid)) + ' ' + esc(curCode(t.cur)) + '</span>'); row.title = { ok: 'flagged, IBM agrees', bad: 'flagged, IBM says ordinary', miss: 'IBM says laundering, missed', bg: 'ordinary, not flagged' }[c] + ' · ' + t.fmt + ' · ' + t.paid + ' ' + t.cur; L.appendChild(row); return { row, ms: t.ms }; });
    DLG = { big, rows, start, hours, T };
    rng.oninput = () => scrubTo(+rng.value);
    scrubTo(hours);
    $('#dlg').hidden = false; $('#dClose').focus();
  }
  $('#dCtx').onchange = () => {
    if (!DLG) return;
    const big = drawUnit(DLG.T.u, DLG.T.run, { W: 720, H: 440, pad: 34, big: true, ringOnly: !$('#dCtx').checked });
    $('#dSvg').innerHTML = ''; $('#dSvg').appendChild(big.svg); DLG.big = big; scrubTo(+$('#dRange').value);
  };
  function scrubTo(h) {
    if (!DLG) return; const t = DLG.start + h * 36e5;
    DLG.big.edges.forEach(e => { e.el.classList.toggle('later', e.p.ms > t); e.el.classList.toggle('fresh', e.p.ms <= t && e.p.ms > t - 12 * 36e5 && h < DLG.hours); });
    let n = 0; DLG.rows.forEach(r => { const lt = r.ms > t; r.row.classList.toggle('later', lt); if (!lt) n++; });
    $('#dTime').textContent = fmtTime(Math.min(t, DLG.start + DLG.hours * 36e5)) + ' · ' + n + ' of ' + DLG.rows.length + ' shown';
  }
  function stopPlay() { if (playTimer) { clearInterval(playTimer); playTimer = null; } $('#dPlay').textContent = 'Play'; }
  $('#dPlay').onclick = () => {
    if (playTimer) { stopPlay(); return; }
    const rng = $('#dRange'); if (+rng.value >= +rng.max) rng.value = 0;
    $('#dPlay').textContent = 'Pause';
    playTimer = setInterval(() => { const v = Math.min(+rng.max, +rng.value + 2); rng.value = v; scrubTo(v); if (v >= +rng.max) stopPlay(); }, 40);
  };
  function closeDlg() { stopPlay(); $('#dlg').hidden = true; DLG = null; }
  $('#dClose').onclick = closeDlg;
  $('#dlg').addEventListener('click', ev => { if (ev.target.id === 'dlg') closeDlg(); });
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && !$('#dlg').hidden) closeDlg(); });

  /* ---------- theme ---------- */
  function isDark() { const t = document.documentElement.getAttribute('data-theme'); return t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches; }
  function syncThemeBtn() { $('#themeBtn').textContent = isDark() ? 'Light' : 'Dark'; }
  $('#themeBtn').onclick = () => { document.documentElement.setAttribute('data-theme', isDark() ? 'light' : 'dark'); syncThemeBtn(); };
  syncThemeBtn();

  /* ---------- boot ---------- */
  const badge = $('#badge');
  if (SAMPLE) { badge.textContent = 'SAMPLE'; badge.classList.add('sample'); badge.title = 'Could not load ' + missing.join(', ') + '; the page made up a small sample.'; }
  else { badge.textContent = (BE.written ? 'runs written ' + BE.written : 'real runs'); badge.title = 'Read from ../../../data/: slice.js, units.js, bench_results.js'; }
  (function honest() {
    const foot = $('#foot');
    if (SAMPLE) { foot.innerHTML = '<p>SAMPLE data made up by this page; ' + esc(missing.join(', ')) + ' did not load. Nothing here is a measurement.</p>'; return; }
    const sl = SL.slice || {}; const all = Object.keys(TX).length;
    const rate = ((BE.dataset || {}).slice_transfers ? NTRUTH / BE.dataset.slice_transfers : NTRUTH / all) * 100;
    const full = sl.full_rows ? (sl.full_laundering / sl.full_rows * 100) : 0.1;
    const lab = Object.values(TX).filter(t => t.label); const ach = lab.filter(t => t.fmt === 'ACH').length;
    const achLine = ach === lab.length ? 'Every laundering transfer in the slice is ACH, a tell a model can lean on.' : Math.round(ach / lab.length * 100) + ' percent of the laundering transfers in the slice are ACH, a tell a model can lean on.';
    foot.innerHTML = '<p>Synthetic data: IBM\'s AMLworld simulator made the transfers and labeled the laundering; we planted nothing, and the labels are IBM\'s.</p>'
      + '<p>The slice is enriched: ' + rate.toFixed(1) + ' percent laundering against ' + (full < 1 ? full.toFixed(1) : full.toFixed(2)) + ' percent in the whole file, and its neighborhoods were cut around IBM\'s groups.</p>'
      + '<p>' + achLine + '</p>';
  })();
  renderModels();
  select(pickDefault());
  const op = Q.get('open'); if (op) { const T = TILES.find(x => x.u.id === op); if (T) { if (Q.get('at')) { openDlg(T); $('#dRange').value = Q.get('at'); scrubTo(+Q.get('at')); } else openDlg(T); } }

  /* ---------- SAMPLE ---------- */
  function makeSample() {
    const rnd = seeded(20261017); let n = 0; const T = [], key = {}, meta = {};
    const acct = () => 'S' + Math.floor(rnd() * 0xfffff).toString(16).toUpperCase().padStart(5, '0');
    const when = (d, h) => '2022/09/' + String(1 + d).padStart(2, '0') + ' ' + String(h).padStart(2, '0') + ':' + String(Math.floor(rnd() * 60)).padStart(2, '0');
    const tx = (f, t, ring, d) => { const id = 'S' + String(++n).padStart(4, '0'); T.push([id, when(d == null ? Math.floor(rnd() * 10) : d, Math.floor(rnd() * 24)), f, t, Math.round(rnd() * 90000) / 10 + 100, rnd() < 0.7 ? 'US Dollar' : 'Euro', ring >= 0 ? 'ACH' : (rnd() < 0.5 ? 'Cheque' : 'Credit Card'), '001', '002']); key[id] = [ring >= 0 ? 1 : 0, ring]; return id; };
    const units = []; const shapes = ['cycle', 'fan-in', 'fan-out', 'scatter-gather', 'chain', 'mesh', 'lone'];
    shapes.forEach((shape, r) => {
      meta[r] = { shape }; const A = Array.from({ length: shape === 'lone' ? 2 : shape === 'chain' ? 4 : 5 }, acct); const ids = [];
      if (shape === 'cycle') A.forEach((a, i) => ids.push(tx(a, A[(i + 1) % A.length], r, i)));
      else if (shape === 'fan-in') A.slice(1).forEach((a, i) => ids.push(tx(a, A[0], r, 2 + i % 2)));
      else if (shape === 'fan-out') A.slice(1).forEach((a, i) => ids.push(tx(A[0], a, r, 3)));
      else if (shape === 'scatter-gather') { [1, 2, 3].forEach(i => { ids.push(tx(A[0], A[i], r, 2)); ids.push(tx(A[i], A[4], r, 4)); }); }
      else if (shape === 'chain') A.slice(1).forEach((a, i) => ids.push(tx(A[i], a, r, 1 + i)));
      else if (shape === 'mesh') { [[0, 3], [0, 4], [1, 3], [2, 4], [1, 4]].forEach(p => ids.push(tx(A[p[0]], A[p[1]], r, 5))); }
      else ids.push(tx(A[0], A[1], r, 6));
      meta[r].n = ids.length;
      const B = Array.from({ length: 6 }, acct); const rows = ids.slice();
      for (let i = 0; i < 9; i++) rows.push(tx(rnd() < 0.5 ? A[Math.floor(rnd() * A.length)] : B[Math.floor(rnd() * 6)], B[Math.floor(rnd() * 6)], -1));
      units.push({ id: 'u' + String(units.length + 1).padStart(2, '0'), expected: 'ring', shape, ring_id: r, accounts: A.concat(B), rows: rows.map(id => T.find(x => x[0] === id)), truth_ids: ids });
    });
    for (let k = 0; k < 10; k++) { const B = Array.from({ length: 6 }, acct); const rows = []; for (let i = 0; i < 9; i++) rows.push(tx(B[Math.floor(rnd() * 6)], B[Math.floor(rnd() * 6)], -1)); units.push({ id: 'u' + String(units.length + 1).padStart(2, '0'), expected: 'ordinary', shape: null, ring_id: null, accounts: B, rows: rows.map(id => T.find(x => x[0] === id)), truth_ids: [] }); }
    units.sort((a, b) => a.id < b.id ? -1 : 1);
    const models = [{ id: 'sample/model-a', family: 'sample-a', version: 'v1' }, { id: 'sample/model-b', family: 'sample-b', version: 'v1' }]; const runs = [];
    models.forEach((m, mi) => { units.forEach(u => {
      const truth = u.truth_ids; const ring = u.expected === 'ring' ? rnd() < (mi ? 0.55 : 0.75) : rnd() < (mi ? 0.2 : 0.35);
      const fl = ring ? (u.expected === 'ring' ? truth.filter(() => rnd() < 0.85) : []).concat(u.rows.filter(r => !truth.includes(r[0]) && rnd() < 0.3).map(r => r[0])) : [];
      runs.push({ model: m.id, family: m.family, version: 'v1', unit: u.id, expected: u.expected, verdict: ring ? 'ring' : 'ordinary', pattern: ring ? (u.shape || 'chain') : null, flagged_transfer_ids: fl, ring_found: u.expected === 'ring' && truth.length > 0 && truth.filter(i => fl.includes(i)).length / truth.length >= 0.5, why: 'SAMPLE reason made up by the page for ' + u.id + '.', ibm_shape: u.shape });
    }); });
    return { slice: { transfers: T, key, ring_meta: meta, sample: true }, units: { units }, bench: { dataset: { name: 'SAMPLE made up by the page' }, models, runs, written: '' } };
  }
})();
