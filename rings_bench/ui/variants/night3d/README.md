# Rings at night (three-dimensional variant)

Open `index.html` with a double-click. It reads `../../../data/slice.js`, `bench_results.js` and `units.js`; if slice or bench is missing it draws a small made-up network and shows a yellow SAMPLE badge.

## What this variant argues, in three sentences

Laundering rings are shapes in a crowd of ordinary money, and depth lets the crowd fall back while the shapes stay readable. A model earns its place by closing those shapes: each ring it catches draws itself shut in green and drops into a roster you can count. Its false alarms and misses stay on the network, quiet and honest (red dashed, amber dotted), so the catch is never shown without its cost.

## What is on screen

- **The network**: 2,824 transfers as one merged hairline geometry, 1,797 accounts as one instanced mesh of small spheres sized by transfer count, laid out by a small 3D force simulation written in the page (grid-hashed repulsion, springs on account pairs, weak gravity; 280 steps at load, about half a second).
- **Lit layers per model**: green solid for flagged transfers IBM labels laundering, red dashed for flagged transfers IBM labels ordinary, amber dotted for labeled transfers the model missed. Spheres take the same colors.
- **The catch moment and the caught roster**: when a ring's evidence is complete (its last flagged transfer has arrived on the time scrub), its lines draw from source to target so the loop closes or the fan snaps into its star, and a copy of the shape travels into a card in the bottom roster. Each card shows IBM's shape name, accounts and transfer count, money moved (largest currency plus how many others), which other families also caught it, and the model's one-line why.
- **Result copy** (right panel) leads with what was caught: "<Model> caught k of IBM's 20 laundering rings and traced m of 113 laundering transfers; it raised f alarms on ordinary neighborhoods, g of them on accounts that sit inside a ring." One limit line follows, and the panel ends on the stronger of two true numbers (share of flagged accounts that sit inside a ring, or rings caught).
- **Time scrub** Sep 1 to Sep 10 with one teal action, Play. The last stop includes the file's tail (to Sep 16), where four groups do most of their work.
- **Model picker**: model grouped by family, then version buttons.
- **Hover card** for any lit line, ring sphere or roster card: IBM's shape name, status (caught, partly traced, missed, or false alarm), the model's one-sentence why, and the transfer ids colored by outcome. The hovered group is outlined in white.
- **Legend** written as the key, plus camera hints.

## Deliberately left out, and why

- Per-group camera swoops: the audits said they distract. The camera moves once, at load.
- Particles, glow bloom, pulses, confetti, sound: none of them carries data.
- The flat page's leaderboard, shape grid and account desk: this variant argues the picture; the flat page already holds the tables.
- A light theme: the variant is the desk at night by design.
- Fat lines (Line2): not in the single three.js file; 1 px WebGL lines plus colored spheres carry the classes.

## Animation timings and what each carries

| Motion | Duration | Carries |
|---|---|---|
| Opening camera move | 1,600 ms, ease-out cubic, once | Brings you from wide to the working view; catches wait for it |
| Model switch | about 320 ms (exponential ease-out, time constant 75 ms) | Old model's lines fade out while the new model's fade in; sphere colors settle |
| Ring resolve (catch) | 450 ms, ease-out cubic; lines staggered in the first 40 percent | The loop closes, the fan snaps into its star: the ring is caught |
| Shape flies to roster | 620 ms, ease-out | The caught ring becomes a countable card |
| Card entry | 260 ms fade and 6 px rise | Same moment, on the card side |
| Gap between catches | 160 ms | Rings land one at a time, in the order their evidence completed |
| Play the ten days | 14 s (1.4 s per day), linear | Transfers appear in time order; rings get caught as their evidence completes |

Under `prefers-reduced-motion: reduce` the opening move, fades, resolves and flights are skipped (end states only), and Play steps one day every 0.9 s.

## Checks run (headless Edge via Playwright, 1280 and 1440 by 800)

- No page errors; the only console message is three.js's own deprecation warning for `three.min.js` (a warning, not an error).
- Default model (strongest by the flat page's rule): Claude Sonnet 5.5 v3, 13 of 20 caught, matching `rings_found` in the bench file; Kimi K3 v1 recounts to 19 of 20, also matching.
- 6 draw calls per frame at rest. Headless software GL ran about 20 fps; a laptop GPU was not measured here.
- Reduced motion: same final state, 13 cards. SAMPLE fallback (folder copy with no data files): renders, badge shows, no errors.

Screenshots (1280 unless named): `shot_1280.jpg` (default view, roster full), `shot_1440.jpg`, `shot_1280_switch_midcatch.jpg` (0.9 s after switching to Kimi K3, rings landing), `shot_1280_kimi.jpg`, `shot_1280_play_mid.jpg` (Play at about Sep 5, 5 of 20 caught so far), `shot_1280_hover_canvas.jpg` (hover card on a false alarm).

## Known limits

- If the room's wifi hangs rather than fails, the CDN script can stall before the local `three.min.js` fallback loads. Swap the order in `index.html` to load the local copy first if the wifi looks bad.
- Lines are 1 px (a WebGL limit), so on a projector the spheres carry more of the color than the lines.
- The layout is computed at load (about half a second on a laptop) and is not saved; it is seeded, so it comes out the same each time.
- Accounts that only pay themselves (340 transfers) have no line; they still count toward sphere size.
- Money moved is summed per currency, never converted.
- Families "also caught it" counts any version of that family.
- The font files come from Google Fonts; offline, the page falls back to Georgia, Segoe UI and Consolas.
