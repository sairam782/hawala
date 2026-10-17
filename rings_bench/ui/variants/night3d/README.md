# Rings at night (three-dimensional variant, loop 1)

Open `index.html` with a double-click. It reads `../../../data/slice.js`, `bench_results.js` and `units.js`. If the slice or bench file is missing, it draws a small made-up network and shows a yellow SAMPLE badge.

## What this variant argues, in three sentences

The picture is IBM's twenty laundering rings and nothing else: each ring stands alone and is drawn by its own shape, so a fan reads as a star, a cycle as a ring, a scatter-gather as a diamond, and a stack as layers. When the selected model catches a ring, the ring closes in thick green and a copy of it drops into the "Caught" row you can count. Misses stay as faint amber dots and false alarms live with the crowd behind the rings, so the cost is there when you look, but the first thing you see is what was caught.

## The three-second test

The opening frame answers both questions. The title reads "Claude Sonnet 5.5 v4 caught 9 of 20 rings", and every shape carries its name underneath (Fan-out, Cycle, Scatter-gather and so on).

## What is on screen

- **The twenty groups, alone.** Twelve shaped groups sit on a sparse four-by-three grid, and the eight one-transfer groups sit in a row below, labeled once. Each shape is laid out from IBM's own name (the runs' `ibm_shape`), not by a force simulation:
  - fan-out and fan-in: a star with the hub at the center
  - cycle: a ring, in the order the money moves
  - scatter-gather and gather-scatter: three columns, senders, middles and receivers
  - stack and bipartite: rows
  - single transfer: one vertical line
- **How the transfers are drawn.** Transfers are instanced tubes with arrowheads, so the direction of the money is visible. Accounts are instanced spheres. Tube thickness carries agreement: a ring caught by more model families draws thicker, from 0.75x to 1.5x.
- **Caught or not.** A caught ring is green, tubes and spheres. Labeled transfers the model missed are amber dots at about a third of the catch's strength. Flagged transfers in a ring the model did not catch stay gray, so green always means caught.
- **Show the crowd.** This toggle fades in the other 1,797 accounts and their transfers as dust at 10 percent opacity, placed behind the rings. The model's false alarms appear with it as red dashed lines at about a third of full strength. The rings' accounts are pinned where their rings sit.
- **The catch moment and the "Caught" row.** A ring is caught when the engine marks it caught (`ring_found` on that run, which also rules out a sweep) and its last flagged transfer has arrived on the time scrub.
  - Its tubes then draw from sender to receiver, so the loop closes or the star snaps shut.
  - A copy of the shape flies into a card in the "Caught" row. The card shows the shape, IBM's name and the money moved.
  - Hovering the card adds the accounts, the transfer count, which other families caught it, the model's one-line why and the transfer ids.
- **Right panel**, in this order:
  - The model picker: one list, grouped by family, with the version in each entry. The versions sit inside this list.
  - The headline: "<Model> caught k of IBM's 20 laundering rings and traced m of 113 laundering transfers; it raised f alarms on ordinary neighborhoods, g of them on accounts that sit inside a ring."
  - Three short limit lines (synthetic data and IBM's labels; the slice is enriched and cut around IBM's groups; the ACH tell).
  - The closing number.
  - A three-item key.
- **Time scrub and Play** cover Sep 1 to Sep 10, plus the file's tail at the last stop. During Play, a ring the model will catch builds in dim green as its transfers arrive, then closes in full green. The title follows the scrub ("caught 3 of 20 rings by Sep 6").

## Deliberately left out, and why

- The crowd in the opening frame. It drowned the twenty groups, so it is now one toggle away.
- Force-directed placement of the rings. It scattered them through the crowd; a shape-by-name layout reads at a glance.
- Camera moves per ring, particles, glow, pulses, confetti and sound. None of them carries data. The camera makes one opening move and then holds.
- Version chips. The versions sit inside the model list instead.
- Detail on the roster cards. Cards show the shape, its name and the money; the rest is on hover.
- The flat page's leaderboard, shape grid and account desk. The flat page already has them.

## Animation timings and what each carries

| Motion | Duration | Carries |
|---|---|---|
| Opening camera move | 1,000 ms, ease-out, once | Settles into the three-quarter view where all twenty read |
| Model switch | about 320 ms (exponential ease-out, time constant 75 ms) | Colors and dots settle to the new model; its catches replay |
| Ring resolve (catch) | 450 ms, ease-out cubic, tubes staggered within the first 40 percent | The loop closes, the star snaps: caught |
| Shape flies into its card | 620 ms, ease-out | The caught ring becomes a countable card |
| Card entry | 260 ms fade and 6 px rise | Same moment, on the card's side |
| Gap between catches | 120 ms | Rings land one at a time, in the order their evidence completed |
| Crowd toggle | about 320 ms fade | Context in or out, never in the opening frame |
| Play the ten days | 14 s (1.4 s per day), linear | Transfers arrive in time order; rings close as their evidence completes |

With `prefers-reduced-motion: reduce`, the page shows end states only, and Play steps one day every 0.9 s.

## Data rules

- **Rings caught** comes from the engine's `ring_found` on each run. The page does not recount it, and it matches `rings_found` in the bench file: Sonnet v4 9, Sonnet v3 10, Kimi K3 v1 9.
- **Transfers traced** comes from the model row's `tp`.
- **The closing account figure** comes from the model row's `account_level` (`flagged_accounts_in_a_ring` of `flagged_accounts`), so it is the same definition as everywhere else: Sonnet v4, 100 of 134, 75%. The panel ends on whichever is stronger, that share or rings caught.
- **Shape names** are IBM's own (`ibm_shape`), in sentence case.
- **Money moved** prints the ring's largest currency total in its own currency, never converted. Rough Sep 2022 dollar rates are used only to choose which currency to print.
- **Em dashes** inside the models' own reasons print as a comma and a space.

## Checks run (headless Edge via Playwright)

- **No page errors** at 1280 by 800, 1280 by 900 and 1440 by 900. The only console message is three.js's own deprecation warning for `three.min.js`.
- **Hanging wifi:** every outside request was made to hang forever. The page still painted fully: title, 9 cards, no errors. three.js loads from the bundled copy only, and the fonts link does not block.
- **The "Caught" row** is fully inside the first screen at 1280 by 900 (and at 800). Its 9 cards wrap onto two rows.
- **Missing data:** a folder copy with no data files renders with the SAMPLE badge and no errors.
- **Draw calls:** 4 at rest. The run measured 144 fps (the vsync cap) on this laptop.

Screenshots:
- `shot_1280x900.jpg`: the default view
- `shot_1280x800.jpg`
- 1440 by 900 was checked (no errors) but not kept as a screenshot, to stay under 1 MB
- `shot_1280_first_2s.jpg`: 1.8 s after load, with the last catch flying into its card
- `shot_1280_hover_card.jpg`: the hover on a "Caught" card
- `shot_1280_crowd.jpg`: the crowd shown
- `shot_1280_play_mid.jpg`: Kimi K3 v1 at Sep 6, 3 of 20 caught so far, others building in dim green

## Known limits

- False alarms are visible only with the crowd on. The headline states the count every time.
- The eight one-transfer groups are tiny by nature. Their model reasons often describe the wider neighborhood rather than the one labeled transfer.
- The crowd layout is computed the first time you show it, which takes about half a second.
- Accounts that pay themselves have no line.
- The grid assumes up to about sixteen shaped groups. A different slice with many more would need a wider grid.
- Not checked: a real projector, or a machine with hardware acceleration off.
