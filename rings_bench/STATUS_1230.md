# Rings bench: where we are at 12:30, what is left, who takes what

Pencil, Claude's draft for Alex at 12:30. Freeze 15:00. Track: Money Intelligence. Repo: https://github.com/sairam782/hawala
Page: https://dashboard.alexmong.com/mt2-f0bown7jys9uclrx/rings/ui/index.html (the slice picker is in the top bar)
Shared data page: https://claude.ai/artifact/LXZCUNwzUERhQqSjrbJfPG

## Done

| Piece | State |
|---|---|
| Data audit | measured from the file, licence settled, IBM's pattern file joined to our 20 groups; plain-language page shared |
| Bench | 60 neighborhoods; 9 model families, v1 (raw rows) and v2 (code facts); plus v3 (facts + Knowledge Base lookup) and v2x (format hidden) for the two strong families; about 1,400 runs, about $35 |
| Scoring | local scorer against IBM's labels; agreement dial (how many families must agree); results and panel files feed the page |
| Held-out | three disjoint slices cut; A complete, B half done, C running; the page shows the held-out line |
| PRISM, Money Intelligence proofs | Knowledge Base: every v3 run has a real retrieval step (done). Evaluator: our rule scores v1 and v3 on the same ten units (done; strict judge, 5 right each, different units). Root Cause: NOT done; PRISM's cluster run times out on this shared workspace (three tries); five per-trace analyses exist as evidence |
| PRISM, extra | every run has 6+ tool steps (Sessions); alert rules per agent, one fired on a real run |
| Page | live: result, every model, where they fail, vote dial, follow the money with case export, honest panel, slice picker |
| Diagrams | five charts live beside the page |
| Repo | two commits on main: engine, page, diagrams, data with licence note, slices, README |
| Pitch | draft with Q&A card (PITCH_DRAFT.md), not yet in the team's voice |

## To do before 15:00

1. **Root Cause proof.** Decide: (a) redeem the team PRISM workspace (code MONEYTALKS#2), give the engine its key and project id, rerun a 50-run subset there and click Analyze now on a fresh workspace; or (b) accept the failure, show our failures-by-shape grid plus the per-trace analyses, and say on stage that PRISM's cluster run timed out at 1,500 failures. (a) is about 25 minutes if the key arrives soon.
2. **PRISM screenshots** of each proof, taken logged in: the Knowledge Base page for rings-openai-v3, one v3 run's Steps tab with the retrieval step, the Evaluators Hub results for task "rings v1 vs v3 same inputs", the fired alert, Root Cause (cluster or the error).
3. **Finish held-out B and C**, final results and panel, push to site and repo (engine thread, automatic).
4. **Demo path**: one walkthrough, no network: the result, one model's groups lighting up, the dial, a neighborhood through every family, follow the money on one account, the honest panel. Record the 60-second fallback clip. Test the page from a double-click on a second laptop.
5. **Pitch**: rewrite the draft in the presenter's words; two rehearsals with the Q&A card.
6. **Submission**: check Discord for the form, deadline and word cap; write-up; repo and page links; the data credit line.
7. **Page redlines**: eight art-direction choices await Alex (rings_bench/ui/README.md, "For Alex to rule on").

## Who takes what

| Who | Takes | Needs from others |
|---|---|---|
| Lead / presenter | pitch rewrite, rehearsals, Q&A drill, submission form | the final numbers (engine), the demo path (coder 2) |
| Coder 1 | PRISM dashboard: log in, screenshot the five proofs, try Analyze now from the dashboard; if the team workspace is redeemed, hand the key to the engine thread | PRISM login (Alex) |
| Coder 2 | demo path and the 60-second clip; open the page from the repo on a second laptop and list any defect; Discord rules check | nothing |
| Designer (if present) | the redlines with Alex, the one-screen demo flow | 15 minutes of Alex |
| Alex | the Root Cause decision, the PRISM workspace, redlines, read the README and the pitch once, sponsor contact | nothing |
| Engine thread (Claude) | held-out B and C, final results, repo commits, any rerun on the team workspace, evaluator for sonnet if credits allow | the team key, if (a) |
| UI thread (Claude) | redlines applied, demo-path bugs fixed | the list from coder 2 and Alex |

Decision rights as in the game plan: Alex calls scope and the freeze; the owner of a file decides inside it.
