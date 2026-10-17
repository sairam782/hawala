"""score_jev.py: score out/jev_<tag>.json against the bench's truth; calibration; Jev as a gate on Sonnet's ring calls.

  python score_jev.py            # prints every table and writes out/scores.json + out/scores.md
Reads: out/jev_main.json, out/jev_heldout_a.json, ../data/units.json, ../data/bench_results.json,
       ../slices/heldout_a/units.json, ../slices/heldout_a/bench_results.json. Writes only under out/.
Scoring rules are the bench README's: rings found = ring verdict and at least half the labeled ids flagged (the run's
own ring_found field); a false ring = an ordinary unit called ring; precision and recall over transfers (tp, fp, fn).
"""
import json, math
from collections import Counter, defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
BENCH = HERE.parent
OUT = HERE / "out"
SONNET = "anthropic/claude-sonnet-5-5"
VARIANTS = ["rows_facts", "facts", "sentences"]
LINES = []


def say(s=""):
    print(s); LINES.append(s)


def auc(pos, neg):
    """Area under the ROC curve = chance a random ring unit scores above a random ordinary unit (ties count half)."""
    if not pos or not neg:
        return None
    wins = sum((1.0 if p > n else 0.5 if p == n else 0.0) for p in pos for n in neg)
    return round(wins / (len(pos) * len(neg)), 3)


def load(tag, slice_dir):
    jev = json.load(open(OUT / f"jev_{tag}.json", encoding="utf-8"))
    units = {u["id"]: u for u in json.load(open(slice_dir / "units.json", encoding="utf-8"))["units"]}
    bench = json.load(open(slice_dir / "bench_results.json", encoding="utf-8"))
    return jev, units, bench


def jev_table(jev, units, tag):
    rows = [r for r in jev["rows"] if "error" not in r]
    say(f"\n## Jev on {tag}: verdict accuracy, false rings, separation (60 units: 20 ring, 40 ordinary)\n")
    say("| state variant | verdicts right | ring units called ring | ordinary called ring (false rings) | pattern named right (of ring units) | AUC of p(ring) | AUC of evidence score |")
    say("|---|---|---|---|---|---|---|")
    res = {}
    for v in VARIANTS:
        R = [r for r in rows if r["variant"] == v]
        right = sum(r["correct"] for r in R)
        rings = [r for r in R if r["expected"] == "ring"]; ords = [r for r in R if r["expected"] == "ordinary"]
        tp = sum(r["scheme"] == "ring" for r in rings); fr = sum(r["scheme"] == "ring" for r in ords)
        named = sum(r["pattern"] == r["shape"] for r in rings)
        a1 = auc([r["p_ring"] for r in rings], [r["p_ring"] for r in ords])
        a2 = auc([r["evidence_0_100"] for r in rings], [r["evidence_0_100"] for r in ords])
        res[v] = {"verdict_right": right, "rings_called": tp, "false_rings": fr, "pattern_named": named, "auc_p_ring": a1, "auc_evidence": a2}
        say(f"| {v} | {right}/60 | {tp}/20 | {fr}/40 | {named}/20 | {a1} | {a2} |")
    # by shape, main variant
    say("\nRing units called ring, by IBM shape (variant facts / sentences):\n")
    by = defaultdict(lambda: [0, 0, 0])
    for r in rows:
        if r["expected"] == "ring" and r["variant"] in ("facts", "sentences"):
            by[r["shape"]][0 if r["variant"] == "facts" else 1] += (r["scheme"] == "ring")
    for r in rows:
        if r["expected"] == "ring" and r["variant"] == "facts":
            by[r["shape"]][2] += 1
    say("| shape | units | called ring (facts) | called ring (sentences) |"); say("|---|---|---|---|")
    for s, (a, b, n) in sorted(by.items()):
        say(f"| {s} | {n} | {a} | {b} |")
    return res


