# Model screen: every Nicrron chat model on the Rings bench

**Round one in progress.** 66 chat models in the catalog, 506 model calls so far, $7.66 spent. Written 2026-10-17 14:08 by `screen.py report`; every number below is read from the scored files it names, so rerun it rather than editing this file.

> **Not a ranking yet.** Some models have answered only 2 of the 20 round-one neighborhoods, so their scores rest on different and fewer cases. Read the Run column before comparing rows.

## Round one: every chat model on 20 neighborhoods

A stratified 20 of the 60: 7 laundering groups across shapes and 13 ordinary neighborhoods. It only decides who gets the full run, so the ranges are wide by design.

| # | Model | Run | F1 | 95% range | P(top 3) | Precision | Recall | Rings caught | False alarms | Errors | Cost | $ per ring | Median |
|---:|---|---:|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | openai/gpt-6-astra | 9/20 | 0.724 | 0.15 to 1.00 | 59% | 57% | 100% | 3 of 7 | 0 of 13 |  | $0.33 | $0.110 | 4.9 s |
| 2 | anthropic/claude-fable-5-1 | 10/20 | 0.700 | 0.14 to 0.95 | 48% | 54% | 100% | 3 of 7 | 1 of 13 |  | $0.73 | $0.243 | 13.4 s |
| 3 | openai/gpt-5.6-sol | 9/20 | 0.677 | 0.11 to 0.96 | 37% | 51% | 100% | 3 of 7 | 2 of 13 |  | $0.25 | $0.083 | 6.3 s |
| 4 | openai/gpt-6.1-sol | 9/20 | 0.667 | 0.12 to 0.95 | 2% | 50% | 100% | 3 of 7 | 1 of 13 |  | $0.07 | $0.024 | 8.8 s |
| 5 | openai/gpt-5.6-terra | 9/20 | 0.667 | 0.00 to 0.96 | 16% | 51% | 95% | 2 of 7 | 1 of 13 |  | $0.11 | $0.053 | 5.1 s |
| 6 | openai/gpt-6-sol † | 20/20 | 0.603 | 0.19 to 0.83 | 26% | 45% | 93% | 4 of 7 | 4 of 13 |  | $0.21 | $0.051 | 5.9 s |
| 7 | openai/gpt-4o | 9/20 | 0.578 | 0.00 to 1.00 | 24% | 54% | 62% | 1 of 7 | 0 of 13 |  | $0.06 | $0.061 | 1.4 s |
| 8 | openai/gpt-5.5 | 9/20 | 0.548 | 0.00 to 0.90 | 6% | 38% | 95% | 2 of 7 | 2 of 13 |  | $0.40 | $0.200 | 9.3 s |
| 9 | anthropic/claude-sonnet-5-5 † | 20/20 | 0.547 | 0.16 to 0.81 | 15% | 39% | 93% | 4 of 7 | 4 of 13 |  | $0.30 | $0.075 | 7.7 s |
| 10 | openai/gpt-5.1 | 9/20 | 0.537 | 0.00 to 0.78 | 2% | 39% | 86% | 2 of 7 | 1 of 13 |  | $0.04 | $0.021 | 1.7 s |
| 11 | xai/grok-4.6 | 8/20 | 0.533 | 0.00 to 0.91 | 8% | 36% | 100% | 2 of 7 | 2 of 13 |  | $0.26 | $0.128 | 75.5 s |
| 12 | openai/gpt-5 | 9/20 | 0.533 | 0.00 to 0.85 | 0% | 37% | 95% | 2 of 7 | 3 of 13 |  | $0.36 | $0.178 | 22.2 s |
| 13 | openai/gpt-6-luna † | 20/20 | 0.522 | 0.04 to 0.82 | 14% | 42% | 68% | 3 of 7 | 2 of 13 |  | $0.02 | $0.006 | 11.0 s |
| 14 | anthropic/claude-opus-5 | 10/20 | 0.457 | 0.04 to 0.80 | 0% | 30% | 100% | 3 of 7 | 4 of 13 |  | $0.38 | $0.128 | 13.0 s |
| 15 | openai/gpt-5.4 | 9/20 | 0.456 | 0.00 to 0.86 | 1% | 36% | 62% | 1 of 7 | 2 of 13 |  | $0.08 | $0.080 | 3.0 s |
| 16 | anthropic/claude-haiku-5-5 † | 20/20 | 0.420 | 0.10 to 0.65 | 0% | 27% | 93% | 4 of 7 | 8 of 13 |  | $0.02 | $0.005 | 7.3 s |
| 17 | anthropic/claude-opus-5-5 | 10/20 | 0.419 | 0.00 to 0.96 | 23% | 41% | 43% | 2 of 7 | 0 of 13 |  | $0.24 | $0.118 | 6.6 s |
| 18 | anthropic/claude-fable-5 | 10/20 | 0.393 | 0.03 to 0.73 | 0% | 24% | 100% | 3 of 7 | 5 of 13 |  | $0.76 | $0.252 | 14.3 s |
| 19 | xai/grok-4.7 † | 20/20 | 0.385 | 0.00 to 0.76 | 11% | 44% | 34% | 1 of 7 | 1 of 13 |  | $0.70 | $0.701 | 53.9 s |
| 20 | xai/grok-4.3 | 9/20 | 0.382 | 0.00 to 0.86 | 1% | 28% | 62% | 1 of 7 | 2 of 13 |  | $0.05 | $0.047 | 10.3 s |
| 21 | openai/gpt-5.2 | 9/20 | 0.378 | 0.00 to 0.82 | 2% | 26% | 67% | 1 of 7 | 2 of 13 |  | $0.06 | $0.065 | 3.6 s |
| 22 | xai/grok-4.5 | 9/20 | 0.374 | 0.00 to 0.57 | 0% | 23% | 95% | 1 of 7 | 3 of 13 |  | $0.15 | $0.152 | 35.3 s |
| 23 | openai/gpt-5.4-mini | 9/20 | 0.372 | 0.00 to 0.61 | 0% | 25% | 76% | 2 of 7 | 4 of 13 |  | $0.02 | $0.011 | 1.7 s |
| 24 | xai/grok-code-fast-1 | 9/20 | 0.359 | 0.00 to 0.87 | 2% | 25% | 67% | 1 of 7 | 1 of 13 |  | $0.14 | $0.145 | 31.9 s |
| 25 | openai/o3 | 9/20 | 0.354 | 0.00 to 0.71 | 0% | 22% | 95% | 2 of 7 | 5 of 13 |  | $0.19 | $0.097 | 9.3 s |
| 26 | anthropic/claude-opus-4-5 | 10/20 | 0.333 | 0.00 to 0.77 | 1% | 23% | 62% | 1 of 7 | 3 of 13 |  | $0.17 | $0.172 | 5.0 s |
| 27 | anthropic/claude-opus-4-8 | 10/20 | 0.304 | 0.02 to 0.55 | 0% | 18% | 100% | 2 of 7 | 5 of 13 |  | $0.22 | $0.111 | 4.8 s |
| 28 | deepseek/deepseek-flash | 9/20 | 0.301 | 0.00 to 0.70 | 0% | 19% | 67% | 2 of 7 | 4 of 13 |  | $0.05 | $0.024 | 18.0 s |
| 29 | z-ai/glm-5.3 † | 20/20 | 0.293 | 0.09 to 0.49 | 0% | 18% | 82% | 3 of 7 | 8 of 13 |  | $0.11 | $0.035 | 5.7 s |
| 30 | moonshot/kimi-k3 † | 20/20 | 0.291 | 0.07 to 0.53 | 0% | 17% | 95% | 4 of 7 | 12 of 13 |  | $0.31 | $0.077 | 13.1 s |
| 31 | xai/grok-4.20 | 9/20 | 0.277 | 0.00 to 0.68 | 0% | 18% | 67% | 1 of 7 | 3 of 13 |  | $0.15 | $0.149 | 50.7 s |
| 32 | z-ai/glm-5.3-flash | 9/20 | 0.259 | 0.03 to 0.64 | 0% | 16% | 71% | 1 of 7 | 3 of 13 |  | $0.00 | $0.005 | 5.2 s |
| 33 | mistral/mistral-large-3 | 10/20 | 0.248 | 0.00 to 0.60 | 0% | 15% | 62% | 1 of 7 | 4 of 13 |  | $0.02 | $0.019 | 2.8 s |
| 34 | z-ai/glm-5.3-flashx | 9/20 | 0.246 | 0.00 to 0.54 | 0% | 15% | 67% | 1 of 7 | 4 of 13 |  | $0.01 | $0.012 | 3.4 s |
| 35 | deepseek/deepseek-v4-pro † | 20/20 | 0.236 | 0.03 to 0.46 | 0% | 15% | 57% | 3 of 7 | 11 of 13 | 4 | $0.63 | $0.211 | 102.6 s |
| 36 | openai/gpt-5-mini | 9/20 | 0.219 | 0.02 to 0.54 | 0% | 13% | 71% | 1 of 7 | 5 of 13 |  | $0.05 | $0.047 | 22.0 s |
| 37 | z-ai/glm-5.2 | 9/20 | 0.194 | 0.00 to 0.40 | 0% | 11% | 67% | 0 of 7 | 5 of 13 |  | $0.14 | – | 15.3 s |
| 38 | anthropic/claude-sonnet-5 | 10/20 | 0.184 | 0.00 to 0.44 | 0% | 11% | 67% | 1 of 7 | 6 of 13 |  | $0.21 | $0.207 | 15.3 s |
| 39 | anthropic/claude-opus-4-7 | 10/20 | 0.184 | 0.00 to 0.41 | 0% | 11% | 67% | 0 of 7 | 6 of 13 |  | $0.22 | – | 5.0 s |
| 40 | anthropic/claude-opus-4-6 | 10/20 | 0.178 | 0.00 to 0.34 | 0% | 11% | 57% | 0 of 7 | 5 of 13 |  | $0.21 | – | 7.8 s |
| 41 | anthropic/claude-sonnet-4-6 | 10/20 | 0.174 | 0.00 to 0.37 | 0% | 10% | 67% | 0 of 7 | 5 of 13 |  | $0.14 | – | 6.4 s |
| 42 | mistral/mistral-large-4 † | 20/20 | 0.163 | 0.02 to 0.33 | 0% | 10% | 55% | 2 of 7 | 10 of 13 |  | $0.09 | $0.047 | 4.9 s |
| 43 | mistral/codestral | 10/20 | 0.138 | 0.00 to 0.26 | 0% | 8% | 62% | 0 of 7 | 5 of 13 |  | $0.01 | – | 2.4 s |
| 44 | openai/gpt-5-nano | 9/20 | 0.130 | 0.00 to 0.25 | 0% | 8% | 33% | 0 of 7 | 4 of 13 |  | $0.02 | – | 22.3 s |
| 45 | z-ai/glm-5 | 9/20 | 0.085 | 0.00 to 0.16 | 0% | 5% | 19% | 0 of 7 | 3 of 13 |  | $0.10 | – | 24.4 s |
| 46 | z-ai/glm-4.5-air | 2/20 | 0.069 | 0.00 to 0.14 | 0% | 5% | 12% | 0 of 7 | 0 of 13 |  | $0.01 | – | 32.9 s |
| 47 | anthropic/claude-haiku-4-5 | 10/20 | 0.064 | 0.00 to 0.12 | 0% | 5% | 10% | 0 of 7 | 2 of 13 |  | $0.04 | – | 3.0 s |
| 48 | xai/grok-4.20-non-reasoning | 9/20 | 0.061 | 0.00 to 0.15 | 0% | 8% | 5% | 0 of 7 | 0 of 13 |  | $0.03 | – | 1.7 s |
| 49 | openai/gpt-4.1 | 10/20 | 0.059 | 0.00 to 0.12 | 0% | 4% | 10% | 0 of 7 | 1 of 13 |  | $0.06 | – | 1.6 s |
| 50 | openai/gpt-5.6-luna | 9/20 | 0.049 | 0.00 to 0.10 | 0% | 3% | 10% | 0 of 7 | 3 of 13 |  | $0.01 | – | 7.4 s |
| 51 | openai/gpt-4.1-mini | 9/20 | 0.045 | 0.00 to 0.14 | 0% | 4% | 5% | 0 of 7 | 0 of 13 |  | $0.01 | – | 1.3 s |
| 52 | z-ai/glm-4.5 | 4/20 | 0.038 | 0.00 to 0.15 | 0% | 2% | 100% | 0 of 7 | 3 of 13 |  | $0.02 | – | 51.4 s |
| 53 | moonshot/kimi-k2.7-code | 5/20 | 0.036 | 0.00 to 0.15 | 0% | 2% | 100% | 0 of 7 | 3 of 13 |  | $0.10 | – | 76.7 s |
| 54 | z-ai/glm-5.1 | 5/20 | 0.027 | 0.00 to 0.10 | 0% | 1% | 100% | 0 of 7 | 4 of 13 |  | $0.06 | – | 42.9 s |
| 55 | mistral/mistral-small-4 | 10/20 | 0.024 | 0.00 to 0.07 | 0% | 2% | 5% | 0 of 7 | 5 of 13 |  | $0.01 | – | 1.7 s |
| 56 | z-ai/glm-4.6 | 7/20 | 0.000 | 0.00 to 0.00 | 0% | 0% | 0% | 0 of 7 | 0 of 13 | 7 | $0.00 | – | 0.0 s |
| 57 | z-ai/glm-4.7 | 7/20 | 0.000 | 0.00 to 0.00 | 0% | 0% | 0% | 0 of 7 | 0 of 13 | 7 | $0.00 | – | 0.0 s |
| 58 | z-ai/glm-5-turbo | 6/20 | 0.000 | 0.00 to 0.00 | 0% | 0% | 0% | 0 of 7 | 0 of 13 | 6 | $0.00 | – | 0.0 s |
| 59 | mistral/ministral-3b | 10/20 | 0.000 | 0.00 to 0.00 | 0% | 0% | 0% | 0 of 7 | 0 of 13 | 2 | $0.00 | – | 1.2 s |
| 60 | openai/gpt-4o-mini | 9/20 | 0.000 | 0.00 to 0.00 | 0% | 0% | 0% | 0 of 7 | 0 of 13 |  | $0.00 | – | 1.1 s |
| 61 | mistral/ministral-8b | 10/20 | 0.000 | 0.00 to 0.00 | 0% | 0% | 0% | 0 of 7 | 0 of 13 |  | $0.01 | – | 3.6 s |
| 62 | openai/gpt-5.4-nano | 9/20 | 0.000 | 0.00 to 0.00 | 0% | 0% | 0% | 0 of 7 | 0 of 13 |  | $0.01 | – | 1.4 s |
| 63 | mistral/mistral-medium-3.5 | 10/20 | 0.000 | 0.00 to 0.00 | 0% | 0% | 0% | 0 of 7 | 0 of 13 |  | $0.05 | – | 1.5 s |
| 64 | mistral/ministral-14b | 10/20 | 0.000 | 0.00 to 0.00 | 0% | 0% | 0% | 0 of 7 | 1 of 13 | 6 | $0.01 | – | 6.7 s |
| 65 | moonshot/kimi-k2.6 | 9/20 | 0.000 | 0.00 to 0.00 | 0% | 0% | 0% | 0 of 7 | 2 of 13 | 4 | $0.31 | – | 88.1 s |
| 66 | moonshot/kimi-k2.7-code-highspeed | 9/20 | 0.000 | 0.00 to 0.00 | 0% | 0% | 0% | 0 of 7 | 2 of 13 | 4 | $0.52 | – | 43.1 s |

