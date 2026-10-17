"""rings_jev.py: Jev (TypeSafe System One, jev-1.13.0) on the Rings bench neighborhoods.

Pencil, Claude's build on Alex's word (2026-10-17 12:38: "see what we can do with jev and crafting prompts and
context for it"). Unruled. Reads the bench's data, writes only under rings_bench/jev/. Never edits the bench.

Three state variants per neighborhood, three typed questions in ONE call per state:
  rows_facts : code facts (facts.facts_text) first, then the raw transfer rows        (the task's main variant)
  facts      : code facts only                                                        (the task's second variant)
  sentences  : the facts rewritten as plain sentences with every comparison done by code
               (jev_options/jev_common.state_text, built 12:27; added because the style guide predicts that
               numbers in "Label: value" form misread, lines 315 to 346)
Questions: scheme (Choice ring / ordinary), pattern (Choice over the bench's nine names), evidence (5-level Score,
reported as position x 100). The rules applied and their source lines are in DESIGN.md beside this file.

  python rings_jev.py dry [--unit u06]                  # print the states and questions for one unit, no call
  python rings_jev.py smoke [--unit u06]                # one live call per variant on one unit
  python rings_jev.py run --tag main                    # all 60 units x 3 variants -> out/jev_main.json
  python rings_jev.py run --tag heldout_a --slice ../slices/heldout_a
Key: C:\\Projects\\J_Initial.txt through JEV_KEY_FILE (read at call time by jevkit; never printed, never logged).
"""
import argparse, json, os, sys, time
from pathlib import Path

HERE = Path(__file__).resolve().parent
BENCH = HERE.parent
sys.path.insert(0, str(BENCH))
sys.path.insert(0, str(BENCH / "jev_options"))
os.environ.setdefault("JEV_KEY_FILE", r"C:\Projects\J_Initial.txt")

import facts  # noqa: E402  the bench's code facts
import prompts  # noqa: E402  rows_text and the pattern vocabulary the chat models saw
from jevkit import Jev, choice, score, position  # noqa: E402  the hub's one-file client (copy in jev_options)
from jev_common import state_text as sentences_state  # noqa: E402  the 12:27 sentence builder

OUT = HERE / "out"
MODEL = "jev-1.13.0"

# ---------------------------------------------------------------- the questions (see DESIGN.md for each rule)
SCHEME = choice(
    "Judging only from the transfers and the code-computed facts, is there a money-laundering scheme among these "
    "transfers, or is this ordinary traffic?",
    {
        "ring": "A laundering scheme is present: the facts show a structure that moves money through accounts on "
                "purpose, such as a loop that returns money to where it started, one account bursting money out to "
                "many accounts or gathering it in from many within a short time, money arriving at an account and "
                "leaving again soon after in a chain, or a tight group of accounts trading among themselves.",
        "ordinary": "Ordinary traffic: recurring payments of similar amounts between the same accounts over many days, "
                    "a busy account with many counterparties but no burst within an hour, no loop that returns money, "
                    "and no chain where money arrives and leaves again soon after. A busy account is not by itself "
                    "suspicious, and a single large or odd transfer with no structure around it reads as ordinary here.",
    })

PATTERN = choice(
    "Which pattern best describes the money movement among these transfers?",
    {
        "fan-out": "Fan-out: one account sends money to many different accounts within a short time. The facts list a "
                   "burst OUT of one account to many distinct accounts, or one account that sent to many distinct accounts.",
        "fan-in": "Fan-in: many different accounts send money to one account within a short time. The facts list a burst "
                  "INTO one account from many distinct accounts, or one account that received from many distinct accounts.",
        "cycle": "Cycle: money leaves an account, passes through two or more other accounts, and returns to where it "
                 "started. The facts list a directed loop that returns money to a starting account.",
        "chain": "Chain: money is passed along, account to account, each one forwarding soon after receiving, with "
                 "similar amounts. The facts list pass-through pairs whose amounts in and out are close.",
        "scatter-gather": "Scatter-gather: one account splits money out to several middle accounts, and those middle "
                          "accounts send it on to one collecting account. The facts list a burst out of one account and a "
                          "burst into another through the same middle accounts.",
        "mesh": "Mesh: a group of accounts trades among themselves, many transfers in several directions within the "
                "group, more than ordinary customers would, with no single hub and no loop.",
        "lone": "Lone: one suspicious transfer on its own, an unusual amount or a one-off between two accounts that "
                "otherwise never deal, with no loop, burst or chain around it.",
        "other": "Other: a laundering structure that is none of fan-out, fan-in, cycle, chain, scatter-gather, mesh or "
                 "lone, such as a mix of two of them.",
        "none": "None: ordinary traffic with no laundering structure, such as recurring payments between the same "
                "accounts, a busy merchant or payroll account, or scattered unrelated transfers.",
    })

