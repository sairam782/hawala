"""make_investigate.py: the "needs a look" tray and the stronger model's answers, for the clearing page.

Tray = neighborhoods where the first pass (Claude Sonnet 5.5, v3 run under the v4 rule) was unsure: it called a ring
at low confidence, or the nine families split (3 to n-3 of those that answered said ring). The investigator is a
stronger model run with the v5 framing on only those neighborhoods. Writes data/investigate.json and .js.

Usage: python make_investigate.py [--model anthropic/claude-opus-5-5] [--version v5]
"""
import argparse, json, math, sys, time
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import bench  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default="anthropic/claude-opus-5-5"); ap.add_argument("--version", default="v5")
    a = ap.parse_args()
    units = {u["id"]: u for u in bench.load_units()}
    tray = json.load(open(HERE / "data" / "uncertain_tray.json", encoding="utf-8"))
    src = bench.OUT_DIR / f"batch_{bench.batch_name(a.model, a.version)}.jsonl"
    recs = {}
    if src.exists():
        for line in src.read_text(encoding="utf-8").splitlines():
            if line.strip():
                r = json.loads(line); recs[r["id"]] = r
    results, n_ring, n_found, n_false, n_cannot = {}, 0, 0, 0, 0
    for t in tray:
        uid = t["unit"]; u = units[uid]; r = recs.get(uid)
        o = (r or {}).get("output") if isinstance((r or {}).get("output"), dict) else None
        if not o:
            continue
        verdict = str(o.get("verdict", "")).lower()
        truth = set(u["truth_ids"]); flagged = set(o.get("flagged_in_unit") or o.get("flagged") or [])
        tp = len(truth & flagged); fp = len(flagged - truth)
        found = verdict == "ring" and tp >= math.ceil(len(truth) / 2) and fp <= max(2, len(truth)) if truth else False
        if verdict == "ring":
            n_ring += 1
            if u["expected"] == "ordinary":
                n_false += 1
        if "cannot" in verdict:
            n_cannot += 1
        if found:
            n_found += 1
        results[uid] = dict(verdict=verdict, confidence=o.get("confidence"), pattern=o.get("pattern"),
                            ibm_shape=bench.IBM_SHAPE.get(u.get("shape"), u.get("shape")) if hasattr(bench, "IBM_SHAPE") else u.get("shape"),
                            why=str(o.get("why", ""))[:600], flagged_in_unit=sorted(flagged), tp=tp, fp=fp,
                            ring_found=bool(found), expected=u["expected"],
                            latency_ms=(r or {}).get("latency_ms"), cost_usd=(r or {}).get("cost_usd"))
    rings_in_tray = sum(1 for t in tray if t["expected"] == "ring")
    out = dict(model=a.model, version=a.version, written=time.strftime("%Y-%m-%d %H:%M"),
               note=f"Investigated by {a.model} with the v5 framing (code facts, Knowledge Base lookup, base rate stated, "
                    f"cannot tell allowed). Runs recorded earlier and replayed here; the page makes no network calls.",
               summary=dict(tray=len(tray), rings_in_tray=rings_in_tray, answered=len(results), called_ring=n_ring,
                            rings_found=n_found, false_rings=n_false, cannot_tell=n_cannot),
               tray=tray, results=results)
    (HERE / "data" / "investigate.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    (HERE / "data" / "investigate.js").write_text("window.INVESTIGATE = " + json.dumps(out, ensure_ascii=False) + ";\n", encoding="utf-8")
    print(f"tray {len(tray)} ({rings_in_tray} IBM rings); answered {len(results)}; called ring {n_ring}; "
          f"rings found {n_found} of {rings_in_tray}; false rings {n_false}; cannot tell {n_cannot}")


if __name__ == "__main__":
    main()
