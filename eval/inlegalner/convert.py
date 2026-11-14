"""
Convert the InLegalNER test split (Label Studio JSON in parquet) into the flat
JSONL that eval/inlegalner/run.ts reads. Input and output both stay in
eval/raw/ (git-ignored); nothing from the dataset is committed.

    python3 -I eval/inlegalner/convert.py
"""
import argparse
import json
from pathlib import Path

import pyarrow.parquet as pq

RAW = Path(__file__).resolve().parent.parent / "raw" / "inlegalner"
KEEP = {"DATE": "dates", "PROVISION": "provisions", "STATUTE": "statutes"}


def convert_row(row: dict) -> dict:
    text: str = row["data"]["text"]
    source: str = (row.get("meta") or {}).get("source") or ""
    out: dict = {
        "id": row["id"],
        # "<collection> <judgement|preamble> <url>": the url identifies the judgment a row came from.
        "kind": source.split(" ")[1] if source.count(" ") >= 2 else "unknown",
        "doc": source.split(" ")[-1],
        "text": text,
        **{field: [] for field in KEEP.values()},
    }
    for annotation in row["annotations"]:
        for result in annotation["result"]:
            value = result["value"]
            start, end = int(value["start"]), int(value["end"])
            if text[start:end] != value["text"]:
                raise ValueError(f"row {row['id']}: offsets {start}-{end} do not match the entity text")
            for label in value["labels"]:
                if label in KEEP:
                    out[KEEP[label]].append({"start": start, "end": end, "text": value["text"]})
    for field in KEEP.values():
        out[field].sort(key=lambda e: (e["start"], e["end"]))
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--split", default="test")
    args = ap.parse_args()

    files = sorted((RAW / "data").glob(f"{args.split}-*.parquet"))
    if not files:
        raise SystemExit(f"No {args.split} parquet under {RAW / 'data'}. Download InLegalNER there first.")
    rows = [convert_row(r) for f in files for r in pq.read_table(f).to_pylist()]
    rows.sort(key=lambda r: r["id"])

    dest = RAW / f"{args.split}.jsonl"
    with dest.open("w", encoding="utf-8") as fh:
        for r in rows:
            fh.write(json.dumps(r, ensure_ascii=False) + "\n")
    counts = {field: sum(len(r[field]) for r in rows) for field in KEEP.values()}
    print(f"{len(rows)} rows -> {dest.relative_to(RAW.parent.parent.parent)} {counts}")


if __name__ == "__main__":
    main()
