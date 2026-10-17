# Check of the SMURF system prompt (main e0cb3b0, 15:16) against the bench's original, 2026-10-17 15:22

One run per cell on the main slice (60 neighborhoods), scored with the engine's rules (a ring counts as caught when at
least half its labeled transfers are flagged without sweeping the neighborhood). "Rule" = keep a ring call only at
medium or high confidence (the page's v4). Raw batches: `out_s9/` (new prompt) and `out/` (recorded, old prompt).

| Arm | Prompt | Precision | Recall | Rings caught | False rings |
|---|---|---|---|---|---|
| Claude Sonnet 5.5 v1 (raw rows) | original | 0.39 | 0.86 | 11 of 20 | 9 |
| Claude Sonnet 5.5 v1 (raw rows) | SMURF | 0.46 | 0.82 | 8 of 20 | 7 |
| Claude Sonnet 5.5 v3 (facts + Knowledge Base) | original | 0.58 | 0.89 | 10 of 20 | 5 |
| Claude Sonnet 5.5 v3 | SMURF | 0.66 | 0.70 | 7 of 20 | 1 |
| Claude Sonnet 5.5 v3 + rule (the page's v4) | original | 0.63 | 0.88 | 9 of 20 | 2 |
| Claude Sonnet 5.5 v3 + rule | SMURF | 0.66 | 0.70 | 7 of 20 | 1 |
| GPT-6 Sol v3 + rule | original | 0.55 | 0.60 | 7 of 20 | 2 |
| GPT-6 Sol v3 + rule | SMURF | 0.61 | 0.39 | 4 of 20 | 1 |

Reading: the SMURF prompt trades rings for false alarms, and the trade is worse than the confidence rule already gives.
On the page's first pass it would go from 9 rings and 2 false alarms to 7 rings and 1 false alarm; GPT-6 Sol loses 3
rings. The demo keeps the recorded runs made with the original prompt. Note for anyone re-running from main: the page's
recorded runs were made with the ORIGINAL system prompt (pinned as S0 in `system_prompts.py`); `prompts.SYSTEM` on main
is now the SMURF text, so a fresh run of any version will not reproduce the page's numbers until that is restored.
Cost of this check: about $5.60, 180 calls.
