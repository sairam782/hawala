# Rings bench, the clearing

Open `index.html` with a double-click. It reads `../../../data/*.js` and the baked `layout.js`; with the data missing it shows a labeled SAMPLE.

## The argument, in three sentences

The whole ten-day slice starts lit: 2,824 transfers among 1,797 accounts, the real graph, nothing pre-sorted. As the model reads the 60 neighborhoods one by one, everything it rules ordinary fades, so the screen clears as it works. What is left at the end is what is worth a look: the rings it caught (green, in place in the graph), the alarms it raised (red dashed) and the rings it missed (amber dotted, shown last).

## The sequence (one clock; Play, the scrub and `?t=` all read the same frame)

| Step | Duration | What it carries |
|---|---|---|
| Opening hold | 700 ms | The whole slice, lit and uniform. The key is already on screen. |
| Outside steps back | 400 ms | 1,626 transfers sit in none of the 60 neighborhoods, so no model read them; they fade first, and a header badge says so. |
| Each neighborhood read | 60 ms each, plus 150 ms dwell on a catch | Ruled ordinary: its accounts and transfers fade to about 8 percent over 400 ms. Called a ring on an ordinary neighborhood: it stays at full strength, outlined red dashed, its flagged transfers red dashed (fades in over 200 ms). |
| Catch | 450 ms, overlapping the pass | In place, inside the graph: the ring's flagged laundering transfers trace in green from payer to payee and its outline closes, settling to a width set by how many model families called it a ring. A text card drops into the Caught roster (200 ms). |
| Gap | 250 ms | The pass is over; the field is mostly dark. |
| Reveal | 600 ms | Missed rings and every laundering transfer the model did not flag appear in amber dotted. |

Claude Sonnet 5.5 v4 runs about 7.4 s in total. A model with more catches runs a little longer (150 ms per catch).

Green appears only where the chosen model caught the ring (its own `ring_found`, never recounted). Outline width carries the panel's family count; color does not. Headline: "<Model> caught k of IBM's 20 laundering rings and traced m of 113 laundering transfers; it raised f alarms on ordinary neighborhoods, g of them on accounts that sit inside a ring." Then one limit line, then the stronger of "rings caught" and "ordinary neighborhoods cleared".

Controls: Play the pass (Pause, Play again), the scrub, Show everything again (undims everything and shows every mark at once), the model and version picker (every model and version with runs; default Claude Sonnet 5.5 v4), hover cards on any neighborhood (IBM's shape name in sentence case, how many families agreed, the model's one-line reason with em dashes printed as commas, IBM's and the flagged transfer ids). Hovering a roster card outlines its ring in the graph. With prefers-reduced-motion the page opens on the end state and Play jumps to it.

URL switches for demos and screenshots: `?t=0..1` (position on the clock), `?model=moonshot/kimi-k3|v1`, `?play=1`, `?all=1`, `?hover=u06`.

## Layout

`layout.js` is baked once by `node build_layout.mjs` from `layout_core.js` (seeded force layout), so nothing moves between loads and nothing lays out at page load (no jitter, no blocking compute). The page recomputes only if the bake is missing or stale. The main mass sits in the middle with a wider spread; the 13 small islands (3 to 36 accounts) sit on an orbit around it; the 350 lone pairs and the 60 accounts that only pay themselves are scattered as faint dust in an elliptical ring outside, not a grid.

Correction to the brief: the eight single labeled transfers ("lone" rings) are not among the 350 disconnected pairs. They sit in small islands of 9 to 24 accounts (and one in the main mass), so they light where they are, and their neighborhoods carry the hover cards.

## Left out, and why

- The shape thumbnails on roster cards: Alex asked (13:41) to see the real graph, not drawings of the shapes, so the roster is text only and every ring stays in the graph.
- The original's gather-and-spread catch motion: it moves accounts away from their real places. The catch now happens in place.
- The ten-day time scrub and the families-must-agree dial of the ops wall: this page has one clock, the model's pass.
- Particles, glow, pulses, camera moves: none, per the brief.

## Known limits

- The panel (family agreement) exists only for v1 and v2. For v2x, v3, v4 and v5 the hover card and outline width use the v2 panel and say so.
- 1,626 of 2,824 transfers lie outside all 60 neighborhoods; they fade at the start because no model read them, not because a model cleared them. The badge and the status line say this.
- A neighborhood that shares accounts with another stays lit until every neighborhood holding it has been ruled ordinary.
- Inside a caught ring's neighborhood, the unlabeled traffic fades after the catch, including any unlabeled transfers the model also flagged there; the hover card lists them.
- Fonts come from Google Fonts, loaded without blocking; offline it falls back to Georgia, Segoe UI and Consolas.

## Files

`index.html`, `clearing.css`, `clearing.js`, `layout_core.js`, `layout.js` (baked), `build_layout.mjs`, `shots/` (1280 by 900: `open_1280.png`, `mid_1280.png`, `end_1280.png`; plus `end_1440.png`). The screenshots came from headless Edge over the DevTools protocol. Live Play was checked there too: after 9 s the roster read 9 of 20 and the counter 38 of 40. No console errors at 1280 or 1440 by 900. `original/` is the ops-wall code this started from.
