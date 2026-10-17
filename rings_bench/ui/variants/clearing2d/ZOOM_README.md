# Cluster zoom (zoom.js + zoom.css)

**What it does.** `window.openClusterZoom(unitId, origin?)` opens a close-up of one neighborhood over the graph stage (`#stage`, not the side rail). The neighborhood is laid out on its own (a small deterministic force layout over only its accounts) and fit to the stage with a margin.

- Every transfer is its own line with an arrow; parallel transfers between the same two accounts fan out as separate curves; self-transfers draw as loops.
- Colors: grey = ordinary; gold-green halo = IBM labeled laundering; green line = flagged by the selected model; teal-green line = flagged by the investigator (Claude Opus 5.5, from `INVESTIGATE.results`). Flagged by both = green line with a teal dashed center.
- Seed account (or, for rings with no seed, the hub account most labeled transfers touch) gets a teal ring and a label; accounts in an IBM ring are gold.
- Hover an account: id, bank, in/out counts and totals per currency inside this neighborhood, IBM ring membership. Hover a transfer: id, time, from, to, amount and currency, payment format, IBM label, model's call, investigator's call. Hover dims everything else. Cards are clamped inside the stage.
- Header: neighborhood name (seed), unit id, account and transfer counts, IBM shape if a ring, what was caught (model and investigator), first-pass verdict, confidence and reason, investigator verdict and reason. Reasons clamp to two lines; full text on hover (title).
- Time scrub at the bottom: shows transfers up to the chosen time.
- Close: Escape, the Close button, or clicking the dim margin. 250 ms in (fade plus grow from `origin` or stage center), 200 ms out; no animation under reduced motion.

**The hook.** `window.openClusterZoom('u06')`. Optional second argument `{x, y}` in client (viewport) pixels: where the neighborhood sits on the main canvas, so the zoom grows from there. `window.closeClusterZoom()` closes it. Selected model is read from `#model` (`id|version`), then `ST.sel`, then falls back to Claude Sonnet 5.5 v4.

**Checked (2026-10-17, headless Edge via Playwright, 1280x900, file://):** u06 (60 lines, 32 accounts, 12 labeled, 12 model-flagged), u19 (28 lines, 1 labeled, 3 investigator-flagged), u03 (17 lines, ordinary). Overlay exactly covers `#stage`; edge and account hover cards render and stay inside the stage; scrub halves to 30 of 60; Escape, backdrop and button all close; no console errors or warnings; no em dashes in zoom text (model reasons have them replaced with commas). Screenshots: `shots/zoom_u06_1280.jpg`, `shots/zoom_u19_1280.jpg`, `shots/zoom_u03_1280.jpg`, `shots/zoom_u06_hover_edge_1280.jpg`, `shots/zoom_u06_hover_node_1280.jpg`, `shots/zoom_u06_scrub_1280.jpg`.

**Known limits.** The click wiring from the main canvas is the other builder's (not tested here). The grow-in animation was not watched frame by frame; it was only checked that the end state renders. Reduced motion was not run in a test. Large neighborhoods (up to 46 accounts) label only the seed and ring accounts; others show their id on hover. The layout is fit by account positions, so a very long self-loop stack can poke slightly past the top margin. Model reasons over two lines are clipped in the header (full text in the tooltip).
