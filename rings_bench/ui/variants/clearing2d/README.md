# Rings bench, the clearing

To open it, double-click `index.html`. It reads `../../../data/` (slice, units, panel, bench_results, investigate), the baked `layout.js` and, if present, `zoom.css` and `zoom.js`. Those two files belong to the separate cluster-zoom overlay, written by another builder. If the data files are missing, a labeled SAMPLE network stands in. The page makes no network calls apart from loading Google Fonts.

## The argument, in three sentences

The whole slice starts lit, the real graph, and the first pass reads the 60 neighborhoods one by one: each one it rules ordinary fades, and each ring it catches traces green in place. The neighborhoods it could not settle stay lit and drop into a "Needs a look" tray, and a stronger model looks closer at them one card at a time, so each one either fades as cleared or closes green as a ring. What remains is what is worth a look: the rings caught, the two alarms, and, on request, the rings both passes missed in amber dotted.

## Four stages (a strip at the top of the graph; the button always names the next stage)

| Stage | Button that starts it | What it shows | Timing |
|---|---|---|---|
| 1 Search | Start the search | Opening hold 700 ms, then a 400 ms fade of the 1,626 transfers outside every neighborhood. Then 60 ms per neighborhood (plus 150 ms on each catch). The neighborhood being read gets a bright outline for 120 ms. Ruled ordinary, it fades to 8 percent over 400 ms. A catch traces green in place and its outline closes (450 ms). A false alarm turns red dashed (200 ms). A tray neighborhood gets an amber-grey outline, and a copy of its sub-graph flies to its tray card (560 ms). Status: read N of 60. | About 6.4 s for Claude Sonnet 5.5 v4 |
| 2 Ambiguous | Reached automatically when the search ends | Everything ruled ordinary is faded, caught rings are green, and the 30 unsettled neighborhoods pulse slowly in amber. Status: "30 neighborhoods the first pass could not settle". | Pulse period about 3.3 s |
| 3 Look closer | Look closer at all 30 (one click), or click any one card | A soft lens (translucent circle, thin ring) glides to each tray neighborhood in turn (220 ms ease-in-out), holds on it (180 ms) while its card sweeps "Investigating with Claude Opus 5.5", then the verdict lands on graph and card at the same instant. Cleared: the outline shrinks inward and the neighborhood fades (300 ms) and the card dims to "Cleared". Ring: the laundering transfers trace green and the outline snaps closed with a brief bright flash (350 ms), and the card turns green: "Ring: <IBM shape>". Status: investigated N of 30. | 400 ms per card plus a 200 ms gap: about 18 s for 30. A single card click takes 1.2 s, without the lens. With reduced motion, the stage jumps to its end. |
| 4 Settled | Reached when the tray is done | Only the green rings and the two red alarms stay lit. Show what was missed then brings in the missed rings and transfers in amber dotted. Each missed tray card gets a "missed" tag. Status and tray line give the closing numbers. | Missed reveal 600 ms |

Each stage label is a button that jumps to the end of that stage, and `?stage=1..4` opens the page there (for screenshots). Other switches: `?model=moonshot/kimi-k3|v1`, `?dial=6`, `?all=1`, `?hover=u06`, `?play=1`. With prefers-reduced-motion, every stage lands at once, with no pulse and no flight.

Closing numbers (computed from the files): the first pass (Claude Sonnet 5.5 v4) caught 9 of 20 rings, traced 100 of 113 laundering transfers and raised 2 alarms. The investigator (Claude Opus 5.5, v5 framing) looked at 30, cleared all 23 ordinary ones, found 2 rings (u19 and u28, lone transfers) and raised 0 false alarms. It ruled the other 5 tray rings ordinary, and they show as missed.

Before and after: when the investigation finishes, a Before / After toggle appears above the tray (After selected). Before shows the Ambiguous state (30 pulsing, the tray as it was); After shows Settled. Flipping it crossfades the graph (250 ms). The tally line comes from the data: "Before: 9 rings caught, 30 neighborhoods unsettled. After: 11 rings caught, 23 cleared, 0 false alarms from the investigator, 9 rings still missed (5 of them in the tray)." `?stage=4&missed=0` opens on After before the misses are shown, and `&view=before` opens on Before.

The families dial ("Families that must agree", 1 to 9) reads the v2 vote table in panel.js. While it is in use, the headline gives the panel's numbers at that dial, and neighborhoods with fewer votes lose their outline. The tray does not change. Picking a model hands the headline back to that model.

Green appears only where the model caught the ring (its own `ring_found`, never recounted). Outline thickness carries the family count.

## Layout

`layout.js` is baked once by `node build_layout.mjs` from `layout_core.js` (a seeded force layout): frozen, with no layout work at load. The main mass sits in the middle. The 13 small islands orbit it, and the 350 lone pairs and the 60 accounts that only pay themselves are faint dust in an elliptical ring around it. The eight single labeled transfers are not among the pairs: seven sit in islands of 9 to 24 accounts and one sits in the main mass.

## Left out, and why

- The caught-rings roster: Alex moved the tray to the uncertain neighborhoods (13:49). Caught rings stay green in the graph.
- Shape thumbnails that move rings out of the graph: the rings are always shown in place. Tray cards carry a small copy of the neighborhood's sub-graph.
- Particles, glow and camera moves. The Ambiguous pulse is there because Alex asked for it.

## Known limits

- The tray and the investigation are recorded for the Claude Sonnet 5.5 v4 first pass only. With any other model there is no tray, and a note says so.
- `uncertain_tray.json`'s "first pass called it a ring at low confidence" reasons (u03, u13, u19, u41) do not match Sonnet v4's own verdicts, which are ordinary on those four. They probably come from another version; the cards print the reasons as the file gives them.
- The 1,626 transfers outside every neighborhood fade at the start because no model read them, not because one cleared them.
- The panel (family agreement) exists only for v1 and v2; v2x to v5 use the v2 panel and say so.
- `window.__clearing` is a read-only debug hook used by the screenshot checks.

## Screenshots (headless Edge over the DevTools protocol, JPG at quality 80)

`shots/open_1280.jpg` (stage 0, before the search), `shots/mid_1280.jpg` (mid-search), `shots/ambiguous_1280.jpg` (stage 2), `shots/after_1280.jpg` (stage 4, After, before the misses are shown), `shots/end_1280.jpg` and `shots/end_1440.jpg` (stage 4, misses shown). No console errors at 1280 or 1440 by 900. Live flow checked: the search reached Ambiguous, Look closer ran the cards, and the tray line read "Investigator: 30 looked at, 23 cleared, 2 rings found, 0 false alarms".
