"""screen.py: the model screen. Every chat model in Nicrron's catalog runs the same 60 units, scored the bench's way.

Standalone (Python 3.9+, stdlib only, no mt2kit, no PRISM), so it runs on any laptop. The prompts (prompts.py), code
facts (facts.py), units, answer parsing and scoring rules are the bench's; only the HTTP call and the bookkeeping are
new. The bench's earlier runs of the same version (data/bench_results.json) join the board, so nothing is paid twice.

  python3 screen.py catalog                          the chat models in the catalog, priced, and which the bench has run
  python3 screen.py estimate [--models all]          dollars and calls before spending anything
  python3 screen.py probe --models all               one tiny call per model: who answers at all (about $0.01 in all)
  python3 screen.py run --models all [--units 60] [--workers 6] [--rpm 50] [--budget 25]
  python3 screen.py subset                           out/screen/subset_screen20.json: 7 ring units across shapes + 13 ordinary
  python3 screen.py score [--boot 2000] [--subset screen20]   data/screen_results_<v>[_<subset>].json (+ .js) and the table
  python3 screen.py report                           evals.md from whichever rounds have been scored

--subset screen20 restricts run and score to the stratified 20 (stage 1 of the staged screen); every model, the bench's
included, is then ranked on exactly those 20 units.

Ranking rule, fixed before any run: transfer-level F1 against IBM's labels over all 60 units (a technical failure
counts as flagging nothing). Rings found, false rings, cost and a paired bootstrap over units are reported beside it.
Env RINGS_SLICE=<folder under slices/> runs a held-out slice, exactly as bench.py does.
Key: env NICRRON_API_KEY, or the file named by NICRRON_KEY_FILE (default ~/.nicrron_key). Never printed or logged.
"""
import argparse, collections, json, math, os, random, re, statistics, sys, threading, time, urllib.error, urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import facts  # noqa: E402
import prompts  # noqa: E402
from prompts import build, SYSTEM  # noqa: E402

# The screen keeps the v2 answer format every v2 run on the board was made with (prompts.py before 504e187 added
# "cannot tell" for v5), so a model screened here and a model the bench ran saw the same words.
prompts.SCHEMA = ('{"verdict": "ring" or "ordinary", "pattern": one of fan-out | fan-in | cycle | chain | scatter-gather | '
                  'mesh | lone | other | none, "flagged_transfer_ids": ["T0001", ...], "accounts": ["..."], '
                  '"confidence": "high" | "medium" | "low", "why": "one or two sentences"}')

API = os.environ.get("NICRRON_BASE_URL", "https://api.nicrron.ai/v1")
SLICE = os.environ.get("RINGS_SLICE", "").strip()
DATA_DIR = (HERE / "slices" / SLICE) if SLICE else (HERE / "data")
OUT = HERE / "out" / "screen"
TAG = SLICE or "main"
SHAPES = ["cycle", "fan-out", "fan-in", "scatter-gather", "chain", "mesh", "other", "lone"]
# bench.py's settings: reasoning families get a bigger cap and reasoning_effort low. The bench's own nine models keep
# its caps exactly (default 3000); every other model gets at least 8000, because newer reasoning models spent all 3000
# thinking and never answered (smoke 13:52: gpt-5-nano, finish_reason length). Tokens not used are not billed.
MAX_TOKENS = {"deepseek": 12000, "z-ai": 12000, "moonshot": 9000, "xai": 6000}
REASONING_LOW = {"deepseek", "z-ai", "moonshot"}
BENCH_MODELS = {"anthropic/claude-haiku-5-5", "anthropic/claude-sonnet-5-5", "deepseek/deepseek-v4-pro",
                "mistral/mistral-large-4", "moonshot/kimi-k3", "openai/gpt-6-luna", "openai/gpt-6-sol",
                "xai/grok-4.7", "z-ai/glm-5.3"}
NEW_MODEL_CAP = 8000


def family(model):
    return model.split("/")[0]


def max_tokens_for(model):
    cap = MAX_TOKENS.get(family(model), 3000)
    return cap if model in BENCH_MODELS else max(cap, NEW_MODEL_CAP)


# ---------------------------------------------------------------- key, catalog, HTTP

def api_key():
    k = os.environ.get("NICRRON_API_KEY", "").strip()
    if not k:
        p = Path(os.environ.get("NICRRON_KEY_FILE", str(Path.home() / ".nicrron_key"))).expanduser()
        if p.exists():
            k = p.read_text(encoding="utf-8").strip()
    if not k:
        sys.exit("no key: set NICRRON_API_KEY or put the key in ~/.nicrron_key (or the file named by NICRRON_KEY_FILE)")
    return k


def scrub(text, key):
    return text.replace(key, "<key>") if key else text


