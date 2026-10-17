# Testing the Rings bench

What we tested, how, what broke, and what is still open. Every result below can be rerun; the commands are at the end.
Tested 2026-10-17 on the `eval/model-screen` branch, rebased on `main` at `b5f7410`.

| # | Test | Result |
|---|---|---|
| 1 | Smoke test: every script, command and page | 52 of 54 checks pass; 2 real problems found (below) |
| 2 | Regression suite (`tests/test_bench.py`) | 18 tests pass; proven able to fail |
| 3 | Claims audit: pitch and README numbers against the data | 19 OK, **9 off**, 6 not checkable from the repo |
| 4 | The page shows the numbers in the data | 46 of 46 leaderboard rows match |
| 5 | Repeatability: same model, same cases, run again | 88 to 92% of verdicts repeat; one run's F1 moves about 0.07 by chance |
| 6 | Relabeling: same cases with new ids and shuffled rows | GPT-6 Sol unaffected; Claude Sonnet 5.5's false alarms nearly double |

## Open issues for the team

These are in team-owned files and were not changed here.

1. **`bench.py results` and `make_investigate.py` wipe committed results on a fresh clone.** Both read run records from
   `out/`, which git ignores. With no records they still write: `data/bench_results.json` (and `.js`) becomes 0 models and
   0 runs, and `investigate.json` loses its answers. Reproduced in a scratch copy. Anyone running the results step on their
   own laptop blanks the main page. Fix: refuse to write when no batch records are found.
2. **The vote dial is not monotonic.** Rings found by votes needed (v1): 5, 10, 11, 11, 12, 7, 5, 5, 1. Requiring fewer
   families catches fewer rings at the low end, because `panel.py` flags the union of every family's flags and the
   no-sweep rule (45ba1ee) then rejects the catch. A judge turning the dial will see it.
3. **Pitch and README numbers that no longer match the data** (section 3): the dial line, "the 5 it still missed", and
   "keeps precision on held-out slices".
4. **Jev numbers are stale.** `jev/out/scores*.json` were written at 12:50, before the 13:21 scoring change. Recomputed
   today every Jev "rings found" figure drops by 1 to 3 (13 to 10 at most thresholds); `jev/REPORT.md` quotes the old ones.
5. **Two scripts cannot be rerun from a clone.** `jev/prefilter.py` reads `jev/out/calls_*.jsonl` (git-ignored) and
   `jev/rings_jev.py` imports `jevkit` (not committed).
6. **The 3D page variants show nothing without WebGL**, with no message. Both load cleanly when WebGL is available.

## 1. Smoke test

Run in a scratch copy of `rings_bench` so nothing live or committed was touched. Scripts that need the Windows-only
`mt2kit` ran against a stand-in that only satisfies imports. Two live calls to `openai/gpt-4o-mini`: $0.0014.

| Area | What ran | Result |
|---|---|---|
| `units.py` | regenerate units for all 5 slices with each slice's recorded seed | byte-identical to the committed files |
| `facts.py`, `prompts.py` | every unit of every slice, prompt versions v1, v2, v3, v5 (1,120 prompts) | no errors |
| `panel.py` | rebuild the vote dial | identical to committed `panel.json` |
| `bench.py` | `--help` on all 8 commands; `results` rebuilt from 1,560 run records | all 26 arms reproduced exactly |
| `mi.py`, `team_rerun.py`, `derive_v4.py`, `make_investigate.py` | start up with no input | run; see open issue 1 |
| `screen.py` | all commands: catalog, estimate, subset, probe, run (main and heldout_c), resume, reparse, retry, 3 scoring modes, report | 19 of 19 checks pass |
| HTML pages | 18 pages in headless Chrome, the main page on all 5 slices | no JavaScript errors |
| `jev/score_jev.py`, `jev/score_q2.py` | rebuild and compare | output differs from committed: open issue 4 |

## 2. Regression suite

`tests/test_bench.py`, 18 tests, no network, about 0.1 seconds. It pins:

