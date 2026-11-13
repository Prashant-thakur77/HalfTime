"""
Download the held-out IL-TUR BAIL orders (Hindi, UP district courts) and draw a
stratified sample for labelling. Nothing downloaded here is committed: it all
stays in eval/raw/ (git-ignored). Requires an accepted access request on
https://huggingface.co/datasets/Exploration-Lab/IL-TUR and HF_TOKEN in the env.

    python eval/download_iltur.py --n 300 --seed 7
    python eval/label.py              # label the sample -> eval/raw/iltur/orders.jsonl
    pnpm eval -- --set iltur
"""
import argparse
import json
import os
import random
from collections import defaultdict
from pathlib import Path

import pandas as pd
from huggingface_hub import hf_hub_download

OUT = Path(__file__).resolve().parent / "raw" / "iltur"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=300)
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--split", default="test_specific", help="district-grouped held-out split")
    args = ap.parse_args()

    token = os.environ.get("HF_TOKEN")
    if not token:
        raise SystemExit("Set HF_TOKEN (and make sure your IL-TUR access request is approved).")

    path = hf_hub_download(
        repo_id="Exploration-Lab/IL-TUR",
        repo_type="dataset",
        filename=f"bail/{args.split}-00000-of-00001.parquet",
        token=token,
    )
    df = pd.read_parquet(path)
    print(f"{len(df)} orders in {args.split}")

    # Stratify by district and bail outcome so the sample isn't one court's style.
    groups: dict[tuple, list[int]] = defaultdict(list)
    for i, row in df.iterrows():
        groups[(row["district"], int(row["label"]))].append(i)
    rng = random.Random(args.seed)
    for g in groups.values():
        rng.shuffle(g)
    picked: list[int] = []
    while len(picked) < args.n and any(groups.values()):
        for key in sorted(groups):
            if groups[key] and len(picked) < args.n:
                picked.append(groups[key].pop())

    OUT.mkdir(parents=True, exist_ok=True)
    with open(OUT / "unlabelled.jsonl", "w", encoding="utf-8") as f:
        for i in picked:
            row = df.loc[i]
            text = row["text"]
            body = "\n".join(list(text["facts-and-arguments"]) + list(text["judge-opinion"]))
            f.write(json.dumps({"id": str(row["id"]), "district": row["district"], "bail_label": int(row["label"]), "language": "hi", "text": body}, ensure_ascii=False) + "\n")
    print(f"wrote {len(picked)} orders to {OUT / 'unlabelled.jsonl'}")


if __name__ == "__main__":
    main()
