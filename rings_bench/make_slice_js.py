"""make_slice_js.py: turn a lineage cut (slice/transfers.csv + key.json, as build_slice.py writes them) into slice.js.

Usage: python make_slice_js.py <cut_folder> <out_folder> "<dataset line>"
Writes <out_folder>/slice.js in the window.SLICE shape the bench and the page read, then prints the counts.
"""
import collections, csv, json, sys
from pathlib import Path

SHAPE = {"bipartite-or-mesh": "mesh", "single": "lone"}


def main():
    src, out, dataset = Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3]
    rows = list(csv.DictReader(open(src / "slice" / "transfers.csv", encoding="utf-8")))
    key = {k["id"]: k for k in json.load(open(src / "key.json", encoding="utf-8"))}
    ring_ids, ring_meta, transfers, keyout = {}, {}, [], {}
    for r in rows:
        tid = r["transfer_id"]; k = key[tid]
        transfers.append([tid, r["timestamp"], r["from_account"], r["to_account"], float(r["amount_paid"]),
                          r["payment_currency"], r["payment_format"], r["from_bank"], r["to_bank"]])
        if k["label"] == 1:
            ridx = ring_ids.setdefault(k["ring"], len(ring_ids))
            keyout[tid] = [1, ridx]
            m = ring_meta.setdefault(str(ridx), {"shape": SHAPE.get(k["shape"], k["shape"]), "n": 0})
            m["n"] += 1
        else:
            keyout[tid] = [0, -1]
    laund = sum(1 for v in keyout.values() if v[0] == 1)
    obj = {"dataset": dataset, "ran": "", "columns": ["id", "time", "from", "to", "paid", "currency", "format", "from_bank", "to_bank"],
           "transfers": transfers, "key": keyout, "ring_meta": ring_meta,
           "slice": {"rows": len(transfers), "laundering": laund, "rate": laund / len(transfers), "full_rows": 5078345, "full_laundering": 5177}}
    out.mkdir(parents=True, exist_ok=True)
    (out / "slice.js").write_text("window.SLICE = " + json.dumps(obj, ensure_ascii=False) + ";" + chr(10), encoding="utf-8")
    print("rows", len(transfers), "laundering", laund, "rings", len(ring_meta), dict(collections.Counter(m["shape"] for m in ring_meta.values())))
    print("labeled rows after 09/10:", sum(1 for t in transfers if keyout[t[0]][0] == 1 and t[1] > "2022/09/10 23:59"))
    ach_l = sum(1 for t in transfers if keyout[t[0]][0] == 1 and t[6] == "ACH")
    ach_o = sum(1 for t in transfers if keyout[t[0]][0] == 0 and t[6] == "ACH")
    print("ACH: labeled", ach_l, "of", laund, "| ordinary ACH rows", ach_o, "of", len(transfers) - laund)


if __name__ == "__main__":
    main()
