"""bench.py: the Rings many-models bench. One process = one model x one version over the 60 units.

  python bench.py run --model anthropic/claude-sonnet-5-5 --version v2 [--units 5 | --units u01,u07] [--workers 2] [--kb] [--dry]
  python bench.py kb-upload --model M            (uploads data/kb_ring_shapes.md to the v2 agent of that family)
  python bench.py spans --model M --version v2   (posts a retrieval span per run so PRISM's {context} is filled)
  python bench.py analyze --model M --version v1 [--max 10]   (1 credit per failed run: feeds Root Cause)
  python bench.py alerts                         (creates error_rate and latency alert rules for every rings-* agent seen)
  python bench.py results                        (data/bench_results.json + a table)

Every model call goes through mt2kit.llm (Nicrron). Every run is a PRISM trace + trajectory via mt2kit.trace with
tool steps: load_rows, degrees, loops, bursts, pass_through_chains, (kb_search), model, parse_answer, final.
A wrong verdict is a FAILED run (judge), tagged missed_ring:<shape> or false_ring, so Root Cause has clusters.
Keys: C:\\Projects\\nicrron.txt and C:\\Projects\\prism.txt (never printed). Project id: env PRISMTRACE_PROJECT_ID.
"""
import argparse, collections, json, math, os, re, statistics, sys, time
from pathlib import Path

HERE = Path(__file__).resolve().parent
KIT = Path(r"C:\Projects\Verticals\Hackathons\kit\mt2_kit")
sys.path.insert(0, str(KIT))
os.environ.setdefault("MT2_OUT_DIR", str(HERE / "out"))
os.environ.setdefault("MT2_BUDGET_USD", "40")
os.environ.setdefault("PRISMTRACE_PROJECT_ID", "46117a99-720a-4ac6-b217-08ff50f0e478")  # MONG Workspace (practice; swap for the team key)

from mt2kit import llm, trace, batch  # noqa: E402
import facts  # noqa: E402
from prompts import build, rows_text, SYSTEM  # noqa: E402

# A held-out slice: env RINGS_SLICE=<folder name under slices/> switches the units, prefixes batch names and suffixes
# the PRISM agent names (rings-<family>-<v>-<slice>), so nothing mixes with the first slice's runs.
SLICE = os.environ.get("RINGS_SLICE", "").strip()
DATA_DIR = (HERE / "slices" / SLICE) if SLICE else (HERE / "data")
FAMILY_DEFAULT = {"anthropic": "anthropic/claude-sonnet-5-5", "openai": "openai/gpt-6-sol",
                  "deepseek": "deepseek/deepseek-v4-pro", "mistral": "mistral/mistral-large-4",
                  "moonshot": "moonshot/kimi-k3", "xai": "xai/grok-4.7", "z-ai": "z-ai/glm-5.3"}
SHAPES = ["cycle", "fan-out", "fan-in", "scatter-gather", "chain", "mesh", "other", "lone"]
# IBM's own names for our 20 IBM-labeled rings, from joining HI-Small_Patterns.txt to the slice (11:42): 8 of 12
# multi-transfer rings match exactly; our mesh is IBM's gather-scatter; our chains are fragments of IBM's stacks.
IBM_SHAPE = {0: "CYCLE", 1: "CYCLE", 2: "FAN-OUT", 3: "FAN-OUT", 4: "FAN-IN", 5: "FAN-IN", 6: "SCATTER-GATHER",
             7: "SCATTER-GATHER", 8: "GATHER-SCATTER (11 of 12)", 9: "STACK (fragment)", 10: "STACK (fragment)",
             11: "STACK (2 of 3)", 12: "no named shape", 13: "no named shape", 14: "no named shape",
             15: "no named shape", 16: "no named shape", 17: "no named shape", 18: "BIPARTITE (1 row)", 19: "no named shape"}


def family(model):
    return model.split("/")[0]


def agent_name(model, version):
    return f"rings-{family(model)}-{version}" + (f"-{SLICE}" if SLICE else "")


def batch_name(model, version):
    return (f"{SLICE}__" if SLICE else "") + f"{model.replace('/', '_')}__{version}"


def load_units(sel=None):
    d = json.load(open(DATA_DIR / "units.json", encoding="utf-8"))
    units = d["units"]
    if sel:
        if sel.isdigit():
            units = units[: int(sel)]
        else:
            want = set(sel.split(","))
            units = [u for u in units if u["id"] in want]
    return units


