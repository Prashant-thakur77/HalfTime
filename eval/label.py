"""
A small terminal labelling tool for real orders. For each order in
eval/raw/iltur/unlabelled.jsonl it shows the text and asks for the facts the
engine needs. Answers are appended to eval/raw/iltur/orders.jsonl, so you can
stop and resume at any time. Leave a field blank for "not stated".

    python eval/label.py               # label
    python eval/label.py --labeller B  # a second labeller, for agreement (kappa)
"""
import argparse
import json
import re
from pathlib import Path

RAW = Path(__file__).resolve().parent / "raw" / "iltur"
ACTS = ["IPC", "BNS", "NDPS", "ARMS", "POCSO", "SCST", "DOWRY", "GAMBLING", "IT", "EXCISE", "GANGSTERS", "OTHER"]


def ask(prompt: str, pattern: str = r".*") -> str:
    while True:
        v = input(prompt).strip()
        if v == "" or re.fullmatch(pattern, v):
            return v
        print("  ? format not recognised, try again (blank = not stated)")


def tri(prompt: str) -> str:
    v = ask(prompt + " [y/n/blank]: ", r"[yn]")
    return {"y": "true", "n": "false"}.get(v, "unknown")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--labeller", default="A")
    args = ap.parse_args()
    out = RAW / ("orders.jsonl" if args.labeller == "A" else f"orders.{args.labeller}.jsonl")
    done = set()
    if out.exists():
        done = {json.loads(l)["id"] for l in out.read_text(encoding="utf-8").splitlines() if l.strip()}
    orders = [json.loads(l) for l in (RAW / "unlabelled.jsonl").read_text(encoding="utf-8").splitlines() if l.strip()]
    todo = [o for o in orders if o["id"] not in done]
    print(f"{len(done)} labelled, {len(todo)} to go. Ctrl-C to stop; progress is saved.\n")
    for o in todo:
        print("=" * 100)
        print(f"{o['id']} · {o['district']}")
        print("-" * 100)
        print(o["text"])
        print("-" * 100)
        sections = []
        print("Charged sections, one per line as ACT SECTION (e.g. 'IPC 379', 'NDPS 20 small'); blank line to finish.")
        while True:
            s = input("  section: ").strip()
            if not s:
                break
            parts = s.split()
            if parts[0].upper() not in ACTS or len(parts) < 2:
                print(f"  ? act must be one of {', '.join(ACTS)}")
                continue
            item = {"act": parts[0].upper(), "section": parts[1]}
            if item["act"] == "NDPS":
                item["quantity"] = parts[2] if len(parts) > 2 and parts[2] in ("small", "intermediate", "commercial") else "unknown"
            sections.append(item)
        custody = ask("Custody began (YYYY-MM-DD, blank if not written): ", r"\d{4}-\d{2}-\d{2}") or None
        registered = ask("FIR registered (YYYY-MM-DD, blank if not written): ", r"\d{4}-\d{2}-\d{2}") or None
        first = tri("First-time offender (no conviction / no criminal history)?")
        other = tri("Other cases pending?")
        rec = {
            "id": o["id"],
            "language": "hi",
            "text": o["text"],
            "gold": {"sections": sections, "custodyStart": custody, "firstTimeOffender": first, "otherPendingCases": other, "registeredOn": registered},
            "traps": [],
            "labeller": args.labeller,
        }
        with open(out, "a", encoding="utf-8") as f:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nSaved. Run again to continue.")