def calibration(jev, tag):
    rows = [r for r in jev["rows"] if "error" not in r]
    say(f"\n## Calibration on {tag}: Jev's confidence number, binned, and how often the verdict was right\n")
    say("Jev's confidence for a two-option Choice is 2 x max probability minus 1 (TypeSafe's spread formula), so it is "
        "the same information as p(ring) folded around 0.5.\n")
    bins = [(0.0, 0.2), (0.2, 0.4), (0.4, 0.6), (0.6, 0.8), (0.8, 1.01)]
    say("| state variant | confidence bin | units | verdict right | right rate |"); say("|---|---|---|---|---|")
    cal = {}
    for v in VARIANTS:
        cal[v] = []
        for lo, hi in bins:
            R = [r for r in rows if r["variant"] == v and lo <= r["scheme_confidence"] < hi]
            if R:
                k = sum(r["correct"] for r in R)
                cal[v].append({"bin": f"{lo:.1f} to {min(hi, 1.0):.1f}", "n": len(R), "right": k, "rate": round(k / len(R), 2)})
                say(f"| {v} | {lo:.1f} to {min(hi, 1.0):.1f} | {len(R)} | {k} | {k / len(R):.2f} |")
    say("\np(ring) binned, share of units that really are rings (a reliability table; a calibrated p would match the bin):\n")
    say("| state variant | p(ring) bin | units | actual rings | ring share |"); say("|---|---|---|---|---|")
    rel = {}
    for v in VARIANTS:
        rel[v] = []
        for lo, hi in [(0.0, 0.5), (0.5, 0.7), (0.7, 0.8), (0.8, 0.9), (0.9, 1.01)]:
            R = [r for r in rows if r["variant"] == v and lo <= r["p_ring"] < hi]
            if R:
                k = sum(r["expected"] == "ring" for r in R)
                rel[v].append({"bin": f"{lo:.1f} to {min(hi, 1.0):.1f}", "n": len(R), "rings": k, "share": round(k / len(R), 2)})
                say(f"| {v} | {lo:.1f} to {min(hi, 1.0):.1f} | {len(R)} | {k} | {k / len(R):.2f} |")
    return {"confidence_bins": cal, "p_ring_bins": rel}


def sonnet_calibration(bench, version, tag):
    runs = [r for r in bench["runs"] if r["model"] == SONNET and r["version"] == version and not r["technical_failure"]]
    say(f"\n## Claude Sonnet {version} on {tag}: self-reported confidence vs being right (for comparison)\n")
    say("| verdict | confidence | runs | verdict right | right rate |"); say("|---|---|---|---|---|")
    out = []
    for verdict in ("ring", "ordinary"):
        for c in ("low", "medium", "high"):
            R = [r for r in runs if r["verdict"] == verdict and r["confidence"] == c]
            if R:
                k = sum(r["correct"] for r in R)
                out.append({"verdict": verdict, "confidence": c, "n": len(R), "right": k})
                say(f"| {verdict} | {c} | {len(R)} | {k} | {k / len(R):.2f} |")
    return out


def summarize(runs):
    tp = sum(r["tp"] for r in runs); fp = sum(r["fp"] for r in runs); fn = sum(r["fn"] for r in runs)
    return {"precision": round(tp / (tp + fp), 3) if tp + fp else 0.0, "recall": round(tp / (tp + fn), 3) if tp + fn else 0.0,
            "rings_found": sum(1 for r in runs if r["ring_found"]), "false_rings": sum(1 for r in runs if r["expected"] == "ordinary" and r["verdict"] == "ring"),
            "ring_calls": sum(1 for r in runs if r["verdict"] == "ring"), "tp": tp, "fp": fp, "fn": fn}


def gated(runs, keep):
    """keep(unit_id) -> bool. A dropped ring call becomes 'ordinary' with nothing flagged."""
    out = []
    for r in runs:
        if r["verdict"] == "ring" and not keep(r["unit"]):
            r2 = dict(r); r2.update({"verdict": "ordinary", "tp": 0, "fp": 0, "fn": r["tp"] + r["fn"], "ring_found": False})
            out.append(r2)
        else:
            out.append(r)
    return out