EVIDENCE = score(
    "How strong is the structural evidence of a laundering scheme in these transfers?",
    [
        "No structure at all: no loop, no burst, no pass-through chain; the transfers look like unrelated everyday payments.",
        "Weak: one busy account or one pass-through pair, which ordinary business also produces.",
        "Moderate: a partial structure, such as several pass-through pairs with mismatched amounts, or a small burst.",
        "Strong: a clear structure, such as a directed loop, a burst to or from many distinct accounts, or a chain with "
        "matching amounts.",
        "Overwhelming: more than one clear structure, or one structure that involves most of the transfers in the neighborhood.",
    ])

QUESTIONS = {"scheme": SCHEME, "pattern": PATTERN, "evidence": EVIDENCE}

# ---- question set 2 (12:52): rulings written into the descriptions after reading the main-slice errors (style guide
# line 383: "write your edge-case rulings into the definitions"). The errors: 28 of 40 ordinary units have pass-through
# pairs in the code facts, and Jev's ring description said "money arriving and leaving again soon after" counts.
# Rulings: a pass-through pair on its own is ordinary; what counts is a loop, a burst to or from three or more
# distinct accounts, or pass-through pairs with matching amounts that link three or more accounts in a line.
SCHEME2 = choice(
    SCHEME["instructions"],
    {
        "ring": "A laundering scheme is present. Ruling: say ring only when the facts show at least one of these: a loop "
                "that returns money to its starting account; one account sending to, or receiving from, three or more "
                "different accounts within an hour; or pass-through pairs with similar amounts in and out that link three "
                "or more accounts in a line.",
        "ordinary": "Ordinary traffic. Ruling: money arriving at an account and leaving within two days is ordinary on its "
                    "own, even in many cases, when the amounts do not match or the pairs do not link into a line of three "
                    "or more accounts. A busy account with many counterparties but no burst within an hour is ordinary. "
                    "Recurring payments between the same accounts are ordinary.",
    })
EVIDENCE2 = score(
    EVIDENCE["instructions"],
    [
        "No structure at all: no loop, no burst to or from three or more different accounts within an hour, and no "
        "pass-through pair; the transfers look like unrelated everyday payments.",
        "Weak: a busy account, or pass-through pairs whose amounts in and out do not match, which ordinary business also "
        "produces.",
        "Moderate: pass-through pairs with similar amounts in and out, but no loop and no burst to or from three or more "
        "different accounts.",
        "Strong: one clear structure: a loop that returns money to its start, a burst to or from three or more different "
        "accounts within an hour, or pass-through pairs with similar amounts linking three or more accounts in a line.",
        "Overwhelming: more than one clear structure, or one clear structure that involves most of the transfers.",
    ])
QUESTIONS2 = {"scheme": SCHEME2, "pattern": PATTERN, "evidence": EVIDENCE2}
QSETS = {"1": QUESTIONS, "2": QUESTIONS2}


# ---------------------------------------------------------------- the states
def state_rows_facts(unit):
    f = facts.facts_text(facts.compute_facts(unit))
    return ("Facts computed by code from the transfers below (facts, not a verdict):\n" + f +
            f"\n\nThe {unit['n_rows']} transfers (a transfer whose from_account equals its to_account is an account "
            "moving its own money):\n" + prompts.rows_text(unit))


def state_facts(unit):
    return "Facts computed by code from a neighborhood of transfers (facts, not a verdict):\n" + \
        facts.facts_text(facts.compute_facts(unit))


def state_sentences(unit):
    return sentences_state(unit)


VARIANTS = {"rows_facts": state_rows_facts, "facts": state_facts, "sentences": state_sentences}


def load_units(slice_dir=None):
    d = json.load(open((Path(slice_dir) if slice_dir else BENCH / "data") / "units.json", encoding="utf-8"))
    return d["units"]


