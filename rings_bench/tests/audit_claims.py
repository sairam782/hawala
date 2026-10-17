"""audit_claims.py: every number the pitch and the README say out loud, recomputed from the committed data.

  python3 tests/audit_claims.py            # prints the table; exit code 1 if any checkable claim is off

Each claim names where it is said and how it is recomputed. OK = the data says the same; OFF = it does not;
CAN'T = the claim rests on something not in the repo (the 5M-row file, PRISM), so it is listed, not passed.
"""
import json, math, sys
from pathlib import Path

RB = Path(__file__).resolve().parent.parent
J = lambda p: json.load(open(RB / p, encoding="utf-8"))  # noqa: E731


def slice_js(p):
    t = (RB / p).read_text(encoding="utf-8")
    return json.loads(t[t.index("{"):].rstrip().rstrip(";"))


def arm(results, model, version):
    return next((m for m in results["models"] if m["id"] == model and m["version"] == version), None)


SON, SOL = "anthropic/claude-sonnet-5-5", "openai/gpt-6-sol"
main = J("data/bench_results.json")
held = {s: J(f"slices/{s}/bench_results.json") for s in ("heldout_a", "heldout_b", "heldout_c", "random_clean")
        if (RB / f"slices/{s}/bench_results.json").exists()}
panel = J("data/panel.json")
inv = J("data/investigate.json")
S = slice_js("data/slice.js")
rows = []


def claim(where, said, got, ok, how):
    rows.append((where, said, got, "OK" if ok is True else "OFF" if ok is False else "CAN'T", how))


# --- the slice
lab = [t for t, (l, _) in S["key"].items() if l == 1]
accts = {x for r in S["transfers"] for x in (r[2], r[3])}
claim("pitch demo 1, README", "2,824 transfers", f"{len(S['transfers']):,}", len(S["transfers"]) == 2824, "rows in data/slice.js")
claim("pitch demo 1", "1,797 accounts", f"{len(accts):,}", len(accts) == 1797, "distinct from/to accounts in data/slice.js")
claim("pitch demo 1", "113 laundering transfers", str(len(lab)), len(lab) == 113, "label 1 in the slice key")
claim("README limits", "slice is 4 percent laundering", f"{len(lab) / len(S['transfers']):.2%}", round(len(lab) / len(S["transfers"]), 2) == 0.04, "113 / 2,824")
byid = {r[0]: r for r in S["transfers"]}
ach = sum(byid[t][6] == "ACH" for t in lab)
claim("README limits, pitch limit", "every laundering transfer in the slice is ACH", f"{ach} of {len(lab)}", ach == len(lab), "payment_format of labeled rows")
claim("README data", "5,078,345 transfers, 5,177 illicit (one in 981)", f"5,078,345 / 5,177 = {5078345 / 5177:.1f}", None,
      "the file is not in the repo; only the arithmetic is checked")

# --- first pass: Sonnet v4 on the main slice
v4 = arm(main, SON, "v4")
if v4:
    claim("pitch demo 1", "Sonnet catches 9 of IBM's 20 rings", f"{v4['rings_found']} of {v4['rings_total']}", v4["rings_found"] == 9, "rings_found, sonnet v4, main")
    claim("pitch demo 1", "100 of 113 laundering transfers", f"{v4['tp']} of {v4['tp'] + v4['fn']}", v4["tp"] == 100, "tp, sonnet v4, main")
    claim("pitch demo 1", "2 alarms on ordinary neighborhoods", str(v4["false_rings"]), v4["false_rings"] == 2, "false_rings, sonnet v4, main")
    fr = [r for r in main["runs"] if r["model"] == SON and r["version"] == "v4" and r["expected"] == "ordinary" and r["verdict"] == "ring"]
    inside = sum(bool(r.get("ring_accounts_flagged")) for r in fr)
    claim("pitch demo 1", "both alarms on accounts inside a ring", f"{inside} of {len(fr)}", bool(fr) and inside == len(fr), "ring_accounts_flagged on those runs")