def norm_pattern(s):
    s = (s or "").lower()
    if s in ("none", "ordinary", ""):
        return "none"
    if re.search(r"scatter|gather", s):
        return "scatter-gather"
    if re.search(r"fan[- ]?out|distribut|dispers", s):
        return "fan-out"
    if re.search(r"fan[- ]?in|funnel|collect|aggregat|consolidat", s):
        return "fan-in"
    if re.search(r"cycle|loop|circular|round[- ]?trip", s):
        return "cycle"
    if re.search(r"chain|layer|pass|relay|stack", s):
        return "chain"
    if re.search(r"mesh|bipartite|web|cluster", s):
        return "mesh"
    if re.search(r"lone|single|isolated", s):
        return "lone"
    return "other"


def norm_verdict(v):
    v = (v or "").strip().lower()
    return "ring" if v.startswith("ring") or v in ("yes", "scheme", "suspicious", "laundering") else "ordinary"


def parse_json(text):
    try:
        obj = json.loads(text)
        return obj if isinstance(obj, dict) else None
    except ValueError:
        pass
    try:
        obj = llm.extract_json(text)
        return obj if isinstance(obj, dict) else None
    except Exception:  # noqa: BLE001
        return None


# Reasoning models spend their tokens thinking before the answer: deepseek-v4-pro and glm-5.3 used all 3,000 on
# reasoning_content and returned an empty answer (probe 11:33). They get a bigger cap; the answer is still one JSON object.
MAX_TOKENS = {"deepseek": 12000, "z-ai": 12000, "moonshot": 9000, "xai": 6000}


REASONING_LOW = {"deepseek", "z-ai", "moonshot"}  # probe 11:38: reasoning_effort "low" stops them spending every token thinking


def chat_low_reasoning(messages, model, max_tokens, timeout):
    """llm.chat's essentials plus reasoning_effort=low (the kit's chat() takes no extra fields). Same ledger row."""
    key = llm._key()
    t0 = time.time()
    payload = {"model": model, "messages": messages, "temperature": 0, "max_tokens": max_tokens, "reasoning_effort": "low"}
    status, text = llm._request("POST", "/chat/completions", payload, timeout, key)
    ms = int((time.time() - t0) * 1000)
    if status != 200:
        raise llm.LLMError(llm._err_message(status, text, key))
    data = json.loads(text)
    out = data["choices"][0]["message"].get("content") or ""
    usage = data.get("usage") or {}
    tin, tout = usage.get("prompt_tokens", 0), usage.get("completion_tokens", 0)
    est = llm._estimate(data.get("model", model), tin, tout, key)
    llm._record(data.get("model", model), tin, tout, est if est is not None else 0.01, ms, estimated=True)
    return {"text": out, "model": data.get("model", model), "input_tokens": tin, "output_tokens": tout,
            "latency_ms": ms, "cost_usd": None, "raw": data}


def chat_with_backoff(messages, model, max_tokens=None, timeout=240):
    """llm.chat plus patience for 429s (60 requests a minute are shared across every process).
    No json_mode: the kit's json mode cut answers at the token cap (smoke 11:18); we parse the object ourselves."""
    last = None
    if max_tokens is None:
        max_tokens = MAX_TOKENS.get(family(model), 3000)
    for n in range(5):
        try:
            if family(model) in REASONING_LOW:
                return chat_low_reasoning(messages, model, max_tokens, timeout)
            return llm.chat(messages, model=model, json_mode=False, max_tokens=max_tokens, timeout=timeout)
        except llm.BudgetExceeded:
            raise
        except llm.LLMError as e:
            last = e
            msg = str(e)
            if "429" in msg or "rate" in msg.lower():
                time.sleep(6 * (n + 1))
                continue
            if "402" in msg:
                raise
            if n < 2 and ("5" in msg[:9] or "timed out" in msg.lower() or "unexpected response" in msg):
                time.sleep(3)
                continue
            raise
    raise last


