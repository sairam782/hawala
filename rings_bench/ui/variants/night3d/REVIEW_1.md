# Review 1: night3d (Rings at night)

Reviewer: Claude (first-loop reviewer), 2026-10-17. Pencil, unstamped. Review only; no variant file was edited.

## Verdict

Not a contender yet; one change would make it one. The numbers are right. Claude Sonnet 5.5 v3 shows 13 of 20 rings, 101 of 113 transfers, 5 alarms with 5 on ring accounts. Kimi K3 v1 shows 19, 104, 32 and 31. I checked one roster card against the data and it holds. The catch moment exists, the motion rules are kept, and it runs at 144 fps on this laptop's integrated GPU. But on the screen the network is an even hairball. The caught rings are 1 px green strands threaded through the whole ball, so you cannot see 13 closed shapes. With Kimi K3 the red false alarms visually outweigh the green. **The one thing that would make it a contender: draw the caught rings as thick, compact shapes.** Use tube geometry for the roughly 100 caught segments, merged into one draw call. Pull each ring's accounts together in the layout. Drop false alarms and misses to about a third of their current opacity. Separately, there is a five-minute must-fix before any demo use. If the wifi hangs, the page stays blank, because both the three.js CDN script and the Google Fonts stylesheet block it (finding 1).

## Findings, most severe first

1. **Critical: a hanging network blanks the page.** `index.html:10` (Google Fonts stylesheet) and `index.html:13` (three.js from cdnjs) are both render-blocking and sit in `<head>`. I made each request hang, never answer, using Playwright request interception (no files touched). In both cases, after 15 s there was still no `<body>`, no first paint, and `night3d.js` had never run. Playwright could not even take a screenshot. A failing CDN is fine: with the CDN aborted, the local `three.min.js` loads and the page renders with no errors. The builder's stall risk is real and also applies to the fonts link. **Should be:** load `three.min.js` from the folder directly and drop the CDN line. The demo opens from file://, so the local copy is always there, and swapping the order is not enough because nothing is gained from the CDN. Then remove the fonts `<link>`, or make it non-blocking (`media="print" onload="this.media='all'"`). The fallbacks (Georgia, Segoe UI, Consolas) are fine. The flat page `ui/index.html` has no external dependencies at all.

2. **High: the rings do not read as shapes, at 1280 or on a projector.** In `night3d.js:198` and `:212-222`, every line is a 1 px `LineSegments`. The force layout (`:71-111`) treats ring edges like every other edge, so the 13 caught rings land scattered through a uniform ball about 470 px across. My 1280 and 1440 screenshots show green strands, not closed loops or stars. The ball also uses only about half the stage width. On a projector, 1 px lines at 0.95 opacity will lose most of their weight. **Should be:**
   - Draw the caught layer, and only that layer, as merged `TubeGeometry` (radius about 0.6 world units). That is about 100 segments, so still one draw call.
   - Give labeled-transfer springs about 3x the stiffness, and a shorter rest length, so each ring collapses into a compact visible figure. Optionally push ring groups toward the shell.
   - Raise the minimum ring-member sphere size.
   - Drop the hairline opacity from 0.16 to about 0.10.
   - Frame the camera so the ball fills the stage.

   Fewer hairlines also helps: degree-1 accounts could skip their line entirely.