# --- the confidence rule (v3 -> v4) on main and the held-out slices
v3 = arm(main, SON, "v3")
if v3 and v4:
    claim("pitch finding 2", "false rings fall 5 to 2 on this slice", f"{v3['false_rings']} to {v4['false_rings']}", (v3["false_rings"], v4["false_rings"]) == (5, 2), "sonnet v3 -> v4, main")
for s, said in zip(("heldout_a", "heldout_b", "heldout_c"), ("11 to 1", "17 to 5", "12 to 7")):
    if s not in held:
        continue
    a4 = arm(held[s], SON, "v4")
    base = next((arm(held[s], SON, v) for v in ("v3", "v2", "v1") if arm(held[s], SON, v) and a4), None)
    vs = next((v for v in ("v3", "v2", "v1") if arm(held[s], SON, v)), "?")
    if a4 and base:
        got = f"{base['false_rings']} to {a4['false_rings']} (from {vs}); v1 {arm(held[s], SON, 'v1')['false_rings'] if arm(held[s], SON, 'v1') else '-'}"
        x, y = (int(n) for n in said.split(" to "))
        cands = {arm(held[s], SON, v)["false_rings"] for v in ("v1", "v2", "v3") if arm(held[s], SON, v)}
        claim(f"pitch finding 2 ({s})", said, got, x in cands and a4["false_rings"] == y, "sonnet base version -> v4")

# --- the vote dial
for ver in ("v1", "v2"):
    tab = (panel["versions"].get(ver) or {}).get("vote_table") or (panel["versions"].get(ver) or {}).get("votes") or []
    if tab:
        k1 = next(t for t in tab if t["votes_needed"] == 1); k7 = next((t for t in tab if t["votes_needed"] == 7), None)
        if k7:
            curve = [t["rings_found"] for t in tab]
            claim(f"pitch finding 3, README ({ver} panel)", "7 of 9 cuts false rings from 39 to 5, halves groups found",
                  f"{k1['false_rings']} to {k7['false_rings']}; groups {k1['rings_found']} to {k7['rings_found']}; rings by k {curve}",
                  (k1["false_rings"], k7["false_rings"]) == (39, 5) and k7["rings_found"] * 2 <= k1["rings_found"] + 1, "panel.json vote table, k=1 vs k=7")
            claim(f"panel.py ({ver})", "the dial is a tolerance knob: fewer votes needed, more rings found",
                  f"rings found by votes needed: {curve}", all(a >= b for a, b in zip(curve, curve[1:])),
                  "rings_found should not rise as k rises; at low k the union of flags trips the no-sweep rule")

# --- the ACH tell
a2, ax = arm(main, SON, "v2"), arm(main, SON, "v2x")
if a2 and ax:
    claim("pitch finding 4, README", "hide the format: Sonnet precision 0.46 to 0.27", f"{a2['precision']:.2f} to {ax['precision']:.2f}",
          (round(a2["precision"], 2), round(ax["precision"], 2)) == (0.46, 0.27), "sonnet v2 -> v2x, main")
o2, ox = arm(main, SOL, "v2"), arm(main, SOL, "v2x")
if o2 and ox:
    claim("README", "the other strong family's precision holds", f"{o2['precision']:.2f} to {ox['precision']:.2f}", abs(o2["precision"] - ox["precision"]) < 0.03, "gpt-6-sol v2 -> v2x")
fams = [m for m in main["models"] if m["version"] in ("v1", "v2")]
lo, hi = min(m["false_rings"] for m in fams), max(m["false_rings"] for m in fams)
claim("README findings", "false alarms 2 to 38 of 40 depending on the family", f"{lo} to {hi}", (lo, hi) == (2, 38), "false_rings over every v1/v2 arm, main")

