"""miss_panel.py: a cross-vendor panel over every case the bench's best model got wrong, through Nicrron.

Alex, 2026-10-17 13:02: "use nicrron and send out multiple agents from multiple vendors. they should look at all the cases
we missed and try to figure out why and also reason through what would make a better prompt or system."

A case = a unit where Claude Sonnet's best version on that slice (v4) missed a ring (ring verdict with at least half the
labeled ids flagged was not reached) or called an ordinary neighborhood a ring. Every case goes to every vendor in the
panel with the same packet: the rows, the code facts, the truth (IBM's labels), what every model run said about it, and
the prompt the models saw. Each agent answers one JSON object: evidence in the data, why the models failed, a failure
class, a prompt fix and a system fix. Then code tallies the classes and two families synthesize the proposals.

  python miss_panel.py plan                 # cases, models, prices from Nicrron, worst-case cost; no model calls
  python miss_panel.py run [--workers 4]    # the panel; resumable (out/answers.jsonl); ledger out/llm_ledger.jsonl
  python miss_panel.py synth                # tallies + two synthesis calls -> out/synthesis_*.md, REPORT.md inputs
Keys: C:\\Projects\\nicrron.txt via mt2kit (never printed). Budget: MT2_BUDGET_USD for THIS folder's ledger (default 15).
Working level: prototype, diagnosis phase. Pencil, unruled.
"""
import argparse, collections, json, os, sys, threading, time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

HERE = Path(__file__).resolve().parent
BENCH = HERE.parent
OUT = HERE / "out"
OUT.mkdir(exist_ok=True)
os.environ["MT2_OUT_DIR"] = str(OUT)                      # this panel's own ledger and budget
os.environ.setdefault("MT2_BUDGET_USD", "15")
sys.path.insert(0, str(BENCH))
import bench  # noqa: E402  (chat_with_backoff, family, MAX_TOKENS; importing it makes no call)
from mt2kit import llm  # noqa: E402
import facts  # noqa: E402
import prompts  # noqa: E402

PANEL = ["anthropic/claude-sonnet-5-5", "openai/gpt-6-sol", "xai/grok-4.7", "deepseek/deepseek-v4-pro", "moonshot/kimi-k3"]
SLICES = [("main", BENCH / "data"), ("heldout_a", BENCH / "slices" / "heldout_a"), ("heldout_b", BENCH / "slices" / "heldout_b"),
          ("heldout_c", BENCH / "slices" / "heldout_c"), ("random_clean", BENCH / "slices" / "random_clean")]
CLASSES = ["lone_no_structure", "chain_cut_short", "burst_is_normal_here", "recurring_payments_read_as_scheme",
           "pass_through_guess", "format_or_currency_tell", "hedged_verdict", "wrong_rows_flagged", "late_timestamp_leak", "other"]

SYSTEM = ("You are a senior financial-crime analyst doing a post-mortem on an AI screening bench. You are given one "
          "neighborhood of transfers, the ground truth from the data set's own labels, and what several AI models said about "
          "it. Your job is to explain, from the data in front of you, why the models got it wrong, and to propose the smallest "
          "change to the prompt or to the system around the model that would fix this class of case without creating new "
          "false alarms. Be concrete, cite transfer ids, and say when the truth is not recoverable from the data at all. "
          "Answer with one JSON object only.")

SCHEMA = ('{"recoverable_from_data": "yes" | "partly" | "no", '
          '"evidence_in_the_data": "what in the rows or facts marks the truth, with transfer ids; or why nothing does", '
          '"why_the_models_failed": "two or three sentences", '
          f'"failure_class": one of {CLASSES}, '
          '"prompt_fix": "the exact sentence or rule to add, change or remove in the prompt", '
          '"system_fix": "a change outside the prompt: a code fact to add, a threshold, a second pass, a different unit of analysis, or none", '
          '"risk_of_fix": "what the fix would newly get wrong", '
          '"confidence": "high" | "medium" | "low"}')


