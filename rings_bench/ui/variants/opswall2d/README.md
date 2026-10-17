# Rings bench: the ops wall (flat, Canvas 2D)

Open `index.html` by double-click. It reads `../../../data/slice.js`, `units.js`, `panel.js` and `bench_results.js`. If slice, units or panel is missing, a small made-up network stands in and the header says SAMPLE in amber.

## What this variant argues, in three sentences

IBM's 20 labeled rings are the only thing on the wall: twelve shapes get a tile each, named by IBM's own pattern name, and the eight single transfers share one tile, so a viewer sees a loop, a star and a fan, and reads the number of rings caught before anything else. Each ring wears an outline halo as thick and bright as the number of model families that called it a ring, and the 40 ordinary neighborhoods sit underneath as one row of small squares that turn red, on the same scale, where families wrongly called them rings. The "families that must agree" dial shows the trade in one move: raise it and the red squares and the contested rings dim while the rings every family found stay lit.

## Elements

- **Twelve ring tiles** (4 by 3), ordered by how many families agreed. Each tile holds only that ring's accounts (clear dots with a dark rim) and its labeled transfers (lines in the catch color), drawn 70 to 120 px across at 1280, inside an outline ring (the halo). One line under it: IBM's pattern name and "n of 9". A CAUGHT tag marks the rings the current choice caught.
- **One shared tile for the eight single transfers**: "Single transfers (7 with no named shape, bipartite): k of 8 caught at this dial", with eight small marks, each with its own halo and "n of 9". Hover shows how many of the eight each family caught.
- **The dial on the tiles themselves (combined-vote view only)**: with one model on top, the dial dims no tile; each tile shows that model's catch or miss at full strength, the halo still carries the families count, and the dial moves only the squares. In the combined-vote view, a ring below the dial dims to a third (shape, label and all) and its halo turns to amber dashes of the same weight. The halo weight never changes with the dial: 1.15 px per family (3 of 9 is thin and dim, 9 of 9 is thick and bright).
- **Key strip** above the grid, in the first frame.
- **40 squares** for the ordinary neighborhoods, red as families wrongly call them rings (same weight rule), dimmed below the dial, with a one-line caption. With one model on top, its own false alarms are underlined.
- **Rail**: the headline (what was caught first), three honest lines (synthetic data and IBM's labels; the slice is enriched, 4.0 percent vs 0.10, and cut around IBM's groups; every laundering transfer is ACH, a tell), the closing number, the dial, and "Whose catches": the families' combined vote (default) or any model and version in bench_results.js, Claude Sonnet 5.5 v4 first. For one model the closing block adds its `account_level` figure ("100 of 134 accounts it flagged sit inside an IBM ring" for Sonnet v4). The v1/v2 choice for the halos is folded under the picker. "Show all traffic" fades in each ring account's other transfers at 10 percent.
- **Caught list**: the landing target for each catch, one short row of compact cards (icon, IBM's name, money moved); the single transfers share one card ("4 of 8 caught"). Everything else is on hover.
- **What "caught" means**: for one model, the engine's `ring_found` (at least half of the ring flagged, without sweeping its neighborhood), and the headline count is the model row's `rings_found`. For the combined vote, the page follows panel.py as rewritten at 13:30 (k families call the neighborhood a ring, at least k of them flag half of the ring, and the agreed flags do not sweep the neighborhood). The headline's caught, traced and alarm counts come straight from panel.json's `vote_table` row for k: at 5 of 9 that is now 12 rings, 89 of 113 transfers, 16 alarms; at 8 of 9, 5 rings, 56 transfers, 2 alarms. The cards follow the same rule and match (12 at 5 of 9).
- URL options: `?model=panel` (default), `?model=<id>|<version>`, `?model=<id>` (Claude Sonnet 5.5 lands on v4), `?k=<1-9>`, `?t=<0-1>`, `?hover=<IBM group number>`, `?traffic=1`.

## Left out on purpose

- The full network of 1,797 accounts and the stray small components: they hid the rings.
- Dots for the ordinary neighborhoods: one square each says "families called this a ring" without another network to read.
- Eight near-identical "two dots and a line" tiles: they are one fact, so they share one tile.
- Particles, glow, bloom, idle pulses, camera moves, zoom and pan.
- A light theme: an ops wall is dark by brief.

## Animation: how long, and what it carries

| Motion | Duration | What it carries |
|---|---|---|
| Opening reveal, at load only | 420 ms, ease-out | The rings the opener caught resolve together (accounts gather and spread, transfers trace in, the halo closes); their cards are already in place. Nothing else moves until a control is touched. |
| Dial or v1/v2 change | 250 ms, ease-out | Rings that cross the bar brighten to green or dim to amber dashes; squares fade red in or out. |
| Show all traffic | 250 ms, ease-out | The rings' accounts' other transfers fade to 10 percent, or out. |
| Time scrub, "Play Sep 1 to 16" | about 9 s, linear | Ring transfers and accounts appear in the order they happened (the slice runs to Sep 16 05:12). A ring joins the list when the clock reaches its last labeled transfer. |
| Catch, in the tile | 420 ms, ease-out | After a control change, a newly caught ring resolves in its tile. |
| Catch, into the list | 560 ms, ease-out, starting 300 ms in; catches stagger 230 ms apart | A copy of the ring's shape travels from its tile into its card; the card fades in (180 ms). |

With prefers-reduced-motion on, every change is instant and play steps one day every 450 ms. Misses and false alarms never animate, and they draw quieter than catches (red dashed at 45 percent, amber dotted at 60 percent).

## Checked in a real-time browser

I could not open the page in the desktop Browser pane: it renders files outside its project as a static snapshot with no scripts. Instead I drove headless Edge on its real clock over the DevTools protocol (`scratchpad/cdp_watch.mjs`, not in this folder) and captured frames:
- **Dial 5 to 8 of 9**: 35 animation frames in the first 600 ms, then none (the page is still again). The headline moved to "8 of 9 caught 5 of IBM's 20 ... 56 of 113 ... 2 alarms", matching vote_table.
- **Switch to Claude Sonnet 5.5 v4**: frames at 200, 450 and 750 ms show tiles resolving and shape copies in flight to the list (`shot_1280_catch_flight.jpg`). At the end: 9 cards, 0 pending, 0 flyers left.
- **Requests**: index.html, opswall.css, opswall.js, the four data files in `../../../data/`, and Google Fonts (one stylesheet, four woff2 files from fonts.gstatic.com, loaded without blocking). Nothing else. No errors or exceptions.

I watched frames, not the motion by eye in a headed window. Ease and feel at projector scale are unverified.

## Known limits

- Hover is mouse only on the canvas tiles; squares and caught cards can be reached by keyboard.
- "Traced" counts distinct labeled transfers flagged, so it can be high while few rings count as caught (the sweep rule).
- The page reads the data files once at load; it does not refresh while open.
- Offline, the fonts fall back to Georgia, Segoe UI and Consolas.
- Final-state screenshots were taken with reduced motion forced on, because headless Edge does not finish CSS fades under a virtual clock.

## Screenshots (1280 x 900)

- `shot_1280.jpg`: the opener, the combined vote at 5 of 9 (12 of 20 caught).
- `shot_1280_sonnet_v4.jpg`: Claude Sonnet 5.5 v4 on top with the dial at 8 of 9; no tile dims.
- `shot_1280_catch_flight.jpg`: real-time frame 450 ms after switching to Sonnet v4 at 8 of 9, with copies in flight.
