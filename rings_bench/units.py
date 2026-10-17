"""units.py: cut the Rings slice into run units for the many-models bench.

A unit is a small neighborhood of accounts and their transfers. A positive unit is one IBM-labeled ring's transfers
plus the ordinary traffic touching the ring's accounts (sampled, capped). A negative unit is an ordinary account's
neighborhood with no laundering transfer in it. The model sees the rows and nothing else; the key stays here.

Reads  data/slice.js   (window.SLICE = {...}, the r2-rings runs.js: transfers, key, ring_meta)
Writes data/units.json  [{id, expected, shape, ring_id, accounts, rows, truth_ids, n_rows}]
Usage: python units.py [--cap 60] [--negatives 40] [--seed 20261017]
"""
import argparse, collections, json, random
from pathlib import Path

HERE = Path(__file__).resolve().parent
COLS = ["id", "time", "from", "to", "paid", "currency", "format", "from_bank", "to_bank"]


def load_slice(d=None):
    t = ((d or (HERE / "data")) / "slice.js").read_text(encoding="utf-8")
    return json.loads(t[t.index("{"):].rstrip().rstrip(";"))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cap", type=int, default=60)
    ap.add_argument("--negatives", type=int, default=40)
    ap.add_argument("--seed", type=int, default=20261017)
    ap.add_argument("--dir", default=None, help="slice folder holding slice.js (default data/); units.json lands beside it")
    a = ap.parse_args()
    rnd = random.Random(a.seed)
    ddir = Path(a.dir).resolve() if a.dir else (HERE / "data")
    d = load_slice(ddir)
    tr = d["transfers"]; key = d["key"]; meta = d["ring_meta"]
    byid = {r[0]: r for r in tr}
    label = {tid: v[0] for tid, v in key.items()}
    ring_rows = collections.defaultdict(list)
    for tid, (lab, ring) in key.items():
        if lab == 1:
            ring_rows[str(ring)].append(tid)
    touch = collections.defaultdict(list)
    for r in tr:
        if r[2] != r[3]:
            touch[r[2]].append(r[0]); touch[r[3]].append(r[0])
    ring_acc = {k: {x for tid in v for x in (byid[tid][2], byid[tid][3])} for k, v in ring_rows.items()}
    all_ring_acc = set().union(*ring_acc.values())
    units = []

    def rows_sorted(ids):
        return sorted((byid[t] for t in ids), key=lambda r: (r[1], r[0]))

    # positives: one per IBM-labeled ring
    for k in sorted(ring_rows, key=int):
        truth = set(ring_rows[k]); acc = ring_acc[k]
        ordinary = sorted({t for x in acc for t in touch[x]} - truth)
        rnd.shuffle(ordinary)
        keep = truth | set(ordinary[: max(0, a.cap - len(truth))])
        rows = rows_sorted(keep)
        units.append({"id": "", "expected": "ring", "shape": meta[k]["shape"], "ring_id": int(k),
                      "accounts": sorted({x for r in rows for x in (r[2], r[3])}), "rows": rows,
                      "truth_ids": sorted(truth), "n_rows": len(rows)})
    # negatives: ordinary seeds; the unit keeps only ordinary rows that are not "beside a label" (same account
    # within 120 minutes of a labelled transfer: IBM's labels are partial inside bursts, so those rows would be
    # unfair negatives). Ring accounts may appear through their ordinary rows; no laundering row ever does.
    import datetime
    def minutes(ts):
        return int(datetime.datetime.strptime(ts, "%Y/%m/%d %H:%M").timestamp() // 60)
    by_acct = collections.defaultdict(list)
    for tid, lab in label.items():
        if lab == 1:
            r = byid[tid]; m = minutes(r[1])
            by_acct[r[2]].append(m); by_acct[r[3]].append(m)
    def beside(tid):
        r = byid[tid]; m = minutes(r[1])
        return any(abs(mm - m) <= 120 for x in (r[2], r[3]) for mm in by_acct.get(x, ()))
    clean = {t for t in byid if label[t] == 0 and byid[t][2] != byid[t][3] and not beside(t)}
    seeds = [x for x, v in touch.items() if x not in all_ring_acc and len([t for t in v if t in clean]) >= 4]
    rnd.shuffle(seeds)
    neg_sets = []
    for s in seeds:
        if len(neg_sets) >= a.negatives:
            break
        hop = {t for t in touch[s] if t in clean}
        nbrs = {x for t in hop for x in (byid[t][2], byid[t][3])}
        pool = sorted({t for x in nbrs for t in touch[x] if t in clean} - hop)
        rnd.shuffle(pool)
        keep = hop | set(pool[: max(0, a.cap - len(hop))])
        if len(keep) < 8 or any(len(keep & prev) / len(keep | prev) >= 0.5 for prev in neg_sets):
            continue
        neg_sets.append(keep)
        rows = rows_sorted(keep)
        units.append({"id": "", "expected": "ordinary", "shape": None, "ring_id": None, "seed_account": s,
                      "accounts": sorted({x for r in rows for x in (r[2], r[3])}), "rows": rows,
                      "truth_ids": [], "n_rows": len(rows)})
    # stable ids, shuffled order so a model that sees several cannot read the order
    rnd.shuffle(units)
    for i, u in enumerate(units, 1):
        u["id"] = f"u{i:02d}"
    blob = json.dumps({"columns": COLS, "cap": a.cap, "seed": a.seed, "units": units}, ensure_ascii=False)
    (ddir / "units.json").write_text(blob, encoding="utf-8")
    (ddir / "units.js").write_text("window.UNITS = " + blob + ";" + chr(10), encoding="utf-8")  # file:// twin for the UI
    pos = [u for u in units if u["expected"] == "ring"]; neg = [u for u in units if u["expected"] == "ordinary"]
    print(f"units {len(units)}: {len(pos)} ring, {len(neg)} ordinary; rows per unit "
          f"min {min(u['n_rows'] for u in units)} median {sorted(u['n_rows'] for u in units)[len(units)//2]} max {max(u['n_rows'] for u in units)}")
    by_shape = collections.Counter(u["shape"] for u in pos)
    print("shapes:", dict(by_shape))
    print("ordinary units with >= 10 rows:", sum(1 for u in neg if u["n_rows"] >= 10))


if __name__ == "__main__":
    main()
