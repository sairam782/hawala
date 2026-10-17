# SMURF: pitch draft v2 (about 3 minutes; Money Intelligence track)

Pencil, Claude's draft at 14:05, rewritten for the staged demo (search, ambiguous, look closer, settled). The
numbers come from `data/bench_results.json`, `data/panel.json` and `data/investigate.json`; the page reads them. Alex and
the team rewrite this in their own words. No slides: the story lives in the clearing page.

**The person (15 s).** A financial-crime investigator at a bank, Monday, 9:00. The monitoring rules raised 41 alerts
overnight. On the data we used, the first rule anyone writes is right 0.75 percent of the time. She reads everything,
because nobody tells her which alerts to trust, and nothing tells her which ones a second look would settle.

**The idea (20 s).** Run a cheap first pass over everything, let it clear what it is sure about, show the human what
it could not settle, and spend the expensive model only there. Every call is scored against the data's own labels, so
we know, by shape, where each model can be trusted and where they all fail together.

**The data, said once (20 s).** IBM's synthetic bank world: 5 million transfers, one in 981 laundering, labels from
the generator that knows where the illicit money went. We cut 60 neighborhoods: 20 hold one of IBM's labeled groups
(IBM's own names: cycle, fan-in, fan-out, scatter-gather, stack, and single transfers with no shape), 40 are ordinary.
Enriched on purpose; shape names checked against IBM's pattern file; one run per cell.

**The demo, four stages (80 s, the clearing page).**
1. *Search.* The whole slice is lit: 2,824 transfers, 1,797 accounts, the real graph. Claude Sonnet 5.5 reads the
   60 neighborhoods one by one with code facts and a Knowledge Base lookup of IBM's shapes (a real PRISM retrieval
   step). What it rules ordinary fades. What it catches traces green in place: 9 of IBM's 20 rings, 100 of 113
   laundering transfers, 2 alarms on ordinary neighborhoods, both on accounts that sit inside a ring.
2. *Ambiguous.* The pass could not settle 30 neighborhoods: it called a ring at low confidence, or the nine model
   families split on it. They pulse amber and drop to the tray. Seven of them are IBM rings, the hard ones: lone
   transfers and two-hop chains that every family missed.
3. *Look closer.* One click sends Claude Opus 5.5 with the fullest setup through the tray. It clears all 23 ordinary
   neighborhoods with no false alarm and finds 2 of the 7 hidden rings, both lone transfers nobody else caught. Cost
   for the 30: about 65 cents.
4. *Settled.* What is left lit is what is worth a human's time: 11 rings in green. Then the 5 it still missed appear
   dotted, because we show what we miss.
Click any cluster to zoom: every transfer as its own line, direction, amounts, IBM's label beside the model's call.

**What we found (30 s, the dial and the slices).**
1. The strong families find the structured shapes; all of them miss lone transfers and most two-hop chains, which is
   also where the published detectors fail (38 percent of this data's laundering is in no named shape).
2. The cost is false alarms. Sonnet's own confidence is the first fix: keep a ring call only above low confidence, and
   false rings fall 5 to 2 on this slice and hold on three slices it never saw (11 to 1, 17 to 5, 12 to 7).
3. The families agree on IBM's groups and split on ordinary ones. The dial on the page asks how many families must
   agree: 7 of 9 cuts false rings from 39 to 5. Disagreement is the signal that sends a case to the tray.
4. Hide the payment format and Sonnet's precision falls 0.46 to 0.27: the data has a tell, and we say so.

**The PRISM beat (20 s).** Every run is a PRISM session with the tool steps shown; the v3 runs carry a real
Knowledge Base retrieval step; an evaluator task scores v1 and v3 on the same ten inputs; an alert fired when a family
took 29 seconds on a run. Root Cause clustering timed out on our shared practice workspace over 1,500 failed runs; the
failures-by-shape grid on the page is the same picture, computed by us.

**The honest limit (15 s).** Synthetic data, enriched slice, one run per cell, and every laundering transfer in the
slice is an ACH transfer, which a model can learn as a shortcut. On clean traffic with no laundering in reach the
strong models still alarm on 1 in 5 neighborhoods; the v5 framing cuts it to 1 in 10. We are not claiming detection;
we are claiming calibration and triage.

**The line (10 s).** The rule floods you. The first pass clears the floor. The second look spends the expensive model
only where it is needed, and you can see every call it made.

## Q&A card (from the mock judges, with today's answers)
- "Show me the PRISM trace." Any run on the page: steps, reason, ids, the alert; the v3 runs show the retrieval step.
- "How do you know it is the right row, not a matching number?" Every flagged id is scored against IBM's label for
  that exact transfer; precision counts the wrong rows; a ring counts as caught only when at least half its transfers
  are flagged without sweeping the neighborhood.
- "Does it hold on new data?" The confidence rule was found on one slice and checked on three it never saw. One run
  per cell; we say so.
- "Who set the ground truth?" IBM's generator; the shape names are IBM's where its pattern file names them.
- "Why Opus only on the tray?" It is the expensive model. On the 30 unsettled cases it raised no false alarm and found
  two rings nobody else did; running it on all 60 would cost twice as much for the same catches on the easy ones.
- "What does the AI add over the rules?" On this slice: fewer false alarms than the one-line rule at similar recall,
  a reason in words with cited rows, and a triage of what a human should read first.
- "Why does it miss the single transfers?" Eight of IBM's twenty rings are one transfer each: one ACH row sitting
  inside an ordinary neighborhood of 11 to 28 rows, same amounts and currencies as its neighbors. IBM labels it
  laundering because its generator's hidden launderer made it, not because of anything in the row. There is no shape to
  find, so no model finds it from the rows; the only two ever caught (by the investigator) sat inside a small burst.
  Five rings were never found by any of 26 arms, all five single transfers. On real data these need a different
  instrument (account history, counterparty risk), and we score them on their own line rather than hide them.
- "Who pays?" The bank's financial-crime operations desk, per investigator seat, measured in alerts closed per hour.
