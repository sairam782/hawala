# Rings bench, variant "board2d": the evidence board (loop 2)

Open `index.html` by double-click. It reads `../../../data/slice.js`, `units.js` and `bench_results.js`. If any of the three is missing, the page builds a small made-up network and labels it SAMPLE in the header badge, the limit line and the footer.

## What this variant argues, in three sentences

One number and the shapes behind it: the first frame says how many of IBM's 20 laundering rings the model caught, and the green shapes it caught lead the board, each drawn large in IBM's own shape. A judge can read "9 caught" and name "cycle" and "fan-in" in a glance, because the shapes are the labels; the misses follow in amber, and IBM's eight single transfers, the part no detector finds, sit together in one tile with a count. False alarms stay true but quiet: one line under the board gives their count and opens the 40 ordinary neighborhoods only when someone asks.

## The opening screen, and what sits behind a click

At 1280 x 900 everything below fits with no scrolling:

- **Controls:** one line holding a single model picker (a select grouped by family, each option showing rings caught and alarms) and a light/dark switch.
- **Number and headline:** the large "rings caught" numeral, which ticks as rings are caught, beside the headline. The headline shape is: "<Model> caught k of IBM's 20 laundering rings and traced m of 113 laundering transfers; it raised f alarms on ordinary neighborhoods, g of them on accounts that sit inside a ring." Under it is one limit line that ends on the strongest true number.
- **Key:** three items on one line (caught, missed, false alarm).
- **Shaped rings:** 12 tiles, four across, caught first and then missed. Each tile holds one shape drawn large with no ordinary traffic behind it. The only text on a tile is IBM's shape name and caught or missed.
- **Single transfers:** one full-width tile reading "Single transfers (no named shape)" with "k of 8 caught" and eight small marks. Each mark is green when caught and amber dotted when missed.
- **Caught tray:** a half-height strip along the bottom with the count and a small outline per caught ring. It is the landing target for the catch animation.

Behind a hover or a click:

- **Hover a shaped tile:** IBM's full name (for example "Gather-scatter (11 of 12)"), what the shape means, and the counts. It also shows what the model flagged right and wrong, its one-sentence reason, and the transfer ids.
- **Hover the single-transfer tile:** the explanation. IBM's pattern file names seven of these "no named shape" and one "bipartite", of which only one row is in this slice. Hover a mark for that transfer's own counts and reason.
- **Click a tile, a mark or a tray icon:** a larger drawing with arrows and account ids, the ring's card, and every transfer in time order.
  - The card gives accounts, transfers, money moved, what was flagged, and which other families also caught it.
  - A time scrub with Play starts on the first day of IBM's group, not the first day of the neighborhood.
  - A switch shows the ordinary traffic around the ring; it is off by default.
- **The alarm strip under the board:** opens the 40 ordinary neighborhoods. A red dashed tile is one the model called a ring.
- **Closed sections:** "The caught rings as cards", and the honest panel at the foot. The panel has three lines computed from the data: synthetic data with IBM's labels; the slice is enriched (4.0 vs 0.1 percent) and cut around IBM's groups; every laundering transfer in the slice is ACH, a tell.

## Changes in loop 2

- **Order:** shaped tiles are sorted caught first, then missed, so the green shapes lead the frame. The marks inside the single-transfer tile are ordered the same way.
- **Single transfers collapsed:** the eight one-transfer rings now share one tile with a count and eight marks. That leaves 12 shaped tiles at four across, 297 px wide at 1280 (1.65 times the original 180 px), with each shape drawing 150 px tall.
- **Tray at half height (32 px):** it keeps its count and serves as the landing target. The icons are smaller (38 x 24) because the grid now carries the shapes.
- **Sequence ends on the last catch:** misses light together in one quiet beat at 120 ms. Then only the catches light, 60 ms apart, each with its catch animation and flight to the tray.
- **Scrub start:** the scrub now starts on the first day of the ring itself and runs ten days, stretched only if the ring runs longer.

