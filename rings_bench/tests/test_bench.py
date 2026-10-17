"""test_bench.py: regression tests for the Rings bench's data, scoring and published files. No network, no keys.

  python3 -m unittest discover -s tests -v          (from rings_bench/)

Data: every unit of every slice is checked against the slice's own IBM key. Scoring: hand-built cases pin the rules
(half the ring flagged, no sweep, a technical failure flags nothing), and every committed result is rescored from its
runs. Published files: each .js twin the page reads from file:// must carry the same data as its .json.
"""
import collections, datetime, glob, json, math, sys, unittest
from pathlib import Path

RB = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RB))
import screen  # noqa: E402  (stdlib only; its scoring follows bench.py's score_batch)

SLICE_DIRS = {"main": RB / "data"}
SLICE_DIRS.update({p.name: p for p in sorted((RB / "slices").iterdir()) if (p / "units.json").exists()})


def J(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def load_js(p, var=None):
    t = Path(p).read_text(encoding="utf-8")
    return json.loads(t[t.index("=") + 1:].strip().rstrip(";")) if var is None else json.loads(t[t.index("{"):].rstrip().rstrip(";"))


def slice_of(d):
    t = (d / "slice.js").read_text(encoding="utf-8")
    return json.loads(t[t.index("{"):].rstrip().rstrip(";"))


def minutes(ts):
    return int(datetime.datetime.strptime(ts, "%Y/%m/%d %H:%M").timestamp() // 60)


class Scoring(unittest.TestCase):
    """The catch rule, by hand. A unit with a 4-transfer ring among 10 rows."""

    U = {"id": "u", "expected": "ring", "shape": "cycle", "truth_ids": ["T1", "T2", "T3", "T4"]}
    O = {"id": "o", "expected": "ordinary", "shape": None, "truth_ids": []}

    def c(self, unit, verdict, flagged, technical=False, pattern="cycle"):
        return screen.unit_counts({"verdict": verdict, "flagged_in_unit": flagged, "technical": technical, "pattern": pattern}, unit)

    def test_half_the_ring_is_a_catch(self):
        self.assertEqual(self.c(self.U, "ring", ["T1", "T2"])["found"], 1)

    def test_less_than_half_is_not(self):
        self.assertEqual(self.c(self.U, "ring", ["T1"])["found"], 0)

    def test_right_rows_wrong_verdict_is_not(self):
        self.assertEqual(self.c(self.U, "ordinary", ["T1", "T2", "T3", "T4"])["found"], 0)

    def test_sweep_is_not_a_catch(self):
        # wrong flags may not outnumber the ring: 4 right + 5 wrong is a sweep, 4 right + 4 wrong is not
        self.assertEqual(self.c(self.U, "ring", ["T1", "T2", "T3", "T4", "X1", "X2", "X3", "X4", "X5"])["found"], 0)
        self.assertEqual(self.c(self.U, "ring", ["T1", "T2", "T3", "T4", "X1", "X2", "X3", "X4"])["found"], 1)

    def test_sweep_floor_of_two_for_a_lone_transfer(self):
        lone = {"id": "l", "expected": "ring", "shape": "lone", "truth_ids": ["T1"]}
        self.assertEqual(self.c(lone, "ring", ["T1", "X1", "X2"])["found"], 1)
        self.assertEqual(self.c(lone, "ring", ["T1", "X1", "X2", "X3"])["found"], 0)

    def test_technical_failure_flags_nothing(self):
        c = self.c(self.U, "ring", ["T1", "T2", "T3", "T4"], technical=True)
        self.assertEqual((c["tp"], c["fp"], c["fn"], c["found"], c["right"]), (0, 0, 4, 0, 0))

    def test_false_ring(self):
        c = self.c(self.O, "ring", ["X1"])
        self.assertEqual((c["false_ring"], c["fp"], c["right"]), (1, 1, 0))

    def test_ordinary_right(self):
        self.assertEqual(self.c(self.O, "ordinary", [])["right"], 1)

    def test_pattern_counts_only_on_a_catch(self):
        self.assertEqual(self.c(self.U, "ring", ["T1", "T2"], pattern="cycle")["named"], 1)
        self.assertEqual(self.c(self.U, "ring", ["T1"], pattern="cycle")["named"], 0)

    def test_f1(self):
        self.assertAlmostEqual(screen.f1(4, 4, 0), 2 / 3)
        self.assertEqual(screen.f1(0, 3, 3), 0.0)

    def test_verdict_words(self):
        for w, v in [("ring", "ring"), ("Ring.", "ring"), ("suspicious", "ring"), ("ordinary", "ordinary"),
                     ("cannot tell", "ordinary"), ("unknown", "ordinary"), (None, "ordinary")]:
            self.assertEqual(screen.norm_verdict(w), v, w)


class Parser(unittest.TestCase):
    def test_cases(self):
        P = screen.parse_json
        self.assertEqual(P('{"verdict": "ring"}'), {"verdict": "ring"})
        self.assertEqual(P('```json\n{"verdict": "ring", // why\n "why": "a // b"}\n```')["why"], "a // b")
        self.assertEqual(P('{"verdict": "ordinary", "why": "one\ntwo"}')["why"], "one\ntwo")
        self.assertEqual(P('{"verdict": "ring", "flagged_transfer_ids": ["T1",],}')["flagged_transfer_ids"], ["T1"])
        self.assertEqual(P('draft {"x": 1} final {"verdict": "ring"}'), {"verdict": "ring"})
        self.assertEqual(P('{"verdict": "ring", "why": "he said \\"loop // x\\""}')["why"], 'he said "loop // x"')
        self.assertIsNone(P("no answer here"))


class Units(unittest.TestCase):
    """Every unit of every slice against that slice's IBM key."""

    def test_every_slice(self):
        for name, d in SLICE_DIRS.items():
            with self.subTest(slice=name):
                S = slice_of(d)
                units = J(d / "units.json")["units"]
                byid = {r[0]: r for r in S["transfers"]}
                label = {t: v[0] for t, v in S["key"].items()}
                ring_of = {t: str(v[1]) for t, v in S["key"].items() if v[0] == 1}
                self.assertEqual(len({u["id"] for u in units}), len(units), "unit ids are unique")
                by_acct = collections.defaultdict(list)
                for t in ring_of:
                    r = byid[t]; by_acct[r[2]].append(minutes(r[1])); by_acct[r[3]].append(minutes(r[1]))
                for u in units:
                    ids = [r[0] for r in u["rows"]]
                    self.assertEqual(len(ids), u["n_rows"], u["id"])
                    for r in u["rows"]:
                        self.assertEqual(list(byid[r[0]]), list(r), f"{u['id']} row {r[0]} matches the slice")
                    truth = set(u["truth_ids"])
                    self.assertTrue(truth <= set(ids), f"{u['id']}: every truth id is in the unit")
                    labeled_here = {t for t in ids if label.get(t) == 1}
                    if u["expected"] == "ring":
                        self.assertEqual(truth, {t for t, k in ring_of.items() if k == str(u["ring_id"])}, f"{u['id']}: truth is the whole IBM ring")
                        self.assertEqual(labeled_here, truth, f"{u['id']}: no other labeled row in a ring unit")
                    else:
                        self.assertEqual(truth, set(), u["id"])
                        self.assertEqual(labeled_here, set(), f"{u['id']}: an ordinary unit holds no laundering row")
                        for r in u["rows"]:
                            m = minutes(r[1])
                            near = [x for a in (r[2], r[3]) for x in by_acct.get(a, ()) if abs(x - m) <= 120]
                            self.assertFalse(near, f"{u['id']} {r[0]}: no ordinary row within 120 min of a label on its account")

    def test_unit_mix(self):
        for name, d in SLICE_DIRS.items():
            units = J(d / "units.json")["units"]
            n_ring = sum(u["expected"] == "ring" for u in units)
            with self.subTest(slice=name):
                self.assertEqual(len(units), 60 if n_ring else 40)
                if n_ring:
                    self.assertEqual(n_ring, 20)


class SliceReadme(unittest.TestCase):
    """The counts table and the overlap claims in slices/README.md."""

    TABLE = {  # slice: (rows, laundering rows, accounts in all rows)
        "main": (2824, 113, 1797), "heldout_a": (2448, 109, 1626), "heldout_b": (2591, 115, 1681), "heldout_c": (2547, 102, 1642)}

    def test_counts(self):
        for name, (n, lab, acc) in self.TABLE.items():
            S = slice_of(SLICE_DIRS[name])
            with self.subTest(slice=name):
                self.assertEqual(len(S["transfers"]), n)
                self.assertEqual(sum(v[0] == 1 for v in S["key"].values()), lab)
                self.assertEqual(len({x for r in S["transfers"] for x in (r[2], r[3])}), acc)

    def test_account_overlap(self):
        acc = {n: {x for r in slice_of(SLICE_DIRS[n])["transfers"] for x in (r[2], r[3])} for n in self.TABLE}
        self.assertEqual(len(acc["main"] & acc["heldout_a"]), 29, "README: first and heldout_a share 29")
        for a, b in [("main", "heldout_b"), ("main", "heldout_c"), ("heldout_a", "heldout_b"), ("heldout_a", "heldout_c"), ("heldout_b", "heldout_c")]:
            with self.subTest(pair=f"{a}/{b}"):
                self.assertEqual(len(acc[a] & acc[b]), 0, "README: every other pair shares 0 accounts")


class Results(unittest.TestCase):
    """Every committed result, rescored from its own runs by the rules above."""

    def test_rescore_every_arm(self):
        for name, d in SLICE_DIRS.items():
            p = d / "bench_results.json"
            if not p.exists():
                continue
            br = J(p)
            units = J(d / "units.json")["units"]
            for m in br["models"]:
                with self.subTest(slice=name, model=m["id"], version=m["version"]):
                    recs = {r["unit"]: screen.normalize_bench_run(r) for r in br["runs"] if r["model"] == m["id"] and r["version"] == m["version"]}
                    self.assertEqual(len(recs), len(units), "one run per unit")
                    summ, _ = screen.score(m["id"], m["version"], recs, units, "bench")
                    for k in ("tp", "fp", "fn", "rings_found", "false_rings"):
                        self.assertEqual(summ[k], m[k], k)


class Twins(unittest.TestCase):
    """The page reads X.js when opened as a file and X.json when served; both must hold the same data."""

    def test_js_matches_json(self):
        pairs = [p for p in glob.glob(str(RB / "**" / "*.json"), recursive=True)
                 if Path(p).with_suffix(".js").exists() and "/out/" not in p and "/jev/" not in p]
        self.assertTrue(pairs)
        for p in pairs:
            with self.subTest(file=str(Path(p).relative_to(RB))):
                self.assertEqual(load_js(Path(p).with_suffix(".js")), J(p))


if __name__ == "__main__":
    unittest.main()