def make_agent(model, version, kb=False):
    def agent(inp, r):
        unit = inp["unit"]
        if version == "v2x":  # v2 with the payment format hidden: measures how much a model leans on the ACH tell
            unit = dict(unit, rows=[list(r[:6]) + ["hidden"] + list(r[7:]) for r in unit["rows"]])
        r.metadata.update({"model": model, "version": version, "unit": unit["id"], "shape": unit["shape"] or "none",
                           "expected": unit["expected"], "family": family(model)})
        r.step("load_rows", input={"unit": unit["id"]}, output={"rows": unit["n_rows"], "accounts": len(unit["accounts"])}, kind="tool")
        f, reference = None, None
        if version in ("v2", "v3", "v2x"):
            d = facts.degrees(unit)
            r.step("degrees", input={"accounts": len(d["accounts"])}, output=d["degrees"][:5], kind="tool")
            lp = facts.loops(unit)
            r.step("loops", input={"max_len": 8}, output={"count": len(lp), "first": lp[:3]}, kind="tool")
            b = facts.bursts(unit)
            r.step("bursts", input={"window_min": 60}, output={"count": len(b), "first": b[:3]}, kind="tool")
            ch = facts.chains(unit)
            r.step("pass_through_chains", input={"hours": 48}, output={"count": len(ch), "first": ch[:3]}, kind="tool")
            f = facts.summary(unit)
            f.update({"n_accounts": len(d["accounts"]), "degrees": d["degrees"][:12], "loops": lp, "bursts": b,
                      "pass_through_chains": ch})
            if kb or version == "v3":  # v3 = v2 plus a real Knowledge Base lookup, logged as a retrieval step
                res = trace.kb_search("laundering patterns fan-out fan-in cycle chain scatter-gather mesh lone", limit=3, run=r)
                reference = "\n".join(x.get("content", "") for x in res if isinstance(x, dict)) or None
                if version == "v3" and not reference:
                    raise RuntimeError("v3 needs the Knowledge Base: kb_search returned nothing for this agent (upload first: bench.py kb-upload --model M --version v3)")
        prompt = build(unit, "v2" if version == "v2x" else version, facts=f, reference=reference)
        messages = [{"role": "system", "content": SYSTEM}, {"role": "user", "content": prompt}]
        try:
            res = chat_with_backoff(messages, model)
        except Exception as e:  # noqa: BLE001
            r.step("model", input={"prompt_chars": len(prompt), "model": model}, output=str(e)[:300], kind="llm", error=str(e))
            raise
        r.step("model", input={"prompt_chars": len(prompt), "model": model}, output=res["text"][:800], kind="llm",
               ms=res["latency_ms"])
        parsed = parse_json(res["text"])
        from_reasoning = False
        if parsed is None:  # empty answer but a draft object inside the model's reasoning text
            rc = ((res.get("raw") or {}).get("choices") or [{}])[0].get("message", {}).get("reasoning_content") or ""
            if rc:
                parsed = parse_json(rc[-6000:])
                from_reasoning = parsed is not None
        r.step("parse_answer", input={"chars": len(res["text"]), "from_reasoning": from_reasoning}, output=parsed, kind="tool",
               error=None if parsed else "no JSON object in the answer")
        if parsed is None:
            raise ValueError("model returned no JSON object; answer head: " + repr(res["text"][:1200]))
        row_ids = {x[0] for x in unit["rows"]}
        flagged = [t for t in (parsed.get("flagged_transfer_ids") or []) if isinstance(t, str)]
        tin, tout = res["input_tokens"], res["output_tokens"]
        cost = res["cost_usd"]
        if cost is None:
            try:
                cost = llm._estimate(res["model"], tin, tout, llm._key())
            except Exception:  # noqa: BLE001
                cost = None
        return {"verdict": norm_verdict(parsed.get("verdict")), "pattern": norm_pattern(parsed.get("pattern")),
                "pattern_raw": str(parsed.get("pattern", ""))[:60], "flagged": flagged,
                "flagged_in_unit": [t for t in flagged if t in row_ids],
                "accounts": [a for a in (parsed.get("accounts") or []) if isinstance(a, str)][:30],
                "confidence": str(parsed.get("confidence", ""))[:10], "why": str(parsed.get("why", ""))[:600],
                "model_served": res["model"], "input_tokens": tin, "output_tokens": tout, "cost_usd": cost,
                "latency_ms": res["latency_ms"], "prompt_chars": len(prompt), "kb_used": bool(reference),
                "from_reasoning": from_reasoning}
    return agent


