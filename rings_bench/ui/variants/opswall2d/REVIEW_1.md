# Ops wall (opswall2d): first-loop review

Reviewer: Claude (Opus 5.5 subagent), 2026-10-17 about 13:25. Review only; no variant file was edited. Pencil, unstamped.

## Verdict

A contender, with conditions. The single-model numbers are right (Kimi K3 v1 and Claude Sonnet 5.5 v1 match the engine exactly), the canvas is fast and still, the catch moment works, reduced motion is honored, and it is the only page where agreement is the picture itself. But the picture does not yet say "agreement" at a glance. At the default dial every green halo carries 5 to 9 votes, which renders as 4.6 to 7.8 px. They look alike, and the key that explains them sits below the fold of the right rail at 1280 x 900 and 1440 x 900. **The one thing that would make it a contender: make the vote weight readable without the legend.** Every IBM group keeps its weight at every dial position, the scale is wide enough that 9 of 9 and 3 of 9 look different from across a room, and the key is visible in the opening frame. Two correctness fixes must land with that. The shape names are ours, not IBM's (finding 2). The panel numbers run looser than panel.json (finding 3). Also note that the live opswall.js changed mid-review and currently blanks the page (finding 1).

## Findings, most severe first

**1. HIGH: the live build is broken right now (mid-edit).** `opswall.js` was rewritten at 13:21:39 while this review ran (41,327 to 40,522 bytes). Line 256 reads `$('#ordRow')` and line 257 calls `ordRow.append(...)`, but `index.html` has no `#ordRow`. On load the page throws "Cannot read properties of null (reading 'append')" and renders blank (headless Edge, `?model=foo/bar` run at 13:22). Everything below reviews the 13:14 build, which loaded with zero console errors in 8 cases. What it should be: land the matching `index.html` and `opswall.css` with the js, then re-run the 0-error check before anyone opens it.

**2. HIGH: the shape name on cards and hover cards is our structural label, not IBM's.** `opswall.js:75` takes `SL.ring_meta[r].shape`. The card prints it at line 318, and the hover card at line 454 prints it under the eyebrow "IBM laundering group N". For 12 of the 20 groups it disagrees with `ibm_shape` in bench_results.json:
- group 8 (u15): "mesh", but IBM says "GATHER-SCATTER (11 of 12)"
- groups 9 and 10 (u33, u08): "chain", but IBM says "STACK (fragment)"
- group 11 (u14): "other", but IBM says "STACK (2 of 3)"
- groups 12 to 17 and 19: "lone", but IBM says "no named shape"
- group 18 (u53): "lone", but IBM says "BIPARTITE (1 row)"

Groups 0 to 7 match apart from case. What it should be: read `ibm_shape` from the unit's runs and label it as IBM's, for example "IBM's shape: gather-scatter". If our structural reading is shown at all, label it as ours.

**3. HIGH (if the panel is ever on screen): the panel's "caught" and "traced" counts use a looser rule than panel.json.** At `opswall.js:156-166`, panelStats unions the flags of every family that said "ring" and counts a ring as caught at half coverage. The engine's `vote_table` disagrees:

| Version and dial | Page: caught | panel.json: rings_found | Page: traced | panel.json: recall × 113 |
|---|---|---|---|---|
| v1, k=5 | 18 | 16 | 108 | 89 |
| v1, k=7 | 12 | 8 | 96 | 63 |
| v1, k=9 | 6 | 4 | 37 | 15 |
| v2, k=5 | 17 | 14 | | |
| v2, k=7 | 10 | 9 | | |

Alarm counts match (16, 6, 1). The README claim that counts "can differ by one" holds for single models but not for the panel. What it should be: take `rings_found`, `recall` and `false_rings` from `vote_table[k-1]` for the headline. Build the roster with the same per-transfer vote rule `panel.py` uses.

**4. HIGH: the key is not visible in the opening frame.** `.rail` is fixed at 587 px tall at 1280 x 900 and at 1440 x 900 (`opswall.css:41`), and the legend starts at y = 686, below the rail's visible bottom (about 683). A judge has to find and scroll the rail to read what the halos mean. What it should be: put a compact key strip on the stage itself (top left, three swatches: thick = "9 of 9 families", thin = "3 of 9", red = "ordinary, wrongly called"), or move the legend above the controls.

