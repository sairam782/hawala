# Rings bench: the ops wall (flat, Canvas 2D)

Open `index.html` by double-click. It reads `../../../data/slice.js`, `units.js`, `panel.js` and `bench_results.js`. If slice, units or panel is missing, a small made-up network stands in and the header says SAMPLE in amber.

## What this variant argues, in three sentences

The 20 laundering rings IBM labeled are the only thing on the wall, one tile each, named by IBM's own pattern name, so a viewer reads the shapes and the count of rings caught before anything else. Each ring's halo is as thick and bright as the number of model families that called it a ring, and the 40 ordinary neighborhoods sit underneath as one row of small squares that turn red, on the same scale, where families wrongly called them rings. The "families that must agree" dial shows the trade in one move: raise it and the red squares go dark while the rings every family found stay lit.

## Elements

- A five by four grid of tiles, one per IBM ring, ordered by how many families agreed (most first). Each tile holds only that ring's accounts (dots sized by their transfers) and its labeled transfers (lines), with the halo around them and two lines under it: IBM's pattern name and "n of 9 families". A small CAUGHT tag marks the tiles the current selection caught. Each ring is laid out once at load and frozen.
- Under the grid, one row of 40 squares for the ordinary neighborhoods, red as families wrongly call them rings (fill and edge both follow the halo rule), with a one-line caption. With a single model selected, its own false alarms are underlined.
- A key strip above the grid, in the opening frame: a thin dim halo (3 of 9 families), a thick bright one (9 of 9), amber dashes (below the dial), and the three line styles.
- Rail: the headline (what was caught first), three honest lines (synthetic data and IBM's labels; the slice is enriched, 4.0 percent vs 0.10, and its neighborhoods were cut around IBM's groups; every laundering transfer is ACH, a tell), the closing number, the dial, and "Whose catches": the families' combined vote at the dial (the default) or any model and version in bench_results.js, with Claude Sonnet 5.5 v4 first. For a single model the closing block adds the account figure from its `account_level` row ("100 of 134 accounts it flagged sit inside an IBM ring" for Sonnet v4). The v1 / v2 choice for the halos sits behind "How the models read the data" under the picker. "Show all traffic" fades in each ring account's other transfers as faint spokes at 10 percent.
- Lines inside a tile: green when the selection flagged a labeled transfer, amber dotted when it missed one, red dashed spokes for flags on the ring's accounts that IBM calls ordinary.
- Hover cards on tiles, squares and caught cards: IBM's pattern name, accounts, transfers, money moved, how many families agreed and which, whether the selection caught it and who else did, and one model's reason in its own words.
- The "Caught" list at the bottom: one compact card per ring caught, holding the shape icon, IBM's pattern name and the money moved; everything else is on hover.
- What "caught" means: for one model, the engine's own `ring_found` on the run for that ring's neighborhood (at least half of the ring flagged, and no sweep of the neighborhood); the headline count is the model row's `rings_found`. For the combined vote, the page follows panel.py: a neighborhood is called a ring when at least k families say so, its flagged transfers are those at least k of those families flagged, and a ring is caught when that covers half of its labeled transfers. The vote's headline counts (caught, traced, alarms) come straight from panel.json's `vote_table` row for k (at 7 of 9: 8 rings, 63 transfers, 6 alarms), and the cards follow the same rule.
- Halo weight never changes with the dial: width is 1.15 px per family (3 of 9 is 3.5 px and dim, 9 of 9 is 10 px and bright). The dial only switches a ring between lit green and dim amber dashes of the same weight; the squares keep their weight too and dim below the dial.
- Names come from each run's `ibm_shape` (IBM's own name, in sentence case: "Fan-out", "Stack (fragment)", "No named shape"), not from the slice's shape column. Model names are written out ("Claude Sonnet 5.5 v4", "Kimi K3").
- URL options for demos and screenshots: `?model=panel` (default), `?model=<id>|<version>`, or `?model=<id>` (Claude Sonnet 5.5 lands on v4), `?k=<1-9>`, `?t=<0-1>` (time position), `?hover=<IBM group number>`, `?traffic=1`.

## Left out on purpose

- The full network of 1,797 accounts and the stray small components: they hid the rings. Ordinary traffic exists only behind the "show all traffic" toggle, and only for the rings' own accounts.
- Dots for the ordinary neighborhoods: a square per neighborhood says "families called this a ring" without asking the eye to read another network.
- Particles, glow, bloom, idle pulses, camera moves, zoom and pan: the wall stays still unless a control changes.
- The leaderboard, shape grid, account desk and held-out slices from the main page.
- A light theme: an ops wall is dark by brief.

## Animation: how long, and what it carries

| Motion | Duration | What it carries |
|---|---|---|
| Dial or v1/v2 change | 250 ms, ease-out | Rings that cross the bar fade between a green halo and an amber dotted outline; squares fade red in or out. |
| Show all traffic | 250 ms, ease-out | The rings' accounts' other transfers fade to 10 percent, or out. |
| Time scrub, "Play Sep 1 to 16" | about 9 s, linear | Ring transfers and accounts appear in the order they happened (Sep 1 to Sep 16 05:12; the slice's tail runs past ten days). A ring joins the Caught list when the clock reaches its last labeled transfer. |
| Opening reveal, at load only | 420 ms, ease-out | Every ring the opener caught resolves at once (accounts gather and spread, transfers trace in, the outline closes) while its card is already in the list. No other motion plays until a control is touched. |
| Catch, in the tile | 420 ms, ease-out | After a control change, a newly caught ring's accounts gather in and spread to their places while its transfers trace in and the outline closes. |
| Catch, into the list | 560 ms, ease-out, starting 300 ms in; catches stagger 230 ms apart | After a model change, a dial change on the vote, or the scrub, a copy of the ring's shape travels from its tile into its card; the card fades in (180 ms) when it lands. |

With prefers-reduced-motion on: every change is instant, cards appear without the flight or the resolve, and play steps one day every 450 ms. Misses and false alarms never animate.

## Known limits

- Google Fonts load without blocking the page (media swap); offline, the fallbacks are Georgia, Segoe UI and Consolas.
- False alarms (red dashed, 45 percent) and misses (amber dotted, 60 percent) are drawn quieter than catches.
- "Traced" counts the distinct labeled transfers the selection flagged, so it can be high while few rings count as caught (the sweep rule).
- Eight of IBM's rings are a single transfer ("No named shape"); their tiles are a line between two dots.
- The 40 squares and their captions are the only view of ordinary neighborhoods; their accounts are not drawn.
- The page reads the data files once at load; it does not refresh while open.
- Headless screenshots of the final state were taken with reduced motion forced on, because headless Edge does not finish CSS fades under a virtual clock; in a normal browser the cards fade in.

## Screenshots (headless Edge, 1280 x 900)

- `shot_1280.jpg`: the opener, the families' combined vote at 5 of 9: 16 of 20 caught, all 16 cards in the list and fully visible.
- `shot_1280_sonnet_v4.jpg`: `?model=anthropic/claude-sonnet-5-5` (lands on v4): 9 of 20 caught, 2 alarms underlined in the squares, misses in amber dots.

Also checked, and dropped to keep the folder under 600 KB: 1440 x 900, the opening reveal 350 ms after load, the hover card on IBM group 7, and `?k=7` (headline reads 8 rings, 63 of 113 transfers, 6 alarms, equal to vote_table). No console errors from the page in headless Edge.
