# Rings bench, variant "board2d": the evidence board (loop 1)

Open `index.html` by double-click. It reads `../../../data/slice.js`, `units.js` and `bench_results.js`. If any of the three is missing, the page builds a small made-up network and labels it SAMPLE in the header badge, the limit line and the footer.

## What this variant argues, in three sentences

One number and twenty shapes: the first frame says how many of IBM's 20 laundering rings the model caught, in a large green numeral, and shows each ring as one large drawing in IBM's own shape, green when caught and amber dotted when missed. A judge can read "9 caught" and name "cycle" and "fan-in" without reading a sentence, because the shapes are the labels and nothing else on the screen competes with them. False alarms stay true but quiet: one line under the rings gives their count and opens the 40 ordinary neighborhoods only when someone asks.

## The opening screen, and what sits behind a click

On screen at 1280 x 900 with no scrolling, all of the following fit; the top edge of the alarm strip also shows above the tray:

- One line of controls: a single model picker (a select grouped by family, each option showing rings caught and alarms) and a light/dark switch.
- The large "rings caught" numeral, which ticks up as rings are caught, beside the headline sentence. The headline shape is: "<Model> caught k of IBM's 20 laundering rings and traced m of 113 laundering transfers; it raised f alarms on ordinary neighborhoods, g of them on accounts that sit inside a ring." Under it is one limit line that ends on the strongest true number.
- A three-item key on one line: caught, missed, false alarm.
- The 20 ring tiles, five across. Each tile holds one shape drawn large with no ordinary traffic behind it. The only text on a tile is IBM's shape name and the status (caught or missed).
- The caught tray at the bottom: a ticking count and one 44 px icon per caught ring, showing the outline of its shape.

Behind a click:

- **Hover a tile:** IBM's shape name in full (for example "Gather-scatter (11 of 12)"), what the shape means, the counts (laundering transfers, accounts, and how many were flagged right and wrong), the model's one-sentence reason, and the transfer ids.
- **Click a tile or a tray icon:** a larger drawing with arrows and account ids, a time scrub with Play, a switch to show the ordinary traffic around the ring (off by default), and the ring's card. The card gives accounts, transfers, money moved by currency, what the model flagged, and which other families also caught it. Every transfer is listed in time order.
- **The alarm strip under the rings:** for example "2 alarms on ordinary neighborhoods, 2 on accounts inside a ring". Click it to open the 40 ordinary neighborhoods as small tiles; a red dashed tile is one the model called a ring.
- **"The caught rings as cards":** a closed section holding one card per catch.
- **The honest panel, at the foot, in three lines:**
  1. The data is synthetic, and the labels are IBM's.
  2. The slice is enriched (4.0 percent laundering against 0.1 percent in the whole file), and its neighborhoods were cut around IBM's groups.
  3. Every laundering transfer in the slice is ACH, which is a tell.

  All three are computed from the data files.

## Changes in this loop, and why

