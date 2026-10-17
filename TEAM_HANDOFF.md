# Team handoff, 12:55 (freeze 15:00)

Three lanes, one repo. Pull before you push; nobody rewrites another lane's files without a word on Discord.

## Where everything is

| What | Path | Open it with |
|---|---|---|
| The page (what judges see) | `rings_bench/ui/index.html` | double-click; `?slice=heldout_a` switches slices; `?still` skips the replay |
| Data the page reads | `rings_bench/data/` and `rings_bench/slices/<name>/` | `bench_results.js` (results), `panel.js` (families vote), `units.js` (the 60 neighborhoods), `slice.js` (the transfers) |
| Engine, scorer, prompts | `rings_bench/bench.py`, `prompts.py`, `facts.py`, `units.py`, `panel.py`, `derive_v4.py` | see `rings_bench/README.md` |
| Jev work | `rings_bench/jev/` | `REPORT.md` first, then `DESIGN.md`, `rings_jev.py`, `prefilter.py` |
| Diagrams | `rings_bench/diagrams/index.html` | double-click |
| Story and numbers | `rings_bench/PITCH_DRAFT.md`, `rings_bench/STATUS_1230.md`, top-level `README.md` | read |
| Live copy of the page | https://dashboard.alexmong.com/mt2-f0bown7jys9uclrx/rings/ui/index.html | the engine lane pushes it |

## Lane 1: Jev and making the models better

Start at `rings_bench/jev/REPORT.md`. What is known: Jev's ring/ordinary answer is not a verdict (wrong on 28 of 40
ordinary neighborhoods), its confidence number is not calibrated on this data, but its five-level evidence Score on
the sentence-form state separates rings from ordinary (AUC 0.83 main, 0.87 held-out A). As a gate on Claude Sonnet
v3 at Score 70.5: false rings 5 to 0, rings kept. As a pre-filter at Score 70: the LLM reads 27 of 60 neighborhoods
and keeps all 13 rings, about half the cost. The open questions, in value order:
1. On `slices/random_clean` (40 neighborhoods with no laundering in reach) Sonnet v3 still calls 12 a ring; GPT-6 Sol 8;
   Sonnet v5 4. Does the Jev gate or pre-filter cut those, and at what cost on the rings? (asked of the Jev thread.)
2. A combined rule: Sonnet's own confidence plus Jev's Score. On the main slice both together gave 0 false rings and
   13 of 20 rings; on held-out A 0 and 7. Confirm on B and C before claiming it.
3. Prompt wording is a dial, not a fix: v5 (base rate, what ordinary looks like, "cannot tell") gives 0 false rings
   and 11 of 20 rings for Sonnet on the main slice, but GPT-6 Sol drops to 7 of 20. Try a middle framing.
Run a new arm: `python bench.py run --model <model> --version <v> --workers 3` (keys outside the repo: the runner reads
`C:\Projects\nicrron.txt` and `C:\Projects\prism.txt`; ask the engine lane for the files). Every new version needs its
name in `prompts.py` and `bench.py` (grep for "v5" to see the four places). Results: `python bench.py results`.
Anything tuned on the main slice must be checked on `slices/heldout_a` (`RINGS_SLICE=heldout_a`) before it goes on the page.

## Lane 2: pitch website and frontend

The page is plain HTML, CSS and JS with no build step and no libraries. Read `rings_bench/ui/README.md` is not in the
repo (it had local paths); the structure is in `index.html`'s section ids. The data contract the page reads is the
shape of `rings_bench/data/bench_results.json`: `models[]` (one row per model and version with precision, recall,
rings_found, false_rings, by_shape, cost_usd, latency_ms_median, account_level) and `runs[]` (one per neighborhood
per arm with verdict, pattern, flagged_transfer_ids, confidence, why, tail_truth_rows, ibm_shape). `panel.json`
holds the families vote table. The engine lane rewrites these files; do not hand-edit them. The honest panel text and
the data credit line are not optional; they are in the page and in `README.md`. A pitch site can link the live page
and the repo; the licence line for the data is in `rings_bench/data/LICENCE.txt`.

## Lane 3: the app, the visuals, the data it shows (Alex)