def load_cases():
    cases = []
    for tag, d in SLICES:
        units = {u["id"]: u for u in json.load(open(d / "units.json", encoding="utf-8"))["units"]}
        r = json.load(open(d / "bench_results.json", encoding="utf-8"))
        runs = collections.defaultdict(list)
        for x in r["runs"]:
            runs[x["unit"]].append(x)
        best = {x["unit"]: x for x in r["runs"] if x["model"] == "anthropic/claude-sonnet-5-5" and x["version"] == "v4"}
        for uid, x in sorted(best.items()):
            u = units[uid]
            if x["expected"] == "ring" and not x["ring_found"]:
                kind = "missed_ring"
            elif x["expected"] == "ordinary" and x["verdict"] == "ring":
                kind = "false_ring"
            else:
                continue
            cases.append({"case_id": f"{tag}:{uid}", "slice": tag, "unit": u, "kind": kind, "runs": runs[uid]})
    return cases


def packet(c):
    u, runs = c["unit"], c["runs"]
    f = facts.compute_facts(u)
    L = [f"CASE {c['case_id']}: a {'MISSED RING' if c['kind'] == 'missed_ring' else 'FALSE RING'} on slice {c['slice']}.", ""]
    if c["kind"] == "missed_ring":
        L.append(f"Ground truth (IBM's labels): this neighborhood holds a laundering ring. Our structural reading of its shape: {u['shape']}. "
                 f"The labeled laundering transfers are: {', '.join(u['truth_ids'])} ({len(u['truth_ids'])} of {u['n_rows']} rows).")
    else:
        L.append("Ground truth (IBM's labels): this neighborhood is ORDINARY traffic. No row in it is labeled laundering, and no account "
                 "in it is within 120 minutes of a labeled transfer" + (" (random-clean slice: no ring account anywhere in reach)." if c["slice"] == "random_clean" else "."))
    L += ["", "The transfers:", prompts.rows_text(u), "", "Facts computed by code from these rows (the same facts the v2 and later models saw):",
          facts.facts_text(f), "", f"What the models said about this neighborhood ({len(runs)} runs; version v1 = raw rows, v2 = rows plus code facts, "
          "v3 = v2 plus a pattern lookup, v4 = v3 plus a confidence rule, v5 = tighter rule, v2x = payment format hidden):"]
    for x in sorted(runs, key=lambda x: (x["model"], x["version"])):
        flagged = x.get("flagged_transfer_ids") or []
        hit = len(set(flagged) & set(u["truth_ids"]))
        L.append(f"- {x['model']} {x['version']}: verdict {x['verdict']}, pattern {x.get('pattern')}, confidence {x.get('confidence')}, "
                 f"flagged {len(flagged)} ids" + (f" ({hit} of them labeled)" if u["truth_ids"] else "") + f". Reason: {(x.get('why') or '')[:400]}")
    L += ["", "The prompt the models answered (v2 form). System: " + prompts.SYSTEM, "",
          "Question: is there a money-laundering scheme among these transfers? Schemes look like: " + prompts.PATTERNS + ". "
          "Most neighborhoods are ordinary traffic, and busy accounts are not by themselves suspicious. If you see a scheme, name its "
          "pattern and list exactly the transfer ids that belong to it; if not, say ordinary.", "",
          "Known limits of this bench you may use: the data is synthetic (IBM AMLworld HI-Small); every labeled laundering transfer in "
          "the main slice is ACH; rows after 2022-09-10 are mostly labeled in the whole file; a 'lone' ring is a single labeled transfer; "
          "our 'chain' is a two-transfer fragment of IBM's longer stack.", "",
          f"Answer with one JSON object: {SCHEMA}"]
    return "\n".join(L)


