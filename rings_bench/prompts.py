"""prompts.py: the v1 and v2 prompts. v1 = raw rows. v2 = raw rows + code facts (+ reference text if given)."""
from facts import compute_facts, facts_text

# The system prompt for every version. Tested 2026-10-17 against eight candidates (system_prompts.py: base rate,
# precise flagging, evidence first, cost of a false alarm, pattern signatures, combinations) on five models with the
# rest of the message unchanged; none beat it, so it stays. The candidates cut false alarms (S1 by half) but missed
# more rings than they saved. Evidence: evals.md, "System prompt search"; data/prompt_compare_step1.json.
SYSTEM = ("You are an analyst on a bank's financial-crime desk reviewing a small neighborhood of account-to-account "
          "transfers from a synthetic data set. Be precise, cite transfer ids, and be honest about uncertainty: a wrong "
          "accusation costs a real customer, a missed scheme costs the bank. Answer with one JSON object only.")

PATTERNS = ("fan-out (one account sends to many), fan-in (many send to one), cycle (money returns to where it started "
            "through 2 or more hops), chain (money passed along A to B to C), scatter-gather (split up, then gathered "
            "again), mesh (a group of accounts trading among themselves), lone (one suspicious transfer on its own), "
            "other")

SCHEMA = ('{"verdict": "ring" or "ordinary" or "cannot tell", "pattern": one of fan-out | fan-in | cycle | chain | scatter-gather | '
          'mesh | lone | other | none, "flagged_transfer_ids": ["T0001", ...], "accounts": ["..."], '
          '"confidence": "high" | "medium" | "low", "why": "one or two sentences"}')

HEADER = "transfer_id,timestamp,from_account,to_account,amount_paid,payment_currency,payment_format,from_bank,to_bank"


def rows_text(unit):
    lines = [HEADER]
    for r in unit["rows"]:
        lines.append(",".join(str(x) for x in r))
    return "\n".join(lines)


V5_FRAME = (
    "Context for the decision. These neighborhoods come from an alert queue: about one in three holds a laundering "
    "scheme, two in three are ordinary business. Ordinary business also looks busy: payroll and supplier payments "
    "repeat the same amounts on a schedule; a merchant or settlement account takes money in from many customers and "
    "pays it out; a pass-through of a single payment with a different amount a day later is normal treasury work. "
    "Call a scheme only when the computed facts show structure that ordinary business does not explain: a loop that "
    "returns money to its start, a burst to or from three or more distinct accounts within an hour, or a chain where "
    "nearly the whole amount moves on within hours. If the rows are consistent with ordinary business, answer ordinary. "
    "If you cannot tell, answer \"cannot tell\" rather than ring. Name in why which computed fact is your evidence."
)


def build(unit, version, facts=None, reference=None):
    parts = [f"Here are {unit['n_rows']} transfers among a small set of accounts (a transfer whose from_account equals "
             "its to_account is an account moving its own money).", "", rows_text(unit), ""]
    if version in ("v2", "v3", "v5"):
        parts += ["Facts computed by code from these rows (facts, not a verdict):",
                  facts_text(facts if facts is not None else compute_facts(unit)), ""]
        if reference:
            parts += ["Reference on laundering patterns (retrieved):", reference, ""]
    if version == "v5":
        parts += [V5_FRAME, ""]
    parts += [f"Question: is there a money-laundering scheme among these transfers? Schemes look like: {PATTERNS}. "
              "Most neighborhoods are ordinary traffic, and busy accounts are not by themselves suspicious. "
              "If you see a scheme, name its pattern and list exactly the transfer ids that belong to it; if not, say ordinary.",
              f"Answer with one JSON object: {SCHEMA}"]
    return "\n".join(parts)