def judge(inp, out):
    unit = inp["unit"]
    if not isinstance(out, dict):
        return False, "no_answer"
    if out["verdict"] == unit["expected"]:
        return True, None
    if unit["expected"] == "ring":
        return False, f"missed_ring:{unit['shape']}"
    return False, "false_ring"


# ---------------------------------------------------------------- commands

def cmd_run(a):
    model = a.model
    os.environ["MT2_AGENT_NAME"] = agent_name(model, a.version)
    units = load_units(a.units)
    inputs = [{"id": u["id"], "unit": u} for u in units]
    name = batch_name(model, a.version)
    print(f"run {model} {a.version}: {len(units)} units, workers {a.workers}, agent {os.environ['MT2_AGENT_NAME']}, "
          f"prism {'on' if trace.configured() else 'OFF'}, batch {name}", flush=True)
    run_timeout = 480 if family(model) in REASONING_LOW or family(model) == "xai" else 240  # kimi took 100 to 240 s a call
    recs = batch.run_batch(make_agent(model, a.version, kb=a.kb), inputs, name, workers=a.workers, version=a.version,
                           timeout=run_timeout, dry=a.dry, pass_run=True, judge=judge, retry_failed=a.retry_failed)
    st = trace.status()
    print("prism:", {k: st[k] for k in ("runs_sent", "disabled", "last_error")}, "| spent so far: $%.3f" % llm.spent(), flush=True)
    print(short_table(model, a.version, recs, units))
    return recs


def short_table(model, version, recs, units):
    byid = {u["id"]: u for u in units}
    ok = sum(1 for r in recs if r.get("ok"))
    tech = sum(1 for r in recs if not r.get("ok") and not str(r.get("error", "")).startswith(("missed_ring", "false_ring")))
    missed = collections.Counter(str(r.get("error", "")).split(":")[1] for r in recs
                                 if str(r.get("error", "")).startswith("missed_ring"))
    false_rings = sum(1 for r in recs if r.get("error") == "false_ring")
    return (f"{model} {version}: right verdict {ok}/{len(recs)}; missed rings by shape {dict(missed)}; "
            f"false rings {false_rings}; technical failures {tech}")


def cmd_kb_upload(a):
    os.environ["MT2_AGENT_NAME"] = agent_name(a.model, a.version)
    text = (HERE / "data" / "kb_ring_shapes.md").read_text(encoding="utf-8")
    # PRISM dedupes identical content across agents and keeps the first agent's assignment (11:58): make each copy distinct
    text += chr(10) + chr(10) + "Reference copy held for agent " + os.environ["MT2_AGENT_NAME"] + "." + chr(10)
    res = trace.kb_upload("kb_ring_shapes_" + os.environ["MT2_AGENT_NAME"] + ".md", text,
                          description="Laundering pattern reference for the Rings bench")
    print(os.environ["MT2_AGENT_NAME"], "->", json.dumps(res)[:300] if res else f"FAILED ({trace.status()['last_error']})")


def context_for(unit, version):
    txt = rows_text(unit)
    if version in ("v2", "v3"):
        txt += "\n\nFacts computed by code:\n" + facts.facts_text(facts.compute_facts(unit))
    return txt


def traces_for(model, version):
    """Local trace records (out/traces.jsonl) for this agent, latest per unit."""
    p = HERE / "out" / "traces.jsonl"
    want = agent_name(model, version)
    recs = {}
    if p.exists():
        for line in p.read_text(encoding="utf-8").splitlines():
            try:
                r = json.loads(line)
            except ValueError:
                continue
            if r.get("agent_name") == want and (r.get("metadata") or {}).get("version") == version:
                recs[(r.get("metadata") or {}).get("unit")] = r
    return recs


def cmd_spans(a):
    units = {u["id"]: u for u in load_units()}
    recs = traces_for(a.model, a.version)
    sent = 0
    for uid, r in recs.items():
        if not r.get("sent") or uid not in units:
            continue
        body = {"trace_id": r["run_id"], "session_id": r["run_id"],
                "spans": [{"span_id": r["run_id"][:8] + "-ctx", "name": "load_rows", "span_type": "retrieval",
                           "input_text": f"unit {uid}", "output_text": context_for(units[uid], a.version)[:12000],
                           "start_time": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(r["t"])), "status": "ok"}]}
        res = trace.api("POST", "/api/spans/ingest", body)
        sent += 1 if res else 0
    print(f"spans posted for {sent} of {len(recs)} runs ({agent_name(a.model, a.version)}); last error: {trace.status()['last_error']}")


