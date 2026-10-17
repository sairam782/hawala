"""prompts.py: the v1 and v2 prompts. v1 = raw rows. v2 = raw rows + code facts (+ reference text if given)."""
from facts import compute_facts, facts_text

SYSTEM = ("You are an analyst on a bank's financial-crime desk reviewing a small neighborhood of account-to-account "
          "transfers from a synthetic data set. Be precise, cite transfer ids, and be honest about uncertainty: a wrong "
          "accusation costs a real customer, a missed scheme costs the bank. Answer with one JSON object only.")

PATTERNS = ("fan-out (one account sends to many), fan-in (many send to one), cycle (money returns to where it started "
            "through 2 or more hops), chain (money passed along A to B to C), scatter-gather (split up, then gathered "
            "again), mesh (a group of accounts trading among themselves), lone (one suspicious transfer on its own), "
            "other")

SCHEMA = ('{"verdict": "ring" or "ordinary", "pattern": one of fan-out | fan-in | cycle | chain | scatter-gather | '
          'mesh | lone | other | none, "flagged_transfer_ids": ["T0001", ...], "accounts": ["..."], '
          '"confidence": "high" | "medium" | "low", "why": "one or two sentences"}')

HEADER = "transfer_id,timestamp,from_account,to_account,amount_paid,payment_currency,payment_format,from_bank,to_bank"


def rows_text(unit):
    lines = [HEADER]
    for r in unit["rows"]:
        lines.append(",".join(str(x) for x in r))
    return "\n".join(lines)


def build(unit, version, facts=None, reference=None):
    parts = [f"Here are {unit['n_rows']} transfers among a small set of accounts (a transfer whose from_account equals "
             "its to_account is an account moving its own money).", "", rows_text(unit), ""]
    if version in ("v2", "v3"):
        parts += ["Facts computed by code from these rows (facts, not a verdict):",
                  facts_text(facts if facts is not None else compute_facts(unit)), ""]
        if reference:
            parts += ["Reference on laundering patterns (retrieved):", reference, ""]
    parts += [f"Question: is there a money-laundering scheme among these transfers? Schemes look like: {PATTERNS}. "
              "Most neighborhoods are ordinary traffic, and busy accounts are not by themselves suspicious. "
              "If you see a scheme, name its pattern and list exactly the transfer ids that belong to it; if not, say ordinary.",
              f"Answer with one JSON object: {SCHEMA}"]
    return "\n".join(parts)
