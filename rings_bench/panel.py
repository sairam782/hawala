"""panel.py: cross-family agreement on the same units, and the vote dial.

Reads data/bench_results.json (only model arms with all 60 units) and data/units.json.
Writes data/panel.json: per version, (a) agreement per unit (how many families said ring), (b) the vote table:
for k = 1..n, the panel verdict is ring when at least k families say ring and a transfer is flagged when at least
k of those families flagged it; precision, recall, rings found, false rings and right verdicts at each k.
The dial is the desk's tolerance knob: more votes needed = fewer false rings, fewer rings found.
Usage: python panel.py
"""
import collections, json, math
from pathlib import Path

HERE = Path(__file__).resolve().parent


def main():
    d = json.load(open(HERE / "data" / "bench_results.json", encoding="utf-8"))
    units = {u["id"]: u for u in json.load(open(HERE / "data" / "units.json", encoding="utf-8"))["units"]}
    out = {"written": d.get("written"), "versions": {}}
    for ver in ("v1", "v2"):
        fams = sorted({m["id"] for m in d["models"] if m["runs"] == len(units) and m["version"] == ver})
        byunit = collections.defaultdict(dict)
        for r in d["runs"]:
            # a technical failure (timeout, no JSON) is not a vote: the family did not answer that unit
            if r["model"] in fams and r["version"] == ver and not r.get("technical_failure") and r.get("verdict"):
                byunit[r["unit"]][r["model"]] = r
        agreement = []
        for uid in sorted(byunit):
            u = units[uid]; rs = byunit[uid]
            agreement.append({"unit": uid, "expected": u["expected"], "shape": u["shape"] or "none",
                              "ring_votes": sum(1 for x in rs.values() if x["verdict"] == "ring"),
                              "families": len(rs), "said_ring": sorted(m for m, x in rs.items() if x["verdict"] == "ring")})
        table = []
        answered = {uid: len(rs) for uid, rs in byunit.items()}
        for k in range(1, len(fams) + 1):
            tp = fp = fn = rings = false = right = 0
            for uid, rs in byunit.items():
                u = units[uid]; truth = set(u["truth_ids"])
                votes = sum(1 for x in rs.values() if x["verdict"] == "ring")
                verdict = "ring" if votes >= k else "ordinary"
                cnt = collections.Counter(t for x in rs.values() if x["verdict"] == "ring" for t in x["flagged_transfer_ids"])
                flagged = {t for t, c in cnt.items() if c >= k} if verdict == "ring" else set()
                t = len(flagged & truth); tp += t; fp += len(flagged - truth); fn += len(truth - flagged)
                right += verdict == u["expected"]
                if u["expected"] == "ring":
                    rings += verdict == "ring" and t >= math.ceil(len(truth) / 2)
                elif verdict == "ring":
                    false += 1
            table.append({"votes_needed": k, "of": len(fams), "verdict_right": right, "precision": round(tp / (tp + fp), 4) if tp + fp else 0.0,
                          "recall": round(tp / (tp + fn), 4) if tp + fn else 0.0, "rings_found": rings, "rings_total": 20, "false_rings": false})
        ring_units = [a for a in agreement if a["expected"] == "ring"]
        ord_units = [a for a in agreement if a["expected"] == "ordinary"]
        summary = {"families": fams, "note": "technical failures are not votes; a unit's family count is the families that answered it",
                   "units_answered_by_all": sum(1 for n in answered.values() if n == len(fams)),
                   "ring_units_all_agree_ring": sum(1 for a in ring_units if a["ring_votes"] == a["families"]),
                   "ring_units_none_say_ring": sum(1 for a in ring_units if a["ring_votes"] == 0),
                   "ring_units_split": sum(1 for a in ring_units if 0 < a["ring_votes"] < a["families"]),
                   "ordinary_units_all_agree_ordinary": sum(1 for a in ord_units if a["ring_votes"] == 0),
                   "ordinary_units_all_say_ring": sum(1 for a in ord_units if a["ring_votes"] == a["families"]),
                   "ordinary_units_split": sum(1 for a in ord_units if 0 < a["ring_votes"] < a["families"]),
                   "missed_by_most": [(a["unit"], a["shape"], a["ring_votes"]) for a in ring_units if a["ring_votes"] <= a["families"] / 2]}
        out["versions"][ver] = {"summary": summary, "agreement": agreement, "vote_table": table}
        print(f"{ver}: {len(fams)} families; ring units all-agree {summary['ring_units_all_agree_ring']}, split {summary['ring_units_split']}, "
              f"none {summary['ring_units_none_say_ring']}; ordinary units all-agree-ordinary {summary['ordinary_units_all_agree_ordinary']}, "
              f"split {summary['ordinary_units_split']}, all-say-ring {summary['ordinary_units_all_say_ring']}")
        for t in table:
            print(f"   need {t['votes_needed']} of {t['of']}: right {t['verdict_right']}/60 prec {t['precision']:.2f} rec {t['recall']:.2f} rings {t['rings_found']}/20 false {t['false_rings']}")
    blob = json.dumps(out, ensure_ascii=False, indent=1)
    (HERE / "data" / "panel.json").write_text(blob, encoding="utf-8")
    (HERE / "data" / "panel.js").write_text("window.PANEL = " + blob + ";\n", encoding="utf-8")
    print("written data/panel.json and panel.js")


if __name__ == "__main__":
    main()
