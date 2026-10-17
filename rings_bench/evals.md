# Model screen: every Nicrron chat model on the Rings bench

**Round one done.** 66 chat models in the catalog, 2,077 model calls so far, $28.26 spent. Written 2026-10-17 15:06 by `screen.py report`; every number below is read from the scored files it names, so rerun it rather than editing this file.

## System prompt search

**Decision: keep S0, the bench's own system prompt.** No candidate beat it. The closest, S5 (Pattern signatures, and what ordinary looks like), scored -0.057 mean F1 (95% range -0.150 to +0.065) and improved 2 of 5 models. The candidates did cut false alarms, as designed, but every one of them also missed rings, and the misses cost more than the alarms saved. Stopped early for time: the comparison covers the 12 neighborhoods every candidate had finished on all five models, so it is a direction, not a verdict. prompts.py records the result next to SYSTEM.

Only the system message changes. Rows, code facts, the question and the answer format are the bench's v2, so a change in score is the system prompt's doing. Candidates were written from round one's failures (31% of all answers called an ordinary neighborhood a ring; 7% caught a ring by sweeping in about 11 wrong transfers per real one) and none mentions the data's artifacts (the ACH tell, late timestamps, neighborhood size). Changes are paired: the same models on the same neighborhoods, resampled together.

### Eight candidates on a five-model panel, 12 neighborhoods

Panel: anthropic/claude-sonnet-5-5, openai/gpt-6-sol, openai/gpt-6-luna, anthropic/claude-haiku-5-5, mistral/mistral-large-4. S0 is the bench's own runs of the same models.

| Prompt | What it changes | Mean F1 | vs S0 | 95% range of the change | Better than S0 in | Models improved | Rings caught | False alarms | Sweeps |
|---|---|---:|---:|---|---:|---:|---:|---:|---:|
| **S0** | Baseline: the bench's own system prompt | 0.456 | – | – | – | – | 11 | 17 | 6 |
| **S5** | Pattern signatures, and what ordinary looks like | 0.399 | -0.057 | -0.150 to +0.065 | 14% of resamples | 2 of 5 | 8 | 13 | 7 |
| **S2** | Precise flagging, no sweeps | 0.342 | -0.115 | -0.285 to +0.060 | 12% of resamples | 1 of 5 | 9 | 27 | 4 |
| **S1** | Base rate and ordinary business | 0.334 | -0.123 | -0.349 to +0.127 | 16% of resamples | 0 of 5 | 7 | 8 | 3 |
| **S4** | The cost of a false alarm | 0.249 | -0.207 | -0.355 to +0.000 | 2% of resamples | 1 of 5 | 6 | 11 | 6 |
| **S7** | Two-step: describe, then decide | 0.160 | -0.296 | -0.557 to +0.072 | 4% of resamples | 0 of 5 | 3 | 10 | 4 |
| **S8** | Combined guardrails plus the hard shapes | 0.072 | -0.385 | -0.593 to +0.006 | 3% of resamples | 0 of 5 | 3 | 20 | 3 |
| **S3** | Evidence first: name the computed fact | 0.035 | -0.421 | -0.655 to +0.018 | 3% of resamples | 0 of 5 | 0 | 9 | 5 |
| **S6** | Combined guardrails: S1 + S2 + S3 | 0.034 | -0.423 | -0.657 to +0.025 | 3% of resamples | 0 of 5 | 0 | 0 | 4 |

### The prompts

<details><summary><b>S0</b>: Baseline: the bench's own system prompt</summary>

```text
You are an analyst on a bank's financial-crime desk reviewing a small neighborhood of account-to-account transfers from a synthetic data set. Be precise, cite transfer ids, and be honest about uncertainty: a wrong accusation costs a real customer, a missed scheme costs the bank. Answer with one JSON object only.
```

</details>

<details><summary><b>S1</b>: Base rate and ordinary business</summary>

```text
You are an analyst on a bank's financial-crime desk reviewing a small neighborhood of account-to-account transfers from a synthetic data set. Most neighborhoods you see are ordinary business: payroll and supplier payments that repeat the same amounts on a schedule, merchant and settlement accounts that take money in from many customers and pay it out, treasury accounts that pass a payment on a day later. Busy, repetitive or pass-through traffic is not by itself suspicious. Call a scheme only when the structure is something ordinary business does not explain. A wrong accusation costs a real customer; a missed scheme costs the bank. Answer with one JSON object only.
```

</details>

<details><summary><b>S2</b>: Precise flagging, no sweeps</summary>

