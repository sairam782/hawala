# Held-out slices of IBM AMLworld HI-Small for the Rings bench

Cut 2026-10-17 (Money Talks 2 build day). Status: pencil, unstamped (Standing ladder). Evidence: code run on the HI-Small zip; the counts below are read back from the slice files by `analyze.py`, not typed by hand. No git.

Folders (each holds `slice.js` in the window.SLICE shape, `transfers.csv`, `key.json`, and `units.json` + `units.js` from `units.py`): `rings_bench\slices\heldout_a`, `heldout_b`, `heldout_c`. The first slice is `rings_bench\data\slice.js` (cut Oct 15, seed 20261014).

## Read this first

- **heldout_a is R157's cut, not mine.** The engine thread had already converted it into this folder (units made 12:15). I did not check before running my cutter, and for about 20 seconds (12:17:10 to 12:17:29) my own 2,482-row `slice.js`, `transfers.csv` and `key.json` sat in `heldout_a`. I then rebuilt all three from R157's cut (`uses\fresh\heldout\slice\transfers.csv` and `key.json`, through `make_slice_js.py`). Every row in the existing `heldout_a\units.json` (1,563 rows) matches the rebuilt `slice.js` exactly. The `dataset` text line inside `slice.js` is my wording (the original was not recoverable). `units.json`/`units.js` were rewritten once at 12:18 by my later `units.py` run; it is deterministic (seed 20261017) on identical input and the file sizes did not change. If a bench run touched `heldout_a` between 12:17:10 and 12:17:29, re-run it. My discarded version is kept at `C:\Projects\_staging\aml_slices_2026-10-17\mine_overwrote_heldout_a\`.
- **heldout_a is not fully account-disjoint from the first slice.** R157 avoided only the 119 accounts of the first slice's labeled groups, not every account in its rows. 29 accounts appear in both slices (1 of them inside a heldout_a labeled group: `100428930`; the rest are ordinary-row accounts). heldout_b and heldout_c are disjoint from the first slice, from heldout_a and from each other on every account in every row (0 shared, checked by `analyze.py`). I left heldout_a as it was, as asked.
- **Seed of heldout_a.** The folder does not record it. I re-ran R157's group selection (`select_rings.py` with its `old_accounts.json`) over candidate seeds and only 20261017 reproduces its `chosen.json`, so group selection is seed 20261017 as specified. Its ordinary-row draw used R157's `pass2.py` (seed 7) and `build_slice.py` (seed 11), not my cutter.
- **Shape names in slice.js are the bench's** (`mesh` for classify.py's bipartite-or-mesh, `lone` for single), because `bench.py` and the page look for those words and `make_slice_js.py` makes the same swap. `key.json` keeps classify.py's names (`bipartite-or-mesh`, `single`). `ring_meta.n` is the number of labeled rows in the group, as in the first slice.

## Counts per slice

| | first slice | heldout_a | heldout_b | heldout_c |
|---|---:|---:|---:|---:|
| Seed (group selection) | 20261014 | 20261017 | 20261018 | 20261019 |
| Rows | 2,824 | 2,448 | 2,591 | 2,547 |
| Laundering rows | 113 | 109 | 115 | 102 |
| Laundering rate | 4.00% | 4.45% | 4.44% | 4.00% |
| Groups (labeled) | 20 | 20 | 20 | 20 |
| Accounts in all rows | 1,797 | 1,626 | 1,681 | 1,642 |
| Rows after 09/10 23:59 (all) | 55 | 25 | 8 | 10 |
| Labeled rows after 09/10 | 34 | 15 | 5 | 8 |
| Groups with any row after 09/10 | 4 | 3 | 1 | 4 |
| ACH share of ordinary rows | 15.0% (407 of 2,711) | 15.9% (373 of 2,339) | 15.5% (385 of 2,476) | 16.6% (407 of 2,445) |
| ACH share of labeled rows | 100.0% (113 of 113) | 90.8% (99 of 109) | 100.0% (115 of 115) | 100.0% (102 of 102) |
| Time span | 09/01 00:00 to 09/16 05:12 | 09/01 00:00 to 09/14 08:33 | 09/01 00:00 to 09/14 18:32 | 09/01 00:00 to 09/13 05:30 |
| Labeled rows found in IBM pattern file | 104 of 113 | 91 of 109 | 107 of 115 | 94 of 102 |

Every slice: 2 cycle, 2 fan-out, 2 fan-in, 2 scatter-gather, 1 mesh (bipartite-or-mesh), 2 chain, 1 other, 8 lone (single) = 20 groups. Each gives 60 units from `units.py` (20 ring, 40 ordinary; 38 to 39 of the ordinary units have 10 or more rows).

Account overlap (accounts appearing in rows of both): first and heldout_a 29; every other pair 0.

Reading the table. The tail after 09/10 is 59 percent labeled in the whole file (R155), so a late timestamp is a tell there; the held-out slices keep that tell small (5 to 15 labeled rows in the tail, against 34 in the first slice). Groups that run past 09/10 (ring number and our shape): heldout_a: ring 3 scatter-gather, ring 16 cycle, ring 18 fan-out; heldout_b: ring 8 mesh; heldout_c: ring 8 mesh, ring 5 fan-in, ring 4 fan-in, ring 7 scatter-gather. The rare shapes force this: after the account-level exclusion, heldout_b and heldout_c had no early mesh group left, heldout_c had no early fan-in left (both of its fan-ins are tail groups), and its second scatter-gather is a tail group. ACH is 100 percent of labeled rows in the first slice, heldout_b and heldout_c, and 90.8 percent in heldout_a (10 non-ACH rows, see the notes). The 15 to 17 percent ACH share of ordinary rows comes from the recipe (ordinary rows are drawn around ring accounts, which are ACH), not from the file, where ACH is 12 percent of all rows (R155).

## Groups, with IBM pattern names where the rows join

Join: a labeled row matches a row in `C:\Users\alexa\Downloads\HI-Small_Patterns.txt` (370 BEGIN/END blocks, 3,209 distinct rows) on minute, from account, to account, amount paid and format. "unmatched" rows are labeled but not listed in any block; lone transfers mostly are not in the file (only the ones joined to BIPARTITE are). Our shape is our reading of the labeled edges; the IBM name is IBM's, and they often differ (our chain is a piece of an IBM STACK, our mesh is IBM GATHER-SCATTER, our "other" is part STACK or CYCLE).

### heldout_a (seed 20261017)

| ring | our shape | labeled rows | IBM block(s) joined | unmatched | last row |
|---:|---|---:|---|---:|---|
| 0 | fan-out | 9 | none | 9 | 09/07 03:02 |
| 1 | fan-in | 6 | FAN-IN: Max 5-degree Fan-In (5) | 1 | 09/07 06:05 |
| 2 | lone | 1 | none | 1 | 09/02 18:36 |
| 3 | scatter-gather | 13 | CYCLE: Max 4 hops (4); GATHER-SCATTER: Max 7-degree Fan-In (9) | 0 | 09/14 08:33 |
| 4 | lone | 1 | none | 1 | 09/02 19:53 |
| 5 | mesh | 13 | GATHER-SCATTER: Max 10-degree Fan-In (13) | 0 | 09/08 19:07 |
| 6 | chain | 2 | STACK (2) | 0 | 09/05 09:57 |
| 7 | lone | 1 | none | 1 | 09/04 12:31 |
| 8 | other | 5 | CYCLE: Max 4 hops (4) | 1 | 09/08 19:18 |
| 9 | lone | 1 | none | 1 | 09/05 22:44 |
| 10 | fan-in | 11 | FAN-IN: Max 11-degree Fan-In (11) | 0 | 09/10 07:47 |
| 11 | scatter-gather | 16 | SCATTER-GATHER (16) | 0 | 09/10 15:43 |
| 12 | chain | 2 | STACK (2) | 0 | 09/08 10:00 |
| 13 | cycle | 5 | CYCLE: Max 5 hops (5) | 0 | 09/08 19:19 |
| 14 | lone | 1 | BIPARTITE (1) | 0 | 09/07 21:03 |
| 15 | lone | 1 | none | 1 | 09/07 22:36 |
| 16 | cycle | 8 | CYCLE: Max 8 hops (8) | 0 | 09/12 07:14 |
| 17 | lone | 1 | none | 1 | 09/09 02:44 |
| 18 | fan-out | 11 | FAN-OUT: Max 11-degree Fan-Out (11) | 0 | 09/12 18:14 |
| 19 | lone | 1 | none | 1 | 09/10 10:42 |

### heldout_b (seed 20261018)

| ring | our shape | labeled rows | IBM block(s) joined | unmatched | last row |
|---:|---|---:|---|---:|---|
| 0 | cycle | 7 | CYCLE: Max 7 hops (7) | 0 | 09/07 14:34 |
| 1 | cycle | 6 | CYCLE: Max 6 hops (6) | 0 | 09/05 09:21 |
| 2 | fan-out | 9 | FAN-OUT: Max 9-degree Fan-Out (9) | 0 | 09/05 14:32 |
| 3 | fan-out | 10 | FAN-OUT: Max 9-degree Fan-Out (9) | 1 | 09/06 13:00 |
| 4 | fan-in | 10 | FAN-IN: Max 10-degree Fan-In (10) | 0 | 09/07 16:03 |
| 5 | fan-in | 10 | FAN-IN: Max 10-degree Fan-In (10) | 0 | 09/08 15:02 |
| 6 | scatter-gather | 18 | SCATTER-GATHER (18) | 0 | 09/06 20:21 |
| 7 | scatter-gather | 14 | SCATTER-GATHER (14) | 0 | 09/08 12:07 |
| 8 | mesh | 12 | GATHER-SCATTER: Max 6-degree Fan-In (12) | 0 | 09/14 18:32 |
| 9 | chain | 2 | STACK (2) | 0 | 09/08 18:47 |
| 10 | chain | 2 | STACK (2) | 0 | 09/06 17:56 |
| 11 | other | 7 | STACK (2); CYCLE: Max 5 hops (5) | 0 | 09/10 01:24 |
| 12 | lone | 1 | BIPARTITE (1) | 0 | 09/09 01:54 |
| 13 | lone | 1 | none | 1 | 09/08 04:03 |
| 14 | lone | 1 | none | 1 | 09/04 02:13 |
| 15 | lone | 1 | none | 1 | 09/06 10:13 |
| 16 | lone | 1 | none | 1 | 09/10 22:17 |
| 17 | lone | 1 | none | 1 | 09/01 13:37 |
| 18 | lone | 1 | none | 1 | 09/06 22:00 |
| 19 | lone | 1 | none | 1 | 09/02 02:40 |

### heldout_c (seed 20261019)

| ring | our shape | labeled rows | IBM block(s) joined | unmatched | last row |
|---:|---|---:|---|---:|---|
| 0 | cycle | 5 | CYCLE: Max 5 hops (5) | 0 | 09/06 12:09 |
| 1 | cycle | 7 | CYCLE: Max 7 hops (7) | 0 | 09/08 21:03 |
| 2 | fan-out | 7 | FAN-OUT: Max 7-degree Fan-Out (7) | 0 | 09/06 17:51 |
| 3 | fan-out | 12 | FAN-OUT: Max 11-degree Fan-Out (11) | 1 | 09/08 17:21 |
| 4 | fan-in | 8 | FAN-IN: Max 8-degree Fan-In (8) | 0 | 09/11 17:24 |
| 5 | fan-in | 8 | FAN-IN: Max 8-degree Fan-In (8) | 0 | 09/11 12:32 |
| 6 | scatter-gather | 14 | SCATTER-GATHER (14) | 0 | 09/06 11:45 |
| 7 | scatter-gather | 12 | SCATTER-GATHER (12) | 0 | 09/11 21:11 |
| 8 | mesh | 14 | GATHER-SCATTER: Max 10-degree Fan-In (14) | 0 | 09/13 05:30 |
| 9 | chain | 2 | STACK (2) | 0 | 09/06 13:43 |
| 10 | chain | 2 | STACK (2) | 0 | 09/10 12:46 |
| 11 | other | 3 | STACK (2) | 1 | 09/08 15:43 |
| 12 | lone | 1 | BIPARTITE (1) | 0 | 09/10 11:31 |
| 13 | lone | 1 | none | 1 | 09/04 13:26 |
| 14 | lone | 1 | none | 1 | 09/02 00:59 |
| 15 | lone | 1 | none | 1 | 09/09 15:55 |
| 16 | lone | 1 | none | 1 | 09/02 14:59 |
| 17 | lone | 1 | none | 1 | 09/08 06:36 |
| 18 | lone | 1 | none | 1 | 09/06 17:45 |
| 19 | lone | 1 | BIPARTITE (1) | 0 | 09/01 07:57 |

Notes on specific groups:
- heldout_a ring 0 (fan-out, 9 rows): all 9 are Cash, Credit Card or Cheque from `100428930` at bank 070, one of the bank-070 hub family R155 describes (the two giant hubs are `100428660` and `1004286A8`). None of its rows is in the IBM pattern file. It supplies 9 of heldout_a's 10 non-ACH labeled rows (the 10th is a lone Cheque transfer, ring 19). The first slice has a neighbor of that family (`100428978`) as an ordinary account.
- For scale, the same join on the first slice finds 104 of 113 labeled rows; lone transfers are most of the misses. A miss does not mean the row is not laundering.

## Method (what the cutter does)

`cut_slices.py` is the Oct 15 lineage folded into one file (pass1, classify.py verbatim, select_rings.py, pass2.py, build_slice.py) with these changes: (1) a labeled group is dropped if any of its accounts appears in any row of an earlier slice, and any ordinary row touching an earlier slice's account is excluded from every pool, so the whole account sets are disjoint; (2) groups that finish on or before 2022/09/10 23:59 are drawn before tail groups; (3) one seed drives every random draw (group choice, the 18-per-ring-account cap, the 3-per-counterparty draw, 450 random rows from a 900-row reservoir), where the lineage used seeds 20261014, 7 and 11; (4) rows are sorted by timestamp text with ties broken by original file row number, then numbered T0001...; (5) the per-counterparty draw is a streaming reservoir instead of keep-all-then-sample, which changes which rows get drawn but not the recipe. The 18, 3 and 450 are the lineage values. Row counts (2,591 and 2,547) landed inside the 2,400 to 3,000 target without tuning; heldout_a is 2,448.

Order of cutting: heldout_a (existing, R157), then heldout_b avoiding the first slice and heldout_a, then heldout_c avoiding all three.

## Commands run

Work folder `C:\Projects\_staging\aml_slices_2026-10-17\` holds the cutter, logs (`cut_heldout_*.log`), `analysis.json` and `analysis.txt`. The zip is read by streaming; nothing was extracted.

```
B=C:/Projects/Verticals/Hackathons/events/2026-10-17_money-talks/rings_bench
cd C:/Projects/_staging/aml_slices_2026-10-17
python -I cut_slices.py --name heldout_b --seed 20261018 --prior $B/data/slice.js $B/slices/heldout_a/slice.js
python -I cut_slices.py --name heldout_c --seed 20261019 --prior $B/data/slice.js $B/slices/heldout_a/slice.js $B/slices/heldout_b/slice.js
python -I $B/units.py --dir $B/slices/heldout_a   # and heldout_b, heldout_c; each prints: units 60: 20 ring, 40 ordinary
python -I analyze.py > analysis.txt   # counts, overlaps, pattern join
python -I make_readme.py              # writes this file
```

The first command I actually ran was `cut_slices.py --name heldout_a --seed 20261017 --prior $B/data/slice.js`, which overwrote the engine thread's heldout_a (see the top). The cutter now refuses to write into a folder that already has a `slice.js`.

`units.py` needed no change and `slice.js` needed no fix; it ran clean on all three.

## random_clean (control: ordinary traffic only)

Cut 2026-10-17, seed 20261020, by `cut_random_clean.py` (graph work on R155's compact copy `size\arrays.npz`; each pulled row is checked against it and the zip). 1,971 rows, 0 labeled, 463 accounts, last row 09/10 23:56. ACH is 15.9 percent of rows (314); the rest is Cheque 763, Credit Card 555, Cash 196, Wire 72, Bitcoin 71.

Rule: a seed account is eligible when it and every counterparty are "clean": in no labeled row, no row touching it labeled or after 09/10 23:59, and no row touching it with an endpoint in a labeled row (6,357 accounts are in labeled rows; 451,013 accounts are clean; 172,190 of those have 4 to 60 non-self transfers). 40 seeds drawn at random from those; each neighborhood keeps every row touching the seed plus a random sample of the rows touching its counterparties, up to 60. Self-transfers are left out. No account is shared with any other slice or between neighborhoods. `seeds.json` lists the 40 seeds. Transfers touching each seed: 4 (six seeds), 6, 6, 7, 8, 10, 10, 10, 14, 16 (four), 17, 18, 19, 21, 22 (four), 23, 24, 32 (three), 33, 34 (three), 44, 46, 51, 56, 58.

`units.py --dir` ran fine on zero rings: 40 units, 0 ring, 40 ordinary, rows per unit 8 to 60 (median 36), 39 with 10 or more rows. It chooses its own seed accounts from everything in the slice (counterparties included), so only 5 of its 40 seeds are the 40 in `seeds.json`; all 40 neighborhoods are still clean, but they are not the same 40. If you want units built from `seeds.json` exactly, that needs a small separate unit builder (not done).

```
python -I cut_random_clean.py
python -I $B/units.py --dir $B/slices/random_clean
```
