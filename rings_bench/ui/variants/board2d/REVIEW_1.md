# board2d, first-loop review

Claude's review (pencil, unstamped), 2026-10-17. Checked against the builder's README claims, `data/bench_results.json`, and the baseline page `ui/index.html` + `ui/app.js`. No variant files were edited.

## Verdict

Yes, a contender. The page is correct where it counts: all headline numbers match `bench_results.json` for both models checked, it runs with no script errors from a file:// URL, the SAMPLE fallback works and says so, and the catch moment, legend, hover cards, expanded tile with scrub, quiet styling and reduced-motion path are all there. The one thing to fix before it can lead the demo is the caught card: it must use IBM's own shape name and say what the model flagged to make the catch. Today 5 of 20 tiles carry our slice's shape name labeled as "IBM's shape" (mesh where IBM says gather-scatter, chain where IBM says stack). And 7 of the default model's 19 catches are single-transfer "lone" rings it caught by flagging 3 to 27 transfers. Those cards read "lone · 2 accounts · 1 transfers" over a reason describing a twelve-account fan-in. A judge who reads one of those cards stops trusting the 19. A close second: open on a model that does not raise 32 alarms on 40 ordinary neighborhoods.

## Findings, most severe first

### High

1. **Shape names shown as IBM's are our slice's names for 5 of 20 rings, plus 8 more where IBM names no shape.** `board.js:41` takes the shape from `SLICE.ring_meta`, and `board.js:249` (tile), `:355` (card) and `:374` (hover, "IBM's shape: …") print it. Every run carries `ibm_shape` (set from `bench.py:40-43`, joined to IBM's pattern file). Mismatches: u15 shows "mesh", IBM says GATHER-SCATTER (11 of 12); u08 and u33 show "chain", IBM says STACK (fragment); u14 shows "other", IBM says STACK (2 of 3); u53 shows "lone", IBM says BIPARTITE (1 row); the 7 other "lone" units are IBM's "no named shape". The pitch draft says the page uses IBM's own names. Should be: label, hover heading and card title from `run.ibm_shape` in sentence case, e.g. "Gather-scatter (11 of 12)" and "Single transfer, no named shape". Keep `ring_meta` only to pick the layout, and keep `SHAPE_WORDS` keyed to the layout. (Checked: the 12 that do match, u06 fan-out and the rest, match exactly.)

2. **Lone-ring "catches" are sweeps, and the card hides it.** For kimi-k3 v1, u11/u19/u20/u28/u29/u31/u37 count as caught by flagging 12/3/27/17/11/7/17 transfers to hit IBM's one; for gpt-6-sol v4, 4 of its 10 catches (u11 12 flagged, u28 3, u29 11, u31 7). The tile shows it honestly (lots of red dashed lines), but the card at `board.js:353-359` says only "2 accounts · 1 transfers", "Also caught by 6 of 6 other families", and the model's reason ("Twelve distinct accounts … push ACH transfers into the same collector"). That reason contradicts the card heading. Should be: one line on every card from the run's own counts, e.g. "Flagged 12 transfers; 1 of them IBM's, 11 ordinary". Consider landing lone catches as one grouped card ("7 single transfers, each caught inside a wider flag") so the roster leads with the shaped rings.

3. **The default model is the noisiest one.** `board.js:221-225` opens on the most rings caught, so kimi-k3 v1: 19 caught, but 32 of 40 ordinary neighborhoods alarmed, and 7 of the 19 are the sweeps in finding 2. The baseline (`app.js:824-826`) weights precision and opens on claude-sonnet-5-5 v3 (13 caught, 5 alarms), so the two pages open on different models. Should be: the same default rule as the baseline, or the model the pitch names, with `?model=` for the rest.

### Medium

4. **The catch sequence ends on the false alarms.** `board.js:291-299` lights the 20 ring tiles first, then the 40 ordinary tiles. Measured in headless Edge (virtual clock): kimi v1 tray slots land at 1.4 to 5.1 s, then the red alarm counter ticks 32 times from 4.2 to 5.7 s. The last thing the room sees is the red number climbing. Should be: light the ordinary tiles first (or at once, with no counter tick), then the rings, so the sequence closes on the last catch.

5. **The false alarms are not quiet.** `index.html:26` with `board.css:42,46`: the alarm counter is the same 40 px numeral as the caught counter, in red, side by side. Should be: the caught number large and the alarm number at secondary weight (for example 20 px, muted ink, red only on the word), as the brief asks for quiet misses and false alarms.

6. **The cards land where nobody can see them.** At 1280x900 the roster ("Caught by …") starts about 1450 px below the fold, so during the catch moment the viewer sees only the tray fill. The per-ring card with shape, accounts, transfers, money, other families and why never appears on screen unless the presenter scrolls. Clicking a tray slot does scroll to its card (`board.js:347`), but that is after the moment. Should be: during the sequence, show the newest card in a small panel above the tray (or move the roster above the ordinary grid), so "a copy travels to the roster" happens in view.

7. **Changing model makes the page jump.** `select()` rebuilds all 60 tiles (`board.js:243`) and `resetRoster()` (`:331-336`) empties the cards, so a presenter scrolled into the roster loses about 1500 px of page height and is thrown up the page, then the page regrows over 4 to 6 s. Should be: hold the roster's min-height at its previous height until the new sequence finishes, or scroll to the top on model change on purpose.

### Low

8. **"1 transfers".** `board.js:356` always says "transfers"; 8 cards read "2 accounts · 1 transfers". Should be singular when n = 1.

9. **8 of 20 tray slots are identical dashes.** The lone rings draw as a single line (see the tray in any screenshot), so at kimi v1 the sequence spends 7 of its 19 beats on the same dash. Folds into finding 2's grouping.

10. **The headline gives the final numbers before the counters count.** `board.js:283` writes the full headline at t = 0 while the counters tick up from 0 for 4 to 6 s, so for that time the page shows "19" and "8" at once (see a 1.5 s frame). Acceptable; tidier to fade the headline in when the sequence ends, or start the counters at their final values with reduced motion only.

11. **The scrub is not always ten days.** `board.js:401` stretches to the group's last transfer; 4 of 60 units scrub 14 days (u26, for one). The README discloses it. Should be: a fixed ten-day window, or "14 days" said in the subtitle (it is: "scrub 14 days for this group only"), so this is a note, not a defect. The tick row uses fixed margins (`board.css:161`) and only lines up because the time label is a fixed width.

12. **Money line mixes names and codes.** Cards use full currency names ("45.2k US Dollar + 36.9k UK Pound + 2 more currencies moved", wrapping to 3 or 4 lines; `board.js:339-343`), while the dialog uses codes (`:410`). Should be: codes on cards too, one line.

13. **Stale hover card after a model change.** `select()` does not hide `#tip`, and a rebuilt tile never fires `mouseleave` (`board.js:280-285, 385-388`). Rare with a mouse, because the cursor is on the model list. Should be: `tip.hidden = true` in `select()`.

14. **Smallest text is too small for a projector.** Ordinary-tile ids are 10 px and ring-tile footers 10.5 px mono (`board.css:87, 92`). Legible on a laptop at 1280 in both themes; likely not from the back of a room.

15. **The "ordinary traffic" key line is nearly invisible.** `.e-bg` at opacity .3 (`board.css:102`) also styles the legend sample (`index.html:45`); in light mode at 1280 the line next to "ordinary traffic around the group" barely shows. Should be: a stronger key sample than the in-tile line.

16. **Ring section heading wraps.** At 1280, "IBM's labeled laundering rings" breaks onto two lines because the note sits beside it (`index.html:56`, `board.css:75`). Fine at 1440. Should be: the note on its own line under the heading.

17. **`?open=` opens the dialog over a running sequence.** `board.js:447-448` opens the tile while the catch sequence still runs underneath, so closing it mid-sequence shows half-lit tiles. Should be: with `?open=`, land the end state at once, as in reduced motion.

### Design list items noted as absent (optional, not defects)

- Agreement halo (stroke weight = families agreeing): absent. The card's "Also caught by k of 6 other families" carries the same fact in words.
- Account search tie-in: absent.

## What passed

- Numbers, checked by hand from `bench_results.json` and rendered by headless Edge from file://:
  - kimi-k3 v1 (default): 19 of 20 rings caught, 104 of 113 transfers traced, 32 alarms on ordinary neighborhoods, 31 of them on accounts inside a ring (runs with a non-empty `ring_accounts_flagged`). Page matches all four.
  - gpt-6-sol v4: 10, 68, 2, 2. Page matches all four.
  - The counters, tray count, roster count and ordinary note agree with the headline in both.
- Tile shape vs. `ibm_shape`: u06 is drawn as a fan-out star (hub = most distinct receivers) and IBM's name is FAN-OUT, a match. 5 of 20 do not match; see finding 1.
- Hover card ids: u26 under kimi v1 splits into 14 "flagged, IBM agrees" (T2728, T2770, T2771, … T2818, exactly IBM's 14), 2 "flagged, IBM says ordinary" (T2786, T2800), 0 missed. All are in u26's rows, and across all 1,560 runs no flagged id falls outside its unit's rows, so the hover lists cannot name a transfer the tile does not hold.
- No script errors: `node --check board.js` passes. An instrumented scratch copy recorded no `error` events or `console.error` in default, `?model=…sol@v4`, and `?open=u50&at=60&theme=dark`. Light, dark, 1280, 1440 and `?open=u26&at=100` render.
- Missing data: a scratch copy without `bench_results.js` renders a labeled SAMPLE (badge, limit line, footer), with no other errors.
- Wording: leads with the catch, then a limit line, then the strongest true number ("It caught 95 percent of IBM's laundering rings" or "It traced 60 percent of IBM's laundering transfers"). No "wrong N times in ten", no "rings found", no em dashes in page copy (model reasons are verbatim and may carry en dashes), American spelling, sentence case.
- Quiet styling: no gradients, glow, particles or camera moves; the only depth is hairlines, a 2 px top rule on caught tiles and the dialog's backdrop tint.
- Reduced motion: `?motion=off` lands the same end state at once (screenshot identical to the animated end state); the code reads `prefers-reduced-motion` via `matchMedia` and the CSS drops transitions.
- Performance (headless Edge, virtual clock): first paint 270 to 420 ms; board.js runs in 110 to 190 ms over 2.84 MB of data scripts (bench_results.js alone is 2.26 MB). The ring catches run as one even beat, about one every 200 ms; see finding 4 for the tail. Variant folder 498 KB including screenshots.

## What I could not check

- Real-browser animation smoothness and whether the flights and line draws read as one sequence: headless Edge's virtual clock does not run Web Animations in step with timers (the builder notes the same), so the timings above come from timer and DOM-change stamps, not from watching it.
- The `prefers-reduced-motion` media query itself (only the `?motion=off` path was rendered; both go through the same function).
- Live hover rendering: the hover card content was verified by recomputing its split from the data, not by hovering.
- Projector legibility, offline font fallback, and the README's claim that the tray clips under about 1180 px (a 1100 px screenshot was taken but not reviewed).
- Contrast was judged from the token values (all text tokens are above 4.5:1 on their surfaces in both themes) and screenshots, not with a measuring tool.
