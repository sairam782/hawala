# Rings in time (variant: timedepth3d, "paper ledger")

Open `index.html` with a double-click. It reads `../../../data/slice.js`, `units.js` and `bench_results.js`; if any is missing it draws a small made-up network and says SAMPLE in an amber badge at the top.

## What it argues, in three sentences

Laundering is a shape in time, not just a shape on a map: a chain marches forward through the days, a cycle comes back to the account it started from, a fan-out sprays from one account in a short burst. So the accounts sit on a flat map and the third axis is the ten days from Sep 1 to Sep 10, and one tilt turns the same picture from "who paid whom" (map) into "in what order" (timeline). Each IBM ring the selected model catches draws itself in the order its money moved and then drops into a "Caught" list, so the screen leads with what was found, and the false alarms and misses stay visible but quiet.

## What is on the page

- **The network, in three dimensions.** Accounts are dots on the map plane (a small force layout written in the page, no libraries; components are packed on a wide spiral, biggest in the middle). Each transfer is a short segment drawn at the depth of the moment it happened. All 2,484 ordinary transfers are faint hairlines in one merged geometry.
- **Lit groups for the selected model.** Green solid: flagged and IBM agrees. Red dashed: flagged, IBM labels it ordinary. Amber dotted: IBM labels it laundering, the model missed it. Thin lines in the group's color join the same account across time inside an IBM ring, which is what turns a chain into a staircase and a cycle into a loop that returns.
- **Camera.** Map (top-down, time hidden) and Timeline (side-on at 76 degrees, days run left to right with day labels), plus a tilt slider for anything between. Drag to pan, scroll to zoom, double-click to reset. The camera is orthographic, so the map view lines up exactly.
- **Day scrub.** A slider and a Play button that extrude the graph forward through time; a teal frame marks the day reached.
- **Model picker.** Model (grouped by family) and version buttons, with the version's one-line meaning from `bench_results.js`.
- **Result copy**, leading with the catch: "<model> caught k of IBM's 20 laundering rings and traced m of 113 laundering transfers; it raised f alarms on ordinary neighborhoods, g of them on accounts that sit inside a ring." One amber line states the limit, and the block ends on the stronger of the two true percentages (rings caught or transfers traced).
- **Hover card** on any lit line: IBM's group number and shape name, how many of its labeled transfers the model flagged, the model's why (first sentence, cut at 240 characters), and the transfer ids colored green (flagged) or amber (missed). For a false alarm: the neighborhood, that IBM labels the transfers ordinary, the shape the model named, its why and the wrongly flagged ids.
- **The catch moment and the Caught roster.** When the scrub reaches the transfer that completes a catch (the flag that brings the ring to half of its labeled transfers), the ring traces itself in time order and a copy of its shape travels from the network down into a card. Each card: IBM's shape name and group number, a drawing of the shape as it sits on the map, accounts, transfers traced of the ring's total, money moved (largest currency, plus how many other currencies), which other model families also caught it (any version), and the model's one-line why. Cards stay in catch order. Scrubbing backward removes cards quietly.
- **Legend** written as the key, one line per mark, in the same strokes the network uses.

Scoring matches the flat page (`ui/app.js`): a model's flags are the union of `flagged_transfer_ids` over its runs, and an IBM group counts as caught when at least half of its labeled transfers are flagged. Alarms on ordinary neighborhoods are runs with `expected: ordinary` and `verdict: ring`; "on accounts inside a ring" means that run's `ring_accounts_flagged` is not empty. These numbers match `models[]` in the bench file (for example kimi-k3 v1: 19 rings, 32 alarms).

## Left out on purpose

- Particles, glow, pulses, auto-swoops to each group: they draw the eye without saying anything.
- Lifelines for false alarms: they ran as long red bars across the whole timeline and drowned the rings; the red dashes alone stay.
- Self-transfers (340 rows, an account paying itself): no segment to draw.
- The flat page's leaderboard, shape grid, account desk and held-out slices: this variant is about the graph; those live on the main page.
- A dark theme: the page keeps its paper ground in dark mode on purpose and sets `color-scheme: light`, so text stays dark on paper.

## Animation timings and what each carries

| Motion | Length | Easing | What it says |
|---|---|---|---|
| Map to Timeline (and back) | 400 ms | ease-out | the same transfers, re-read as order in time |
| Model switch | 120 ms fade out, 200 ms fade in | ease-out | a different model's flags on the same network |
| Day scrub, Play | 0.6 s per day, about 6.6 s for all | linear (time is linear) | the network building up day by day |
| Catch: ring traces itself | 450 ms | ease-out, each transfer in time order | the money path closing into IBM's shape |
| Catch: copy travels to its card | 700 ms, starting halfway through the trace | ease-out | this ring joins the caught list |
| Catches on a model switch | one every 300 ms, in time order | | the roster filling in the order the rings completed |

With `prefers-reduced-motion` (or `?still=1` in the address) every motion is instant: the tilt jumps, Play jumps to the end, the roster fills at once.

## Known limits

- The slice runs to Sep 16; the 55 transfers after Sep 10 are squeezed into one short slab labeled "Sep 11 to 16" in amber. Four rings put most of their labeled rows there.
- WebGL draws lines one pixel wide, so lit lines are thin cylinders instead; they scale with zoom.
- In the timeline view the 1,797 account dots stack into a column at the left (the map plane seen edge-on); they fade as you tilt, but they are still there.
- The hover finds the nearest lit line within 9 pixels; where lines cross, it picks one.
- The bundled `three.min.js` (r160) logs a deprecation warning in the console on load; there are no errors.
- Layout runs in the page on every load (about 0.3 s on a laptop).
- Frame rate: measured in headless Edge with software WebGL (SwiftShader), 144 frames per second idle and 85 while playing; a laptop GPU should hold 60 easily. The page only redraws when something changes.

## Screenshots (headless Edge, `msedge --headless --screenshot`, and Edge driven by Playwright)

- `shot_1280_map.jpg` map view, kimi-k3 v1 (the default: most rings caught), roster filled
- `shot_1280_timeline.jpg` the same at the timeline tilt
- `shot_1440_timeline.jpg` timeline at 1440 wide
- `shot_1280_hover.jpg` hover card on IBM group 8 (mesh)
- `shot_1280_playing_timeline.jpg` mid-Play on claude-sonnet-5-5 v1, the teal frame at Sep 8, seven rings caught so far

Address parameters for a fixed view: `?model=openai/gpt-6-sol&v=v2&view=timeline&cut=6&still=1` (`tilt=0..90` also works).
