// Bakes layout.js from ../../../data/slice.js with layout_core.js, so the page never lays out at load (frozen, no jitter).
// Run: node build_layout.mjs
import fs from 'node:fs'; import vm from 'node:vm'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const ctx = { window: {} }; ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(here, '../../../data/slice.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(path.join(here, 'layout_core.js'), 'utf8'), ctx);
const SL = ctx.window.SLICE; const t0 = Date.now();
const out = ctx.window.RingsLayout(SL.transfers, id => { const k = SL.key[id]; return k && k[0] ? k[1] : -1; }, 1.55);
const n = Object.keys(out.pos).length;
fs.writeFileSync(path.join(here, 'layout.js'), '/* baked by build_layout.mjs from slice.js; ' + n + ' accounts */\nwindow.RINGS_LAYOUT = ' + JSON.stringify(out) + ';\n');
console.log('accounts', n, 'ms', Date.now() - t0, 'main radius', out.mainRadius);