- **The catch rule, by hand.** Half the ring flagged is a catch, less is not; the right rows with an "ordinary" verdict are
  not; a sweep is not (wrong flags may not outnumber the ring, with a floor of two for a lone transfer); a failed call
  flags nothing and counts as a miss; a ring call on an ordinary unit is a false ring.
- **The answer parser**: code fences, `//` comments, raw line breaks in strings, trailing commas, escaped quotes.
- **Every unit of every slice (280)** against that slice's IBM key: a ring unit's answer key is the whole IBM ring and
  nothing else; an ordinary unit holds no laundering row and no row within 120 minutes of a label on the same account.
- **`slices/README.md`**: the rows, laundering rows and accounts per slice, and the account overlaps (main and heldout_a
  share 29; every other pair shares 0).
- **Every committed result (46 arms)** rescored from its own runs.
- **Every `.js` twin equals its `.json`.** The page reads the `.js` when opened as a file and the `.json` when served, so a
  drift would show different numbers depending on how the page was opened.

To prove the tests can fail, two faults were planted. Restoring the scoring rule from before 45ba1ee failed 44 checks;
a drifted `.js` twin failed 13. Unplanted, 0 failures.

## 3. Claims audit

`tests/audit_claims.py` recomputes every number the pitch draft and README say out loud.

| Status | Claim | Where | The data says |
|---|---|---|---|
| OK | 2,824 transfers, 1,797 accounts, 113 laundering | pitch, README | same |
| OK | slice is 4% laundering, all of it ACH | README, pitch | 4.00%, 113 of 113 |
| OK | Sonnet's first pass: 9 of 20 rings, 100 of 113 transfers, 2 alarms, both on ring accounts | pitch | same |
| OK | confidence rule cuts false rings 5 to 2, and 11 to 1, 17 to 5, 12 to 7 on held-out A, B, C | pitch | same |
| OK | hiding the payment format: Sonnet precision 0.46 to 0.27, GPT-6 Sol holds | pitch, README | 0.46 to 0.27; 0.46 to 0.45 |
| OK | false alarms range 2 to 38 of 40 by family | README | same |
| OK | 30 in the tray, 7 of them rings; 11 rings in green at the end | pitch | same |
| OK | 1 in 5 clean neighborhoods alarmed, v5 cuts it to 1 in 10 | pitch | Sonnet v4 and GPT-6 Sol 8 of 40; Sonnet v5 4 of 40 |
| **OFF** | 7 of 9 families cuts false rings 39 to 5 and halves the groups found | pitch, README | 40 to 6, and the same 5 rings at both ends (v1); v2 6 and 6 |
| **OFF** | the dial trades rings for false alarms | page, pitch | not monotonic: open issue 2 |
| **OFF** | "then the 5 it still missed appear" | pitch | 9 rings are not caught: 5 left in the tray and 4 the first pass dismissed; the page shows all 9 |
| **OFF** | held-out: the strong models keep their precision | README | Sonnet v2 0.46 to 0.27, GPT-6 Sol v2 0.46 to 0.26 (mean of 3 held-out); recall drops about 20%, as claimed |
| can't check | 5,078,345 transfers, 1 in 981; 38% in no named shape; 8 of 12 groups match IBM's pattern file | README, pitch | needs the full IBM file |
| can't check | first rule right 0.75% of the time | pitch | needs the full file; note the page says the ACH rule is 0.84% |
| can't check | PRISM alert at 29 seconds; Root Cause timed out over 1,500 runs | pitch | needs PRISM |

## 4. The page shows the numbers in the data

The main page was rendered in headless Chrome on all five slices and every leaderboard row was read back from the page:
precision, recall, rings found, false rings, verdicts right and cost, against `bench_results.json`. 46 of 46 rows match.
The one apparent mismatch is a half cent: GLM-5.3 v1 costs exactly $0.835, which JavaScript rounds to $0.84 and Python
to $0.83.

## 5. Repeatability

