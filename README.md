# Hawala: the Rings bench

Money Talks 2 hackathon, New York, October 17, 2026. Track: Money Intelligence.

Every AI model family we can reach through one API key hunts money-laundering rings in the same synthetic bank
transfers, with no answer key, and is scored against the data's own labels. The result is not "AI finds laundering."
It is a calibration an investigator can use: which model family can be trusted, for which shape of scheme, at what
cost, and where they all fail together. Every run is recorded in PRISM.

## What is in this repository

| Folder | What |
|---|---|
| `rings_bench/` | the bench: unit cutter, code facts, prompts, runner, scorer, agreement dial, Money Intelligence proofs |
| `rings_bench/ui/` | the page: result, every model, where they fail, the vote dial, follow the money, the honest panel (opens from a file, no server) |
| `rings_bench/diagrams/` | concept flow, technical data flow, PRISM proof map, user interaction chart, honest-limits map |
| `rings_bench/data/` | the 2,824-transfer slice, the 60 neighborhoods, the results of every arm, the agreement file, the licence note |
| `rings_bench/slices/` | three held-out slices with no account shared with the first, and their results as they land |

Read `rings_bench/README.md` for how to run it and `rings_bench/PITCH_DRAFT.md` for the story in three minutes.

## The data, in one paragraph

IBM AMLworld HI-Small: a simulated bank world of 5,078,345 transfers in which 5,177 (one in 981) carry illicit money,
labeled by the generator that knows where every dollar came from. IBM's simulator injects eight shapes of laundering
attempt (fan-out, fan-in, cycle, stack, scatter-gather, gather-scatter, bipartite, random) and labels them; 38 percent
of the laundering sits in no named shape at all. We cut a slice around 20 of IBM's labeled groups, named the shapes
from the graph, and checked the names against IBM's pattern file (8 of 12 multi-transfer groups match exactly). We
planted nothing.

## What we found (one run per cell, synthetic data, enriched slice)

- The strong families find the structured shapes in nearly every run. Everyone misses the lone transfers and most
  two-hop chains, which is also what the published detectors miss.
- The main cost is false alarms on ordinary neighborhoods: 2 to 38 of 40 depending on the family.
- The families agree on IBM's labeled groups and split on the ordinary ones. Disagreement is the signal: requiring
  seven of nine families to agree cuts false alarms from 39 to 5 and halves the groups found. That dial is the
  investigator's tolerance knob.
- Hide the payment format and one strong family's precision falls from 0.46 to 0.27 while the other's holds: the
  data has a tell (every injected attempt is an ACH transfer) and we measure who leans on it.
- On a held-out slice the strong models keep their precision and lose about a quarter of their recall.

## Honest limits

Synthetic data; labels are IBM's generator's; our slice is 4 percent laundering where the file is 0.1 percent; one
run per model per neighborhood; every injected attempt is ACH; the file's tail after day 10 is 59 percent labeled.
We claim calibration, not detection.

## Data licence

Data: IBM Transactions for Anti Money Laundering (AML), HI-Small, by Erik Altman et al. (IBM), CDLA-Sharing-1.0.
Altman et al., "Realistic Synthetic Financial Transactions for Anti-Money Laundering Models," NeurIPS 2023,
arXiv:2306.16424. The slices here are derived data under the same licence (see `rings_bench/data/LICENCE.txt`).
Labels are IBM's generator's. The slice and the shape names are ours. No real customers.

Models were called through the Nicrron API; runs were recorded in PRISM by Block Convey. Keys are not in this
repository: the runner reads them from files outside it.
