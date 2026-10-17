# Rings bench: pitch draft (about 3 minutes; Money Operations track)

Pencil, Claude's draft at 11:50 on the numbers of five complete model arms; the final numbers live in
`data/bench_results.json` and `data/panel.json` and the page reads them. Alex and the team rewrite this in their own
words. No slides: the story lives in the page.

**The person (15 s).** A financial-crime investigator at a bank, Monday, 9:00. The monitoring rules raised 41 alerts
overnight. On the data we used, the first rule anyone writes is right 0.75 percent of the time. She reads everything,
because nobody tells her which alerts to trust.

**The idea (20 s).** Give the same pile of transfers to every AI model family we can reach, no answer key, and score
them against the data's own labels. Not "does AI find laundering" but "where can each model be trusted, by shape, at
what cost, and where do they all fail together." That is the second look an investigator can use.

**The data, said once (20 s).** IBM's synthetic bank world: 5 million transfers, one in 981 laundering, labels from
the generator that knows where the illicit money went. We cut 60 neighborhoods: 20 hold one of IBM's labeled groups (IBM's own
names: cycle, fan-in, fan-out, scatter-gather, stack, and single transfers with no shape), 40 are clean. Enriched on
purpose; shape names checked against IBM's pattern file; one run per cell.

**The run (30 s, the page's replay).** Nine model families through the sponsor's single key, two ways each: v1 reads
the raw rows, v2 gets code facts first (degrees, loops, bursts, pass-through chains). Every run is a PRISM session
with seven tool steps. 60 runs per arm, over a thousand runs in an hour, for about twenty dollars.

**What we found (45 s, the leaderboard and the grid).**
1. The strong families find the structured shapes in nearly every run: cycles, fan-in, fan-out, scatter-gather.
2. They all miss the same things: the single transfers with no shape and the two-hop chains, which is also the part
   the published detectors miss (38 percent of this data's laundering is in no named shape).
3. The real cost is false alarms on ordinary neighborhoods: 7 to 38 of 40, depending on the family. Code facts (v2)
   helped the weaker models more than the strong ones.
4. The families agree on IBM's labeled groups and split on the ordinary ones. Disagreement is the signal: requiring
   all three strong families to agree cuts false alarms from 39 to 4, at the price of half the patterns. That dial is
   the investigator's tolerance knob, and the page shows what each setting costs.

**The PRISM beat (25 s).** Open one run: seven steps, the model's own one-sentence reason, the transfer ids it cites.
The alert that fired when a model family took 29 seconds on a run. The failed runs tagged by shape, which is the
Root Cause cluster: "missed: lone" and "false ring" are the two causes, and v2 on the same inputs is the fix for the
weaker families.

**The honest limit (15 s).** Synthetic data, enriched slice, one run per cell, and every transfer in IBM's pattern file
is an ACH transfer, which a model can learn as a shortcut. On the real file the best model's precision would be a few
percent. We are not claiming detection; we are claiming calibration.

**The line (10 s).** The rule floods you. The model drowns you less. Now you know which model, for which shape, and
when they all agree.

## Q&A card (from the mock judges, with today's answers)
- "Show me the PRISM trace." Any run on the page: steps, reason, ids, the alert.
- "How do you know it is the right row, not a matching number?" Every flagged id is scored against IBM's label for
  that exact transfer; precision counts the wrong rows.
- "Does it hold on new data?" One run per cell on one slice; a second slice with a new seed is cut and unrun. We say so.
- "Who set the ground truth?" IBM's generator; the shape names are IBM's where its pattern file names them, ours for
  the rest.
- "Run it on something we choose." We can cut a fresh neighborhood from the file in seconds and run one family live
  (about ten seconds a run for the fast families).
- "What does the AI add over the rules?" On this slice: fewer false alarms than the one-line rule at similar recall,
  and a reason in words with cited rows. Not more than that.
- "Who pays?" The bank's financial-crime operations desk, per investigator seat, measured in alerts closed per hour.