def http(method, path, payload=None, key=None, timeout=240):
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(API + path, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if key:
        req.add_header("Authorization", "Bearer " + key)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")


def catalog(refresh=False):
    OUT.mkdir(parents=True, exist_ok=True)
    p = OUT / "models.json"
    if refresh or not p.exists():
        st, text = http("GET", "/models", timeout=30)
        if st != 200:
            sys.exit(f"catalog: HTTP {st}")
        p.write_text(text, encoding="utf-8")
    d = json.loads(p.read_text(encoding="utf-8"))["data"]
    return {m["id"]: m for m in d if m.get("modality") == "chat" and not m.get("deprecated")}


def price(m):
    p = m.get("pricing") or {}
    return float(p.get("prompt") or 0), float(p.get("completion") or 0)


def bench_results():
    p = DATA_DIR / "bench_results.json"
    return json.load(open(p, encoding="utf-8")) if p.exists() else {"models": [], "runs": []}


def pick_models(spec, cat, version):
    if spec in ("all", "new"):
        done = {m["id"] for m in bench_results()["models"] if m["version"] == version and m["runs"] >= 60}
        return [m for m in sorted(cat) if spec == "all" or m not in done]
    want = [x.strip() for x in spec.split(",") if x.strip()]
    bad = [x for x in want if x not in cat]
    if bad:
        sys.exit(f"not chat models in the catalog: {bad}")
    return want


class Limiter:
    """Start at most rpm requests a minute across every worker (the key's limit is shared with the team)."""
    def __init__(self, rpm):
        self.gap, self.next, self.lock = 60.0 / rpm, 0.0, threading.Lock()

    def wait(self):
        with self.lock:
            now = time.time()
            t = max(now, self.next)
            self.next = t + self.gap
        if t > now:
            time.sleep(t - now)


def chat(model, messages, key, limiter, max_tokens, timeout=240):
    """One completion with the bench's settings; adapts once to models that refuse temperature or max_tokens."""
    payload = {"model": model, "messages": messages, "temperature": 0, "max_tokens": max_tokens}
    if family(model) in REASONING_LOW:
        payload["reasoning_effort"] = "low"
    last = None
    for n in range(6):
        limiter.wait()
        t0 = time.time()
        try:
            st, text = http("POST", "/chat/completions", payload, key, timeout)
        except Exception as e:  # noqa: BLE001  (timeouts, resets)
            st, text = 0, f"{type(e).__name__}: {e}"
        ms = int((time.time() - t0) * 1000)
        if st == 200:
            try:
                return json.loads(text), ms
            except ValueError:
                last = f"HTTP 200 but not JSON: {text[:200]}"
                continue
        low = text.lower()
        last = f"HTTP {st}: {scrub(text, key)[:300]}"
        if st == 400 and "temperature" in low and "temperature" in payload:
            payload.pop("temperature"); continue
        if st == 400 and "max_tokens" in low and "max_tokens" in payload:
            payload["max_completion_tokens"] = payload.pop("max_tokens"); continue
        if st == 400 and "reasoning" in low and "reasoning_effort" in payload:
            payload.pop("reasoning_effort"); continue
        if st in (401, 402, 403, 404):
            raise RuntimeError(last)
        if st == 429 or st == 0 or st >= 500:
            time.sleep(min(60, 5 * (n + 1)))
            continue
        raise RuntimeError(last)
    raise RuntimeError(last or "no answer")


# ---------------------------------------------------------------- answer parsing (bench.py's rules)

def norm_pattern(s):
    s = (s or "").lower()
    if s in ("none", "ordinary", ""):
        return "none"
    if re.search(r"scatter|gather", s):
        return "scatter-gather"
    if re.search(r"fan[- ]?out|distribut|dispers", s):
        return "fan-out"
    if re.search(r"fan[- ]?in|funnel|collect|aggregat|consolidat", s):
        return "fan-in"
    if re.search(r"cycle|loop|circular|round[- ]?trip", s):
        return "cycle"
    if re.search(r"chain|layer|pass|relay|stack", s):
        return "chain"
    if re.search(r"mesh|bipartite|web|cluster", s):
        return "mesh"
    if re.search(r"lone|single|isolated", s):
        return "lone"
    return "other"


def norm_verdict(v):
    v = (str(v) if v is not None else "").strip().lower()
    if v.startswith("cannot") or v.startswith("can't") or v in ("unsure", "unknown", "abstain"):
        return "ordinary"  # an abstention is not an accusation (bench.py, 504e187)
    return "ring" if v.startswith("ring") or v in ("yes", "scheme", "suspicious", "laundering") else "ordinary"


def parse_json(text):
    """The whole text as JSON, else the last balanced {...} that parses and carries a verdict, else any that parses."""
    text = (text or "").strip()
    try:
        obj = json.loads(text)
        if isinstance(obj, dict):
            return obj
    except ValueError:
        pass
    text = re.sub(r"```(?:json)?", "", text)
    found = []
    for i, ch in enumerate(text):
        if ch != "{":
            continue
        depth, in_str, esc = 0, False, False
        for j in range(i, len(text)):
            c = text[j]
            if in_str:
                esc = (c == "\\") and not esc
                if c == '"' and not esc:
                    in_str = False
                continue
            if c == '"':
                in_str = True
            elif c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
                if depth == 0:
                    try:
                        obj = json.loads(text[i:j + 1])
                        if isinstance(obj, dict):
                            found.append(obj)
                    except ValueError:
                        pass
                    break
    with_verdict = [o for o in found if "verdict" in o]
    return (with_verdict or found or [None])[-1]


# ---------------------------------------------------------------- units and one run

def load_units(subset=None):
    units = json.load(open(DATA_DIR / "units.json", encoding="utf-8"))["units"]
    if subset:
        p = OUT / f"subset_{subset}.json"
        if not p.exists():
            sys.exit(f"no {p}: run `screen.py subset` first")
        want = set(json.loads(p.read_text(encoding="utf-8"))["units"])
        units = [u for u in units if u["id"] in want]
    return units


def batch_path(model, version):
    return OUT / f"{TAG}__{model.replace('/', '_')}__{version}.jsonl"


def load_batch(model, version):
    p = batch_path(model, version)
    recs = {}
    if p.exists():
        for line in p.read_text(encoding="utf-8").splitlines():
            try:
                r = json.loads(line)
                recs[r["unit"]] = r  # last record per unit wins (a retry replaces a failure)
            except (ValueError, KeyError):
                pass
    return recs


def run_one(model, version, unit, key, limiter, pin, pout):
    if version == "v2x":  # v2 with the payment format hidden, as in bench.py
        unit = dict(unit, rows=[list(r[:6]) + ["hidden"] + list(r[7:]) for r in unit["rows"]])
    f = facts.compute_facts(unit) if version in ("v2", "v2x") else None
    prompt = build(unit, "v2" if version == "v2x" else version, facts=f)
    messages = [{"role": "system", "content": SYSTEM}, {"role": "user", "content": prompt}]
    rec = {"unit": unit["id"], "model": model, "version": version, "slice": TAG, "at": time.strftime("%Y-%m-%d %H:%M:%S"),
           "prompt_chars": len(prompt)}
    try:
        data, ms = chat(model, messages, key, limiter, max_tokens_for(model))
    except Exception as e:  # noqa: BLE001
        rec.update({"ok": False, "technical": True, "error": scrub(str(e), key)[:400]})
        return rec
    msg = ((data.get("choices") or [{}])[0].get("message") or {})
    text = msg.get("content") or ""
    usage = data.get("usage") or {}
    tin, tout = int(usage.get("prompt_tokens") or 0), int(usage.get("completion_tokens") or 0)
    rec.update({"model_served": data.get("model", model), "latency_ms": ms, "input_tokens": tin, "output_tokens": tout,
                "cost_usd": round(tin * pin + tout * pout, 6), "usage": usage,
                "finish_reason": (data.get("choices") or [{}])[0].get("finish_reason"), "answer_text": text[:4000]})
    parsed, from_reasoning = parse_json(text), False
    if parsed is None:  # empty answer but a draft object inside the reasoning text, as bench.py does
        rc = msg.get("reasoning_content") or msg.get("reasoning") or ""
        if isinstance(rc, str) and rc:
            parsed = parse_json(rc[-6000:])
            from_reasoning = parsed is not None
    if parsed is None:
        rec.update({"ok": False, "technical": True, "error": "no JSON object in the answer"})
        return rec
    row_ids = {x[0] for x in unit["rows"]}
    flagged = [t for t in (parsed.get("flagged_transfer_ids") or []) if isinstance(t, str)]
    verdict = norm_verdict(parsed.get("verdict"))
    rec.update({"ok": verdict == unit["expected"], "technical": False, "verdict": verdict,
                "pattern": norm_pattern(parsed.get("pattern")), "pattern_raw": str(parsed.get("pattern", ""))[:60],
                "flagged": flagged, "flagged_in_unit": [t for t in flagged if t in row_ids],
                "flagged_outside_unit": [t for t in flagged if t not in row_ids],
                "confidence": str(parsed.get("confidence", ""))[:10].lower(), "why": str(parsed.get("why", ""))[:600],
                "from_reasoning": from_reasoning})
    return rec


# ---------------------------------------------------------------- scoring (bench.py's score_batch rules, plus F1)

def normalize_bench_run(r):
    return {"unit": r["unit"], "verdict": r.get("verdict"), "pattern": r.get("pattern"),
            "flagged_in_unit": r.get("flagged_transfer_ids") or [], "technical": bool(r.get("technical_failure")),
            "confidence": (r.get("confidence") or "").lower(), "why": r.get("why"), "cost_usd": r.get("cost_usd"),
            "latency_ms": r.get("latency_ms"), "flagged_outside_unit": None}


def unit_counts(rec, u):
    truth = set(u["truth_ids"])
    flagged = set() if rec.get("technical") else set(rec.get("flagged_in_unit") or [])
    verdict = None if rec.get("technical") else rec.get("verdict")
    t, f_ = len(flagged & truth), len(flagged - truth)
    ring = u["expected"] == "ring"
    # caught = ring verdict, at least half the labeled transfers flagged, and no sweep: wrong flags in the unit may
    # not outnumber the ring itself (bench.py score_batch since 45ba1ee)
    found = ring and verdict == "ring" and t >= math.ceil(len(truth) / 2) and f_ <= max(2, len(truth))
    return {"tp": t, "fp": f_, "fn": len(truth - flagged), "found": int(found),
            "false_ring": int((not ring) and verdict == "ring"), "right": int(verdict == u["expected"]),
            "named": int(found and rec.get("pattern") == u["shape"])}


def f1(tp, fp, fn):
    return 2 * tp / (2 * tp + fp + fn) if tp else 0.0


def score(model, version, recs, units, source, pin=None, pout=None):
    per = {u["id"]: unit_counts(recs[u["id"]], u) for u in units if u["id"] in recs}
    S = lambda k: sum(c[k] for c in per.values())  # noqa: E731
    tp, fp, fn = S("tp"), S("fp"), S("fn")
    by_shape = {s: {"rings": 0, "found": 0} for s in SHAPES}
    for u in units:
        if u["expected"] == "ring":
            by_shape[u["shape"]]["rings"] += 1
            if u["id"] in per:
                by_shape[u["shape"]]["found"] += per[u["id"]]["found"]
    rs = [recs[u] for u in per]
    costs = [r["cost_usd"] for r in rs if r.get("cost_usd") is not None]
    lats = [r["latency_ms"] for r in rs if r.get("latency_ms")]
    outside = [len(r["flagged_outside_unit"]) for r in rs if r.get("flagged_outside_unit") is not None]
    rings_total = sum(1 for u in units if u["expected"] == "ring")
    cost = round(sum(costs), 4)
    found = S("found")
    return {"id": model, "family": family(model), "version": version, "source": source, "runs": len(per),
            "f1": round(f1(tp, fp, fn), 4), "precision": round(tp / (tp + fp), 4) if tp + fp else 0.0,
            "recall": round(tp / (tp + fn), 4) if tp + fn else 0.0, "tp": tp, "fp": fp, "fn": fn,
            "rings_found": found, "rings_total": rings_total, "false_rings": S("false_ring"),
            "verdict_right": S("right"), "pattern_named_ok": S("named"),
            "technical_failures": sum(1 for r in rs if r.get("technical")),
            "flagged_outside_unit": sum(outside) if outside else None,
            "cost_usd": cost, "usd_per_ring_found": round(cost / found, 4) if found else None,
            "latency_ms_median": int(statistics.median(lats)) if lats else None,
            "price_per_m": [round(pin * 1e6, 2), round(pout * 1e6, 2)] if pin is not None else None,
            "by_shape": by_shape}, per


def bootstrap(per_by_model, unit_ids, reps, seed=20261017):
    """Paired bootstrap over units: one resample of the 60 units is applied to every model at once."""
    rnd = random.Random(seed)
    names = list(per_by_model)
    draws = {n: [] for n in names}
    ranks = {n: collections.Counter() for n in names}
    for _ in range(reps):
        sample = [rnd.choice(unit_ids) for _ in unit_ids]
        vals = {}
        for n in names:
            per = per_by_model[n]
            tp = fp = fn = 0
            for u in sample:
                c = per.get(u)
                if c:
                    tp += c["tp"]; fp += c["fp"]; fn += c["fn"]
            vals[n] = f1(tp, fp, fn)
            draws[n].append(vals[n])
        for i, n in enumerate(sorted(names, key=lambda x: -vals[x])):
            ranks[n][i + 1] += 1
    out = {}
    for n in names:
        d = sorted(draws[n])
        out[n] = {"f1_ci95": [round(d[int(0.025 * reps)], 4), round(d[int(0.975 * reps) - 1], 4)],
                  "p_top3": round(sum(v for k, v in ranks[n].items() if k <= 3) / reps, 3),
                  "p_first": round(ranks[n][1] / reps, 3)}
    return out, draws


# ---------------------------------------------------------------- commands

def cmd_catalog(a):
    cat = catalog(refresh=True)
    done = {(m["id"], m["version"]) for m in bench_results()["models"]}
    print(f"{len(cat)} chat models in the catalog ({API})")
    print(f"{'model':42} {'$in/M':>7} {'$out/M':>7} {'ctx':>8}  bench versions")
    for mid in sorted(cat):
        pin, pout = price(cat[mid])
        vs = ",".join(sorted(v for (m, v) in done if m == mid))
        print(f"{mid:42} {pin * 1e6:7.2f} {pout * 1e6:7.2f} {cat[mid].get('context_length') or 0:8}  {vs}")


def estimate_one(model, cat, n_units, in_tokens, out_per_run):
    pin, pout = price(cat[model])
    out_tokens = out_per_run * (3 if model.split("/")[0] in REASONING_LOW or "reason" in model else 1)
    return in_tokens * n_units / 60 * pin + out_tokens * n_units * pout


def cmd_estimate(a):
    cat = catalog()
    models = pick_models(a.models, cat, a.version)
    units = load_units()[: a.units]
    chars = sum(len(SYSTEM) + len(build(u, "v2" if a.version == "v2x" else a.version,
                                         facts=facts.compute_facts(u) if a.version != "v1" else None)) for u in units)
    in_tokens = chars / a.chars_per_token
    rows = sorted(((estimate_one(m, cat, len(units), in_tokens * 60 / len(units), a.out_tokens), m) for m in models), reverse=True)
    print(f"{len(models)} models x {len(units)} units = {len(models) * len(units)} calls; ~{in_tokens:,.0f} input tokens per model "
          f"(chars/{a.chars_per_token}); output ~{a.out_tokens} tokens a run (x3 for reasoning families)")
    for usd, m in rows:
        print(f"  {m:42} ~${usd:6.2f}")
    print(f"total ~${sum(u for u, _ in rows):.2f}  (at {a.rpm} rpm: ~{len(models) * len(units) / a.rpm:.0f} minutes)")


def cmd_probe(a):
    key, cat = api_key(), catalog()
    models = pick_models(a.models, cat, a.version)
    lim = Limiter(a.rpm)
    msgs = [{"role": "user", "content": 'Reply with exactly this JSON and nothing else: {"ok": true}'}]
    res = {}

    def one(m):
        try:
            d, ms = chat(m, msgs, key, lim, max_tokens_for(m), timeout=90)
            txt = ((d.get("choices") or [{}])[0].get("message") or {}).get("content") or ""
            return m, {"ok": parse_json(txt) is not None, "ms": ms, "served": d.get("model"), "head": txt[:80]}
        except Exception as e:  # noqa: BLE001
            return m, {"ok": False, "error": scrub(str(e), key)[:200]}

    with ThreadPoolExecutor(a.workers) as ex:
        for fut in as_completed([ex.submit(one, m) for m in models]):
            m, r = fut.result(); res[m] = r
            print(f"{'ok ' if r['ok'] else 'BAD'} {m:42} {r.get('ms', '')!s:>6} {r.get('error') or r.get('head', '')!r}"[:200], flush=True)
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "probe.json").write_text(json.dumps(res, indent=1), encoding="utf-8")
    print(f"{sum(r['ok'] for r in res.values())} of {len(res)} answered with JSON; written {OUT / 'probe.json'}")


