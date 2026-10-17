# Rings bench: the ops wall (flat, Canvas 2D)

Open `index.html` by double-click. It reads `../../../data/slice.js`, `units.js`, `panel.js` and `bench_results.js`. If slice, units or panel is missing, a small made-up network stands in and the header says SAMPLE in amber.

## What this variant argues, in three sentences

Agreement is the evidence: each of IBM's 20 laundering groups wears a halo whose width and brightness equal the number of model families that called it a ring, so the groups every family found read thick and bright and the contested ones read thin. The same scale, in red and at half width, marks the ordinary neighborhoods that families wrongly called rings, which makes the cost of a low bar visible at a glance. Turning the "families that must agree" dial shows the trade in one move: raise it and false alarms go dark while the strongest rings stay lit.

## Elements added

- One frozen network: accounts as dots sized by their transfers, transfers as faint hairlines. A force layout written for this page runs once at load (members of an IBM group pull gently toward each other so their outline stays legible), then positions never move.
- Agreement halos around IBM's 20 groups (green, width and brightness = families that called it a ring); amber dotted outline when a group is below the dial; red halos on the 40 ordinary neighborhoods.
- "Families that must agree" dial (1 to 9), a v1 / v2 switch, and a "Model on top" picker (or "the panel at the dial").
- Model overlay: green for flags IBM agrees with, red dashed for flags IBM calls ordinary, amber dotted for labeled transfers the model missed.
- Hover card per group: IBM's shape name, accounts, transfers, money moved, how many families agreed and which, whether the selected model caught it, and one model's reason in its own words.
- The catch moment and the "Caught" roster: one card per ring caught, with IBM's shape name, accounts and transfer count, money moved, which other families also caught it, and the model's one-line reason.
- Headline that leads with what was caught: "kimi-k3 caught 19 of IBM's 20 laundering rings and traced 104 of 113 laundering transfers; it raised 32 alarms on ordinary neighborhoods, 31 of them on accounts that sit inside a ring." One line of limit, then the closing number. (Numbers from the bench output as written at 13:12; the page recounts them from the flagged transfer ids.)
- URL options for demos and screenshots: `?model=<id>` or `?model=panel`, `?k=<1-9>`, `?t=<0-1>` (scrub position), `?hover=<IBM group number>`.

## Left out on purpose

- Particles, glow, bloom, idle pulses, camera moves, zoom and pan: the wall stays still unless a control changes, so a viewer can trust that motion means something.
- The leaderboard, shape grid, account desk and held-out slices from the main page: this variant is about agreement on one network; those screens already exist there.
- A light theme: an ops wall is dark by brief.
- Arrows on edges: direction matters less here than membership, and arrows add noise at this density.

## Animation: how long, and what it carries

| Motion | Duration | What it carries |
|---|---|---|
| Dial or v1/v2 change | 250 ms, ease-out | Groups that cross the bar fade between green halo and amber dotted outline; ordinary neighborhoods fade their red halo in or out. |
| Time scrub, "Play the ten days" | about 9 s, linear | Transfers and accounts appear in the order they happened (Sep 1 to Sep 16 05:12; the slice's tail runs past ten days). A ring joins the roster when the clock reaches its last labeled transfer. |
| Catch, on the stage | 420 ms, ease-out | The caught group's accounts gather in and spread to their places while its transfers trace in and the outline closes. |
| Catch, into the roster | 560 ms, ease-out, starting 300 ms in; cards stagger 230 ms apart | A copy of the ring's shape travels from the network into its card; the card fades in (180 ms) when it lands. |

With prefers-reduced-motion on: the dial switches instantly, cards appear without the flight or the resolve, and play steps one day every 450 ms. Misses and false alarms never animate.

## Known limits

- "Caught" follows the page's rule: a model caught a ring when its flags cover at least half of that ring's labeled transfers. The headline counts come from the same recount, so they can differ by one from a number the engine computed another way.
- Alarm counts are per neighborhood run; "on accounts that sit inside a ring" uses the engine's `ring_accounts_flagged` per run.
- The hover card is mouse only; there is no keyboard path to a single group yet.
- Some outlines in the big connected cluster overlap; the hover card picks the IBM group first, then the smallest outline.
- The page reads the data files once at load; it does not refresh while open.
- Over file:// with no network, the Google Fonts fall back to Georgia, Segoe UI and Consolas.
- The 60 accounts with only self-transfers and the many two-account pairs sit in a grid at the lower right; they carry no halo.

## Screenshots (headless Edge, 1280 wide)

- `shot_1280.jpg`: at load, kimi-k3 v1 on top, dial at 5 of 9, all 19 caught cards landed.
- `shot_1280_catch_mid.jpg`: 1.5 s after load, rings resolving on the stage and copies traveling into the roster.
- `shot_1280_hover.jpg`: hover card on IBM group 7 (scatter-gather), 9 of 9 families agreed.

Also checked at 1440 x 900, at a mid scrub (`?t=0.3`), and with the panel at 9 of 9 (`?model=panel&k=9`); those screenshots were dropped to keep the folder under 600 KB. No console errors from the page in headless Edge.