# --- the tray and the investigator
tray = J("data/uncertain_tray.json")
rings_in_tray = sum(1 for t in tray if (t.get("expected") if isinstance(t, dict) else None) == "ring")
claim("pitch demo 2", "30 neighborhoods in the tray, 7 of them IBM rings", f"{len(tray)}, {rings_in_tray} rings", len(tray) == 30 and rings_in_tray == 7, "data/uncertain_tray.json")
sm = inv.get("summary") or {}
claim("pitch demo 3", "Opus clears all 23 ordinary with no false alarm, finds 2 of 7, about 65 cents",
      ", ".join(f"{k} {v}" for k, v in sm.items() if not isinstance(v, (dict, list)))[:150], None, "data/investigate.json summary (read it against the claim)")
caught = (v4["rings_found"] if v4 else 0) + (sm.get("rings_found") or 0)
claim("pitch demo 4", "11 rings in green", str(caught), caught == 11, "sonnet v4 rings + Opus tray rings")
claim("pitch demo 4", "then the 5 it still missed appear", f"{20 - caught} of 20 rings are not caught",
      20 - caught == 5, "20 minus the 11 caught; 5 is only the tray's misses (7 - 2)")

# --- clean traffic
rc = held.get("random_clean")
if rc:
    r3, r5 = arm(rc, SON, "v3"), arm(rc, SON, "v5")
    r4, o3 = arm(rc, SON, "v4"), arm(rc, SOL, "v3")
    if r4 and r5:
        claim("pitch limit", "strong models alarm on 1 in 5 clean neighborhoods; v5 cuts it to 1 in 10",
              f"Sonnet v4 {r4['false_rings']}, GPT-6 Sol v3 {o3['false_rings'] if o3 else '-'}, Sonnet v5 {r5['false_rings']} (of 40); Sonnet v3 {r3['false_rings'] if r3 else '-'}",
              abs(r4["false_rings"] / 40 - 0.2) <= 0.05 and abs(r5["false_rings"] / 40 - 0.1) <= 0.05,
              "random_clean slice: every alarm is false by construction")

# --- held-out generalisation (README)
for m in (SON, SOL):
    for v in ("v1", "v2"):
        a = arm(main, m, v); hs = [arm(held[s], m, v) for s in ("heldout_a", "heldout_b", "heldout_c") if s in held and arm(held[s], m, v)]
        if a and hs:
            rec = sum(h["recall"] for h in hs) / len(hs); pre = sum(h["precision"] for h in hs) / len(hs)
            claim(f"README findings ({m.split('/')[1]} {v})", "held-out: keeps precision, loses about a quarter of recall",
                  f"precision {a['precision']:.2f} -> {pre:.2f}, recall {a['recall']:.2f} -> {rec:.2f} (mean of {len(hs)} held-out)",
                  abs(pre - a["precision"]) <= 0.05 and 0.15 <= 1 - rec / a["recall"] <= 0.35,
                  "precision within 0.05 and recall down 15 to 35 percent, mean over held-out A, B, C")

for c in ("pitch person: the first rule is right 0.75 percent of the time (page says the ACH rule is 0.84% on the whole file)",
          "pitch data: 38 percent of laundering is in no named shape", "README: 8 of 12 multi-transfer groups match IBM's pattern file",
          "pitch PRISM: an alert fired at 29 seconds; Root Cause timed out over 1,500 failed runs"):
    claim(c.split(":")[0], c.split(":", 1)[1].strip(), "-", None, "needs the full file or PRISM")

print(f"{'':5} {'said where':34} {'claim':62} {'data says'}")
for where, said, got, st, how in rows:
    print(f"{st:5} {where[:34]:34} {said[:62]:62} {got}")
off = [r for r in rows if r[3] == "OFF"]
cant = sum(r[3] == "CAN'T" for r in rows)
print(f"\n{sum(r[3] == 'OK' for r in rows)} OK, {len(off)} OFF, {cant} not checkable from the repo")
sys.exit(1 if off else 0)
