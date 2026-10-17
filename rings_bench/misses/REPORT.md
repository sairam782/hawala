# Why the ring hunters miss: a five-vendor post-mortem on every case the best prompt got wrong

Pencil, Claude's build on Alex's word (2026-10-17 13:02: "send out multiple agents from multiple vendors. they should look at
all the cases we missed and try to figure out why and also reason through what would make a better prompt or system").
Written 14:27. Evidence: 298 model answers through Nicrron (five vendors, 60 cases), one cross-family synthesis, and a code
tally. Everything is in `misses\out\` (answers.jsonl, tally.json, case_table.md, synthesis_gpt-6-sol.md, llm_ledger.jsonl).
Cost $9.96 for 356 ledger rows (the panel, two synthesis attempts, three Sonnet synthesis timeouts). No PRISM traces.

## What was done

- **The cases.** A case is a neighborhood where Claude Sonnet v4, the best version on every slice, either missed a ring
  (did not call ring with at least half the labeled transfers flagged) or called an ordinary neighborhood a ring. That is
  60 cases: 37 missed rings and 23 false rings, across main, heldout A, B, C and random clean.
- **The packet.** Each case went out with the raw rows, the code facts, the truth from IBM's labels (shape and labeled
  transfer ids, or "ordinary, nothing labeled in reach"), every model run's verdict, pattern, confidence, flagged count and
  one-sentence reason (up to 26 runs on main), the prompt the models saw, and the bench's known limits. Built by
  `miss_panel.py packet`.
- **The panel.** Five vendors, one answer each per case, as one JSON object: is the truth recoverable from the data, the
  evidence with transfer ids, why the models failed, a failure class from a fixed list, a prompt fix, a system fix, the risk
  of the fix, and a confidence. Claude Sonnet 5.5, GPT-6 Sol, Grok 4.7, DeepSeek v4 Pro, Kimi K3. 298 of 300 calls came
  back parsed (one Grok upstream timeout, one Sonnet answer that was not JSON).
- **The synthesis.** Code tallied the classes and the vendor agreement per case. GPT-6 Sol then wrote a synthesis over all
  298 findings (`out\synthesis_gpt-6-sol.md`). Claude Sonnet's synthesis call timed out upstream three times, twice on the full
  input and once on a condensed per-case version, so there is one written synthesis, from a different family than the model
  being fixed.

| vendor | answers | median seconds per answer | cost |
|---|---|---|---|
| Claude Sonnet 5.5 | 59 of 60 | 10 | $1.95 (includes the three failed synthesis attempts) |
| GPT-6 Sol | 60 of 60 | 11 | $1.16 (includes the synthesis) |
| Grok 4.7 | 59 of 60 | 82 | $3.81 |
| DeepSeek v4 Pro | 60 of 60 | 50 | $1.53 |
| Kimi K3 | 60 of 60 | 26 | $1.50 |

## The answer in plain words

**Two classes explain 37 of the 60 cases, and the five vendors agree on them.** On 33 cases all five vendors picked the
same failure class; on 42 at least four did.

1. **A lone labeled transfer with nothing around it (22 of the 37 missed rings).** Eight of the twenty rings in every slice
   are one labeled ACH transfer sitting in ordinary traffic. The vendors read the rows and say the same thing in different
   words: nothing in the neighborhood singles that transfer out. Where it sits inside a small burst (main u19, u28) the burst
   is a decoy: flagging the whole burst scores a hit on the labeled id and is wrong on the other two. The vendors voted
   "partly recoverable" on most of these and "not recoverable" on a few (heldout A u25: four of five said no). GPT-6 Sol's
   synthesis puts it plainly: an IBM label can mark one ordinary-looking transfer while the distinguishing evidence lies
   outside the supplied rows, and a prompt cannot reconstruct an unseen label.
2. **Recurring payments read as a scheme (15 of the 23 false rings).** The same amount, same route, every day or two,
   often across payment formats. The models call it a chain because the code facts list many pass-through pairs, and the
   pass-through list is a cross product of every inflow with every later outflow within 48 hours, so a busy middle account
   with standing payments produces 19 "pairs" out of a handful of real transfers. Main u35 is the type case: five identical
   71,020.50 cheques, then fixed amounts on fixed routes. All five vendors agree, on 13 of the 15.

**Three smaller classes cover most of the rest.**

3. **Chain cut short (6 missed rings).** Our "chain" rings are two-transfer fragments of IBM's longer stacks. The two
   labeled transfers sit 41 hours apart through a quiet middle account, with different amounts and sometimes different
   currencies, while a louder structure elsewhere in the rows (a cash hub, a burst) pulls the model's attention. The models
   either chased the loud structure or dismissed the pair because the amounts do not conserve.
4. **A burst is normal here (5 false rings, plus one missed ring).** Fourteen ACH transfers into one account from fourteen
   senders in 27 minutes looks like a fan-in and is payroll or merchant takings in this data. Random clean's false rings are
   mostly this. The vendors agree that a burst alone is a review signal, not proof.
5. **Wrong rows flagged or a hedged verdict (5 missed rings).** The model found the ring, named it, and then either flagged
   the wrong half of it (heldout A u05: it saw the loop and the gather as two stories) or called it at low confidence, which
   the v4 confidence rule turned into "ordinary" (heldout A u41, a clean fan-in).

**What this says about the numbers on the page.** Of the 37 missed rings, 22 are lone transfers the vendors judge
unrecoverable or only partly recoverable from the neighborhood. Scoring them as misses measures the cut of the data more
than the model. GPT-6 Sol's proposal, which I would adopt: score structural ring detection separately from lone-transfer
detection, and report the lone rings as their own line.

## Failure class by kind of case (majority vote of the five vendors)

| failure class | missed rings (of 37) | false rings (of 23) |
|---|---|---|
| lone transfer, no structure | 22 | 0 |
| recurring payments read as a scheme | 0 | 15 |
| chain cut short | 6 | 0 |
| a burst is normal here | 1 | 5 |
| wrong rows flagged | 3 | 0 |
| pass-through guess (time-only pairs taken as a chain) | 0 | 3 |
| hedged verdict turned to ordinary by the rule | 2 | 0 |
| format or currency tell (model leaned on ACH or currency) | 2 | 0 |
| other | 1 | 0 |

Agreement: 33 cases 5 of 5, 9 cases 4 of 5, 14 cases 3 of 5, 4 cases split. Recoverable from the data, by majority:
missed rings 35 "partly" and 2 "no"; false rings 8 "yes", 13 "partly", 2 "no". Per-case detail: `out\case_table.md`.

Each vendor's own leaning (its top class across all 60): Grok and GPT-6 Sol lean "lone, no structure"; Sonnet leans
"recurring payments"; DeepSeek alone used "format or currency tell" nine times; Kimi used "hedged verdict" four times. The
lineages disagree at the margins and agree on the center, which is what a panel is for.

## The proposed v6 prompt (sentences the vendors converged on)

Each sentence is tied to the class it addresses. The wording is the vendors' with light merging; the exact per-vendor
proposals are in `out\answers.jsonl` under `prompt_fix`.

| add to the prompt | addresses | risk |
|---|---|---|
| "Identical amounts that repeat on the same sender-to-receiver route at regular intervals are standing payments, not layering, even across several payment formats and even when the receiver forwards money within hours. Call a chain only when the amount leaving an account roughly matches what just arrived and the route does not repeat." | recurring payments (15 false rings) | laundering blended into routine payments would be missed |
| "A listed pass-through pair means only that a receipt came before a payment through the same account. It is not evidence by itself; check amount, currency, recurrence, and whether one transfer is reused in several pairs." | pass-through guess (3 false rings), and the same 15 | a split or a currency conversion could be dismissed |
| "A burst into or out of one account is a review signal, not proof. Call a fan-in or fan-out only if the collected money also moves onward within the rows, the amounts are near-identical or clustered just under a round figure, or the senders have no other activity." | a burst is normal here (5 false rings) | a real fan-in that ends at a sink account would be missed |
| "A chain can be only two transfers, through a quiet middle account, up to 72 hours apart, with amounts and currencies that differ. Before saying ordinary, check every time-ordered two-transfer path through an account with few other transfers, and list only the two supporting ids, not the account's other traffic." | chain cut short (6 missed rings) | more coincidental pairs become candidates |
| "A lone ring is a single transfer. Check for one, but do not name a transfer as the lone one on payment format, size, a new counterparty, or burst membership alone. If comparable rows remain, say the exact transfer cannot be identified from these rows." | lone transfers (22 missed rings), wrong rows flagged | more abstentions; forced-choice recall on lone rings falls, which is honest |
| "When you find a structure, list the transfers that make it up and nothing else. If the loop and a gather share an account, they are one scheme: flag both parts." | wrong rows flagged (3 missed rings) | parallel legs could be dropped |

Remove or change:

- The v4 and v5 rule that rewrites a low-confidence ring call to ordinary. Two clean rings were lost that way (heldout A
  u41 fan-in, heldout C u47). Route low-confidence ring calls to review instead, and count them as a separate line. The
  Jev gate measured earlier (`rings_bench\jev\REPORT.md`) is a better second check than the model's own confidence word
  on the held-out slices, and the two stack.
- Any sentence that turns the main slice's "every labeled transfer is ACH" into a rule. Heldout A has a ring with no ACH
  rows (ring 0, all Cash, Credit Card and Cheque). Several vendors proposed leaning harder on ACH; DeepSeek tagged nine cases
  as a format tell. It is a leak of the cut, not a feature of laundering (the UI thread measured the ACH rule at 0.84 percent
  precision on the whole file).

## System changes outside the prompt, ranked by value for the effort

1. **Fix the pass-through fact before adding rules (biggest win, an hour of code).** The 48-hour pass-through list is the
   single fact behind most false rings. Replace it with: pairs whose outgoing amount is within a stated band of the incoming
   one; mark each pair that reuses a transfer already in another pair; and add a separate "recurring route" fact: sender,
   receiver, count, the repeated amount, the interval. The model then reads "a recurring route" instead of "19 pass-through
   pairs". Jev read the same fact the same wrong way until a ruling named it, which is the same finding from the other side.
2. **A second pass for chain candidates (an hour).** Enumerate two-transfer paths through accounts with few other transfers,
   out to 72 hours, cross-currency allowed, ranked, and hand the top few to the model as named candidates. Tests chain
   recall directly on the 7 chain misses.
3. **Score lone rings on their own line (ten minutes, a scoring decision for Alex).** Report structural rings found of 12
   and lone rings found of 8 separately, and let the model say "cannot identify the exact transfer". The page's headline
   then stops punishing the model for a label the neighborhood does not carry.
4. **Replace the confidence rewrite with a review queue (an hour).** Low-confidence ring calls go to a third column, not
   to ordinary; the Jev structural score orders that queue. Measured on heldout B earlier: Sonnet's own low drop plus the Jev
   gate went from 17 false rings to 2 at 12 of 20 rings found.
5. **Transaction-level evidence for lone candidates (half a day, not for today).** Sender and receiver history outside the
   neighborhood, amount baselines per account, format rarity. This is what would make lone rings recoverable, and it
   needs rows the unit does not carry.

## What to measure first

Run v4 and v6 on the same frozen 60 cases plus the 60 units of heldout C (untouched by any prompt change) and compare:
rings found, false rings, transfer-id precision and recall, split by slice and by the five classes above. Read every v4
hit that v6 loses, especially cross-currency chains and fan-ins that end at a sink. Report the review-queue count as its own
number, so fewer false rings cannot be bought by silently dropping rings. Then the 60-unit caveat applies as always: every
count carries about plus or minus 4.

## Files

| file | what |
|---|---|
| `miss_panel.py` | `plan` (prices and cases, no calls), `packet --case ID`, `run` (resumable), `synth` |
| `out\answers.jsonl` | 300 records: case, vendor, the parsed answer, tokens, latency |
| `out\tally.json`, `out\case_table.md` | class votes per case and per vendor, agreement, recoverability |
| `out\synthesis_gpt-6-sol.md` | GPT-6 Sol's synthesis of all 298 findings (the Sonnet one failed upstream three times) |
| `out\llm_ledger.jsonl` | every Nicrron call with tokens and cost |