**5. HIGH (the variant's whole idea): halo weight barely reads at a glance.** The weight is correct: it equals `agreement.ring_votes` in panel.json.
- Group 7 (u32) has 9 votes and renders at 7.8 px, opacity 1.0.
- Group 18 (u53) has 5 votes and renders at 4.6 px, opacity 0.65.
- Group 9 (u33) has 3 votes, sits below the dial at 5, and shows only as an amber dotted outline.

But `opswall.js:242` draws the green halo only for groups with votes ≥ k. At the default k=5 the visible range is 5 to 9 votes, and `wOf`/`aOf` (lines 201-202) map that to 4.6 to 7.8 px and 0.65 to 1.0 opacity, which is a 1.7x difference. In the 1280 screenshot the green halos read as one weight. The legend's "thin, dim" sample (1.4 px, 0.45) never appears at the default dial. The big left cluster also overlaps several green and red outlines into one tangle.

What it should be:
- Every IBM group keeps its vote weight at every dial position. Groups below the dial dim and dash, so the dial changes the style and never erases the weight.
- Widen the scale so 1 vote = 1 px and 9 votes = 10 px or more.
- Optionally print "9/9" beside the strongest outlines.
- Consider letting the layout pull the big cluster's ring groups apart a little more.

**6. MEDIUM: with a model on top (the default), the dial does not move the story.** `opswall.js:415` calls `select()` only when no model is picked. Turning the dial changes the halos and the one-line `#dialNote`, but the headline, closing number and roster stay on "kimi-k3 caught 19 of 20". The demo's "trade in one move" then lives in a 12 px muted sentence. What it should be: make the panel the opener (see item 8), or add a headline sub-line that follows the dial.

**7. MEDIUM: v3, v4, v5 and v2x are unreachable; `?model=anthropic/claude-sonnet-5-5` maps to v1.** `VERSIONS` (`opswall.js:144`) keeps only versions present in panel.json (v1, v2), and there is no `?ver=` parameter. The Sonnet v1 numbers on screen are correct: 14 of 20 caught, 97 of 113 traced, 9 alarms, 9 of them inside a ring, all equal to the engine. The baseline page opens on Sonnet v3 (13 / 101 / 5 / 5). This variant cannot show that, or v4 (12 / 100 / 2 / 2). What it should be: build the version list from bench runs, draw halos only where panel data exists for that version, and add `?ver=`.

**8. MEDIUM: the default opener (Kimi K3 v1).** The page's own rule picks Kimi: most rings caught, then fewest alarms (`opswall.js:475-478`). That gives 19 of 20 and 104 of 113, but also 32 alarms on 40 ordinary neighborhoods. The first sum a judge does is 32 of 40, and it undercuts the catch-first line.

My choice for this variant is `?model=panel` as the opener, once finding 3 is fixed. The variant argues agreement, and the panel is the only selection where the dial drives the headline. From vote_table v1:
- at 5 of 9: 16 of 20 rings, 16 alarms
- at 7 of 9: 8 rings, 6 alarms
- at 9 of 9: 4 rings, 1 alarm

Open at 5 and turn the dial on stage. If the team prefers one named model, match the baseline's Sonnet v3; that needs finding 7.

**9. MEDIUM: false alarms and misses are not quiet.** In the model overlay:
- false flags are red dashed at opacity 0.8 (`opswall.js:259`)
- missed labeled transfers are amber dotted, 1.8 px, opacity 0.95 (line 260)
- 16 red neighborhood halos are added on top

In the left cluster, red reads about as loud as green. What it should be: about 0.35 opacity and 1 px for both overlays, and red halos at about half their current opacity. The green catch then carries the picture.

**10. MEDIUM: motion at load without any control changing.** `init()` calls `select(true)`, which queues all 19 catches: 19 × 230 ms stagger plus a 560 ms flight, about 4.9 s of motion. The brief says motion only when a control changes. This is a judgment call: it is the catch moment, and a presenter may want it at open. What it should be: open with cards already landed and play the catch on "Play the ten days" or a model change. Or keep it, and say in the README that load counts as the opening control.

**11. MEDIUM: the honest panel is short but drops two limits the bench README says to say on stage.** `opswall.js:385` gives synthetic data, one run per cell, and the enrichment (4.0 vs 0.10 percent). It omits that units were cut around IBM's rings, which makes them easier than a blind scan, and that every laundering transfer is ACH, a tell the model can use. The baseline shows the ACH tell. What it should be: one more clause, for example "units were cut around IBM's groups, and every laundering transfer is ACH."

**12. LOW: there is no keyboard path to a group or a card, and cards do not light their ring.** Tab order is play, time, dial, model, v1, v2, strip, and then focus leaves the page. The canvas groups and the roster cards are not focusable or clickable. In the baseline, clicking a card lights its ring. Cost: low for the live demo, since the presenter uses a mouse. Medium for judges exploring on their own. What it should be: cards become buttons that set `ST.hover` to their group and show the hover card. Account search is absent; it was optional.

**13. LOW: "Play the ten days" vs a 15-day clock.** The button (`index.html:28`, `opswall.js:424`) says ten days while the clock reads "Sep 1, 00:00 to Sep 16, 05:12". What it should be: "Play Sep 1 to 16" or "Play the transfers".

**14. LOW: not sentence case.** `text-transform: capitalize` (`opswall.css:81`, `opswall.js:454`) renders "Scatter-Gather" and "Fan-In". The headline opens lowercase with "kimi-k3 caught" because `shortName` returns the raw slug (line 16). What it should be: "Scatter-gather", and display names such as "Kimi K3" and "Claude Sonnet 5.5".

**15. LOW: "money moved" shows only the largest currency, plus "+N more".** At `opswall.js:300`, "45.2K US Dollar +3 more moved" reads as if "+3 more" were an amount. The values are right:
- group 7: USD 192,832.44 becomes "192.8K US Dollar +1 more"
- group 8: AUD 127,224.42 plus 2 other currencies
- group 1: USD 45,159.30 plus 3 other currencies

What it should be: "+3 other currencies".

**16. LOW: URL options fail quietly.** `?model=<unknown id>` silently falls back to the panel (`opswall.js:413`). In my probe, `?hover=8` and `?hover=12` showed no hover card at 6 s, though the builder's shot for group 7 shows one; see "Could not check". These are screenshot aids only.

**17. LOW: the roster is clipped at 1280 x 900.** Document height is 904 px, so the second line of each card's reason is cut at the bottom edge, and 4 of 19 cards are visible before the strip scrolls. It is acceptable at 1440 x 900.

### Verified correct (13:14 build)

- **Kimi K3 v1 headline matches the engine:** 19 of 20 caught, 104 of 113 traced, 32 alarms, 31 of them on accounts inside a ring (`rings_found`, `tp`, `false_rings`, and runs with a non-empty `ring_accounts_flagged`).
- **Claude Sonnet 5.5 v1 matches too:** 14 / 97 / 9 / 9.
- **`?k=7` lights the groups the vote_table implies:** 12 of 20 IBM groups green and 6 of 40 ordinary red. That agrees with vote_table k=7 (`false_rings` 6; `verdict_right` 46 = 12 + 34). Lit groups follow verdict votes. The panel headline's caught count does not; see finding 3.
- **Caught cards:**
  - Every labeled transfer id for groups 7, 8 and 1 is in its unit's rows, and the unit's `truth_ids` equal IBM's labels.
  - Paid amounts match, and the money sums match.
  - One card per caught ring: 19 for Kimi, 14 for Sonnet.
- **Motion:**
  - The dial transition is 250 ms with cubic ease-out (`DIAL.dur`, `easeOut`).
  - The scrub reveals transfers in time order.
  - There are no particles, shadowBlur, glow or idle loop: rAF reschedules only while the dial, a catch or play is active.
- **Reduced motion:** 19 cards present at 300 ms, 0 flyers, dial instant, play steps a day every 450 ms.
- **Wording:** no em dashes, American spelling, no "rings found", no "wrong N times in ten". The headline is catch-first and ends on "19 of 20 rings caught".
- **Missing panel.js (tested on a copy of the folder):** the amber SAMPLE badge shows, the limit line says no number is a measurement, and the only console error is the panel.js 404.

### Performance (headless Edge, GPU disabled, 1280 x 900)

- **Load:** first contentful paint 120 to 132 ms, load event 401 ms, headline (including the one-time layout) at 0.44 s.
- **Play:** 244 frames, median 16.7 ms, max 16.8 ms, none over 50 ms.
- **Dial sweep (7, 3, 9, 5):** 113 frames, max 16.8 ms, no jank.
- **Size:** variant code is 53 KB (js 41 KB, css 6.5 KB, html 5 KB). It shares 2.9 MB of data with the baseline; bench_results.js alone is 2.25 MB. The folder's screenshots add 480 KB. Fonts come from Google and fall back offline.

## What I could not check

- **The current (13:21) build beyond its load error:** the builder is mid-edit (finding 1).
- **Whether the bench data changed under me:** bench_results.js was rewritten at about 13:20 (badge "runs written 13:20"). The Kimi headline was unchanged on reload. I did not re-run the Sonnet or panel comparisons against the 13:20 data.
- **`?hover=` cards:** I did not see them in my probe for groups 8 and 12. I did not debug why; the builder's group 7 shot shows the card working.
- **Frame rate on real hardware with a GPU and a projector,** and how readable the halo opacity steps are from across a room.
- **The exact per-transfer rule in `panel.py`:** I compared against its output (vote_table), not its code.
- **The 250 ms transition's feel:** checked only by code and a mid-transition screenshot, not watched live.
