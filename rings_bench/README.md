# Rings many-models bench (Money Talks 2, 2026-10-17)

Pencil, Claude's build on Alex's word (11:02). Every model family reachable through Nicrron hunts laundering rings in
the same 60 neighborhoods cut from IBM's synthetic AMLworld HI-Small slice, is scored against IBM's own labels, and
every run goes to PRISM. Two versions on the same inputs: **v1** the model reads the raw transfers; **v2** code
computes the neighborhood's facts (degrees, loops, bursts, pass-through chains, formats) and the model names the outcome.

## Files
| File | What |
|---|---|
| `data/slice.js` | `window.SLICE`: the r2-rings slice (2,824 transfers, 113 laundering in 20 of IBM's labeled groups), copied from the Oct 15 build |
| `units.py` -> `data/units.json` | 60 run units: 20 IBM-labeled-ring neighborhoods (ring rows + ordinary traffic on the ring's accounts, capped at 60 rows) and 40 ordinary neighborhoods (clean rows only: no laundering row, nothing within 120 minutes of a labelled transfer on the same account) |
| `facts.py` | code facts per unit, each also a PRISM tool step |
| `prompts.py` | v1 and v2 prompts; the model answers one JSON object (verdict, pattern, flagged ids, confidence, why) |
| `bench.py` | the runner (see below) |
| `data/kb_ring_shapes.md` | pattern reference for the optional Knowledge Base retrieval step (`--kb`) |
| `out/batch_<model>__<v>.jsonl` | one record per unit per model-version (resumable) |
| `out/traces.jsonl` | the local copy of every PRISM run (run id, steps, metadata, PRISM row ids) |
| `out/llm_ledger.jsonl` | every Nicrron call with tokens and estimated cost |
| `data/bench_results.json` (+ `.js` twin) | the output contract the UI reads (models, runs with `ibm_shape` and `tail_truth_rows`, failures_by_shape) |
| `panel.py` -> `data/panel.json` (+ `.js`) | cross-family agreement per unit and the vote dial (k of n families must say ring) |
| `PITCH_DRAFT.md` | the three-minute story on the numbers so far, for the team to rewrite |
| `jev_options/` | five designed, dry-runnable ways to use Jev (TypeSafe's fast calibrated classifier): first pass, gate, Root Cause by cause class, tenth voter, per-transfer flags; see its README |

## Run
Python: `C:\Projects\Verticals\Hackathons\kit\mt2_kit\.venv\Scripts\python.exe` (has the PRISM SDK). Keys: `C:\Projects\nicrron.txt`,
`C:\Projects\prism.txt`; PRISM project id in `bench.py` (env `PRISMTRACE_PROJECT_ID` overrides; swap to the team workspace key + id).
```
python bench.py run --model anthropic/claude-sonnet-5-5 --version v1 --workers 2      # then --version v2
python bench.py results                                  # data/bench_results.json + table
python bench.py spans --model M --version v2             # retrieval span per run so a PRISM evaluator's {context} is filled
python bench.py analyze --model M --version v1 --max 10  # 1 credit per failed run; feeds Root Cause
python bench.py alerts                                   # error_rate and latency rules for every rings-* agent
python bench.py rootcause                                # Analyze now (5 credits), then our clusters
```
PRISM agent names: `rings-<family>-v1` and `rings-<family>-v2` (filter the dashboard by these). A wrong verdict is a
FAILED run with reason `missed_ring:<shape>` or `false_ring`; a model error (timeout, no JSON) is a technical failure.

## Scoring (local, the independent check)
Per run: verdict vs expected; flagged transfer ids vs IBM's labels inside the unit (tp, fp, fn). Per model-version:
precision and recall over all transfers; rings found = ring units with verdict ring and at least half the ring's
transfers flagged (the Oct 15 rule); false rings = ordinary units called ring; pattern named right; cost (Nicrron
price list, estimated); median latency.

## Honest limits
Synthetic data; labels are IBM's; pattern names are our structural reading; the slice is enriched (4% laundering vs
0.1% in the file); every laundering transfer in the slice is ACH (a tell); one run per cell; units were cut around the
IBM's labeled rings, so "ring units" are easier than a blind scan of the whole file. Say all of this on stage.
