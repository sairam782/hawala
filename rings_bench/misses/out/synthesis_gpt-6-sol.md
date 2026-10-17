The unit of counting below is a **case**, not a vendor post-mortem. There are 60 distinct cases.

### 1. Failure classes

| Failure class | Cases | Vendor agreement |
|---|---:|---|
| A lone labeled transfer has no visible ring structure, or is lost among ordinary rows | 23 | Strong on the diagnosis; weak on whether an anomaly can identify the exact transfer |
| Recurring payments or time-only pass-throughs are mistaken for laundering | 18 | Strong, although vendors differ on how tightly amounts must match |
| Short chains are missed or their hops are cut off | 7 | Strong on checking two-hop paths; mixed on accepting unequal amounts or different currencies |
| The model chooses the wrong motif or transfer IDs, often favoring a burst over a fan or linked hub | 7 | Mixed on the specific fix |
| An ordinary burst is treated as a scheme | 5 | Strong that a burst alone is insufficient; mixed on whether onward movement must be required |

These are practical groupings. For example, vendors split some chain errors between “chain cut short” and “pass-through guess.”

### 2. What the data cannot establish

**No missed-ring case has a unanimous vendor finding of “not recoverable.”** The clearest disputed example is **heldout_a:u25**: four vendors say the lone labeled ID cannot be identified from this neighborhood; one sees a possible clue. Multiple vendors also say “no” for **main:u19 and u28, heldout_a:u34 and u53, and heldout_c:u01 and u34**. Other missed-ring cases received a “no” from one or two vendors, often against “partly” findings. Those judgments should not be turned into a definitive list of impossible cases.

The underlying problem is real: an IBM label can mark one ordinary-looking transfer while the distinguishing path or account history lies outside the supplied rows. A prompt cannot reconstruct an unseen label. Some vendors also answered “no” on **false-ring** cases. That generally means the rows cannot prove illicit intent, not that the ordinary answer is impossible.

Score structural ring detection separately from exact-ID detection for lone labels. For disputed lone cases, obtain the full IBM path or independent transaction evidence, or permit **unidentifiable/review** and report those results separately. Do not reward guessing an ACH ID from the label distribution.

### 3. Proposed v6 prompt edits

Add these exact sentences; the risks are part of the change review, not prompt text.

| Exact sentence | Addresses | Risk |
|---|---|---|
| “Before deciding ordinary, check time-ordered two-transfer paths through one account; a chain may stop at the edge of this neighborhood, and a currency change or unequal amounts does not by itself rule it out.” | Short chains | More coincidental paths look plausible |
| “A listed pass-through pair means only that a receipt came before a payment; assess amount compatibility, currency, recurrence, and whether the same transfer was reused in several proposed pairs.” | False pass-throughs | Strict interpretation could miss splits, gathers, or conversion |
| “Repeated fixed amounts on the same route or a replayed payment batch are ordinary evidence unless a separate, specific flow supports a scheme.” | Recurring-payment false alarms | Could hide laundering blended into routine payments |
| “Check individual transfers for a possible lone case, but do not name an exact ID from ACH format, a large amount, a new counterparty, or burst membership alone; if comparable rows remain, say the exact ID is unidentifiable.” | Lone misses and wrong IDs | More abstentions may lower forced-choice recall |
| “Compare sustained one-to-many sending and linked hub activity with any short burst before choosing the pattern; list only transfers supported by the chosen flow.” | Wrong motif and rows | May omit real parallel legs |
| “A burst alone is a review clue, not proof of laundering; seek an independent linked leg or transaction-specific evidence.” | Ordinary-burst false alarms | May miss a genuine fan-in ending at a sink |

**Remove or qualify any sentence that makes the main-slice ACH label observation a rule for heldout slices.** Its risk is lower recall on legitimate non-ACH rings. Also remove any automatic instruction that rewrites a low-confidence ring to ordinary; send it to review instead, at the cost of a larger review queue.

### 4. System changes, ranked by value for effort

1. **Fix the facts before adding rules.** Show recurring-pair counts and label time-only joins as such. For each candidate flow, show chronological IDs, amount ratio, currency, and reused edges. Put exact or near-matched, non-overlapping flows first without deleting unmatched paths. This directly targets many false rings at moderate effort.
2. **Add a second pass over omitted candidates.** Enumerate two-hop paths through 48 to 72 hours, including cross-currency paths, plus sustained distinct-recipient fan-outs and linked collectors. Rank candidates rather than applying an automatic laundering threshold. Moderate effort; tests chain recall.
3. **Add a separate transaction-level review path.** Supply sender and recipient history, recurrence, format rarity, and comparable-amount baselines for lone candidates. Do not automatically turn an outlier or sole ACH row into a ring. Higher effort, but necessary for exact-ID claims.
4. **Change verdict handling and evaluation.** Route low-confidence findings to review; support an unidentifiable exact-ID outcome. Apply any slice-specific label constraint only after verifying that slice. Relatively low engineering effort, with a scoring-policy decision required.

### 5. First measurement

Run v4 and v6 on the same frozen cases and compare **ring recall, false-ring rate, and exact transfer-ID precision and recall**, broken out by slice and the five classes above. Inspect every v4 hit lost by v6, especially short or cross-currency chains, sink fan-ins, and non-ACH heldout fans. Report review and abstention rates separately so fewer false alarms cannot masquerade as an improvement bought by silently losing rings.