3. **High: false alarms and misses are not quiet.** `night3d.js:217` sets red to 0.85 and amber to 0.85, against 0.95 for green. On the ground that is about 4.8:1 for red and 6.1:1 for amber, against 7.7:1 for green, so amber reads almost as strongly as the catches. `night3d.js:276` colors endpoint spheres full red or amber. With Kimi K3 v1 (628 false-flag transfers) the red web dominates the network (my `kimi_1280` capture and the builder's `shot_1280_switch_midcatch.jpg`). **Should be:** red and amber lines at about 0.3 to 0.35 opacity, red and amber spheres mixed about halfway toward the base gray, and caught green at full weight. The cost stays visible, but the catch stays the figure.

4. **High: during Play the page shows failures first.** At `night3d.js:296`, flagged transfers of rings the model eventually catches are left out of the `ok` layer. They sit collapsed in the caught layer until the ring's last flagged transfer arrives (`:239-264`). Misses and false alarms, meanwhile, draw the moment they occur. At Sep 4 14:08 my capture shows one green line against dozens of red and amber marks. Also, the headline (`:307`) does not follow the scrub: it says "caught 13" while the roster says "1 of 20". **Should be:** draw a found ring's flagged transfers in a dim green as they arrive, as evidence building, then close the ring in full green at the catch. Make the headline follow the scrub ("so far, k of 20") or say plainly that it is the full-run result.

5. **High: roster cards cut off the required facts at both widths.** In `night3d.css:91-103`, a 268 px card with a 64 px mini drawing leaves about 170 px of text. At 1280 the card shows "9 accounts · 14 transfe…", "141,401 US Dollar + 4 o…", "Also caught by DeepSeek, Mistral, Moonsho…" and "GATHER-SCATTER (11 …". Only about 3.3 of 13 cards are visible, and `night3d.js:362` scrolls to the end, so the first catches leave the screen. At 1440 the first card is clipped mid-text. **Should be:** put money on its own full-width line, and write families as a count ("and 6 other families", full list on hover). Either widen cards to about 300 px or use a two-row wrapping grid with a smaller mini drawing, so the count and the cards can be read together.

6. **High (story): the first catch is a one-transfer "ring" whose why describes a burst.** Eight of IBM's 20 groups have one labeled transfer; `bench.py:42` names them "no named shape". In Play, the first card to land is IBM group 14: "no named shape · 2 accounts · 1 transfer · 276 Canadian Dollar". Its why says "Three different accounts sent ACH transfers (T0713, T0714, T0717)…". Kimi K3's first card has the same mismatch ("All 17 transfers flow into a single collector…"). The catch moment, the variant's headline device, opens on its weakest and most confusing example. **Should be:** label these cards "one labeled transfer (IBM names no shape)". Consider a small "single transfer" mark on the mini drawing, so a judge does not read "1 transfer" against a why that describes 11.

7. **Medium: the closing figure disagrees with the bench file.** `night3d.js:171-172` counts distinct flagged accounts across all of a model's ring calls. `bench.py:450-454` sums per-run counts, so an account flagged in two runs counts twice. For Claude Sonnet 5.5 v3 the page ends on **70% (100 of 142)**, while `bench_results.json` `account_level` gives **105 of 147 (71%)**. For Kimi K3 v1 it is 112 of 279 (40%) against 146 of 339 (43%), not shown because 19 of 20 wins there. The ring-account flag count per run (`ring_accounts_flagged`) does agree: 5 of 5 and 31 of 32. **Should be:** choose one definition with whoever writes the pitch. Either read `account_level` directly so every surface says 71%, or keep distinct accounts and say "distinct accounts" in the line. Arguably the page's version is the more honest count.

8. **Medium: the honest panel is too thin.** `night3d.js:308` is the only limit line. Missing, compared with `rings_bench/README.md` "Honest limits" and the flat page:
   - Every laundering transfer in the slice is ACH (the tell).
   - The slice is enriched (4% laundering against 0.1% in the file).
   - Units were cut around the rings.
   - The transfer-level cost: 72 of Sonnet v3's 173 flagged transfers are ordinary. The headline counts neighborhoods, not transfers.
   - The bank-rule baseline the flat page carries.

   **Should be:** two or three short lines, at minimum the ACH tell and the transfer-level false flags.

9. **Medium: the legend leaves out the sphere colors.** `index.html:65-69` keys four line styles and one gray "account, sized by its transfers" row. The builder says the spheres carry the signal on a projector, yet green, red and amber spheres have no key. The legend's 2 px SVG dashes are also crisper than the 1 px world-space dashes in the scene, which blur at distance. **Should be:** add a row of three colored dots ("account in a caught ring / on a false alarm / on a missed transfer"). If finding 2 is fixed, draw the green key as a thick stroke to match the tubes.

10. **Medium: Alex's approved design list is only partly met.**
    - Present: the legend as a key (wording is good), and hover cards with IBM's shape name, the model's one-sentence why and the transfer ids. I checked the roster hover and saw the builder's line-hover screenshot.
    - Removals held: no camera swoops (the camera moves once, 1.6 s), no particle flights, no glow or bloom (fog is a depth cue, not glow), no "rings found" phrase (grep finds none), no failure-first headline (no "wrong N in ten").
    - **Absent:** the agreement halo (stroke weight = families agreeing). The data is there (`famCaught`, `night3d.js:178`), and a tube radius scaled by agreeing families would deliver it together with finding 2. The account search tie-in (optional) is also absent.

11. **Medium: the money line favors weak currencies.** `night3d.js:344` sorts currencies by raw summed number. The FAN-OUT ring shows "1,553,050 Ruble + 5 other currencies" because rubles produce the biggest figure, not the most money. The sums are correct: for IBM group 0 the Yuan total 20,440.98 rounds to 20,441, plus US Dollar 15,973.52 and Australian Dollar 4,457.00. **Should be:** rank by a fixed approximate USD rate table, or retitle the line "largest single-currency total, not converted".

12. **Low:** `night3d.js:400` hover reads "1 transfers among 2 accounts". It needs a plural check like the one at `:357`.

13. **Low:** the hover header shows internal ids and jargon: "IBM group 14 · neighborhood u19" and "our shape name: lone" (`night3d.js:399-400`). Fine at the desk, but noise for judges. Keep IBM's shape name, the status and the why, and move the ids to the ids line.

14. **Low:** the title "Rings, at the desk at night" (`index.html:20`) names the concept, not what the page shows. Something like "Which of IBM's 20 laundering rings each model caught" would serve better. At 1440 the masthead text overlaps the top of the network.

15. **Low:** the clock text wraps at 1280 ("Sep 10, plus the file's tail / to Sep 16", `night3d.css:67`, a 250 px column). The tick labels use `space-between` (`:79`), so "Sep 10" sits at the end of Sep 10 and labels drift by up to a day from their positions.

16. **Low:** em dashes reach the cards through model whys. Kimi K3 whys contain "—", and `oneLine` passes them through. The page's own copy has none and uses American spelling throughout. Replace "—" with ", " at render if the no-em-dash rule covers quoted model text.

17. **Info:** the console shows three.js's own r160 deprecation warning for the non-module build. It is harmless and is the only console message on a normal load.

## Verified correct (for the record)

- **Claude Sonnet 5.5 v3 (default; same strength rule as the flat page, which I confirmed by recount):** "caught 13 of IBM's 20 … traced 101 of 113 … 5 alarms on ordinary neighborhoods, 5 of them on accounts that sit inside a ring". This matches my independent recount from `slice.js` and `bench_results.json`, and the bench (`rings_found` 13, `tp` 101, `false_rings` 5). Roster count: 13 of 20.
- **Kimi K3 v1:** 19 of 20, 104 of 113, 32 alarms, 31 inside a ring. It ends on "19 of 20 rings caught" because 95% beats the 40% account share. All match.
- **Roster card, CYCLE (IBM group 0, unit u47):** the shape name equals `ibm_shape` CYCLE, with 7 accounts and 7 transfers. All 7 transfer ids (T0508, T1211, T1215, T1243, T1245, T1464, T1476) are in u47's rows. The money equals the summed `paid` of the labeled rows per currency.
- **CDN failure (aborted):** the local fallback loads with no page errors.
- **Reduced motion:** same final state and 13 cards. The CSS and JS both skip fades, flights and the opening move.
- **Play:** runs Sep 1 to Sep 10 plus the tail in about 14 s and ends with 13 cards.
- **Draw calls:** 6 at rest, confirmed via `renderer.info`. A model switch briefly adds the 4 fading layers.

## Performance

- **Frame rate with a GPU:** 144 fps idle and while orbiting, which is the vsync cap. The WebGL renderer on this laptop is the AMD Radeon 780M integrated GPU.
- **Frame rate in software (SwiftShader, `--disable-gpu`):** 17 to 19 fps, matching the builder's "about 20". Any laptop with hardware acceleration on will be smooth. The only risk is a browser with acceleration off, or a remote-desktop session, where orbiting would feel sluggish but stay usable.
- **First paint:** 192 ms at 1280 and 392 ms at 1440. Data loaded and scene ready in about 1.2 s from file://, including the 280-step layout.
- **Size:** the variant's own files are 59 KB, plus 670 KB for `three.min.js`. The shared data is about 2.8 MB (`bench_results.js` is 2.25 MB). Screenshots are not loaded.

## What I could not check

- A real projector. My judgment on line weight comes from 1280 and 1440 captures at device pixel ratio 1.
- The demo laptop itself, if it is not this machine.
- Hovering a single 3D line with a real mouse. I checked the roster-card hover by script and relied on the builder's `shot_1280_hover_canvas.jpg` for line hover.
- Color-blind simulation. Red against green is separated only by the dash pattern, which is weak at 1 px.
- The visual result of the font fallback offline.
- The `msedge --headless --screenshot` command line. I used Playwright with the msedge channel instead, and request interception instead of a folder copy for the CDN and fonts failure and hang cases.