def plan(cases):
    by = collections.Counter((c["slice"], c["kind"]) for c in cases)
    print(f"{len(cases)} cases:", dict(by))
    sizes = [len(packet(c)) for c in cases]
    print(f"packet size: mean {sum(sizes) // len(sizes)} chars, max {max(sizes)} (about {sum(sizes) // len(sizes) // 4} tokens in)")
    key = llm._key()
    llm._estimate(PANEL[0], 1, 1, key)  # fills the price table from Nicrron's model list
    total = 0.0
    print("| model | $/M in | $/M out | worst case for all cases (in + max_tokens out) |")
    for m in PANEL:
        pp, pc = llm._PRICES.get(m, (None, None))
        if pp is None:
            print(f"| {m} | not priced | | |"); continue
        mt = bench.MAX_TOKENS.get(bench.family(m), 3000)
        worst = sum((s / 4) * pp + mt * pc for s in sizes)          # Nicrron prices are per token
        likely = sum((s / 4) * pp + 1200 * pc for s in sizes)       # about 1,200 tokens of answer each
        total += worst
        print(f"| {m} | {pp * 1e6:.2f} | {pc * 1e6:.2f} | ${worst:.2f} (likely ${likely:.2f}) |")
    print(f"worst case total ${total:.2f}; budget MT2_BUDGET_USD={os.environ['MT2_BUDGET_USD']}; spent so far in this folder ${llm.spent():.4f}")


def run(cases, workers):
    done = set()
    path = OUT / "answers.jsonl"
    if path.exists():
        for line in open(path, encoding="utf-8"):
            r = json.loads(line); done.add((r["case_id"], r["model"]))
    jobs = [(c, m) for c in cases for m in PANEL if (c["case_id"], m) not in done]
    print(f"{len(jobs)} calls to make ({len(done)} already done)")
    lock = threading.Lock()
    counts = collections.Counter()

    def one(job):
        c, m = job
        msgs = [{"role": "system", "content": SYSTEM}, {"role": "user", "content": packet(c)}]
        t0 = time.time()
        try:
            r = bench.chat_with_backoff(msgs, m, max_tokens=bench.MAX_TOKENS.get(bench.family(m), 3000), timeout=240)
            obj = bench.parse_answer(r["text"]) if hasattr(bench, "parse_answer") else None
            if obj is None:
                try:
                    obj = llm.extract_json(r["text"])
                except Exception:  # noqa: BLE001
                    obj = None
            rec = {"case_id": c["case_id"], "slice": c["slice"], "unit": c["unit"]["id"], "kind": c["kind"], "shape": c["unit"]["shape"],
                   "model": m, "answer": obj, "raw_text": r["text"][:6000] if obj is None else None, "input_tokens": r["input_tokens"],
                   "output_tokens": r["output_tokens"], "latency_ms": r["latency_ms"], "t": time.strftime("%H:%M:%S")}
        except Exception as e:  # noqa: BLE001
            rec = {"case_id": c["case_id"], "slice": c["slice"], "unit": c["unit"]["id"], "kind": c["kind"], "shape": c["unit"]["shape"],
                   "model": m, "answer": None, "error": str(e)[:500], "latency_ms": int(1000 * (time.time() - t0)), "t": time.strftime("%H:%M:%S")}
        with lock:
            with open(path, "a", encoding="utf-8") as f:
                f.write(json.dumps(rec, ensure_ascii=False) + "\n")
            counts["ok" if rec.get("answer") else "fail"] += 1
            n = counts["ok"] + counts["fail"]
            if n % 10 == 0 or n == len(jobs):
                print(f"  {n}/{len(jobs)} done, {counts['fail']} failed, spent ${llm.spent():.2f}", flush=True)
        return rec

    with ThreadPoolExecutor(max_workers=workers) as ex:
        list(ex.map(one, jobs))
    print(f"finished: {counts}, spent ${llm.spent():.2f}")