def cmd_analyze(a):
    recs = traces_for(a.model, a.version)
    done = 0
    for uid, r in recs.items():
        if done >= a.max:
            break
        if r.get("ok") or not r.get("sent"):
            continue
        row_id = (r.get("prism") or {}).get("trace")
        if not isinstance(row_id, str):
            continue
        res = trace.api("POST", f"/api/traces/{row_id}/analyze", {})
        done += 1 if res else 0
        print(uid, r.get("error"), "->", (json.dumps(res)[:160] if res else f"FAILED {trace.status()['last_error']}"))
    print(f"analyzed {done} failed runs of {agent_name(a.model, a.version)} (1 credit each)")


def cmd_alerts(a):
    names = sorted({r.get("agent_name") for r in traces_all() if str(r.get("agent_name", "")).startswith("rings-")})
    existing = trace.api("GET", f"/api/alerts/rules?project_id={os.environ['PRISMTRACE_PROJECT_ID']}") or []
    have = {(x.get("agent_id"), x.get("metric")) for x in (existing if isinstance(existing, list) else existing.get("rules", []))}
    for n in names:
        for metric, thr in (("error_rate", 10), ("latency", 20000)):
            if (n, metric) in have:
                print("exists", n, metric); continue
            res = trace.api("POST", "/api/alerts/rules", {"name": f"{n} {metric}", "metric": metric, "condition": "above",
                                                           "threshold": thr, "severity": "high", "agent_id": n})
            print(n, metric, "->", (res or {}).get("id") or f"FAILED {trace.status()['last_error']}")
    fired = trace.api("GET", f"/api/alerts/fired?project_id={os.environ['PRISMTRACE_PROJECT_ID']}")
    print("fired:", json.dumps(fired)[:600])


def cmd_rootcause(a):
    """Analyze now (5 credits), then list the clusters that belong to rings-* agents."""
    pid = os.environ["PRISMTRACE_PROJECT_ID"]
    ready = trace.api("GET", f"/api/intelligence/clusters/analyze/readiness?project_id={pid}")
    print("readiness:", json.dumps(ready)[:300])
    if not a.list_only:
        res = trace.api("POST", "/api/intelligence/clusters/analyze", {})
        print("analyze now ->", json.dumps(res)[:300] if res else f"FAILED {trace.status()['last_error']}")
        t0 = time.time()
        while time.time() - t0 < a.wait:
            time.sleep(20)
            st = trace.api("GET", f"/api/intelligence/clusters/analyze/status?project_id={pid}") or {}
            cl = trace.api("GET", f"/api/intelligence/clusters?project_id={pid}&limit=100") or {}
            items = cl if isinstance(cl, list) else (cl.get("clusters") or cl.get("items") or [])
            ours = [c for c in items if str(c.get("agent_name", "")).startswith("rings-")]
            print(f"{int(time.time() - t0)}s status {st.get('state')} rings clusters {len(ours)}", flush=True)
            # the status flaps between idle and running while other agents start runs (b3's note); only trust
            # idle after two minutes, and stop early once our clusters show
            if ours or (time.time() - t0 > 120 and str(st.get("state", "")).lower() in ("idle", "done", "completed")):
                break
    cl = trace.api("GET", f"/api/intelligence/clusters?project_id={pid}&limit=100") or {}
    items = cl if isinstance(cl, list) else (cl.get("clusters") or cl.get("items") or [])
    ours = [c for c in items if str(c.get("agent_name", "")).startswith("rings-")]
    print(f"clusters: {len(items)} in project, {len(ours)} for rings-* agents")
    for c in ours:
        print(" ", c.get("id"), c.get("agent_name"), "members", c.get("member_count") or len(c.get("members") or []),
              "|", c.get("cause_class"), "|", str(c.get("label") or c.get("title"))[:140])
    (HERE / "out" / "clusters.json").write_text(json.dumps(ours, indent=1), encoding="utf-8")