def spent_so_far():
    total = 0.0
    for p in OUT.glob("*.jsonl"):
        for line in p.read_text(encoding="utf-8").splitlines():
            try:
                total += json.loads(line).get("cost_usd") or 0
            except ValueError:
                pass
    return total


def cmd_run(a):
    key, cat = api_key(), catalog()
    models = pick_models(a.models, cat, a.version)
    if a.skip_bad and (OUT / "probe.json").exists():
        probe = json.loads((OUT / "probe.json").read_text(encoding="utf-8"))
        bad = [m for m in models if m in probe and not probe[m]["ok"]]
        if bad:
            print("skipping models that failed the probe:", ", ".join(bad))
        models = [m for m in models if m not in bad]
    units = load_units(a.subset)
    if a.units:
        units = units[: a.units]
    OUT.mkdir(parents=True, exist_ok=True)
    lim, lock = Limiter(a.rpm), threading.Lock()
    spent = [spent_so_far()]
    print(f"slice {TAG}: {len(models)} models x {len(units)} units, version {a.version}, {a.workers} workers, {a.rpm} rpm, "
          f"budget ${a.budget:.2f} (already spent in out/screen: ${spent[0]:.3f})", flush=True)
    jobs = []
    for m in models:
        have = load_batch(m, a.version)
        for u in units:
            r = have.get(u["id"])
            if r and (not r.get("technical") or not a.retry_failed):
                continue
            jobs.append((m, u))
    print(f"{len(jobs)} calls to make", flush=True)
    done = collections.Counter()
    stop = threading.Event()

    def one(m, u):
        if stop.is_set():
            return m, None
        pin, pout = price(cat[m])
        rec = run_one(m, a.version, u, key, lim, pin, pout)
        with lock:
            with open(batch_path(m, a.version), "a", encoding="utf-8") as fh:
                fh.write(json.dumps(rec, ensure_ascii=False) + "\n")
            spent[0] += rec.get("cost_usd") or 0
            done[m] += 1
            if spent[0] >= a.budget and not stop.is_set():
                stop.set()
                print(f"BUDGET reached (${spent[0]:.2f}); finishing calls in flight, starting no more", flush=True)
        return m, rec

    t0 = time.time()
    # interleave models so a slow model does not hold up the rest and every model gets units early
    order = sorted(jobs, key=lambda j: (load_units_index(j[1]["id"]), j[0]))
    with ThreadPoolExecutor(a.workers) as ex:
        futs = [ex.submit(one, m, u) for m, u in order]
        for i, fut in enumerate(as_completed(futs), 1):
            m, rec = fut.result()
            if rec and (i % 25 == 0 or rec.get("technical")):
                tag = "TECH " + rec.get("error", "")[:90] if rec.get("technical") else ""
                print(f"[{i}/{len(jobs)} {int(time.time() - t0)}s ${spent[0]:.2f}] {m} {rec['unit']} {tag}", flush=True)
    print(f"done in {int(time.time() - t0)}s; spent in out/screen ${spent[0]:.3f}")


