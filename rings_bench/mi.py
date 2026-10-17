"""mi.py: the Money Intelligence proofs on top of the bench (Knowledge Base, Evaluator; Root Cause stays in bench.py).

  python mi.py spans --model M --version v1|v2|v3       retrieval span per sent run: the answer key + what the model retrieved,
                                                       so PRISM's evaluator can fill {context} (it reads retrieval spans only)
  python mi.py create                                   our evaluator + a manual eval task (ids saved in out/evaluator.json)
  python mi.py run --agent rings-openai-v1 --limit 10   preview (free), then score that many newest unscored traces (1 credit each)
  python mi.py results                                  fetch eval results, join to our runs, print right/wrong per agent and version

Same keys and project as bench.py. Credits: scoring is 1 per trace; everything else here is free.
"""
import argparse, json, os, sys, time
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT_DIR = Path(os.environ.get("MT2_OUT_DIR") or (HERE / "out"))
sys.path.insert(0, str(HERE))
import bench  # noqa: E402  (sets the kit path, env defaults)
from mt2kit import trace  # noqa: E402
import facts  # noqa: E402

PID = os.environ["PRISMTRACE_PROJECT_ID"]
EVAL_FILE = OUT_DIR / "evaluator.json"

TEMPLATE = (
    "You are checking a financial-crime analyst agent's answer against an answer key.\n"
    "The input below holds the transfer rows given to the agent, followed by a system message that carries the "
    "ANSWER KEY (expected verdict, shape, labeled_transfer_ids). The agent never saw the key.\n"
    "Input: {input}\n\n"
    "Context (what the agent retrieved from its knowledge base, if anything): {context}\n\n"
    "Agent's answer, one JSON object with verdict, pattern and flagged_transfer_ids: {output}\n\n"
    "Compare the agent's answer with the answer key. Rule: the answer is RIGHT when its verdict (ring or ordinary) equals the key's expected verdict and, when the "
    "key's expected verdict is ring, at least half of the key's labeled transfer ids appear in the answer's "
    "flagged_transfer_ids. In every other case the answer is WRONG, including a ring verdict on a neighborhood whose "
    "key says ordinary, and a missing or unparseable answer. Check the ids one by one. Answer with exactly one word: right or wrong."
)


def context_for(unit, version, kb_text=None):
    key = {"expected": unit["expected"], "shape": unit["shape"] or "none", "labeled_transfer_ids": unit["truth_ids"],
           "all_transfer_ids_in_neighborhood": [r[0] for r in unit["rows"]]}
    parts = ["ANSWER KEY (never shown to the agent): " + json.dumps(key)]
    if version in ("v2", "v3"):
        parts.append("FACTS COMPUTED BY CODE (shown to the agent): " + facts.facts_text(facts.compute_facts(unit))[:3000])
    if kb_text:
        parts.append("RETRIEVED FROM THE KNOWLEDGE BASE (shown to the agent): " + kb_text[:2500])
    return "\n\n".join(parts)


def cmd_spans(a):
    units = {u["id"]: u for u in bench.load_units()}
    recs = bench.traces_for(a.model, a.version)
    sent = 0
    for uid, r in recs.items():
        if not r.get("sent") or uid not in units:
            continue
        kb = next((s["output_summary"] for s in r.get("steps", []) if s.get("label") == "kb_search"), None)
        body = {"trace_id": r["run_id"], "session_id": r["run_id"],
                "spans": [{"span_id": r["run_id"][:8] + "-key", "name": "answer_key_and_retrieval", "span_type": "retrieval",
                           "input_text": f"unit {uid}",
                           "output_text": (("RETRIEVED FROM THE KNOWLEDGE BASE: " + kb[:2500]) if (a.key_in_input and kb) else
                                           ("RETRIEVED: nothing (this version does no lookup)" if a.key_in_input else
                                            context_for(units[uid], a.version, kb))),
                           "start_time": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(r["t"])), "status": "ok"}]}
        res = trace.api("POST", "/api/spans/ingest", body)
        sent += 1 if res else 0
    print(f"spans posted for {sent} of {len(recs)} runs of {bench.agent_name(a.model, a.version)}; last error: {trace.status()['last_error']}")