- **One screen at a time.** The model list became one select, the "how to read a tile" box became a three-item key, and the 40 ordinary tiles and the cards moved behind a click.
- **Larger tiles.** Tiles are 1.3 times wider than before. The drawn shape is about 2 to 2.4 times wider, because it now fills the tile instead of sharing it with background traffic. Tile height was held so that all 20 tiles and the tray fit in 1280 x 900.
- **IBM's names.** Tiles, hover, cards and the expanded view use each run's `ibm_shape` (IBM's own name, in sentence case). The slice's `ring_meta` name is no longer shown anywhere. Layout follows IBM's name: a loop for a cycle, a star for fan-in and fan-out, and columns for scatter-gather, gather-scatter, stack and bipartite. When IBM names no shape, the tile reads "No named shape" and draws the single transfer.
- **The engine's catch rule.** "Caught" is the run's `ring_found`, and the headline counts come from each model row's `rings_found` and `false_rings`. That includes the 13:22 no-sweep rule: wrong flags in the unit may not outnumber the ring, and at most 2 are allowed. A ring whose transfers were flagged inside a sweep shows as missed, and its hover explains why.
- **Default model.** It opens on Claude Sonnet 5.5 v4 (9 caught, 2 alarms in the 13:20 file). `?model=` opens any other.
- **Review fixes folded in (REVIEW_1.md).**
  - The alarm counter is gone. Ordinary tiles light at once, behind the strip, so the sequence ends on the last catch.
  - Cards now say what was flagged ("Flagged 11 transfers: 11 of IBM's 12, 0 ordinary").
  - Counts use the singular when there is one ("1 transfer").
  - Money is shown in currency codes on one line.
  - The hover card closes on model change.
  - `?open=` lands the end state at once.
  - The smallest text went from 10 to 11 px.
- **Common fixes from all four reviews.**
  - Google Fonts loads without blocking the page (`media="print"`, switched to all on load), over the real fallback stack.
  - No internal unit ids appear in headers, cards or tiles.
  - Shape names are in sentence case.
  - There is no alarm counter, so the sequence ends on the last catch.
  - No account-level figure is printed.

## Left out on purpose

- **One network of all transfers:** it is the hairball this variant argues against.
- **The precision, recall, cost and latency table, panel voting and held-out slices:** the flat page carries them.
- **Motion on misses and false alarms:** they get the same 180 ms color change and nothing more.
- **Gradients, glow, drop shadows, confetti and sound:** the only depth is hairline borders and the dialog's backdrop tint.

## Animation, how long and what it carries

| Motion | Duration | What it carries |
|---|---|---|
| Ring tiles light in sequence on model change | 60 ms stagger, 180 ms ease-out color change each | The verdict arriving, ring by ring. 20 tiles take 1.3 s, and the last flight lands by about 2.2 s, under the 3 s budget |
| Caught counter and tray count tick | one step per catch | The running total, in step with the tiles |
| Catch resolve: accounts move from the tile center into the shape | 300 ms, ease-out | The ring snapping into IBM's shape when it is caught |
| Catch resolve: the caught transfers draw along their paths | 440 ms, starting 30 percent in, ease-out | The loop closing, the star filling in |
| The shape flies into the tray | 520 ms, starting 380 ms after the tile lights | "Caught and kept"; the card is added as it lands |
| Time scrub Play (user-started) | 2 hours of data per 40 ms | When each transfer happened; the last 12 hours draw thicker |

Ordinary tiles do not animate. `prefers-reduced-motion: reduce` (or `?motion=off`) lands everything at once with no flights.

## Known limits

- "Other families also caught it" counts any version of a family.
- In a missed tile, a green line is a transfer the model did flag inside a sweep; the hover says so.
- The scrub runs ten days from the group's first day, stretched when its transfers run later (the slice runs Sep 1 to Sep 16).
- The animation was checked in headless Edge, whose virtual clock does not advance Web Animations in step with timers. Smoothness in a real browser has not been watched.
- Fonts come from Google Fonts. Offline, the page falls back to Georgia, Segoe UI and Consolas.
- The models' reasons are quoted verbatim.

## Checks done

Headless Edge, file:// URL, at 1280 and 1440, with board.js inlined into a scratch copy so errors carry their text. There were no script errors in the default view, with `?open=u29`, in dark mode with `?model=moonshot/kimi-k3@v1`, or with bench_results.js removed (SAMPLE mode; the only error is the expected missing-file load). The scratch copies were deleted afterwards.

## Screenshots (headless Edge, `msedge --headless=new --screenshot`, data written 13:20)

Taken with `?motion=off`, which lands the same end state as the animated run; headless Edge sometimes freezes transitions partway.

- `shot_1280_light.webp`: 1280 x 900, light, default model, end state.
- `shot_1280_dark.webp`: 1280 x 900, dark.
- `shot_1280_expanded.webp`: the gather-scatter ring opened, scrub at Sep 14.
- `shot_1440_light.webp`: 1440 x 900, light.

Not captured: a frame mid-animation, for the virtual-clock reason above.