_UNIT_INDEX = {}


def load_units_index(uid):
    if not _UNIT_INDEX:
        for i, u in enumerate(load_units()):
            _UNIT_INDEX[u["id"]] = i
    return _UNIT_INDEX.get(uid, 0)


def cmd_score(a):
    cat = catalog()
    units = load_units(a.subset)
    uid = [u["id"] for u in units]
    want = set(uid)
    models, pers, runs = [], {}, []
    for p in sorted(OUT.glob(f"{TAG}__*__{a.version}.jsonl")):
        recs = {k: v for k, v in load_batch_file(p).items() if k in want}
        if not recs:
            continue
        m = next(iter(recs.values()))["model"]
        pin, pout = price(cat[m]) if m in cat else (None, None)
        summ, per = score(m, a.version, recs, units, "screen", pin, pout)
        if summ["runs"] < len(units) and not a.partial:
            print(f"  (skipping {m}: {summ['runs']} of {len(units)} units; --partial to include)")
            continue
        models.append(summ); pers[m] = per
        for u in units:
            r = recs.get(u["id"])
            if r:
                c = per[u["id"]]
                runs.append({"model": m, "version": a.version, "source": "screen", "unit": u["id"], "expected": u["expected"],
                             "shape": u["shape"] or "none", "verdict": r.get("verdict"), "pattern": r.get("pattern"),
                             "flagged_transfer_ids": sorted(r.get("flagged_in_unit") or []), "tp": c["tp"], "fp": c["fp"],
                             "fn": c["fn"], "ring_found": bool(c["found"]), "technical_failure": bool(r.get("technical")),
                             "error": r.get("error"), "confidence": r.get("confidence"), "why": r.get("why"),
                             "cost_usd": r.get("cost_usd"), "latency_ms": r.get("latency_ms"),
                             "input_tokens": r.get("input_tokens"), "output_tokens": r.get("output_tokens"),
                             "model_served": r.get("model_served"), "at": r.get("at")})
    # the bench's own runs of this version join the board unless the screen re-ran that model
    br = bench_results()
    for bm in br["models"]:
        if bm["version"] != a.version or bm["id"] in pers or bm["runs"] < len(units):
            continue
        recs = {r["unit"]: normalize_bench_run(r) for r in br["runs"]
                if r["model"] == bm["id"] and r["version"] == a.version and r["unit"] in want}
        pin, pout = price(cat[bm["id"]]) if bm["id"] in cat else (None, None)
        summ, per = score(bm["id"], a.version, recs, units, "bench", pin, pout)
        for k in ("precision", "recall", "rings_found", "false_rings", "tp", "fp", "fn"):
            if not a.subset and summ[k] != bm[k]:
                print(f"  WARNING: rescoring {bm['id']} {a.version} gives {k}={summ[k]}, bench says {bm[k]}")
        models.append(summ); pers[bm["id"]] = per
        for r in br["runs"]:
            if r["model"] == bm["id"] and r["version"] == a.version and r["unit"] in want:
                runs.append(dict(r, source="bench"))
    if not models:
        sys.exit("nothing to score yet")
    boot, draws = bootstrap(pers, uid, a.boot)
    for m in models:
        m.update(boot[m["id"]])
    models.sort(key=lambda m: (-m["f1"], -m["rings_found"], m["false_rings"], m["cost_usd"]))
    for i, m in enumerate(models, 1):
        m["rank"] = i
    # paired check of the podium: how often does each of the top 3 beat the 4th, and the 1st beat the 2nd
    pairs = []
    ids = [m["id"] for m in models]
    for i, j in [(0, 1), (1, 2), (0, 3), (1, 3), (2, 3)]:
        if j < len(ids):
            x, y = draws[ids[i]], draws[ids[j]]
            pairs.append({"a": ids[i], "b": ids[j], "p_a_beats_b": round(sum(p > q for p, q in zip(x, y)) / len(x), 3)})
    out = {"slice": TAG, "version": a.version, "subset": a.subset or None, "written": time.strftime("%Y-%m-%d %H:%M"),
           "ranking_rule": "transfer-level F1 against IBM's labels over all units; a technical failure flags nothing. "
                           "Ties: more rings found, fewer false rings, lower cost.",
           "bootstrap": {"reps": a.boot, "paired_over_units": True, "seed": 20261017},
           "catalog": {"source": API + "/models", "chat_models": len(cat)},
           "units": len(units), "rings_total": sum(1 for u in units if u["expected"] == "ring"),
           "models": models, "podium_pairs": pairs, "runs": runs}
    blob = json.dumps(out, ensure_ascii=False, indent=1)
    name = f"screen_results_{a.version}" + (f"_{a.subset}" if a.subset else "")
    (DATA_DIR / f"{name}.json").write_text(blob, encoding="utf-8")
    (DATA_DIR / f"{name}.js").write_text("window.SCREEN = " + blob + ";\n", encoding="utf-8")
    print(f"{'#':>3} {'model':38} {'src':6} {'F1':>5} {'95% CI':>13} {'P(top3)':>7} {'prec':>5} {'rec':>5} {'rings':>6} "
          f"{'false':>5} {'tech':>4} {'$':>7} {'$/ring':>7} {'ms':>6}")
    for m in models:
        ci = m["f1_ci95"]
        print(f"{m['rank']:3} {m['id']:38} {m['source']:6} {m['f1']:5.3f} [{ci[0]:.3f},{ci[1]:.3f}] {m['p_top3']:7.2f} "
              f"{m['precision']:5.2f} {m['recall']:5.2f} {m['rings_found']:3}/{m['rings_total']:<2} {m['false_rings']:5} "
              f"{m['technical_failures']:4} {m['cost_usd']:7.3f} {(m['usd_per_ring_found'] or 0):7.3f} {m['latency_ms_median'] or 0:6}")
    for p in pairs:
        print(f"  P({p['a']} beats {p['b']}) = {p['p_a_beats_b']}")
    print("written", DATA_DIR / f"{name}.json")