def gate_sweep(jev, bench, version, variant, signal, tag, thresholds=None):
    runs = [r for r in bench["runs"] if r["model"] == SONNET and r["version"] == version and not r["technical_failure"]]
    J = {r["unit"]: r for r in jev["rows"] if r["variant"] == variant and "error" not in r}
    base = summarize(runs)
    table = [{"threshold": None, **base}]
    if thresholds is None:
        vals = sorted({J[u][signal] for u in J})
        thresholds = vals
    for t in thresholds:
        g = gated(runs, lambda u: J.get(u, {}).get(signal, 0) >= t)
        table.append({"threshold": t, **summarize(g)})
    return table


def f1(s):
    p, r = s["precision"], s["recall"]
    return 2 * p * r / (p + r) if p + r else 0.0


def show_gate(table, title, picks=None):
    say(f"\n{title}\n")
    say("| gate threshold | precision | recall | rings found of 20 | false rings of 40 | ring calls |"); say("|---|---|---|---|---|---|")
    for s in table:
        if picks is None or s["threshold"] is None or s["threshold"] in picks:
            t = "none (Sonnet alone)" if s["threshold"] is None else f"{s['threshold']}"
            say(f"| {t} | {s['precision']:.2f} | {s['recall']:.2f} | {s['rings_found']} | {s['false_rings']} | {s['ring_calls']} |")