Eight art-direction choices await a ruling (they were listed in the UI thread's notes; the engine lane has them).
Things the data can show that the page does not yet: the account-level view (`account_level` per model row: the share
of flagged accounts that sit in one of IBM's rings), the v4 and v5 rows side by side as the improvement ladder, the
random clean slice as the false-alarm rate on clean traffic, and the Jev gate and pre-filter numbers from
`rings_bench/jev/out/`. The slices picker already reads `slices/slices.js`.

## Engine lane (the Claude thread on Alex's laptop) keeps

Running arms and rewriting the results files, pushing the live site, the PRISM proofs (Knowledge Base done,
Evaluator done, Root Cause waiting on the team workspace key), the team-workspace rerun (`team_rerun.py`), and the
repo commits of results. Ask it before changing `bench.py`, `prompts.py` or the data files.

## PRISM, if your lane uses it too

One workspace per team, and its credits and daily analysis allowance are shared, so say on Discord before you spend
(trace analysis 1 credit each, an evaluator run 1 per scored trace, Root Cause 5 per run; tracing, reads, alerts and
guardrail checks are free). Facts learned today, each from a live call:
- Host `https://api.prism.blockconvey.com`, header `X-PRISMtrace-Key`. Name every run: `agent_name` and `agent_id`,
  our convention `rings-<family>-<version>[-<slice>]`; runs without a name land in "unknown".
- A trace with steps is a trajectory (`submit_trajectory`), and that is what the Steps tab shows; a plain trace has none.
- An eval task only sees traces created after the task itself. To score old runs, re-send them as fresh traces with
  `metadata.replay_of` (see `mi.py replay`).
- Ingesting any span REBUILDS the trace's input and output from the spans. Send the whole turn as spans in order
  (request, retrieval, answer) or the judge grades the wrong text (`mi.py replay` does this).
- The evaluator's `{context}` is filled only from a retrieval span; `{output}` from the last llm span.
- Root Cause ("Analyze now") has timed out three times on the shared practice workspace (statement timeout over
  1,500 failed runs). A fresh workspace is the fix; `team_rerun.py` reruns the two proof arms there in one command.
- Knowledge Base uploads with identical content are deduplicated across agents and keep only the first agent's
  assignment; make each agent's copy distinct (`bench.py kb-upload` appends the agent name).
- Credits balance is not readable with a project key; count what you spend.
Everything above is in `rings_bench/bench.py` and `rings_bench/mi.py` with receipts in the engine lane's notes.

## Numbers you can say today (all synthetic, one run per cell)

- Nine model families on 60 neighborhoods: the strong ones find 14 of IBM's 20 groups and wrongly flag 9 to 12 of 40
  ordinary neighborhoods; the weak ones find more and flag 24 to 38.
- Fix found on one slice and confirmed on three it never saw: Sonnet's own confidence. False rings 5 to 2 (main),
  11 to 1 (A), 17 to 5 (B), 12 to 7 (C).
- Families agree on IBM's groups and split on ordinary ones; asking 7 of 9 families to agree cuts false rings from 39 to 5.
- Hide the payment format: Sonnet's precision falls 0.46 to 0.27, GPT-6 Sol's holds. The data has a tell.
- On clean traffic with no laundering in reach, the strong models still raise an alarm on 1 in 5 to 3 in 10
  neighborhoods; the v5 framing cuts it to 1 in 10.

## 14:35 update: what is on main now, and how to plug model work into it

- **The demo page is `rings_bench/ui/variants/clearing2d/index.html`** (double-click; live copy at
  https://dashboard.alexmong.com/mt2-f0bown7jys9uclrx/rings/ui/variants/clearing2d/index.html). Four steps: Search
  (first pass), Ambiguous (the tray), Look closer (the investigator), Settled. `?stage=1..4` opens a step; click a
  neighborhood for the cluster zoom with Follow the money. `walkthrough/run.py` in that folder runs the whole demo in
  headless Edge and screenshots every state; run it after any change.
- **What the page reads**, all under `rings_bench/data/`: `bench_results.js` (every model and version; the model picker
  lists its rows), `panel.js` (the nine-family vote; the dial), `uncertain_tray.json` (the 30 the first pass could not
  settle: Sonnet v3 low confidence, or families split 3 to n-3), `investigate.js` (Claude Opus 5.5 v5 on those 30;
  `make_investigate.py` rebuilds it from the batch file). The tray and investigation exist for Sonnet v4 only.
- **To put a new model or prompt version on the page**: run it as a bench arm (`bench.py run --model M --version V`,
  then `bench.py results`), and its row appears in the model picker with its own catches, alarms and fades. A new
  version needs its name in `prompts.py` and `bench.py` (grep for "v5"). To make it the first pass of the funnel too,
  rebuild the tray and the investigation for it: `uncertain_tray.json` is built from that model's v3-style run and
  `panel.json`, then `bench.py run --model anthropic/claude-opus-5-5 --version v5 --units <the tray's ids>` and
  `python make_investigate.py`. Ask the engine thread before changing the data files; it rewrites them.
- **Error classes and a v6 prompt** are in `rings_bench/misses/REPORT.md` (five-vendor post-mortem of every missed
  and false ring). Nobody has run v6 yet; the clean path is the model screen on the 20, then a bench arm on the 60 and
  the held-out slices, then the page.
- **The model screen** (`eval/model-screen` branch: `screen.py`, `evals.md`) scores the bench's way, so its rows and
  ours compare directly; its results file can sit beside the others under `data/` when it merges.