The bench runs each model once per neighborhood. To see how much of a score is the model and how much is the draw,
Claude Sonnet 5.5 and GPT-6 Sol ran the same 60 main neighborhoods again with the same v2 prompt, temperature 0 and
token caps (`--run-tag rep1`, $1.40).

| | Claude Sonnet 5.5 | GPT-6 Sol |
|---|---|---|
| Same verdict on the rerun | 92% (5 of 60 flip, 2 of them rings) | 88% (7 flip, 2 on rings) |
| Flagged transfers in common, where both runs called a ring | 96% | 98% |
| F1, first run then rerun | 0.608, 0.534 | 0.604, 0.578 |
| Rings caught, first run then rerun | 9, 9 (8 the same) | 10, 12 (10 the same) |
| False alarms, first run then rerun | 7, 8 | 12, 13 |

**What it means.** One run's F1 can move by about 0.07 for the same model on the same cases. Any gap smaller than that
between two single runs is not evidence. Round one's top five sit within 0.06 of each other, and the evals report's
95% ranges are wide for this reason. When the models do commit to a ring they flag almost exactly the same transfers
each time: the noise is in borderline verdicts, not in which rows they point at.

One caveat: the first runs went through the bench's kit on Windows and the reruns through `screen.py`. Same prompt,
same settings, but a single rerun cannot separate a path difference from chance.

## 6. Relabeling

The same two models on the same 60 neighborhoods with every account id and transfer id replaced (one random mapping per
neighborhood, same id style) and the rows shuffled (`--transform relabel`, $1.40). Amounts, times, formats and banks are
untouched, so the structure a model should read is identical; the code facts come out the same (checked on a ring unit:
same loops, bursts and 11 pass-through chains). Flagged ids are mapped back before scoring.

| | Claude Sonnet 5.5 | GPT-6 Sol |
|---|---|---|
| Same verdict as the first run | **83%** (10 flip, 4 on rings) | 87% (8 flip, 2 on rings) |
| Same verdict as the rerun | 85% (9 flip) | 85% (9 flip) |
| F1 | 0.476 (0.608 and 0.534 unrelabeled) | 0.552 (0.604 and 0.578) |
| False alarms | **13** (7 and 8 unrelabeled) | 12 (12 and 13) |
| Rings caught | 11 | 11 |

**What it means.** GPT-6 Sol is indifferent to the labels: relabeling changes its answers no more than a plain rerun
does. Claude Sonnet 5.5 is not: with new ids and shuffled rows it raised nearly twice the false alarms and its precision
fell from 0.46 to 0.32, well outside its own rerun noise. Something in the presentation it was reading as evidence is
gone. This test cannot yet say which part: the original account ids, or rows in time order. Splitting it (ids only,
order only) is about $1.40 per model.

One side effect of the transform to know: where accounts tie in the facts' "busiest accounts" list, new ids can change
which tied accounts are listed first.

## Bugs found and fixed in the model screen

| Bug | Effect | Fix |
|---|---|---|
| Parser rejected readable answers | 12 Ministral answers with `//` comments or line breaks in strings counted as failures | lenient parser; `reparse` re-read the stored answers, no new calls |
| Token cap too low for reasoning models | gpt-5-nano, kimi-k2.6, kimi-k2.7-code-highspeed thought until the cap and answered nothing | 8,000 tokens for new models, 24,000 for new reasoning families; the bench's nine keep their caps |
| `--retry-failed` was unfair | would re-ask models that gave no answer, a second try nobody else got | `--retry-transport` retries only provider and network failures |
| Scoring copied before 45ba1ee | the screen used the old catch rule | follows the no-sweep rule; rescoring reproduces every committed number |
| Prompt drift risk | `prompts.py` gained "cannot tell" for v5 mid-run | the screen pins the v2 answer format every v2 run on the board used |

## Rerun

From `rings_bench/`:

```
python3 -m unittest discover -s tests -v                     # regression suite, no network
python3 tests/audit_claims.py                                # claims audit
python3 screen.py stability --models anthropic/claude-sonnet-5-5,openai/gpt-6-sol --runs bench,rep1,relabel
```