def cmd_subset(a):
    """Stratified stage-1 units, fixed by seed: one ring unit per common shape, two lone, and 13 ordinary."""
    rnd = random.Random(a.seed)
    units = load_units()
    by_shape = collections.defaultdict(list)
    for u in units:
        by_shape[u["shape"] if u["expected"] == "ring" else "ordinary"].append(u["id"])
    take = {"cycle": 1, "fan-out": 1, "fan-in": 1, "scatter-gather": 1, "chain": 1, "lone": 2, "ordinary": 13}
    pick = []
    for k, n in take.items():
        pool = sorted(by_shape[k]); rnd.shuffle(pool); pick += pool[:n]
    OUT.mkdir(parents=True, exist_ok=True)
    p = OUT / f"subset_{a.name}.json"
    p.write_text(json.dumps({"seed": a.seed, "take": take, "units": sorted(pick)}, indent=1), encoding="utf-8")
    chosen = [u for u in units if u["id"] in set(pick)]
    print(f"{len(pick)} units -> {p}:", ", ".join(f"{u['id']} {u['shape'] or 'ordinary'}" for u in chosen))


def _fmt_model(m, bold):
    name = m["id"] + (" †" if m["source"] == "bench" else "")
    return f"**{name}**" if bold else name


def _board(models, units, rings_total, n_ordinary, bold=lambda m: False, top=None):
    head = ("| # | Model | Run | F1 | 95% range | P(top 3) | Precision | Recall | Rings caught | False alarms | Errors | Cost "
            "| $ per ring | Median |\n|---:|---|---:|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|")
    rows = []
    for m in models[:top] if top else models:
        lo, hi = m["f1_ci95"]
        rows.append(f"| {m['rank']} | {_fmt_model(m, bold(m))} | {m['runs']}/{units} | {m['f1']:.3f} | {lo:.2f} to {hi:.2f} "
                    f"| {m['p_top3']:.0%} | {m['precision']:.0%} | {m['recall']:.0%} | {m['rings_found']} of {rings_total} "
                    f"| {m['false_rings']} of {n_ordinary} | {m['technical_failures'] or ''} | ${m['cost_usd']:.2f} "
                    f"| {'$%.3f' % m['usd_per_ring_found'] if m['usd_per_ring_found'] else '–'} "
                    f"| {(m['latency_ms_median'] or 0) / 1000:.1f} s |")
    return head + "\n" + "\n".join(rows)