Carried from loop 1:
- IBM's own names from `ibm_shape` in sentence case.
- The engine's `ring_found`, `rings_found` and `false_rings`, including the no-sweep rule.
- The default model, Claude Sonnet 5.5 v4.
- No alarm counter.
- Fonts loaded without blocking.
- No internal ids in headers.
- The three-line honest panel.

## What the page requests

- **From this folder:** `board.css` and `board.js`.
- **From the shared data folder, by design:** `../../../data/slice.js`, `units.js` and `bench_results.js`.
- **From outside the machine, non-blocking:** the Google Fonts stylesheet and its font files only. Offline, the page renders in Georgia, Segoe UI and Consolas.
- **Nothing else:** no other script, image or fetch. I checked this by listing every `src`, `href` and URL in the three source files.

## Animation, how long and what it carries

| Motion | Duration | What it carries |
|---|---|---|
| Misses light | one beat at 120 ms, 180 ms ease-out color change | The verdict on the misses, quietly and all at once |
| Catches light in sequence | from 300 ms, 60 ms stagger, 180 ms ease-out each | The verdict arriving catch by catch |
| Caught counter ticks | one step per catch | The running total, in step with the tiles |
| Catch resolve: accounts move from the tile center into the shape | 300 ms, ease-out | The ring snapping into IBM's shape |
| Catch resolve: the caught transfers draw along their paths | 440 ms, starting 30 percent in, ease-out | The loop closing, the star filling in |
| The shape flies into the tray | 520 ms, starting 380 ms after the tile lights; the tray count ticks as each lands | "Caught and kept" |
| Time scrub Play (user-started) | 2 hours of data per 40 ms | When each transfer happened; the last 12 hours draw thicker |

**Measured in a real browser** (the Claude desktop browser pane, a headed Chromium page served from a local `python -m http.server`):
- **gpt-6-sol v4 (7 catches):** the counter stepped at 308, 372, 433, 491, 548, 623 and 667 ms, and the tray filled at 1259 to 1599 ms. The sequence ended with the last catch landing at about 1.6 s.
- **Sonnet v4:** a mid-sequence frame shows the fan-out accounts drawing into the star while later tiles are still gray, and the end frame shows all nine green with the tray full.
- **Not watched:** the pane was narrow (about 626 px, phone layout), so I did not watch it at 1280 width with a head.

`prefers-reduced-motion: reduce` (or `?motion=off`, or `?open=`) lands everything at once with no flights.

## Left out on purpose

- **One network of all transfers:** it is the hairball this variant argues against.
- **The precision, recall, cost and latency table, panel voting and held-out slices:** the flat page carries them.
- **Motion on misses and false alarms.**
- **Decoration:** no gradients, glow, drop shadows, confetti or sound.

## Known limits

- **Families:** "Other families also caught it" counts any version of a family.
- **Green inside a missed tile:** this is a transfer the model flagged inside a sweep, so it does not count. The hover says so.
- **Scrub past the data:** a ring that starts late (for example Sep 10) scrubs to Sep 20, past the slice's last day (Sep 16).
- **Tray lags the counter:** the tray count trails the big counter by about 0.9 s, because it ticks when each shape lands.
- **Model reasons:** they are quoted verbatim.

## Checks done

- **Headless Edge, file:// URL, at 1280 and 1440:** board.js was inlined into a scratch copy so errors carry their text, and the scratch copies were deleted afterwards. No script errors in:
  - the default view
  - `?open=u29`
  - dark mode with `?model=moonshot/kimi-k3@v1`
  - bench_results.js removed (SAMPLE mode, where the only error is the expected missing file)
- **Real browser:** sequence timings as above.

## Screenshots (headless Edge, `msedge --headless=new --screenshot`, data written 13:20)

They were taken with `?motion=off`, which lands the same end state as the animated run; headless Edge's virtual clock sometimes freezes transitions partway.

- `shot_1280_light.webp`: 1280 x 900, light, default model.
- `shot_1280_dark.webp`: 1280 x 900, dark.
- `shot_1280_expanded.webp`: the gather-scatter ring opened, with the scrub starting on the ring's first day.
- `shot_1440_light.webp`: 1440 x 900, light.
