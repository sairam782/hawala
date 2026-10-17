"""team_rerun.py: the Money Intelligence proofs on a fresh PRISM workspace (the team's), in one go.

  python team_rerun.py --key pt-sk-... --project <uuid> [--model openai/gpt-6-sol] [--skip-runs]

What it does, in order (each step prints its receipt; stop with Ctrl+C and rerun, the batches resume):
  1. whoami on the workspace (name, scopes)                                  free
  2. Knowledge Base: upload the pattern reference for the v3 agent          free
  3. run the model's v1 and v3 over all 60 units (two processes, 3 workers) model cost about $1.20
  4. alert rules (error_rate, latency) for the two agents                   free
  5. analyze up to 10 failed v1 traces (Root Cause input)                   10 credits
  6. Root Cause: Analyze now, poll, list our clusters                       5 credits
  7. evaluator: create, replay 10 units for v1 and v3, score both           20 credits
Everything lands under out_team/ (separate from the practice workspace's out/), so nothing resumes from old runs.
"""
import argparse, os, subprocess, sys, time
from pathlib import Path

HERE = Path(__file__).resolve().parent
PY = sys.executable
UNITS = "u06,u08,u09,u10,u11,u01,u02,u03,u04,u05"


def run(cmd, env, bg=False):
    print(">", " ".join(cmd), flush=True)
    if bg:
        return subprocess.Popen(cmd, cwd=HERE, env=env)
    r = subprocess.run(cmd, cwd=HERE, env=env)
    if r.returncode != 0:
        print(f"  step returned {r.returncode}; continuing", flush=True)
    return r


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--key", required=True); ap.add_argument("--project", required=True)
    ap.add_argument("--model", default="openai/gpt-6-sol"); ap.add_argument("--skip-runs", action="store_true")
    ap.add_argument("--workers", type=int, default=3)
    a = ap.parse_args()
    env = dict(os.environ, PRISMTRACE_API_KEY=a.key, PRISM_API_KEY=a.key, PRISMTRACE_PROJECT_ID=a.project,
               PRISM_PROJECT_ID=a.project, MT2_OUT_DIR=str(HERE / "out_team"), MT2_BUDGET_USD="40")
    (HERE / "out_team").mkdir(exist_ok=True)
    # 1. whoami
    run([PY, "-c", "import sys,os,json; sys.path.insert(0, r'C:/Projects/Verticals/Hackathons/kit/mt2_kit'); "
         "from mt2kit import trace; print('whoami:', json.dumps(trace.api('GET','/api/whoami'))[:300]); "
         "print('entitlements:', json.dumps((trace.api('GET','/api/entitlements?project_id=' + os.environ['PRISMTRACE_PROJECT_ID']) or {}).get('plan')))"], env)
    # 2. KB
    run([PY, "bench.py", "kb-upload", "--model", a.model, "--version", "v3"], env)
    # 3. runs
    if not a.skip_runs:
        p1 = run([PY, "bench.py", "run", "--model", a.model, "--version", "v1", "--workers", str(a.workers)], env, bg=True)
        p3 = run([PY, "bench.py", "run", "--model", a.model, "--version", "v3", "--workers", str(a.workers)], env, bg=True)
        p1.wait(); p3.wait()
    # 4. alerts
    run([PY, "bench.py", "alerts"], env)
    # 5. analyze failed v1 traces
    run([PY, "bench.py", "analyze", "--model", a.model, "--version", "v1", "--max", "10"], env)
    # 6. root cause
    run([PY, "bench.py", "rootcause", "--wait", "600"], env)
    # 7. evaluator
    run([PY, "mi.py", "create"], env)
    run([PY, "mi.py", "replay", "--model", a.model, "--version", "v1", "--units", UNITS], env)
    run([PY, "mi.py", "replay", "--model", a.model, "--version", "v3", "--units", UNITS], env)
    fam = a.model.split("/")[0]
    run([PY, "mi.py", "run", "--agent", f"rings-{fam}-v1", "--limit", "10"], env)
    time.sleep(75)
    run([PY, "mi.py", "run", "--agent", f"rings-{fam}-v3", "--limit", "10"], env)
    time.sleep(75)
    run([PY, "mi.py", "results"], env)
    print("team rerun finished; receipts above, files under out_team/", flush=True)


if __name__ == "__main__":
    main()