def cmd_report(a):
    def load(p):
        return json.load(open(p, encoding="utf-8")) if p.exists() else None
    r1 = load(HERE / "data" / "screen_results_v2_screen20.json")
    r2 = load(HERE / "data" / "screen_results_v2.json")
    r3 = load(HERE / "slices" / "heldout_c" / "screen_results_v2.json")
    if not (r1 or r2):
        sys.exit("nothing scored yet: run `screen.py score --subset screen20` first")
    cat = catalog()
    spent = spent_so_far()  # every round, held-out included, writes to out/screen
    calls = sum(1 for p in OUT.glob("*.jsonl") for _ in p.open(encoding="utf-8"))

    def n_ord(r):
        return r["units"] - r["rings_total"]

    def complete(r):
        return all(m["runs"] == r["units"] for m in r["models"])

    final = r2 if r2 and complete(r2) else None
    L = ["# Model screen: every Nicrron chat model on the Rings bench", ""]
    stage = ("Held-out check done" if r3 and complete(r3) else "Finalists done" if final else
             "Round one done" if r1 and complete(r1) else "Round one in progress")
    L += [f"**{stage}.** {len(cat)} chat models in the catalog, {calls:,} model calls so far, ${spent:.2f} spent. "
          f"Written {time.strftime('%Y-%m-%d %H:%M')} by `screen.py report`; every number below is read from the scored files "
          "it names, so rerun it rather than editing this file.", ""]
    if not final and r1 and not complete(r1):
        least = min(m["runs"] for m in r1["models"])
        L += [f"> **Not a ranking yet.** Some models have answered only {least} of the {r1['units']} round-one neighborhoods, "
              "so their scores rest on different and fewer cases. Read the Run column before comparing rows.", ""]
    if final:
        top3 = final["models"][:3]
        L += ["## Top 3", "", "Ranked by F1 on all 60 neighborhoods (20 hold one of IBM's laundering groups, 40 are ordinary).", ""]
        L += ["| Rank | Model | F1 | 95% range | In the top 3 | Rings caught | False alarms | Cost of 60 runs | Held-out C F1 |",
              "|---:|---|---:|---|---:|---:|---:|---:|---:|"]
        held = {m["id"]: m for m in (r3 or {}).get("models", [])}
        for m in top3:
            lo, hi = m["f1_ci95"]; h = held.get(m["id"])
            L.append(f"| {m['rank']} | **{m['id']}** | {m['f1']:.3f} | {lo:.2f} to {hi:.2f} | {m['p_top3']:.0%} of resamples "
                     f"| {m['rings_found']} of {final['rings_total']} | {m['false_rings']} of {n_ord(final)} | ${m['cost_usd']:.2f} "
                     f"| {('%.3f' % h['f1']) if h else 'not run'} |")
        L.append("")
        for pr in final.get("podium_pairs", []):
            L.append(f"- {pr['a']} beats {pr['b']} in {pr['p_a_beats_b']:.0%} of resamples.")
        L.append("")
    if r3:
        L += ["## Held-out C: does the order hold on unseen data?", "",
              "A fresh cut of the same IBM file, no account shared with the main slice, never used to tune a prompt.", "",
              _board(r3["models"], r3["units"], r3["rings_total"], n_ord(r3)), ""]
    if r2:
        L += ["## Finalists on all 60 neighborhoods", "", _board(r2["models"], r2["units"], r2["rings_total"], n_ord(r2),
              bold=lambda m: m["rank"] <= 3), ""]
    if r1:
        adv = {m["id"] for m in r2["models"]} if r2 else set()
        L += ["## Round one: every chat model on 20 neighborhoods", "",
              f"A stratified 20 of the 60: {r1['rings_total']} laundering groups across shapes and {n_ord(r1)} ordinary "
              "neighborhoods. It only decides who gets the full run, so the ranges are wide by design."
              + (" Bold models went on to all 60." if adv else ""), "",
              _board(r1["models"], r1["units"], r1["rings_total"], n_ord(r1), bold=lambda m: m["id"] in adv), ""]
    L += ["## How to read the tables", "",
          "- **F1** balances precision and recall over individual transfers, scored against IBM's labels. It is the ranking rule, fixed before any run.",
          "- **95% range** comes from resampling the neighborhoods 2,000 times, the same draw for every model. Where two models' ranges overlap, their order could flip on other data.",
          "- **P(top 3)** is the share of resamples in which the model finished in the top 3.",
          "- **Rings caught** means the model called the neighborhood a ring, flagged at least half of IBM's labeled transfers, and did not sweep (its wrong flags did not outnumber the ring).",
          "- **False alarms** are ordinary neighborhoods the model called a ring. **Errors** are calls that failed or gave no readable answer; they count as flagging nothing.",
          "- **Cost** is Nicrron's list price times the tokens each call reported. **Median** is the median time to answer.",
          "- † marks the nine models the bench ran earlier (data/bench_results.json), joined here and rescored with the same rules; every other row ran in this screen.", "",
          "## Method", "",
          "- Data: IBM AMLworld HI-Small, synthetic. Labels come from IBM's generator, not from us or from a model. Same 60 neighborhoods for every model (data/units.json).",
          "- Prompt: the bench's v2 (raw transfers plus code-computed facts: degrees, loops, bursts, pass-through chains), with the answer format every v2 run on the board used. Temperature 0, one run per model per neighborhood.",
          "- Rounds: all 57 models the bench had not run were screened on the stratified 20. The ten best overall ran all 60. The top five then ran held-out C.",
          "- Limits: synthetic data; the slice is about 4% laundering where the file is 0.1%; every laundering transfer here is ACH, a shortcut a model can learn; ring neighborhoods are larger than ordinary ones; one run per cell.", "",
          "## Reproduce", "", "```",
          "cd rings_bench",
          "python3 screen.py subset                                  # the stratified 20 (seeded)",
          "python3 screen.py run --models new --subset screen20      # round one; key in ~/.nicrron_key",
          "python3 screen.py score --subset screen20",
          "python3 screen.py run --models <top 10, comma list>       # finalists on all 60",
          "python3 screen.py score",
          "RINGS_SLICE=heldout_c python3 screen.py run --models <top 5>",
          "RINGS_SLICE=heldout_c python3 screen.py score",
          "python3 screen.py report                                  # this file",
          "```", "",
          "Raw evidence: one JSONL per model in `out/screen/` holding each call's full answer, verdict, flagged transfer ids, tokens, cost and latency. "
          "Scored runs, with each model's reason in its own words, are in the `runs` list of the results files above."]
    out = HERE / "evals.md"
    out.write_text("\n".join(L) + "\n", encoding="utf-8")
    print("written", out)


