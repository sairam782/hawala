# Jev on the Rings bench: what it is good for here, measured

Pencil, Claude's build on Alex's word (2026-10-17 12:38: "see what we can do with jev and crafting prompts and
context for it"). Unruled. Written 2026-10-17 12:49 (hook-verified time), about 50 minutes into the 60-minute box. Evidence: 726 live calls to
`jev-1.13.0` (every one logged in `out\calls_*.jsonl`), scored against IBM's labels by the code beside this file.
Nothing in the bench was edited; nothing was sent to Nicrron or PRISM.

## The answer in plain words

**Jev cannot be the detector here, but it is a useful second opinion on structure.** Asked "is there a laundering
scheme?", Jev first said ring for three of every four ordinary neighborhoods (30 of 60 verdicts right), because the
code facts list "money arrives at an account and leaves within two days" for 28 of the 40 ordinary neighborhoods and
Jev read that as the chain it had been told to look for. One round of rulings written into the option descriptions
("a pass-through pair on its own is ordinary; what counts is a loop, a burst to or from three or more accounts within an
hour, or matching-amount pass-throughs linking three accounts") lifted that to 44 of 60 on the main slice and 46 of 60
on a slice no Jev question had ever seen (heldout_b, sentence-form state). That is one sentence per side, 4 seconds and
a cent per slice to re-run.

**Its confidence number is not calibrated on this data the way it is on real text.** With the first question set,
neighborhoods Jev was most sure about (confidence 0.8 to 1.0) were right only 49 to 70 percent of the time, no better
than its unsure ones. With the rulings in place the facts-only state became usable: the 0.8 to 1.0 bin was right
88, 81 and 92 percent of the time on main, heldout_a and heldout_b, and p(ring) of 0.9 or more picked real rings 8 of
9, 9 of 11 and 8 of 8 times. Claude Sonnet's three-word self-report is still the better calibrated signal on its own
verdicts (ring calls marked low: 25 to 40 percent right; marked medium: 73 to 89 percent).

**The one signal that carried across slices is Jev's structural-evidence Score on the sentence-form state.** It
separates ring from ordinary neighborhoods with an area under the curve of 0.76 to 0.87 depending on slice and question
set (0.5 is coin-flip, 1.0 is perfect). Used as a gate on Sonnet's ring calls, with the threshold chosen on the main slice
and applied unchanged, it halved the false rings on both held-out slices while keeping the rings found. Stacked with
Sonnet's own low-confidence drop, heldout_b went from 17 false rings to 2 at 12 of 20 rings found, precision 0.29 to 0.62.
The two signals are different kinds of evidence (Sonnet's is about its own reading; Jev's is a literal match of the
code facts against described structures), which is why stacking them helps.

**What this is not.** Jev reads only what the code facts say. Eight of the 20 rings are a single labeled transfer
with no structure to describe; Jev calls those ring only when the neighborhood happens to hold a burst. A code-only rule
(loop, or a burst to or from three or more distinct accounts) already finds 8 to 10 rings per slice with 0 to 2 false
rings; Jev with rulings finds 11 to 15 at 7 to 14 false. Jev adds recall over the rule at the price of false alarms, and
the gate is where that trade pays. Nobody should say on stage that Jev detects laundering.

## The numbers

### Verdict and separation, question set 1 (no rulings), three state variants

| slice | state variant | verdicts right of 60 | ring units called ring of 20 | ordinary called ring of 40 | pattern named right of 20 | AUC of p(ring) | AUC of evidence Score |
|---|---|---|---|---|---|---|---|
| main | rows + facts | 30 | 18 | 28 | 6 | 0.59 | 0.62 |
| main | facts only | 29 | 18 | 29 | 4 | 0.61 | 0.62 |
| main | sentences | 31 | 19 | 28 | 3 | 0.65 | 0.83 |
| heldout_a | rows + facts | 28 | 18 | 30 | 4 | 0.77 | 0.77 |
| heldout_a | facts only | 28 | 18 | 30 | 3 | 0.75 | 0.74 |
| heldout_a | sentences | 29 | 18 | 29 | 5 | 0.72 | 0.87 |

The raw rows added nothing over the facts alone (the style guide predicted this: irrelevant content shifts borderline
answers, lines 295 to 301) and cost twice the tokens. The sentence-form state, where code has already done every
comparison, is the only one whose Score separates well.

### Verdict and separation, question set 2 (rulings in the descriptions)

| slice | state variant | verdicts right of 60 | ring units called ring of 20 | ordinary called ring of 40 | AUC of p(ring) | AUC of evidence Score |
|---|---|---|---|---|---|---|
| main (rulings written from its errors) | facts only | 44 | 12 | 8 | 0.77 | 0.74 |
| main | sentences | 40 | 14 | 14 | 0.80 | 0.76 |
| heldout_a (seen once with set 1) | facts only | 42 | 13 | 11 | 0.75 | 0.74 |
| heldout_a | sentences | 42 | 15 | 13 | 0.78 | 0.80 |
| heldout_b (never seen) | facts only | 39 | 11 | 12 | 0.74 | 0.70 |
| heldout_b | sentences | 46 | 13 | 7 | 0.76 | 0.85 |

Code-only rule for scale (ring if a loop, or a burst to or from 3+ distinct accounts within an hour): main 9 of 20 at
0 false; heldout_a 10 of 20 at 2 false; heldout_b 8 of 20 at 0 false.

Pattern naming stays poor in every set (3 to 6 of 20): Jev calls most structured units "chain" because pass-through
pairs appear in nearly every unit's facts, and the bench's shapes (our structural reading of IBM's groups) are often not
what the facts show at the neighborhood level (a two-transfer chain reads as one pass-through pair).

### Calibration: Jev's confidence number, binned, against being right

Question set 1, facts-only state, main slice (the same shape on every variant and slice; full tables in `out\scores.md`):

| confidence bin | units | verdict right | right rate |
|---|---|---|---|
| 0.0 to 0.2 | 3 | 1 | 0.33 |
| 0.2 to 0.4 | 1 | 0 | 0.00 |
| 0.4 to 0.6 | 3 | 2 | 0.67 |
| 0.6 to 0.8 | 6 | 3 | 0.50 |
| 0.8 to 1.0 | 47 | 23 | 0.49 |

Question set 2, facts-only state:

| slice | confidence bin | units | verdict right | right rate |
|---|---|---|---|---|
| main | 0.0 to 0.4 | 13 | 6 | 0.46 |
| main | 0.4 to 0.8 | 22 | 16 | 0.73 |
| main | 0.8 to 1.0 | 25 | 22 | 0.88 |
| heldout_a | 0.0 to 0.4 | 12 | 7 | 0.58 |
| heldout_a | 0.4 to 0.8 | 22 | 14 | 0.64 |
| heldout_a | 0.8 to 1.0 | 26 | 21 | 0.81 |
| heldout_b | 0.0 to 0.4 | 15 | 6 | 0.40 |
| heldout_b | 0.4 to 0.8 | 21 | 11 | 0.52 |
| heldout_b | 0.8 to 1.0 | 24 | 22 | 0.92 |

p(ring) as a probability, set 2, facts-only: units with p(ring) 0.9 or more were real rings 8 of 9 (main), 9 of 11
(heldout_a), 8 of 8 (heldout_b); units below 0.5 were rings 21, 19 and 25 percent of the time (the base rate is 33).
So after the rulings, a high p(ring) on the facts-only state can be trusted; a low one means "no structure described",
which is also true of the lone rings.

Claude Sonnet, self-reported confidence on its own verdicts (from `data\bench_results.json`), for comparison:

| slice, version | ring calls marked low: right | ring calls marked medium or high: right | ordinary calls marked low: right | ordinary marked medium: right |
|---|---|---|---|---|
| main, v3 | 1 of 4 | 12 of 14 | 12 of 16 | 23 of 26 |
| main, v2 | 2 of 5 | 11 of 15 | 19 of 24 | 14 of 16 |
| heldout_a, v2 | 4 of 14 | 8 of 9 | 19 of 24 | 10 of 13 |

### Jev as a gate on Sonnet's ring calls

Rule: keep a Sonnet ring call only when Jev's signal for that neighborhood is at or above the threshold; a dropped call
becomes ordinary with nothing flagged. Threshold chosen on the main slice against Sonnet v3 (best F1 of the gated
result), applied unchanged to the held-out slices. Sonnet v3 was never run on the held-out slices (only v1, v2 and, on
heldout_b, v4 exist there), so the held-out rows gate Sonnet v2; main's v2 row is the like-for-like read. Scoring per
the bench README: precision and recall over transfers; rings found = ring verdict and at least half the labeled ids
flagged; false ring = ordinary unit called ring.

Set 1, evidence Score on the sentence state, threshold 70.5 of 100:

| slice, Sonnet version | precision | recall | rings found of 20 | false rings of 40 |
|---|---|---|---|---|
| main v3, before | 0.58 | 0.89 | 13 | 5 |
| main v3, gated | 0.74 | 0.89 | 13 | 0 |
| main v2, before | 0.46 | 0.89 | 12 | 7 |
| main v2, gated | 0.75 | 0.89 | 12 | 0 |
| heldout_a v2, before | 0.30 | 0.66 | 10 | 11 |
| heldout_a v2, gated | 0.50 | 0.55 | 8 | 2 |
| random clean v3, before (40 ordinary units, zero rings) | n/a | n/a | n/a | 12 |
| random clean v3, gated | n/a | n/a | n/a | 6 |
| random clean v3, Sonnet low-drop alone | n/a | n/a | n/a | 8 |
| random clean v3, low-drop and gate together | n/a | n/a | n/a | 5 |

Set 2, evidence Score on the sentence state, threshold 30.2 of 100 (a lower bar, since the rulings pulled every
ordinary neighborhood's score down):

| slice, Sonnet version | precision | recall | rings found of 20 | false rings of 40 |
|---|---|---|---|---|
| main v3, before | 0.58 | 0.89 | 13 | 5 |
| main v3, gated | 0.62 | 0.89 | 13 | 3 |
| heldout_a v2, before | 0.30 | 0.66 | 10 | 11 |
| heldout_a v2, gated | 0.40 | 0.66 | 10 | 6 |
| heldout_b v2, before | 0.29 | 0.82 | 13 | 17 |
| heldout_b v2, gated | 0.46 | 0.81 | 12 | 8 |

Gating by p(ring) instead of the Score did not help at any threshold on main with set 2 (the sweep is in
`out\scores_q2.md`); with set 1 it traded rings for false rings. The Score is the gate signal.

Stacked with Sonnet's own low-confidence drop (the 12:40 finding):

| slice, Sonnet version | gate | precision | recall | rings found | false rings |
|---|---|---|---|---|---|
| main v3 | none | 0.58 | 0.89 | 13 | 5 |
| main v3 | drop Sonnet low | 0.63 | 0.89 | 12 | 2 |
| main v3 | drop low, and Jev set 2 Score below 30.2 | 0.66 | 0.89 | 12 | 1 |
| main v3 | drop low, and Jev set 1 Score below 70.5 | 0.75 | 0.89 | 12 | 0 |
| heldout_a v2 | none | 0.30 | 0.66 | 10 | 11 |
| heldout_a v2 | drop Sonnet low | 0.60 | 0.57 | 8 | 1 |
| heldout_a v2 | drop low, and Jev set 2 Score below 30.2 | 0.60 | 0.57 | 8 | 1 |
| heldout_b v2 | none | 0.29 | 0.82 | 13 | 17 |
| heldout_b v2 | drop Sonnet low | 0.47 | 0.81 | 12 | 5 |
| heldout_b v2 | drop low, and Jev set 2 Score below 30.2 | 0.62 | 0.81 | 12 | 2 |

Reading: on heldout_a Sonnet's own self-report already removes nearly every false ring and Jev adds nothing; on
heldout_b Sonnet's self-report leaves 5 false rings and Jev's Score removes 3 more at no cost in rings found. Two
held-out slices of 60 are too few to say which case is typical (each count carries about plus or minus 4).

### Jev as a pre-filter: the LLM only sees neighborhoods above a Jev threshold

Alex, 12:40: "only using the llms on ones that reach a certain threshold on jev." Jev runs first on all 60 (about 4
seconds and half a cent per slice); only neighborhoods at or above the threshold go to Sonnet; the rest are closed as
ordinary with no LLM call. On the verdict numbers this is the same arithmetic as the gate above (a closed neighborhood
and a dropped ring call both end as "ordinary, nothing flagged"); what changes is the LLM calls, cost and time saved.
Threshold 0 is Sonnet on all 60. Thresholds chosen on main against Sonnet v3, applied unchanged to heldout_a (Sonnet
v2 there). Sonnet on all 60 costs about $0.90 and 7 to 8 minutes of model time per slice (per-run cost and latency from
`bench_results.json`); Jev's own cost and time are already subtracted from the savings. Full sweep for three signals:
`out\prefilter.md`, produced by `prefilter.py`.

Set 1 evidence Score on the sentence state (the cleanest curve):

| slice, Sonnet version | Jev threshold | sent to the LLM of 60 | rings found of 20 | false rings of 40 | rings the LLM never saw | LLM cost saved | LLM time saved |
|---|---|---|---|---|---|---|---|
| main v3 | 0 (all) | 60 | 13 | 5 | 0 | 0 | 0 |
| main v3 | 60 | 39 | 13 | 3 | 2 | 28% | 121 s (28%) |
| main v3 | 70 | 27 | 13 | 1 | 5 | 47% | 204 s (48%) |
| main v3 | 75 | 20 | 11 | 0 | 7 | 60% | 260 s (62%) |
| heldout_a v2 | 0 (all) | 60 | 10 | 11 | 0 | 0 | 0 |
| heldout_a v2 | 60 | 40 | 10 | 8 | 2 | 26% | 129 s (27%) |
| heldout_a v2 | 70 | 22 | 8 | 3 | 4 | 56% | 273 s (58%) |
| heldout_a v2 | 75 | 18 | 8 | 2 | 6 | 62% | 300 s (64%) |
| random clean v3 (40 ordinary, zero rings) | all | 40 | 0 | 12 | 0 | 0 |
| random clean v3 | 70 | 13 | 0 | 6 | 0 | 65% |

Set 2 p(ring) on the facts-only state (sharper savings, more rings closed unseen):

| slice, Sonnet version | Jev threshold | sent to the LLM of 60 | rings found of 20 | false rings of 40 | rings the LLM never saw | LLM cost saved | LLM time saved |
|---|---|---|---|---|---|---|---|
| main v3 | 0.5 | 21 | 10 | 2 | 8 | 62% | 259 s (61%) |
| main v3 | 0.7 | 12 | 9 | 0 | 10 | 77% | 326 s (77%) |
| heldout_a v2 | 0.5 | 24 | 8 | 5 | 7 | 53% | 256 s (55%) |
| heldout_a v2 | 0.7 | 18 | 6 | 3 | 9 | 66% | 311 s (66%) |

Random clean (added 12:56 on the engine thread's ask): 40 ordinary neighborhoods cut from random accounts with no labeled row and no ring account in reach, so every ring call is a false alarm. Jev's set 1 Score on the sentence state runs high there too (median 64.5 of 100; the scheme Choice says ring for 33 of 40), because the facts hold real bursts ("14 ACH transfers from 14 distinct accounts in 27 minutes") and Jev reads a burst as structure, as Sonnet does. At the main-chosen thresholds the gate (70.5) keeps 6 of Sonnet v3's 12 false ring calls and the pre-filter (70) lets 13 of 40 through to the LLM, which calls 6 of those ring; Sonnet's own low-drop keeps 8 of 12, and both together keep 5. Set 2's Score is weaker here (gate at 30.2 keeps 10 of 12). So on clean traffic Jev halves the false alarms and the LLM bill; it does not remove the burst-shaped false alarms, because the code facts call them bursts. Per-unit scores: `out\jev_random_clean.json`, `out\jev_random_clean_q2.json`.

Reading: at a Score threshold of 70, the LLM reads fewer than half the neighborhoods, finds the same 13 rings on main
and 8 of the 10 it would have found on heldout_a, and makes a quarter of the false ring calls, at about half the cost and
time. The rings the pre-filter closes unseen are mostly the lone single-transfer rings, which the LLM mostly misses
anyway (the "rings found" column barely moves while "rings never seen" climbs). Pushing the threshold higher buys more
savings by closing rings the LLM would have found.

### Cost and latency per call

| state variant | mean input tokens | mean cost per call | median latency |
|---|---|---|---|
| rows + facts | 3,795 | $0.00016 | 123 ms |
| facts only | 1,964 | $0.00008 | 114 ms |
| sentences | 1,271 | $0.00005 | 111 ms |

Whole run: 726 calls, $0.062, median 111 ms, 90th percentile 172 ms, slowest 436 ms. A 60-unit slice with three
questions per call takes about 4 seconds at 8 workers. Every call carries all three questions at no extra time.
Against the chat families: 5 to 100 seconds and about a cent or more per unit.

## Files beside this report

| file | what |
|---|---|
| `DESIGN.md` | every style-guide rule applied, with its source line, and the question set 2 rulings |
| `questions.json` | question set 1 exactly as sent (set 2 is `SCHEME2` and `EVIDENCE2` in `rings_jev.py`) |
| `state_<variant>_u06_ring.txt`, `state_<variant>_u01_ordinary.txt` | the three states for one ring and one ordinary unit, exactly as sent |
| `rings_jev.py` | the runner (`dry`, `smoke`, `run --tag T [--slice DIR] [--qset 1 or 2] [--variants ...]`) |
| `score_jev.py`, `score_q2.py` | the scoring, calibration, gate sweep and code-rule baseline; they wrote `out\scores.md` and `out\scores_q2.md` |
| `out\jev_<tag>.json` | per-unit answers: p(ring), confidence, pattern and its confidence, evidence 0 to 100 |
| `out\calls_<tag>.jsonl` | every call: state, questions, raw response, latency, cost (the key is never in it) |

Commands that produced the numbers (from `rings_bench\jev\`, plain `python`):

```
python rings_jev.py run --tag main
python rings_jev.py run --tag heldout_a --slice ../slices/heldout_a
python score_jev.py
python rings_jev.py run --tag main_q2 --qset 2 --variants facts,sentences
python rings_jev.py run --tag heldout_a_q2 --qset 2 --slice ../slices/heldout_a --variants facts,sentences
python rings_jev.py run --tag heldout_b_q2 --qset 2 --slice ../slices/heldout_b --variants facts,sentences
python score_q2.py
```

## What Jev cannot do here

- **Find a lone laundering transfer.** Eight of 20 rings per slice are one labeled transfer. The code facts describe
  nothing about it, so Jev (and every chat model) sees ordinary traffic unless the neighborhood holds a burst.
- **Name the pattern.** 3 to 6 of 20 right in every run. The facts at the neighborhood level do not carry the shape
  the way the bench's labels do (a fan-out with no burst within an hour reads as "sends to 12 different accounts",
  which Jev read as chain or other).
- **Compare numbers or follow ids.** It read "pass-through pairs: 11" as a chain regardless of amounts until the
  ruling said matching amounts are required. Anything that depends on a comparison must be computed in code first
  (the sentence state does this; the facts text does not).
- **Report calibrated confidence out of the box on this synthetic, numeric state.** Set 1's confidence was flat;
  the style guide's calibration numbers came from real human text and did not transfer.
- **Flag transfers.** These questions judge the neighborhood; the per-transfer design (`jev_options\opt5_per_transfer.py`)
  was not run in this time box.

## Three next steps, ranked by value per minute

1. **Put the set 2 Score gate and Sonnet's low-drop on the page as one chip (about 15 minutes, no new calls).**
   `out\jev_main_q2.json` has the Score per unit; the UI thread's "families that must agree" chip row can take a
   "structure check" chip that greys a ring call when Jev's evidence Score is below 30.2. The heldout_b numbers above
   (17 false rings to 2, rings kept at 12) are the demo line, said with the plus or minus 4 caveat.
2. **One more ruling round, written from heldout_b's set 2 errors and read on heldout_c (about 10 minutes, $0.02).**
   The set 1 to set 2 step removed 14 to 21 false rings per slice from one sentence per side. The remaining false
   rings on the facts-only state (8, 11, 12) cluster on units with a single pass-through pair of similar amounts; the
   next ruling is "one matching pair is still ordinary; a line of three accounts is needed", said in the Score's
   moderate level too. heldout_c has not been touched by any Jev question.
3. **Run Jev on neighborhoods cut from the whole HI-Small file (about 30 minutes, under a dollar).** At $0.00008 and
   0.11 seconds per neighborhood, the facts-only set 2 question gives the first whole-file precision number the bench
   lacks (the README's honest limit: units were cut around labeled rings). That is the number a judge will ask for,
   and no chat family can produce it today at any price.
