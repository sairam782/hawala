"""derive_v4.py: the fix as a decision rule, derived from existing runs without a new model call.

v4 = the v3 run (code facts + knowledge base lookup) with one rule on top: a ring verdict is kept only when the
model's own confidence is not "low". Found on the main slice at 12:40 (Claude Sonnet: nearly every clean
neighborhood it called a ring carried "low" confidence) and confirmed on held-out A and B. It writes a batch file
out/[slice__]<model>__v4.jsonl in the same record shape as the runner, so results, panel and replays treat it like
any arm. The record keeps the v3 output and adds rule fields, so nothing is hidden.

Usage: python derive_v4.py [--model M] [--base v3]       (env RINGS_SLICE=<name> for a held-out slice)
"""
import argparse, json, os, sys, time
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import bench  # noqa: E402

RULE = "keep a ring verdict only when the model's confidence is not low (v3 + confidence rule)"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default="anthropic/claude-sonnet-5-5"); ap.add_argument("--base", default="v3")
    a = ap.parse_args()
    units = {u["id"]: u for u in bench.load_units()}
    src = bench.OUT_DIR / f"batch_{bench.batch_name(a.model, a.base)}.jsonl"
    if not src.exists():
        print("no base batch:", src); return
    recs = {}
    for line in src.read_text(encoding="utf-8").splitlines():
        if line.strip():
            r = json.loads(line); recs[r["id"]] = r
    out_path = bench.OUT_DIR / f"batch_{bench.batch_name(a.model, 'v4')}.jsonl"
    n_changed = 0
    with out_path.open("w", encoding="utf-8") as f:
        for uid, r in recs.items():
            o = r.get("output") if isinstance(r.get("output"), dict) else None
            if not o:
                r2 = dict(r, version="v4", name=bench.batch_name(a.model, "v4")); f.write(json.dumps(r2, ensure_ascii=False) + "\n"); continue
            o2 = dict(o, rule=RULE, base_version=a.base, base_verdict=o["verdict"], base_confidence=o.get("confidence"))
            if o["verdict"] == "ring" and str(o.get("confidence", "")).lower() == "low":
                o2["verdict"] = "ordinary"; o2["pattern"] = "none"; o2["flagged"] = []; o2["flagged_in_unit"] = []
                o2["why"] = "Downgraded by the confidence rule: the model called a ring at low confidence. Model's reason: " + str(o.get("why", ""))[:400]
                n_changed += 1
            u = units[uid]
            ok = o2["verdict"] == u["expected"]
            err = None if ok else (f"missed_ring:{u['shape']}" if u["expected"] == "ring" else "false_ring")
            r2 = dict(r, version="v4", name=bench.batch_name(a.model, "v4"), output=o2, ok=ok, error=err)
            f.write(json.dumps(r2, ensure_ascii=False) + "\n")
    print(f"wrote {out_path.name}: {len(recs)} records, {n_changed} ring calls downgraded by the rule")


if __name__ == "__main__":
    main()