def cmd_replay(a):
    """Re-send the latest run of each chosen unit as a fresh trace (metadata.replay_of = the original run id), then its
    answer-key span. Why: an eval task only sees traces created after the task itself (preview 12:04: v1 traces from
    11:24 were invisible, v3 traces from 12:00 were not). Replaying both versions for the same units right before the
    run makes "newest unscored first" pick exactly these units. Trace ingest is free."""
    import uuid
    units = {u["id"]: u for u in bench.load_units()}
    want = a.units.split(",")
    recs = bench.traces_for(a.model, a.version)
    c = trace.client()
    agent = bench.agent_name(a.model, a.version)
    done = 0
    for uid in want:
        r = recs.get(uid)
        if not r:
            print("no local run for", uid, agent); continue
        new_id = str(uuid.uuid4())
        out = r.get("output")
        out_text = json.dumps(out, ensure_ascii=False) if isinstance(out, dict) else f"FAILED: {r.get('error')}"
        md = dict(r.get("metadata") or {}, replay_of=r["run_id"], replayed_at=time.strftime("%Y-%m-%dT%H:%M:%S"))
        key_msg = {"role": "system", "content": "ANSWER KEY FOR THE EVALUATOR (never shown to the agent): " + json.dumps(
            {"expected": units[uid]["expected"], "shape": units[uid]["shape"] or "none", "labeled_transfer_ids": units[uid]["truth_ids"]})}
        body = {"project_id": c.project_id, "model": str(md.get("model", "mt2-agent")),
                "input_messages": (([key_msg] if a.key_in_input else [])  # key FIRST: PRISM treats the last message as the output (probe 12:12)
                                   + [{"role": "user", "content": json.dumps(units[uid], ensure_ascii=False)[:4000]}]),
                "output_message": out_text[:4000], "latency_ms": int(r.get("latency_ms") or 0), "trace_id": new_id,
                "session_id": new_id, "agent_id": agent, "agent_name": agent, "metadata": md}
        tr = c._post_sync("/api/traces", body)
        if not tr:
            print("trace post failed", uid); continue
        kb = next((s["output_summary"] for s in r.get("steps", []) if s.get("label") == "kb_search"), None)
        # PRISM rebuilds a trace's input and output from its spans once any span is ingested (read back 12:16: the
        # trace's output_message had become the retrieval span's text). So the whole turn goes in as spans, in
        # order: the request, the retrieval (the key for the judge plus any knowledge base text), the agent's answer.
        base = time.time()
        iso = lambda off: time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(base + off))
        # the request span carries the prompt the model really saw (rows and instructions), never the unit record,
        # which holds expected/truth_ids and would look like a leaked key to the judge
        from prompts import build as build_prompt
        prompt_text = build_prompt(units[uid], "v2" if a.version in ("v2", "v3") else "v1", reference=kb)[:6000]
        span = {"trace_id": new_id, "session_id": new_id, "spans": [
            {"span_id": new_id[:8] + "-req", "name": "request", "span_type": "llm", "input_text": prompt_text,
             "output_text": "", "start_time": iso(0), "status": "ok"},
            {"span_id": new_id[:8] + "-key", "name": "answer_key_and_retrieval", "span_type": "retrieval",
             "input_text": f"unit {uid}", "output_text": context_for(units[uid], a.version, kb),
             "start_time": iso(1), "status": "ok"},
            {"span_id": new_id[:8] + "-ans", "name": "agent_answer", "span_type": "llm", "input_text": prompt_text,
             "output_text": out_text[:4000], "start_time": iso(2), "status": "ok"}]}
        sp = trace.api("POST", "/api/spans/ingest", span)
        done += 1 if sp else 0
        with (OUT_DIR / "replays.jsonl").open("a", encoding="utf-8") as f:
            f.write(json.dumps({"agent": agent, "version": a.version, "unit": uid, "new_trace_id": new_id, "row_id": tr.get("id"),
                                "replay_of": r["run_id"], "our_ok": r.get("ok"), "error": r.get("error")}) + chr(10))
    print(f"replayed {done} of {len(want)} units for {agent} (traces + spans)")


