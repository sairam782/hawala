# Rings in time (variant: timedepth3d, "paper ledger"), loop 2

Open `index.html` with a double-click. It reads `../../../data/slice.js`, `units.js` and `bench_results.js`. If any of them is missing, it draws a small made-up network and shows SAMPLE in an amber badge. three.js r160 loads from this folder only, so the page makes no outside request it has to wait for. Fonts come from Google without blocking the page, and fall back to Georgia, Segoe UI and Consolas.

## What it argues, in three sentences

A flat graph cannot show order in time, but time order is the one thing that gives a laundering ring away: in a cycle, the money comes back to the account it started from, days later. So the page puts one IBM group at a time on a large stage: its accounts on the map plane, its transfers drawn at the moment they happened, and a tilt that turns "who paid whom" into "in what order". A quiet row of twenty shape icons gives the score at a glance (caught in green, missed in amber). Play walks through the caught rings one by one, and each one draws itself in time order and drops into the Caught list.

The first frame is built for a judge who has never seen the page. The icon row and the headline give the number caught and name the shapes. On load, the stage draws Claude Sonnet 5.5 v4's caught cycle (IBM's group from Sep 7 to Sep 11), and the money arrives "back at the start" about four seconds in.

## What is on the page

- **Icon row**: 13 items for IBM's 20 groups.
  - 12 shape icons, each drawn from IBM's own shape name (`ibm_shape` on the ring's neighborhood run) and sentence-cased: cycle, fan-out, fan-in, scatter-gather, gather-scatter, stack.
  - One wider item, "Single transfers: k of 8 caught", with one small mark per group. These are the seven groups IBM calls "no named shape" plus the one-row bipartite group.
  - Caught is solid green with arrows; missed is amber dotted. Click an icon or a mark to put that group on the stage.
- **Stage**, one group only, laid out from scratch:
  - The accounts sit on the map plane, and a cycle is placed on a circle in the order the money went round. Each transfer is a thick segment (3.8 px whatever the zoom) with an arrowhead, at the depth of its day and time.
  - Thin lines follow one account from one transfer to its next. The first sender's line is teal, labeled "starts here", and "back at the start" appears when the money returns.
  - Day ticks run under the group, and a thin dashed circle labeled "map plane" marks where the accounts are laid out, on the group's first day.
  - The caption gives IBM's shape name, the counts and dates, and the model's one-sentence why.
  - When the engine says "missed" although the model flagged at least half of the ring (the sweep rule), the flagged transfers are drawn in muted green. The caption then adds "Flagged, but with too many wrong flags around it to count as caught", so the icon and the stage agree.
  - Nothing else is drawn unless "Neighborhood traffic" is on: then the ordinary transfers in the group's neighborhood appear at 10 percent opacity.
- **Camera**: Map (top-down, time hidden) and Timeline (68 degrees round, 14 degrees up; days run left to right), with one eased transition and a tilt slider between them. Drag to pan, scroll to zoom, double-click to reset.
- **Day scrub**: a slider that extrudes the group through its days. Each transfer grows from sender to receiver as its time passes.
- **Right panel**:
  - The model picker, with version chips behind it.
  - The headline, leading with the catch: "Claude Sonnet 5.5 v4 caught 9 of IBM's 20 laundering rings and traced 100 of 113 laundering transfers; it raised 2 alarms on 40 ordinary neighborhoods, 2 of them on accounts that sit inside a ring."
  - The closing figure, from the bench's own `account_level`: "100 of the 134 accounts it flagged sit inside an IBM ring."
  - A three-item key.
  - "Read with care", in three lines: the data is synthetic and the labels are IBM's; the slice is enriched (4 percent laundering against 0.1 percent) and each neighborhood was cut around an IBM group; every laundering transfer in the slice is ACH, which is a tell.
- **Caught roster**: a strip inside the first screen (checked at 1280x900 and 1440x900). One card per caught ring: icon, IBM's shape name, and money moved, given as the largest single-currency sum with its code plus how many other currencies (for example "45,159 USD + 3 currencies moved"). Clicking a card puts its group back on the stage.
- **Hover** on a drawn transfer: its id, time, format, sender and receiver, amount, and whether the model flagged it.

**Scoring** comes from the engine, not a recount:
- Caught is each ring's neighborhood run's `ring_found`: half the ring flagged and no sweep.
- The count is `models[].rings_found`, and the closing figure is `models[].account_level`.
- "Traced" is the union of flagged transfer ids that IBM labels laundering.
- Alarms are runs with `expected: ordinary` and `verdict: ring`, over the number of ordinary neighborhoods.

## Left out on purpose

- **The full 2,824-transfer network**: it read as a wall of ticks. Time as depth only works for one group at a time.
- **False alarms on the stage**: they belong to ordinary neighborhoods, not to an IBM group, so they appear in the headline count only.
- **Misses at full strength**: they are drawn at a third of a catch's opacity, so a mistake is never louder than a catch.
- **Card details**: no account counts, families or why on the cards. The brief cut them to icon, name and money moved, and the why sits in the stage caption.
- **Particles, glow, pulses and camera swoops.** Also left out: a dark theme. The page keeps its paper ground in dark mode on purpose.

## Animation timings and what each carries

| Motion | Length | Easing | What it says |
|---|---|---|---|
| A group draws itself | 700 ms + 330 ms per transfer, at most 3.6 s (a cycle of 8: 3.3 s) | linear in time; each transfer grows over about 4 percent of the window, ease-out | the money moving, in order; for a cycle, the last hop closes the loop |
| Resolve to the model's verdict | 420 ms | ease-out | ink turns green (caught) or faint amber (missed): the loop closes, the fan snaps |
| Copy of the shape travels to its card | 700 ms | ease-out | this ring joins the caught list |
| Map to Timeline | 400 ms | ease-out | the same group, re-read as order in time |
| Play | one caught group after another, about 4 to 5 s each | | the whole catch, one ring at a time |

With `prefers-reduced-motion` (or `?still=1`), every motion is instant, and Play fills the roster at once.

## Known limits

- The time axis is per group, from the midnight before its first transfer to the midnight after its last, so the depth of one day differs from group to group. The day ticks show the scale for each one.
- In the timeline view, a group with many accounts crowds vertically. The map view is the better read for the fans.
- Money moved is not converted between currencies. "Largest" means the largest face value, so yen or rubles can outrank dollars.
- The bundled three.js prints one deprecation warning in the console. There are no errors.
- Frame rate: 142 frames per second while playing, in headless Edge with software WebGL. Not checked on a real GPU. The page only redraws when something changes.

## Screenshots (Edge, headless, driven by Playwright, 1280x900)

- `shot_1280_t1500_drawing.jpg`: 1.5 s in, the cycle drawing itself in ink
- `shot_1280_first_frame_after_5s.jpg`: 5 s in, the cycle resolved green, "back at the start" labeled, first card in the roster
- `shot_1280_hover.jpg`: hover on the first transfer of the cycle
- `shot_1280_map.jpg`: the same cycle in the map view, a closed loop
- `shot_1280_after_play.jpg`: Play in progress, scatter-gather on the stage, eight cards in the roster
- `shot_1280_neighborhood.jpg`: the same with neighborhood traffic on
- `shot_1280_sweep_case.jpg`: kimi-k3 v1 on IBM's fan-in from Sep 10, which it flagged 12 of 12 but the engine counts as missed (sweep), drawn muted green with the one-line caption

Address parameters: `?model=openai/gpt-6-sol&v=v4&group=0&view=map&still=1` (`tilt=0..68` also works).