## How to read the tables

- **F1** balances precision and recall over individual transfers, scored against IBM's labels. It is the ranking rule, fixed before any run.
- **95% range** comes from resampling the neighborhoods 2,000 times, the same draw for every model. Where two models' ranges overlap, their order could flip on other data.
- **P(top 3)** is the share of resamples in which the model finished in the top 3.
- **Rings caught** means the model called the neighborhood a ring, flagged at least half of IBM's labeled transfers, and did not sweep (its wrong flags did not outnumber the ring).
- **False alarms** are ordinary neighborhoods the model called a ring. **Errors** are calls that failed or gave no readable answer; they count as flagging nothing.
- **Cost** is Nicrron's list price times the tokens each call reported. **Median** is the median time to answer.
- † marks the nine models the bench ran earlier (data/bench_results.json), joined here and rescored with the same rules; every other row ran in this screen.

## Method

- Data: IBM AMLworld HI-Small, synthetic. Labels come from IBM's generator, not from us or from a model. Same 60 neighborhoods for every model (data/units.json).
- Prompt: the bench's v2 (raw transfers plus code-computed facts: degrees, loops, bursts, pass-through chains), with the answer format every v2 run on the board used. Temperature 0, one run per model per neighborhood.
- Rounds: all 57 models the bench had not run were screened on the stratified 20. The ten best overall ran all 60. The top five then ran held-out C.
- Limits: synthetic data; the slice is about 4% laundering where the file is 0.1%; every laundering transfer here is ACH, a shortcut a model can learn; ring neighborhoods are larger than ordinary ones; one run per cell.

## Reproduce

```
cd rings_bench
python3 screen.py subset                                  # the stratified 20 (seeded)
python3 screen.py run --models new --subset screen20      # round one; key in ~/.nicrron_key
python3 screen.py score --subset screen20
python3 screen.py run --models <top 10, comma list>       # finalists on all 60
python3 screen.py score
RINGS_SLICE=heldout_c python3 screen.py run --models <top 5>
RINGS_SLICE=heldout_c python3 screen.py score
python3 screen.py report                                  # this file
```

Raw evidence: one JSONL per model in `out/screen/` holding each call's full answer, verdict, flagged transfer ids, tokens, cost and latency. Scored runs, with each model's reason in its own words, are in the `runs` list of the results files above.