def read(ans):
    """One call's answers -> flat row fields."""
    s, p, e = ans["scheme"], ans["pattern"], ans["evidence"]
    return {"p_ring": round(s["probabilities"].get("ring", 0.0), 4), "scheme": s["choice"],
            "scheme_confidence": round(s.get("confidence", 0.0), 4),
            "pattern": p["choice"], "pattern_confidence": round(p.get("confidence", 0.0), 4),
            "pattern_probs": {k: round(v, 3) for k, v in sorted(p["probabilities"].items(), key=lambda x: -x[1])[:3]},
            "evidence_0_100": round(100 * position(e), 1), "evidence_top": e["choice"] if "choice" in e else e.get("score"),
            "evidence_confidence": round(e.get("confidence", 0.0), 4)}


def run(units, tag, variants, workers=8, qset="1"):
    OUT.mkdir(exist_ok=True)
    QS = QSETS[qset]
    log = OUT / f"calls_{tag}.jsonl"
    jev = Jev(model=MODEL, log_path=str(log))
    rows = []
    for v in variants:
        build = VARIANTS[v]
        t0 = time.time()
        jobs = [(build(u), QS) for u in units]
        answers = jev.ask_many(jobs, workers=workers)
        secs = time.time() - t0
        for u, a in zip(units, answers):
            r = {"unit": u["id"], "expected": u["expected"], "shape": u["shape"], "variant": v, "state_chars": len(jobs[units.index(u)][0])}
            if a is None:
                r["error"] = "call failed"
            else:
                r.update(read(a))
                r["correct"] = (r["scheme"] == u["expected"])
            rows.append(r)
        ok = sum(1 for r in rows if r["variant"] == v and r.get("correct"))
        print(f"{tag} {v}: {ok}/{len(units)} verdicts right, {secs:.1f} s for {len(units)} calls")
    # ledger from the kit's log: latency and cost per call
    lat, cost = [], 0.0
    for line in open(log, encoding="utf-8"):
        rec = json.loads(line)
        lat.append(rec["latency_ms"]); cost += rec["cost_usd"]
    lat.sort()
    ledger = {"calls": jev.calls, "cost_usd": round(jev.cost_usd, 6), "latency_ms_median": lat[len(lat) // 2] if lat else None,
              "latency_ms_p90": lat[int(0.9 * len(lat))] if lat else None, "latency_ms_max": lat[-1] if lat else None,
              "model": MODEL, "log": str(log.name)}
    out = {"tag": tag, "model": MODEL, "written": time.strftime("%Y-%m-%d %H:%M"), "variants": variants, "ledger": ledger,
           "question_set": qset, "questions": QS, "rows": rows}
    (OUT / f"jev_{tag}.json").write_text(json.dumps(out, indent=1, ensure_ascii=False), encoding="utf-8")
    print("ledger:", json.dumps(ledger))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("mode", choices=["dry", "smoke", "run"])
    ap.add_argument("--unit", default="u06"); ap.add_argument("--tag", default="main"); ap.add_argument("--slice")
    ap.add_argument("--variants", default="rows_facts,facts,sentences"); ap.add_argument("--qset", default="1", choices=["1", "2"])
    a = ap.parse_args()
    units = load_units(a.slice)
    variants = a.variants.split(",")
    if a.mode in ("dry", "smoke"):
        u = next(x for x in units if x["id"] == a.unit)
        print(f"== unit {u['id']}: expected {u['expected']}, shape {u['shape']}, {u['n_rows']} rows, {len(u['truth_ids'])} labeled")
        for v in variants:
            s = VARIANTS[v](u)
            print(f"\n== state '{v}' ({len(s)} chars):\n{s[:1800]}{'...' if len(s) > 1800 else ''}")
        if a.mode == "dry":
            print("\n== questions:\n" + json.dumps(QUESTIONS, indent=1))
            return
        jev = Jev(model=MODEL, log_path=str(OUT / "calls_smoke.jsonl")); OUT.mkdir(exist_ok=True)
        for v in variants:
            t0 = time.time(); ans = jev.ask(VARIANTS[v](u), QUESTIONS)
            print(f"\n== answer '{v}' in {1000 * (time.time() - t0):.0f} ms:", json.dumps(read(ans)))
            print("   raw evidence:", json.dumps(ans["evidence"]))
        print(f"calls {jev.calls}, cost ${jev.cost_usd:.6f}")
        return
    run(units, a.tag, variants, qset=a.qset)


if __name__ == "__main__":
    main()