def traces_all():
    p = HERE / "out" / "traces.jsonl"
    out = []
    if p.exists():
        for line in p.read_text(encoding="utf-8").splitlines():
            try:
                out.append(json.loads(line))
            except ValueError:
                pass
    return out


def score_batch(model, version, recs, units):
    byid = {u["id"]: u for u in units}
    tp = fp = fn = 0
    rings_total = sum(1 for u in units if u["expected"] == "ring")
    by_shape = {s: {"rings": 0, "found": 0, "verdict_right": 0} for s in SHAPES}
    for u in units:
        if u["expected"] == "ring":
            by_shape[u["shape"]]["rings"] += 1
    rings_found = false_rings = named_ok = tech = 0
    runs, costs, lats = [], [], []
    for r in recs:
        u = byid.get(r["id"])
        if not u:
            continue
        o = r.get("output") if isinstance(r.get("output"), dict) else {}
        truth = set(u["truth_ids"])
        flagged = set(o.get("flagged_in_unit") or [])
        t, f_, n = len(flagged & truth), len(flagged - truth), len(truth - flagged)
        tp += t; fp += f_; fn += n
        verdict = o.get("verdict") if o else None
        correct = bool(r.get("ok"))
        technical = (not r.get("ok")) and not str(r.get("error", "")).startswith(("missed_ring", "false_ring"))
        tech += technical
        found = False
        if u["expected"] == "ring":
            if verdict == "ring":
                by_shape[u["shape"]]["verdict_right"] += 1
            found = verdict == "ring" and t >= math.ceil(len(truth) / 2)
            if found:
                rings_found += 1; by_shape[u["shape"]]["found"] += 1
                named_ok += o.get("pattern") == u["shape"]
        elif verdict == "ring":
            false_rings += 1
        if o.get("cost_usd") is not None:
            costs.append(o["cost_usd"])
        if o.get("latency_ms") is not None:
            lats.append(o["latency_ms"])
        rows_by_id = {x[0]: x for x in u["rows"]}
        tail_truth = sum(1 for t in u["truth_ids"] if rows_by_id[t][1] > "2022/09/10 23:59")
        runs.append({"run_id": f"{batch_name(model, version)}:{u['id']}", "model": model, "family": family(model),
                     "tail_truth_rows": tail_truth, "ibm_shape": IBM_SHAPE.get(u.get("ring_id")) if u["expected"] == "ring" else None,
                     "version": version, "unit": u["id"], "shape": u["shape"] or "none", "expected": u["expected"],
                     "verdict": verdict, "pattern": o.get("pattern"), "flagged_transfer_ids": sorted(flagged),
                     "tp": t, "fp": f_, "fn": n, "ring_found": found, "correct": correct,
                     "technical_failure": technical, "error": r.get("error"), "confidence": o.get("confidence"),
                     "why": o.get("why"), "latency_ms": o.get("latency_ms"), "cost_usd": o.get("cost_usd"),
                     "kb_used": o.get("kb_used", False)})
    prec = tp / (tp + fp) if tp + fp else 0.0
    rec = tp / (tp + fn) if tp + fn else 0.0
    return {"id": model, "family": family(model), "version": version, "runs": len(runs),
            "verdict_right": sum(1 for x in runs if x["correct"]), "precision": round(prec, 4), "recall": round(rec, 4),
            "tp": tp, "fp": fp, "fn": fn, "rings_found": rings_found, "rings_total": rings_total,
            "pattern_named_ok": named_ok, "false_rings": false_rings, "technical_failures": tech,
            "by_shape": by_shape, "cost_usd": round(sum(costs), 4),
            "latency_ms_median": int(statistics.median(lats)) if lats else None,
            "prism_agent_name": agent_name(model, version)}, runs


