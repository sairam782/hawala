# Model screen: every Nicrron chat model on the Rings bench

**Round one done.** 66 chat models in the catalog, 1,678 model calls so far, $22.30 spent. Written 2026-10-17 14:57 by `screen.py report`; every number below is read from the scored files it names, so rerun it rather than editing this file.

## Round one: every chat model on 20 neighborhoods

A stratified 20 of the 60: 7 laundering groups across shapes and 13 ordinary neighborhoods. It only decides who gets the full run, so the ranges are wide by design.

| # | Model | Run | F1 | 95% range | P(top 3) | Precision | Recall | Rings caught | False alarms | Errors | Cost | $ per ring | Median |
|---:|---|---:|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | openai/gpt-5.6-terra | 20/20 | 0.774 | 0.38 to 0.94 | 72% | 66% | 93% | 4 of 7 | 1 of 13 |  | $0.25 | $0.061 | 6.1 s |
| 2 | openai/gpt-6-astra | 20/20 | 0.772 | 0.42 to 0.95 | 74% | 63% | 100% | 6 of 7 | 1 of 13 |  | $0.74 | $0.123 | 5.3 s |
| 3 | anthropic/claude-fable-5-1 | 20/20 | 0.757 | 0.38 to 0.92 | 57% | 63% | 95% | 5 of 7 | 2 of 13 |  | $1.53 | $0.306 | 12.7 s |
| 4 | openai/gpt-5.6-sol | 20/20 | 0.724 | 0.34 to 0.92 | 28% | 58% | 95% | 5 of 7 | 3 of 13 |  | $0.57 | $0.114 | 7.1 s |
| 5 | anthropic/claude-opus-5-5 | 20/20 | 0.719 | 0.28 to 1.00 | 44% | 71% | 73% | 5 of 7 | 0 of 13 |  | $0.49 | $0.097 | 6.5 s |
| 6 | openai/gpt-6.1-sol | 20/20 | 0.636 | 0.24 to 0.87 | 3% | 48% | 95% | 5 of 7 | 3 of 13 |  | $0.15 | $0.031 | 8.5 s |
| 7 | openai/gpt-6-sol † | 20/20 | 0.603 | 0.19 to 0.83 | 1% | 45% | 93% | 4 of 7 | 4 of 13 |  | $0.21 | $0.051 | 5.9 s |
| 8 | openai/gpt-5.5 | 20/20 | 0.594 | 0.18 to 0.83 | 3% | 44% | 93% | 4 of 7 | 4 of 13 |  | $0.87 | $0.218 | 11.4 s |
| 9 | xai/grok-4.6 | 20/20 | 0.562 | 0.18 to 0.82 | 0% | 40% | 93% | 4 of 7 | 4 of 13 |  | $0.63 | $0.159 | 71.5 s |
| 10 | anthropic/claude-sonnet-5-5 † | 20/20 | 0.547 | 0.17 to 0.81 | 0% | 39% | 93% | 4 of 7 | 4 of 13 |  | $0.30 | $0.075 | 7.7 s |
| 11 | openai/gpt-5 | 20/20 | 0.527 | 0.03 to 0.78 | 1% | 40% | 77% | 3 of 7 | 4 of 13 | 1 | $0.72 | $0.239 | 22.2 s |
| 12 | openai/gpt-6-luna † | 20/20 | 0.522 | 0.04 to 0.81 | 2% | 42% | 68% | 3 of 7 | 2 of 13 |  | $0.02 | $0.006 | 11.0 s |
| 13 | anthropic/claude-haiku-5-5 † | 20/20 | 0.420 | 0.11 to 0.65 | 0% | 27% | 93% | 4 of 7 | 8 of 13 |  | $0.02 | $0.005 | 7.3 s |
| 14 | anthropic/claude-opus-4-5 | 20/20 | 0.417 | 0.02 to 0.70 | 0% | 29% | 77% | 3 of 7 | 7 of 13 |  | $0.35 | $0.117 | 4.9 s |
| 15 | openai/gpt-4o | 20/20 | 0.390 | 0.03 to 0.68 | 0% | 31% | 52% | 2 of 7 | 4 of 13 |  | $0.14 | $0.070 | 1.3 s |
| 16 | anthropic/claude-opus-5 | 20/20 | 0.387 | 0.10 to 0.62 | 0% | 24% | 95% | 5 of 7 | 11 of 13 |  | $0.84 | $0.167 | 14.4 s |
| 17 | xai/grok-4.7 † | 20/20 | 0.385 | 0.00 to 0.75 | 1% | 44% | 34% | 1 of 7 | 1 of 13 |  | $0.70 | $0.701 | 53.9 s |
| 18 | anthropic/claude-fable-5 | 20/20 | 0.360 | 0.10 to 0.60 | 0% | 22% | 98% | 5 of 7 | 11 of 13 |  | $1.59 | $0.318 | 14.6 s |
| 19 | xai/grok-4.20 | 20/20 | 0.347 | 0.06 to 0.61 | 0% | 22% | 84% | 3 of 7 | 6 of 13 |  | $0.31 | $0.103 | 49.5 s |
| 20 | xai/grok-code-fast-1 | 20/20 | 0.344 | 0.03 to 0.68 | 0% | 27% | 48% | 2 of 7 | 2 of 13 |  | $0.31 | $0.155 | 34.3 s |
| 21 | xai/grok-4.5 | 20/20 | 0.335 | 0.09 to 0.55 | 0% | 20% | 93% | 3 of 7 | 9 of 13 |  | $0.32 | $0.107 | 28.2 s |
| 22 | openai/gpt-5.1 | 20/20 | 0.333 | 0.14 to 0.57 | 0% | 22% | 66% | 2 of 7 | 2 of 13 |  | $0.09 | $0.047 | 1.7 s |
| 23 | openai/o3 | 20/20 | 0.326 | 0.09 to 0.55 | 0% | 20% | 98% | 4 of 7 | 12 of 13 |  | $0.42 | $0.104 | 9.5 s |
| 24 | deepseek/deepseek-flash | 20/20 | 0.300 | 0.04 to 0.54 | 0% | 18% | 82% | 4 of 7 | 11 of 13 |  | $0.14 | $0.035 | 19.4 s |
| 25 | z-ai/glm-5.3 † | 20/20 | 0.293 | 0.09 to 0.49 | 0% | 18% | 82% | 3 of 7 | 8 of 13 |  | $0.11 | $0.035 | 5.7 s |
| 26 | moonshot/kimi-k3 † | 20/20 | 0.291 | 0.07 to 0.51 | 0% | 17% | 95% | 4 of 7 | 12 of 13 |  | $0.31 | $0.077 | 13.1 s |
| 27 | openai/gpt-5.4-mini | 20/20 | 0.291 | 0.09 to 0.45 | 0% | 18% | 77% | 3 of 7 | 9 of 13 |  | $0.05 | $0.018 | 1.4 s |
| 28 | anthropic/claude-opus-4-8 | 20/20 | 0.290 | 0.07 to 0.49 | 0% | 17% | 95% | 4 of 7 | 12 of 13 |  | $0.45 | $0.113 | 4.5 s |
| 29 | xai/grok-4.3 | 20/20 | 0.288 | 0.00 to 0.61 | 0% | 21% | 45% | 2 of 7 | 5 of 13 |  | $0.11 | $0.053 | 8.2 s |
| 30 | openai/gpt-4o-mini | 20/20 | 0.275 | 0.00 to 0.78 | 6% | 100% | 16% | 1 of 7 | 0 of 13 |  | $0.01 | $0.008 | 1.2 s |
| 31 | openai/gpt-5.2 | 20/20 | 0.266 | 0.02 to 0.56 | 0% | 18% | 48% | 2 of 7 | 6 of 13 |  | $0.15 | $0.073 | 3.7 s |
| 32 | openai/gpt-5.4-nano | 20/20 | 0.264 | 0.00 to 0.70 | 2% | 78% | 16% | 1 of 7 | 0 of 13 |  | $0.01 | $0.013 | 1.3 s |
| 33 | mistral/mistral-medium-3.5 | 20/20 | 0.264 | 0.00 to 0.70 | 4% | 78% | 16% | 1 of 7 | 0 of 13 |  | $0.11 | $0.113 | 1.5 s |
| 34 | z-ai/glm-5.3-flash | 20/20 | 0.258 | 0.04 to 0.49 | 0% | 16% | 66% | 3 of 7 | 8 of 13 |  | $0.01 | $0.004 | 5.2 s |
| 35 | anthropic/claude-opus-4-6 | 20/20 | 0.257 | 0.01 to 0.46 | 0% | 15% | 75% | 2 of 7 | 10 of 13 |  | $0.43 | $0.216 | 7.8 s |
| 36 | anthropic/claude-sonnet-5 | 20/20 | 0.254 | 0.03 to 0.46 | 0% | 15% | 82% | 3 of 7 | 11 of 13 |  | $0.43 | $0.144 | 16.5 s |
| 37 | openai/gpt-5.4 | 20/20 | 0.248 | 0.00 to 0.59 | 0% | 21% | 30% | 1 of 7 | 4 of 13 |  | $0.18 | $0.177 | 3.0 s |
| 38 | xai/grok-4.20-non-reasoning | 20/20 | 0.246 | 0.00 to 0.61 | 0% | 38% | 18% | 1 of 7 | 0 of 13 |  | $0.07 | $0.069 | 2.0 s |
| 39 | anthropic/claude-sonnet-4-6 | 20/20 | 0.242 | 0.04 to 0.41 | 0% | 14% | 84% | 2 of 7 | 11 of 13 |  | $0.26 | $0.131 | 6.7 s |
| 40 | anthropic/claude-opus-4-7 | 20/20 | 0.240 | 0.04 to 0.42 | 0% | 14% | 84% | 1 of 7 | 13 of 13 |  | $0.44 | $0.444 | 5.1 s |
| 41 | deepseek/deepseek-v4-pro † | 20/20 | 0.236 | 0.03 to 0.48 | 0% | 15% | 57% | 3 of 7 | 11 of 13 | 4 | $0.63 | $0.211 | 102.6 s |
| 42 | z-ai/glm-5.2 | 20/20 | 0.233 | 0.02 to 0.41 | 0% | 14% | 75% | 2 of 7 | 11 of 13 |  | $0.26 | $0.128 | 15.7 s |
| 43 | mistral/mistral-large-3 | 20/20 | 0.231 | 0.02 to 0.43 | 0% | 14% | 64% | 3 of 7 | 10 of 13 |  | $0.04 | $0.013 | 3.1 s |
| 44 | moonshot/kimi-k2.7-code-highspeed | 20/20 | 0.229 | 0.00 to 0.48 | 0% | 15% | 50% | 2 of 7 | 8 of 13 | 3 | $1.30 | $0.648 | 41.9 s |
| 45 | z-ai/glm-5.3-flashx | 20/20 | 0.212 | 0.02 to 0.40 | 0% | 13% | 57% | 2 of 7 | 11 of 13 |  | $0.03 | $0.014 | 3.3 s |
| 46 | openai/gpt-4.1-mini | 20/20 | 0.210 | 0.00 to 0.56 | 0% | 25% | 18% | 1 of 7 | 0 of 13 |  | $0.02 | $0.022 | 1.3 s |
| 47 | openai/gpt-5.6-luna | 20/20 | 0.209 | 0.02 to 0.41 | 0% | 14% | 39% | 2 of 7 | 6 of 13 |  | $0.03 | $0.015 | 6.9 s |
| 48 | mistral/ministral-14b | 20/20 | 0.208 | 0.07 to 0.34 | 0% | 12% | 66% | 0 of 7 | 5 of 13 |  | $0.02 | – | 6.4 s |
| 49 | z-ai/glm-5 | 20/20 | 0.207 | 0.03 to 0.42 | 0% | 12% | 61% | 2 of 7 | 9 of 13 |  | $0.19 | $0.096 | 24.6 s |
| 50 | openai/gpt-5-nano | 20/20 | 0.199 | 0.04 to 0.35 | 0% | 12% | 52% | 2 of 7 | 8 of 13 | 1 | $0.04 | $0.019 | 22.3 s |
| 51 | mistral/codestral | 20/20 | 0.195 | 0.01 to 0.31 | 0% | 11% | 77% | 1 of 7 | 10 of 13 |  | $0.02 | $0.024 | 2.3 s |
| 52 | openai/gpt-5-mini | 20/20 | 0.190 | 0.04 to 0.37 | 0% | 11% | 70% | 3 of 7 | 13 of 13 |  | $0.10 | $0.032 | 20.6 s |
| 53 | z-ai/glm-4.5 | 20/20 | 0.180 | 0.01 to 0.39 | 0% | 11% | 52% | 2 of 7 | 12 of 13 | 3 | $0.12 | $0.062 | 64.4 s |
| 54 | mistral/mistral-large-4 † | 20/20 | 0.163 | 0.03 to 0.33 | 0% | 10% | 55% | 2 of 7 | 10 of 13 |  | $0.09 | $0.047 | 4.9 s |
| 55 | z-ai/glm-5.1 | 20/20 | 0.158 | 0.01 to 0.35 | 0% | 9% | 52% | 2 of 7 | 13 of 13 | 3 | $0.28 | $0.138 | 77.7 s |
| 56 | openai/gpt-4.1 | 20/20 | 0.142 | 0.00 to 0.34 | 0% | 11% | 20% | 1 of 7 | 4 of 13 |  | $0.12 | $0.119 | 1.7 s |
| 57 | anthropic/claude-haiku-4-5 | 20/20 | 0.134 | 0.00 to 0.34 | 0% | 10% | 20% | 1 of 7 | 5 of 13 |  | $0.07 | $0.074 | 3.2 s |
| 58 | mistral/mistral-small-4 | 20/20 | 0.124 | 0.00 to 0.30 | 0% | 9% | 23% | 1 of 7 | 10 of 13 |  | $0.01 | $0.012 | 1.6 s |
| 59 | moonshot/kimi-k2.7-code | 20/20 | 0.083 | 0.00 to 0.24 | 0% | 5% | 18% | 1 of 7 | 10 of 13 | 2 | $0.37 | $0.375 | 94.0 s |
| 60 | mistral/ministral-3b | 20/20 | 0.000 | 0.00 to 0.00 | 0% | 0% | 0% | 0 of 7 | 0 of 13 |  | $0.01 | – | 1.4 s |
| 61 | mistral/ministral-8b | 20/20 | 0.000 | 0.00 to 0.00 | 0% | 0% | 0% | 0 of 7 | 0 of 13 |  | $0.01 | – | 3.3 s |
| 62 | moonshot/kimi-k2.6 | 20/20 | 0.000 | 0.00 to 0.00 | 0% | 0% | 0% | 0 of 7 | 4 of 13 | 7 | $0.66 | – | 87.5 s |