def cmd_create(a):
    ev = trace.api("POST", "/api/evaluators", {
        "name": "rings verdict vs key", "type": "llm_judge", "category": "custom",
        "description": "Right when the verdict matches the answer key and, for a ring, at least half of the key's labeled transfer ids are flagged.",
        "template_prompt": TEMPLATE, "rails": ["right", "wrong"]})
    if not ev or not ev.get("id"):
        print("evaluator create FAILED:", trace.status()["last_error"], json.dumps(ev)[:300]); return
    task = trace.api("POST", "/api/eval-tasks", {"evaluator_id": ev["id"], "name": "rings v1 vs v3 same inputs",
                                                  "cadence": "manual", "sampling_rate": 100, "granularity": "trace"})
    if not task or not task.get("id"):
        print("eval task create FAILED:", trace.status()["last_error"], json.dumps(task)[:300]); return
    EVAL_FILE.parent.mkdir(exist_ok=True)
    EVAL_FILE.write_text(json.dumps({"evaluator_id": ev["id"], "task_id": task["id"], "created": time.strftime("%Y-%m-%d %H:%M")}, indent=1))
    print("evaluator", ev["id"], "task", task["id"], "model", ev.get("model"))


def cmd_run(a):
    ids = json.loads(EVAL_FILE.read_text())
    q = f"?agent_name={a.agent}&since_hours={a.since_hours}&limit={a.limit}"
    prev = trace.api("GET", f"/api/eval-tasks/{ids['task_id']}/preview{q}&project_id={PID}")
    print("preview:", json.dumps(prev)[:300])
    if a.preview_only:
        return
    res = trace.api("POST", f"/api/eval-tasks/{ids['task_id']}/run{q}", {})
    print("run:", json.dumps(res)[:300] if res else f"FAILED {trace.status()['last_error']}")


def cmd_results(a):
    ids = json.loads(EVAL_FILE.read_text())
    res = trace.api("GET", f"/api/eval-results?project_id={PID}&task_id={ids['task_id']}&limit=500") or {}
    rows = res if isinstance(res, list) else (res.get("results") or res.get("items") or [])
    # join on the internal trace row id, which our trace records keep in prism.trace
    recs = bench.traces_all()
    by_row = {(r.get("prism") or {}).get("trace"): r for r in recs if isinstance((r.get("prism") or {}).get("trace"), str)}
    rp = OUT_DIR / "replays.jsonl"  # replayed traces carry their own row ids
    if rp.exists():
        for line in rp.read_text(encoding="utf-8").splitlines():
            if line.strip():
                x = json.loads(line)
                by_row[x.get("row_id")] = {"agent_name": x["agent"], "ok": x.get("our_ok"), "metadata": {"version": x["version"], "unit": x["unit"], "replay": True}}
    out, tally = [], {}
    for x in rows:
        r = by_row.get(x.get("trace_id"))
        md = (r or {}).get("metadata") or {}
        key = (r or {}).get("agent_name", "?"), md.get("version", "?")
        t = tally.setdefault(key, {"right": 0, "wrong": 0, "other": 0})
        lab = str(x.get("label", "")).lower()
        t["right" if lab == "right" else "wrong" if lab == "wrong" else "other"] += 1
        out.append({"agent": key[0], "version": key[1], "unit": md.get("unit"), "expected": md.get("expected"),
                    "our_ok": (r or {}).get("ok"), "prism_label": lab, "score": x.get("score"), "reasoning": str(x.get("reasoning", ""))[:300]})
    (OUT_DIR / "eval_results.json").write_text(json.dumps(out, indent=1, ensure_ascii=False), encoding="utf-8")
    agree = sum(1 for o in out if o["our_ok"] is not None and (o["prism_label"] == "right") == bool(o["our_ok"]))
    print(f"{len(out)} scored rows; PRISM judge agrees with our local scorer on {agree}")
    for k, t in sorted(tally.items()):
        print(f"  {k[0]:24} {k[1]:3} right {t['right']:3} wrong {t['wrong']:3} other {t['other']}")


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("spans"); s.add_argument("--model", required=True); s.add_argument("--version", required=True)
    sub.add_parser("create")
    r = sub.add_parser("run"); r.add_argument("--agent", required=True); r.add_argument("--limit", type=int, default=10)
    r.add_argument("--since-hours", type=int, default=8); r.add_argument("--preview-only", action="store_true")
    sub.add_parser("results")
    rp = sub.add_parser("replay"); rp.add_argument("--model", required=True); rp.add_argument("--version", required=True); rp.add_argument("--units", required=True)
    rp.add_argument("--key-in-input", action="store_true", help="put the answer key in the trace input (a system message), keep the span for what was retrieved")
    a = ap.parse_args()
    {"spans": cmd_spans, "create": cmd_create, "run": cmd_run, "results": cmd_results, "replay": cmd_replay}[a.cmd](a)


if __name__ == "__main__":
    main()