def cmd_results(a):
    units = load_units()
    models, all_runs = [], []
    for p in sorted((HERE / "out").glob("batch_*.jsonl")):
        name = p.stem[len("batch_"):]
        full_name = name  # the batch file keeps the slice prefix; only the model/version parse drops it
        if "__" not in name:
            continue
        if SLICE:
            if not name.startswith(SLICE + "__"):
                continue
            name = name[len(SLICE) + 2:]
        elif name.split("__")[0] in {d.name for d in (HERE / "slices").glob("*")} if (HERE / "slices").exists() else False:
            continue
        m, v = name.rsplit("__", 1)
        model = m.replace("_", "/", 1)
        recs = list(batch.load_results(full_name).values())
        if not recs:
            continue
        summ, runs = score_batch(model, v, recs, units)
        models.append(summ); all_runs += runs
    fails = collections.defaultdict(list)
    for r in all_runs:
        if not r["correct"] and not r["technical_failure"]:
            fails[r["shape"] if r["expected"] == "ring" else "false_ring"].append(
                {"run_id": r["run_id"], "model": r["model"], "version": r["version"], "unit": r["unit"], "why": r["why"]})
    shapes = collections.Counter(u["shape"] for u in units if u["expected"] == "ring")
    out = {"dataset": {"name": "IBM AMLworld HI-Small (synthetic), 10-day slice cut by us", "slice_transfers": 2824,
                       "slice_laundering": 113, "groups": 20, "shapes": dict(shapes),
                       "units": len(units), "ring_units": sum(shapes.values()), "ordinary_units": len(units) - sum(shapes.values()),
                       "notes": ["Four ring units (u15 mesh, u26 scatter-gather, u49 cycle, u50 fan-in) have most of their labeled rows after 2022-09-10, in the file's tail where 59 percent of rows are labeled; a late timestamp is a tell there (R155).",
                                 "Every laundering transfer in this slice is ACH; in the whole file it is 87 percent (R155).",
                                 "Slice laundering rate 4.0 percent vs 0.10 percent in the file; labels are IBM's generator's; shape names are ours."]},
           "versions": {"v1": "model reads the raw transfers of a neighborhood",
                        "v2": "code computes the neighborhood's facts (degrees, loops, bursts, pass-through chains, formats) and the model names the outcome"},
           "written": time.strftime("%Y-%m-%d %H:%M"), "models": models, "runs": all_runs, "failures_by_shape": fails}
    if SLICE:
        out["dataset"]["name"] += f" (held-out slice {SLICE})"
    blob = json.dumps(out, ensure_ascii=False, indent=1)
    (DATA_DIR / "bench_results.json").write_text(blob, encoding="utf-8")
    # the UI thread's ask (11:29): a .js twin so the page opens from a double-click with no server
    (DATA_DIR / "bench_results.js").write_text("window.BENCH = " + blob + ";" + chr(10), encoding="utf-8")
    print(f"{'model':34} {'ver':3} {'runs':>4} {'right':>5} {'prec':>6} {'rec':>6} {'rings':>7} {'false':>5} {'tech':>4} {'$':>7} {'ms':>6}")
    for m in sorted(models, key=lambda x: (x["id"], x["version"])):
        print(f"{m['id']:34} {m['version']:3} {m['runs']:4} {m['verdict_right']:5} {m['precision']:6.2f} {m['recall']:6.2f} "
              f"{m['rings_found']:3}/{m['rings_total']:<3} {m['false_rings']:5} {m['technical_failures']:4} {m['cost_usd']:7.3f} {m['latency_ms_median'] or 0:6}")
    print("written", DATA_DIR / "bench_results.json")


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    r = sub.add_parser("run"); r.add_argument("--model", required=True); r.add_argument("--version", default="v1")
    r.add_argument("--units"); r.add_argument("--workers", type=int, default=2); r.add_argument("--kb", action="store_true")
    r.add_argument("--dry", action="store_true"); r.add_argument("--retry-failed", action="store_true")
    k = sub.add_parser("kb-upload"); k.add_argument("--model", required=True); k.add_argument("--version", default="v3")
    s = sub.add_parser("spans"); s.add_argument("--model", required=True); s.add_argument("--version", default="v2")
    z = sub.add_parser("analyze"); z.add_argument("--model", required=True); z.add_argument("--version", default="v1"); z.add_argument("--max", type=int, default=10)
    sub.add_parser("alerts")
    rc = sub.add_parser("rootcause"); rc.add_argument("--list-only", action="store_true"); rc.add_argument("--wait", type=int, default=600)
    sub.add_parser("results")
    a = ap.parse_args()
    {"run": cmd_run, "kb-upload": cmd_kb_upload, "spans": cmd_spans, "analyze": cmd_analyze, "alerts": cmd_alerts,
     "rootcause": cmd_rootcause, "results": cmd_results}[a.cmd](a)


if __name__ == "__main__":
    main()