**Not ranked: the provider would not serve them.** More than a quarter of these models' calls failed at the provider (rate limits, upstream timeouts) even after slow retries, so they were never really asked. Scoring them would rank an outage, not a model.

| Model | Calls that failed at the provider |
|---|---:|
| z-ai/glm-4.5-air | 10 of 20 |
| z-ai/glm-4.6 | 11 of 20 |
| z-ai/glm-4.7 | 16 of 20 |
| z-ai/glm-5-turbo | 20 of 20 |

## How to read the tables

- **F1** balances precision and recall over individual transfers, scored against IBM's labels. It is the ranking rule, fixed before any run.
- **95% range** comes from resampling the neighborhoods 2,000 times, the same draw for every model. Where two models' ranges overlap, their order could flip on other data.
- **P(top 3)** is the share of resamples in which the model finished in the top 3.
- **Noise.** Rerunning the same model on the same cases changes 8 to 12% of verdicts and moves F1 by about 0.07 (test.md, section 5). A gap smaller than that between two models is not evidence.
- **Rings caught** means the model called the neighborhood a ring, flagged at least half of IBM's labeled transfers, and did not sweep (its wrong flags did not outnumber the ring).
- **False alarms** are ordinary neighborhoods the model called a ring. **Errors** are calls that failed or gave no readable answer, after fair retries; they count as flagging nothing.
- **Cost** is Nicrron's list price times the tokens each call reported. **Median** is the median time to answer.
- † marks the nine models the bench ran earlier (data/bench_results.json), joined here and rescored with the same rules; every other row ran in this screen.

## Method

- Data: IBM AMLworld HI-Small, synthetic. Labels come from IBM's generator, not from us or from a model. Same 60 neighborhoods for every model (data/units.json).
- Prompt: the bench's v2 (raw transfers plus code-computed facts: degrees, loops, bursts, pass-through chains), with the answer format every v2 run on the board used. Temperature 0, one run per model per neighborhood.
- Rounds: all 57 models the bench had not run were screened on the stratified 20. The ten best overall ran all 60, plus gpt-5 (11th, two of its calls lost to provider outages). The top five then ran held-out C.
- Fair retries: calls that failed at the provider (429, 5xx, timeouts) and calls that ran out of tokens were retried; a model that answered but unreadably was not re-asked. Answers rejected only for JSON style (comments, raw line breaks) were re-read from the stored text.
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
