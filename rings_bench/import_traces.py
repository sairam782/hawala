"""import_traces.py: move our recorded PRISM runs into another PRISM workspace (the team's), without new model calls.

The export is export/prism_traces_2026-10-17.jsonl.gz: one record per run as the engine sent it to PRISM on
2026-10-17 (agent name, model, input, output, the tool steps, metadata, latency). This script re-posts each record
as a trace (POST /api/traces) and a trajectory (POST /api/trajectories) under a new key and project, the same two
calls the engine made the first time. Tracing is free on PRISM. Standard library only; no kit needed.

  python import_traces.py --key pt-sk-... --project <uuid> [--agents rings-anthropic-v3,rings-openai-v3]
                          [--limit N] [--dry-run] [--file export/prism_traces_2026-10-17.jsonl.gz]

Agent names are kept (rings-<family>-<version>[-<slice>]), so alert rules, Knowledge Base assignments and the
evaluator in the new workspace attach to the same names. metadata.replay_of carries the original trace id. An eval
task in the new workspace only sees traces created after the task, so create the task first, then import.
"""
import argparse, gzip, json, sys, time, urllib.error, urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
HOST = "https://api.prism.blockconvey.com"


def post(path, body, key):
    req = urllib.request.Request(HOST + path, data=json.dumps(body).encode("utf-8"), method="POST",
                                 headers={"X-PRISMtrace-Key": key, "content-type": "application/json"})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.status, json.loads(r.read() or b"{}")
        except urllib.error.HTTPError as e:
            txt = (e.read() or b"")[:300].decode("utf-8", "replace")
            if e.code in (429, 500, 502, 503, 504) and attempt < 3:
                time.sleep(2 * (attempt + 1)); continue
            return e.code, txt
        except Exception as e:  # network
            if attempt < 3:
                time.sleep(2 * (attempt + 1)); continue
            return 0, str(e)


def text(x, cap=12000):
    s = x if isinstance(x, str) else json.dumps(x, ensure_ascii=False)
    return s if len(s) <= cap else s[:cap] + " ..."


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--key", required=True); ap.add_argument("--project", required=True)
    ap.add_argument("--file", default=str(HERE / "export" / "prism_traces_2026-10-17.jsonl.gz"))
    ap.add_argument("--agents", default="", help="comma list of agent names to import; default all")
    ap.add_argument("--limit", type=int, default=0); ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    want = {s.strip() for s in a.agents.split(",") if s.strip()}
    opener = gzip.open if a.file.endswith(".gz") else open
    n = sent = failed = 0
    with opener(a.file, "rt", encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            r = json.loads(line)
            if want and r.get("agent_name") not in want:
                continue
            n += 1
            if a.limit and n > a.limit:
                break
            md = dict(r.get("metadata") or {}, run_name=r.get("name"), mt2_run_id=r.get("run_id"),
                      replay_of=(r.get("prism") or {}).get("trace"), imported_from="MONG Workspace practice run 2026-10-17")
            if r.get("version"):
                md["version"] = r["version"]
            if not r.get("ok"):
                md["error"] = r.get("error")
            ok = bool(r.get("ok"))
            model = str(md.get("model", "mt2-agent"))
            trace = {"project_id": a.project, "model": model,
                     "input_messages": [{"role": "user", "content": text(r.get("input"))}],
                     "output_message": text(r.get("output")) if ok else f"FAILED: {r.get('error')}",
                     "latency_ms": r.get("latency_ms") or 0, "trace_id": r.get("run_id"), "session_id": r.get("run_id"),
                     "agent_id": r.get("agent_name"), "agent_name": r.get("agent_name"), "metadata": md}
            steps = r.get("steps") or []
            traj = {"project_id": a.project, "conversation_id": r.get("run_id"), "request_id": r.get("run_id"),
                    "agent_id": r.get("agent_name"), "agent_name": r.get("agent_name"), "steps": steps,
                    "total_duration_ms": sum(s.get("duration_ms") or 0 for s in steps),
                    "final_status": "success" if ok else "error", "model": model}
            if a.dry_run:
                if n <= 3:
                    print("would send:", r.get("agent_name"), r.get("run_id"), "steps", len(steps), "ok", ok)
                continue
            s1, b1 = post("/api/traces", trace, a.key)
            s2, b2 = post("/api/trajectories", traj, a.key) if steps else (200, {})
            if s1 in (200, 201) and s2 in (200, 201):
                sent += 1
            else:
                failed += 1
                if failed <= 5:
                    print("failed:", r.get("agent_name"), r.get("run_id"), s1, str(b1)[:160], s2, str(b2)[:160])
            if sent and sent % 100 == 0:
                print(f"  sent {sent}", flush=True)
    print(f"records matched {n if not a.limit else min(n, a.limit)}; sent {sent}; failed {failed}; dry_run={a.dry_run}")


if __name__ == "__main__":
    main()