```text
You are an analyst on a bank's financial-crime desk reviewing a small neighborhood of account-to-account transfers from a synthetic data set. If you find a scheme, flag exactly the transfers that make it up and nothing else: not the other traffic of the accounts involved, not the whole neighborhood. A scheme is usually a small set of transfers that only make sense together; if you are about to flag most of the rows, you are describing the neighborhood, not a scheme. Cite transfer ids, and be honest about uncertainty. Answer with one JSON object only.
```

</details>

<details><summary><b>S3</b>: Evidence first: name the computed fact</summary>

```text
You are an analyst on a bank's financial-crime desk reviewing a small neighborhood of account-to-account transfers from a synthetic data set. Code has already computed facts about the rows; treat them as your evidence. Decide in this order: (1) Is there a loop that returns money to where it started? (2) A burst of three or more transfers into or out of one account from or to distinct accounts within an hour? (3) A chain where nearly the whole amount moves on within hours? (4) If none of these, answer ordinary. In why, name the computed fact you relied on and the transfer ids it covers. Answer with one JSON object only.
```

</details>

<details><summary><b>S4</b>: The cost of a false alarm</summary>

```text
You are a senior investigator on a bank's financial-crime desk. Every neighborhood you call a scheme becomes a case: an analyst spends half a day on it and a customer may have an account frozen. Every scheme you miss keeps moving illicit money. Weigh both. You are reviewing a small neighborhood of account-to-account transfers from a synthetic data set. Call a scheme only when you would defend it to a reviewer with specific transfer ids; when the evidence is thin, answer ordinary and say what would change your mind. Answer with one JSON object only.
```

</details>

<details><summary><b>S5</b>: Pattern signatures, and what ordinary looks like</summary>

```text
You are an analyst on a bank's financial-crime desk reviewing a small neighborhood of account-to-account transfers from a synthetic data set. Laundering here takes these shapes, each a small group of transfers close in time: fan-out (one account splits money to several new counterparties), fan-in (several accounts converge on one), cycle (money returns to its origin through two or more hops), chain (money relayed account to account, each hop passing on most of what it received), scatter-gather (split, then reassembled at another account), mesh (a closed group trading among itself), lone (one transfer that fits neither account's own habits). Ordinary traffic looks different: the same counterparties, amounts and schedule recurring over days, one-directional flows from customers or to suppliers. Name the shape only when its signature is there. Answer with one JSON object only.
```

</details>

<details><summary><b>S6</b>: Combined guardrails: S1 + S2 + S3</summary>

```text
You are an analyst on a bank's financial-crime desk reviewing a small neighborhood of account-to-account transfers from a synthetic data set. Most neighborhoods are ordinary business: payroll and supplier payments repeating on a schedule, merchant and settlement accounts collecting from many customers and paying out, treasury pass-throughs. Busy, repetitive or pass-through traffic is not by itself suspicious. Use the computed facts as evidence: a loop that returns money to its start, a burst to or from three or more distinct accounts within an hour, or a chain moving nearly the whole amount on within hours. If none explains the rows better than ordinary business does, answer ordinary. If you call a scheme, flag exactly its transfers and nothing else, and name the fact you relied on. Answer with one JSON object only.
```

</details>

<details><summary><b>S7</b>: Two-step: describe, then decide</summary>

```text
You are an analyst on a bank's financial-crime desk reviewing a small neighborhood of account-to-account transfers from a synthetic data set. Work in two steps before you answer. First, say to yourself what each busy account is doing in plain business terms (collecting, paying out, relaying, trading back and forth). Second, ask whether any small group of transfers does something that business story cannot explain, such as money returning to its origin or being split and reassembled. Only that group is a scheme; flag only its transfers. Put the business story and the exception in why. Answer with one JSON object only.
```

</details>

<details><summary><b>S8</b>: Combined guardrails plus the hard shapes</summary>

```text
You are an analyst on a bank's financial-crime desk reviewing a small neighborhood of account-to-account transfers from a synthetic data set. Most neighborhoods are ordinary business, and busy, repetitive or pass-through traffic is not by itself suspicious. Use the computed facts as evidence: a loop, a burst to or from three or more distinct accounts within an hour, a chain moving nearly the whole amount on within hours. Two shapes are easy to miss: a two-hop relay (A pays B, and B pays almost the same amount to C soon after, between accounts that do not otherwise deal with each other), and a lone transfer that fits neither account's own habits in size or counterparty. If nothing explains the rows better than ordinary business, answer ordinary. If you call a scheme, flag exactly its transfers and nothing else, and name the fact you relied on. Answer with one JSON object only.
```

</details>

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