def main():
    OUT.mkdir(exist_ok=True)
    jm, um, bm = load("main", BENCH / "data")
    jh, uh, bh = load("heldout_a", BENCH / "slices" / "heldout_a")
    say("# Jev on the Rings bench: scores (generated by score_jev.py)\n")
    say(f"Jev model {jm['model']}; main run written {jm['written']}, heldout_a run written {jh['written']}. "
        f"Ledger main: {json.dumps(jm['ledger'])}. Ledger heldout_a: {json.dumps(jh['ledger'])}.")
    res = {"jev_main": jev_table(jm, um, "main"), "jev_heldout_a": jev_table(jh, uh, "heldout_a")}
    res["calibration_main"] = calibration(jm, "main")
    res["calibration_heldout_a"] = calibration(jh, "heldout_a")
    res["sonnet_v3_main"] = sonnet_calibration(bm, "v3", "main")
    res["sonnet_v2_main"] = sonnet_calibration(bm, "v2", "main")
    res["sonnet_v2_heldout_a"] = sonnet_calibration(bh, "v2", "heldout_a")

    # ---- the gate: choose on main (Sonnet v3), apply to heldout_a (Sonnet v2: v3 was never run there)
    say("\n## Jev as a gate on Sonnet's ring calls\n")
    say("Rule: keep a Sonnet ring call only when Jev's signal for that neighborhood is at or above the threshold; a dropped "
        "call becomes 'ordinary' with nothing flagged. Threshold chosen on the main slice against Sonnet v3, then applied "
        "unchanged to heldout_a. Sonnet v3 was never run on heldout_a (only v1 and v2 exist there), so the held-out test "
        "gates Sonnet v2 (facts, no Knowledge Base lookup); the same gate on v2 of the main slice is shown for a like-for-like read.\n")
    gates = {}
    chosen = {}
    for variant in VARIANTS:
        for signal in ("p_ring", "evidence_0_100"):
            table = gate_sweep(jm, bm, "v3", variant, signal, "main")
            # choose: the threshold with the best F1 on main; ties -> the lowest threshold (drops least)
            best = max(table[1:], key=lambda s: (round(f1(s), 4), -s["threshold"]))
            chosen[(variant, signal)] = best["threshold"]
            gates[f"main_v3_{variant}_{signal}"] = table
    # report the two task-named signals on the main variants, full sweep at a few round thresholds
    for variant in VARIANTS:
        for signal, grid in (("p_ring", [0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.95]), ("evidence_0_100", [40, 50, 60, 70, 75, 80, 85, 90])):
            t = gate_sweep(jm, bm, "v3", variant, signal, "main", grid)
            show_gate(t, f"### main slice, Sonnet v3 gated by Jev {signal} (state variant {variant})")
            say(f"\nBest F1 threshold on main (full sweep): {chosen[(variant, signal)]}")
    say("\n### The chosen thresholds applied to heldout_a (Sonnet v2) and, like for like, to the main slice's Sonnet v2\n")
    say("| state variant | signal | threshold (from main v3) | slice | precision before -> after | recall before -> after | rings found before -> after | false rings before -> after |")
    say("|---|---|---|---|---|---|---|---|")
    applied = []
    for variant in VARIANTS:
        for signal in ("p_ring", "evidence_0_100"):
            t = chosen[(variant, signal)]
            for tag, jev, bench, ver in (("main", jm, bm, "v3"), ("main", jm, bm, "v2"), ("heldout_a", jh, bh, "v2")):
                tbl = gate_sweep(jev, bench, ver, variant, signal, tag, [t])
                b, a = tbl[0], tbl[1]
                applied.append({"variant": variant, "signal": signal, "threshold": t, "slice": tag, "sonnet_version": ver, "before": b, "after": a})
                say(f"| {variant} | {signal} | {t} | {tag} Sonnet {ver} | {b['precision']:.2f} -> {a['precision']:.2f} | {b['recall']:.2f} -> {a['recall']:.2f} | "
                    f"{b['rings_found']} -> {a['rings_found']} | {b['false_rings']} -> {a['false_rings']} |")
    res["gate_applied"] = applied
    res["gate_sweeps_main_v3"] = gates

    # ---- Sonnet's own confidence as the gate (the 12:40 finding), for comparison, and both gates together
    say("\n### For comparison: Sonnet's own self-reported confidence as the gate (drop ring calls marked low), and both gates together\n")
    say("| slice | Sonnet version | gate | precision | recall | rings found | false rings |"); say("|---|---|---|---|---|---|---|")
    both = []
    for tag, jev, bench, ver in (("main", jm, bm, "v3"), ("main", jm, bm, "v2"), ("heldout_a", jh, bh, "v2")):
        runs = [r for r in bench["runs"] if r["model"] == SONNET and r["version"] == ver and not r["technical_failure"]]
        conf = {r["unit"]: r["confidence"] for r in runs}
        s0 = summarize(runs)
        s1 = summarize(gated(runs, lambda u: conf[u] != "low"))
        say(f"| {tag} | {ver} | none | {s0['precision']:.2f} | {s0['recall']:.2f} | {s0['rings_found']} | {s0['false_rings']} |")
        say(f"| {tag} | {ver} | drop Sonnet 'low' | {s1['precision']:.2f} | {s1['recall']:.2f} | {s1['rings_found']} | {s1['false_rings']} |")
        for variant in ("facts", "sentences"):
            for signal in ("p_ring", "evidence_0_100"):
                t = chosen[(variant, signal)]
                J = {r["unit"]: r for r in jev["rows"] if r["variant"] == variant and "error" not in r}
                s2 = summarize(gated(runs, lambda u: conf[u] != "low" and J.get(u, {}).get(signal, 0) >= t))
                say(f"| {tag} | {ver} | drop 'low' AND Jev {signal} < {t} ({variant}) | {s2['precision']:.2f} | {s2['recall']:.2f} | {s2['rings_found']} | {s2['false_rings']} |")
                both.append({"slice": tag, "version": ver, "variant": variant, "signal": signal, "threshold": t, **s2})
    res["both_gates"] = both
    res["chosen_thresholds"] = {f"{v}|{s}": t for (v, s), t in chosen.items()}

    (OUT / "scores.json").write_text(json.dumps(res, indent=1), encoding="utf-8")
    (OUT / "scores.md").write_text("\n".join(LINES), encoding="utf-8")


if __name__ == "__main__":
    main()