def load_batch_file(p):
    recs = {}
    for line in p.read_text(encoding="utf-8").splitlines():
        try:
            r = json.loads(line)
            recs[r["unit"]] = r
        except (ValueError, KeyError):
            pass
    return recs


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("catalog")
    e = sub.add_parser("estimate")
    e.add_argument("--models", default="new"); e.add_argument("--version", default="v2"); e.add_argument("--units", type=int, default=60)
    e.add_argument("--chars-per-token", type=float, default=3.0); e.add_argument("--out-tokens", type=int, default=700)
    e.add_argument("--rpm", type=int, default=50)
    p = sub.add_parser("probe")
    p.add_argument("--models", default="all"); p.add_argument("--version", default="v2")
    p.add_argument("--workers", type=int, default=6); p.add_argument("--rpm", type=int, default=50)
    r = sub.add_parser("run")
    r.add_argument("--models", required=True, help="all | new (not yet run by the bench) | comma list")
    r.add_argument("--version", default="v2", choices=["v1", "v2", "v2x"])
    r.add_argument("--units", type=int, default=0, help="first N units only (0 = all)")
    r.add_argument("--workers", type=int, default=6); r.add_argument("--rpm", type=int, default=50)
    r.add_argument("--budget", type=float, default=25.0, help="stop starting calls once out/screen has spent this much")
    r.add_argument("--retry-failed", action="store_true"); r.add_argument("--skip-bad", action="store_true")
    r.add_argument("--subset", default=None, help="a subset name made by `screen.py subset` (e.g. screen20)")
    s = sub.add_parser("score")
    s.add_argument("--version", default="v2"); s.add_argument("--boot", type=int, default=2000)
    s.add_argument("--partial", action="store_true"); s.add_argument("--subset", default=None)
    sub.add_parser("report")
    b = sub.add_parser("subset")
    b.add_argument("--name", default="screen20"); b.add_argument("--seed", type=int, default=20261017)
    a = ap.parse_args()
    {"catalog": cmd_catalog, "estimate": cmd_estimate, "probe": cmd_probe, "run": cmd_run, "score": cmd_score, "subset": cmd_subset,
     "report": cmd_report}[a.cmd](a)


if __name__ == "__main__":
    main()
