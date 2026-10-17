"""facts.py: what code can say about a unit's transfers before any model looks. Facts only, no verdict.

compute_facts(unit) -> dict; facts_text(facts) -> plain-text block for the v2 prompt.
Loops, bursts, pass-through chains, degrees, amounts, payment formats, time span. Every fact names transfer ids
so the model can cite them and the scorer can check them. Each part is also exposed as its own function so the
bench can log it as a separate tool step (PRISM Sessions proof: 6+ steps).
"""
import collections, datetime, statistics


def _min(ts):
    return int(datetime.datetime.strptime(ts, "%Y/%m/%d %H:%M").timestamp() // 60)


def _edges(unit):
    return [r for r in unit["rows"] if r[2] != r[3]]


def degrees(unit):
    edges = _edges(unit)
    selfs = [r for r in unit["rows"] if r[2] == r[3]]
    out_n, in_n = collections.Counter(), collections.Counter()
    out_to, in_from = collections.defaultdict(set), collections.defaultdict(set)
    for r in edges:
        out_n[r[2]] += 1; in_n[r[3]] += 1; out_to[r[2]].add(r[3]); in_from[r[3]].add(r[2])
    accounts = sorted({x for r in edges for x in (r[2], r[3])} | {r[2] for r in selfs})
    degs = [{"account": a, "sent": out_n[a], "to_distinct": len(out_to[a]), "received": in_n[a],
             "from_distinct": len(in_from[a]), "pass_through": bool(out_n[a] and in_n[a])} for a in accounts]
    degs.sort(key=lambda d: -(d["sent"] + d["received"]))
    return {"accounts": accounts, "degrees": degs}


def loops(unit, limit=20):
    """Directed loops of 2 to 8 accounts that return money to a starting account."""
    nxt = collections.defaultdict(list)
    for r in _edges(unit):
        nxt[r[2]].append((r[3], r[0]))
    found = []

    def dfs(start, u, path, tids, depth):
        if len(found) >= limit:
            return
        for v, t in nxt.get(u, ()):
            if v == start and depth >= 1:
                found.append({"accounts": list(path), "transfer_ids": tids + [t]})
            elif v > start and v not in path and depth < 7:
                dfs(start, v, path + [v], tids + [t], depth + 1)

    for s in sorted(nxt):
        dfs(s, s, [s], [], 0)
    return found


def bursts(unit, window_min=60, min_count=3):
    """3 or more transfers into or out of one account within 60 minutes."""
    edges = _edges(unit)
    accounts = sorted({x for r in edges for x in (r[2], r[3])})
    out = []
    for a in accounts:
        for direction, sel in (("in", [r for r in edges if r[3] == a]), ("out", [r for r in edges if r[2] == a])):
            sel = sorted(sel, key=lambda r: _min(r[1]))
            i = 0
            while i < len(sel):
                j = i
                while j + 1 < len(sel) and _min(sel[j + 1][1]) - _min(sel[i][1]) <= window_min:
                    j += 1
                if j - i + 1 >= min_count:
                    out.append({"account": a, "direction": direction, "count": j - i + 1,
                                "minutes": _min(sel[j][1]) - _min(sel[i][1]),
                                "transfer_ids": [r[0] for r in sel[i:j + 1]],
                                "distinct_counterparties": len({(r[2] if direction == "in" else r[3]) for r in sel[i:j + 1]})})
                    i = j + 1
                else:
                    i += 1
    return out


def chains(unit, hours=48, limit=20):
    """Pass-through pairs: money arrives at an account and leaves it within 48 hours (A -> B -> C)."""
    edges = _edges(unit)
    by_from = collections.defaultdict(list)
    for r in edges:
        by_from[r[2]].append(r)
    out = []
    for r1 in edges:
        for r2 in by_from.get(r1[3], ()):
            if r2[3] != r1[2] and 0 <= _min(r2[1]) - _min(r1[1]) <= hours * 60:
                out.append({"accounts": [r1[2], r1[3], r2[3]], "transfer_ids": [r1[0], r2[0]],
                            "hours_between": round((_min(r2[1]) - _min(r1[1])) / 60, 1),
                            "amounts": [r1[4], r2[4]]})
    return out[:limit]


def summary(unit):
    rows = unit["rows"]
    edges = _edges(unit)
    amts = [r[4] for r in edges] or [0]
    times = sorted(_min(r[1]) for r in rows)
    return {"n_rows": len(rows), "n_between_accounts": len(edges), "n_self_transfers": len(rows) - len(edges),
            "span_hours": round((times[-1] - times[0]) / 60, 1) if times else 0,
            "first": rows[0][1] if rows else None, "last": rows[-1][1] if rows else None,
            "amount_median": round(statistics.median(amts), 2), "amount_max": max(amts),
            "formats": dict(collections.Counter(r[6] for r in rows).most_common()),
            "currencies": dict(collections.Counter(r[5] for r in rows).most_common())}


def compute_facts(unit):
    d = degrees(unit)
    f = summary(unit)
    f.update({"n_accounts": len(d["accounts"]), "degrees": d["degrees"][:12], "loops": loops(unit),
              "bursts": bursts(unit), "pass_through_chains": chains(unit)})
    return f


def facts_text(f):
    L = [f"Rows: {f['n_rows']} ({f['n_between_accounts']} between different accounts, {f['n_self_transfers']} an account moving its own money); "
         f"{f['n_accounts']} accounts; from {f['first']} to {f['last']} ({f['span_hours']} hours).",
         "Payment formats: " + ", ".join(f"{k} {v}" for k, v in f["formats"].items()) + ".",
         "Currencies: " + ", ".join(f"{k} {v}" for k, v in f["currencies"].items()) + ".",
         f"Amounts between accounts: median {f['amount_median']}, max {f['amount_max']}.",
         "Busiest accounts (sent / to how many distinct, received / from how many distinct, pass-through):"]
    for d in f["degrees"]:
        L.append(f"  {d['account']}: sent {d['sent']} to {d['to_distinct']}, received {d['received']} from {d['from_distinct']}"
                 + (", pass-through" if d["pass_through"] else ""))
    L.append(f"Directed loops that return money to a starting account: {len(f['loops'])}" + (":" if f["loops"] else "."))
    for l in f["loops"][:10]:
        L.append("  " + " -> ".join(l["accounts"]) + " -> back; transfers " + ", ".join(l["transfer_ids"]))
    L.append(f"Bursts (3 or more transfers in or out of one account within 60 minutes): {len(f['bursts'])}" + (":" if f["bursts"] else "."))
    for b in f["bursts"][:10]:
        L.append(f"  {b['account']} {b['direction']}: {b['count']} transfers in {b['minutes']} min from/to {b['distinct_counterparties']} distinct accounts; " + ", ".join(b["transfer_ids"]))
    L.append(f"Pass-through pairs (money arrives at an account and leaves it within 48 hours): {len(f['pass_through_chains'])}" + (":" if f["pass_through_chains"] else "."))
    for c in f["pass_through_chains"][:10]:
        L.append("  " + " -> ".join(c["accounts"]) + f" ({c['hours_between']} h apart; amounts {c['amounts'][0]} then {c['amounts'][1]}); transfers " + ", ".join(c["transfer_ids"]))
    return "\n".join(L)


if __name__ == "__main__":
    import json, sys
    d = json.load(open("data/units.json", encoding="utf-8"))
    u = next(x for x in d["units"] if x["id"] == (sys.argv[1] if len(sys.argv) > 1 else "u01"))
    print(u["id"], u["expected"], u["shape"])
    print(facts_text(compute_facts(u)))