def synth(cases):
    answers = [json.loads(l) for l in open(OUT / "answers.jsonl", encoding="utf-8")]
    good = [a for a in answers if a.get("answer")]
    print(f"{len(good)} answers of {len(answers)} records")
    # tallies
    cls = collections.defaultdict(collections.Counter)      # case -> class votes
    by_model_cls = collections.defaultdict(collections.Counter)
    recov = collections.defaultdict(collections.Counter)
    for a in good:
        o = a["answer"]
        c = str(o.get("failure_class", "other")).strip()
        cls[a["case_id"]][c] += 1; by_model_cls[a["model"]][c] += 1
        recov[a["kind"]][str(o.get("recoverable_from_data", "?")).strip().lower()] += 1
    tally = {"per_case_majority": {}, "by_model": {m: dict(v) for m, v in by_model_cls.items()},
             "recoverable_by_kind": {k: dict(v) for k, v in recov.items()}}
    agree = collections.Counter()
    for cid, v in cls.items():
        top, n = v.most_common(1)[0]
        tally["per_case_majority"][cid] = {"class": top, "votes": n, "of": sum(v.values()), "all": dict(v)}
        agree[f"{n} of {sum(v.values())}"] += 1
    tally["agreement"] = dict(agree)
    (OUT / "tally.json").write_text(json.dumps(tally, indent=1), encoding="utf-8")
    # condensed proposals for the synthesizers
    lines = []
    for a in good:
        o = a["answer"]
        lines.append(f"[{a['case_id']} {a['kind']} shape={a['shape']} | {a['model'].split('/')[1]} | class={o.get('failure_class')} | "
                     f"recoverable={o.get('recoverable_from_data')}] PROMPT FIX: {str(o.get('prompt_fix', ''))[:220]} || SYSTEM FIX: "
                     f"{str(o.get('system_fix', ''))[:160]}")
    body = "\n".join(lines)
    ask = ("Below are the post-mortem findings of five AI vendors' models on every case our best screening prompt got wrong on a "
           "money-laundering bench (IBM AMLworld synthetic data; 60-transfer neighborhoods; the model answers ring or ordinary and lists "
           "transfer ids). Each line: the case, its kind (missed ring or false ring), the labeled shape, the vendor, the failure class it "
           "assigned, whether it judged the truth recoverable from the data, and its proposed prompt fix, system fix and the risk of that fix.\n\n"
           "Write, in plain American English with no em dashes, under 900 words:\n"
           "1. The three to five failure classes that explain most cases, each with how many cases and whether the vendors agree.\n"
           "2. Which cases are NOT recoverable from the data (so no prompt can fix them) and what that implies for how the bench is scored.\n"
           "3. A proposed v6 prompt: the exact added, changed or removed sentences, each tied to the failure class it addresses, with the risk.\n"
           "4. Proposed system changes outside the prompt (code facts to add, thresholds, two-pass designs), ranked by value for the effort.\n"
           "5. What you would measure first to check that v6 beats v4 without losing rings.\n\n" + body)
    for m in ("anthropic/claude-sonnet-5-5", "openai/gpt-6-sol"):
        r = bench.chat_with_backoff([{"role": "user", "content": ask}], m, max_tokens=4000, timeout=600)
        (OUT / f"synthesis_{m.split('/')[1]}.md").write_text(r["text"], encoding="utf-8")
        print(f"synthesis by {m}: {r['output_tokens']} tokens out, {r['latency_ms']} ms")
    print(json.dumps({"agreement": tally["agreement"], "recoverable_by_kind": tally["recoverable_by_kind"]}, indent=1))
    print(f"spent ${llm.spent():.2f}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("mode", choices=["plan", "run", "synth", "packet"])
    ap.add_argument("--workers", type=int, default=4); ap.add_argument("--case")
    a = ap.parse_args()
    cases = load_cases()
    if a.mode == "plan":
        plan(cases)
    elif a.mode == "packet":
        c = next(x for x in cases if x["case_id"] == a.case) if a.case else cases[0]
        print(packet(c))
    elif a.mode == "run":
        run(cases, a.workers)
    else:
        synth(cases)


if __name__ == "__main__":
    main()
