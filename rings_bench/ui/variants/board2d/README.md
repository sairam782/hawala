# Rings bench, variant "board2d": the evidence board

Open `index.html` by double-click. It reads `../../../data/slice.js`, `units.js` and `bench_results.js`. If any of the three is missing, the page builds a small made-up network and labels it SAMPLE in the header badge, the limit line and the footer.

## What this variant argues, in three sentences

The case is twenty separate pieces of evidence, not one hairball: each of IBM's labeled laundering rings gets its own tile, drawn in the shape IBM's simulator gave it, so you can see at a glance which shapes a model catches and which it misses. The forty ordinary neighborhoods sit underneath as small gray tiles, so a false alarm is a visible object (a red dashed tile) that you can count and open, not a percentage. Every caught ring leaves the board and joins a roster at the bottom, so the result reads as what the model found first and what it got wrong second.

## Elements added

- Header headline in the agreed shape: "<model> caught k of IBM's 20 laundering rings and traced m of 113 laundering transfers; it raised f alarms on ordinary neighborhoods, g of them on accounts that sit inside a ring." One limit line, then a closing line with the strongest true number (the larger of rings caught or transfers traced, as a percent).
- Two running counters (rings caught, alarms) that tick as tiles light.
- Model list on the left, grouped by family, each row showing rings caught and alarms.
- A key that reads as the legend: the four edge states (green solid, red dashed, amber dotted, faint gray) and the three tile states (caught, missed, false alarm).
- Ring grid: 20 tiles, sorted by IBM shape. Layout matches the shape: a loop for a cycle (ordered by following the money in time), a star for fan-in and fan-out (hub is the account with the most distinct senders or receivers), columns for scatter-gather, chain (stack), mesh, other and lone (accounts placed by how many hops from a source). The neighborhood's ordinary traffic sits faint on an outer ring, each account placed near the ring account it trades with.
- Ordinary grid: 40 small gray tiles; dashed red when the model called that neighborhood a ring, with the flagged transfers dashed red inside.
- Hover on any tile: IBM's shape name and a one-line meaning, what the model said, its first sentence of why, and the transfer ids split into flagged-and-right, flagged-but-ordinary and missed.
- Click on any tile: a larger drawing with arrows and account ids, the model's full reason, every transfer in time order, and a time scrub (with Play) for that group only.
- The catch moment and the caught roster: a fixed tray at the bottom with one slot per ring; each caught ring's shape flies into the next slot, then a card lands in the "Caught by <model>" section with IBM's shape name, accounts, transfer count, money moved (by currency), which other families also caught it, and the model's one-line why.
- URL switches for demos and screenshots: `?model=openai/gpt-6-sol@v4`, `?theme=dark` or `light`, `?open=u26&at=100` (open a tile at hour 100 of its scrub), `?motion=off`.

## Deliberately left out

- One big network of all transfers: it is the hairball this variant argues against, and the flat page already has it.
- Precision, recall, cost and latency tables: the flat page has them; here the counts are visible objects instead.
- Animation on misses and false alarms: they light with the same 180 ms color change as everything else and do nothing more, so motion only ever means "caught".
- Gradients, glow, drop shadows, confetti, sound. The only depth is a hairline border and a 2 px top rule on caught tiles.
- Panel voting and held-out slices: they belong to the flat page's story and would crowd the board.

## Animation, how long and what it carries

| Motion | Duration | What it carries |
|---|---|---|
| Tiles light in sequence on model change | 40 ms stagger, 180 ms ease-out color change each | The model's verdict arriving tile by tile; rings first, then ordinary neighborhoods |
| Extra pause after each caught ring | 160 ms | Lets each catch read on its own instead of as a swarm. Full sequence: about 4 s for a 10-ring model, about 5.5 s for a 19-ring model |
| Counters tick | instant step per tile | Running total of rings caught and alarms raised, in step with the tiles |
| Catch resolve: accounts move from the tile center into the shape | 300 ms, ease-out | The group "snaps into" IBM's shape when the model gets it |
| Catch resolve: the caught transfers draw along their paths | 440 ms, starts 30 percent in, ease-out | The loop closing, the star filling in |
| The shape flies to the tray | 520 ms, starts 380 ms after the tile lights | "This one is caught and kept"; a card joins the roster as it lands |
| Time scrub Play (user-started) | 2 hours of data per 40 ms | When each transfer happened; the last 12 hours draw thicker |

`prefers-reduced-motion: reduce` (or `?motion=off`) turns all of it off: tiles, counters, tray and roster land at once with no flights. CSS transitions are also removed in that mode.

## Known limits

- "Caught" is the bench's own `ring_found` (half or more of IBM's labeled transfers in that neighborhood flagged by that run). "Other families also caught it" counts any version of a family.
- "Accounts that sit inside a ring" uses each run's `ring_accounts_flagged`.
- Edges are one line per account pair per state, so repeated transfers between the same two accounts draw as one line; the expanded view lists each transfer.
- The scrub is ten days from the group's first day, stretched when its transfers run later (the slice runs Sep 1 to Sep 16, so some groups show 14 days).
- Lone rings are a single transfer, so their tiles are mostly ordinary traffic; that is the honest picture.
- The default model is the one with the most rings caught (kimi-k3 v1), which also raises many alarms; use `?model=` to open a different one.
- Fonts come from Google Fonts; offline the page falls back to Georgia, Segoe UI and Consolas. A missing data file shows up as one failed script load in the console, by design, and the page switches to SAMPLE.
- The models' own reasons are shown verbatim, including any punctuation they used.
- The tray holds 20 slots; under about 1180 px wide the last slots clip.

## Checks done

- Headless Edge, file:// URL, at 1280 and 1440: no script errors (window error and console.error captured into the page and read back), in light, dark, with a tile open, and with bench_results.js removed (SAMPLE mode; only the expected missing-file load error).
- Folder size about 500 KB including screenshots.

## Screenshots (headless Edge, `msedge --headless=new --screenshot`)

- `shot_1280_light.webp`: 1280 wide, light, end state of the default model.
- `shot_1280_dark.webp`: 1280 wide, dark.
- `shot_1280_expanded.webp`: 1280 wide, a scatter-gather ring opened with the scrub at Sep 5.
- `shot_1440_light.webp`: 1440 wide, gpt-6-sol v4.

Not captured: a frame mid-animation. Headless Edge's virtual clock does not advance the Web Animations timeline in step with timers, so a mid-sequence capture shows caught tiles with their lines not yet drawn, which is not what a real browser shows. The end states above are reliable.
