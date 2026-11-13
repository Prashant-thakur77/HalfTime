/** Compares HalfTime's verdict on each sample with the constructed answer key. */
import { readFileSync } from "node:fs";
import { evaluate } from "../packages/law/src/index.js";
import { decide } from "../packages/reader/src/index.js";

const today = process.argv[2] ?? "2026-11-15";
const samples = JSON.parse(readFileSync("apps/web/src/data/samples.json", "utf8"));
const runs = JSON.parse(readFileSync("apps/web/src/data/sample-runs.json", "utf8"));
let agree = 0;
for (const s of samples) {
  const r = decide(s.text, runs[s.id].extraction, today);
  const gold = evaluate(s.gold, today);
  const ok = r.evaluation.verdict === gold.verdict && r.evaluation.lineDate === gold.lineDate;
  if (ok) agree++;
  console.log(
    `${s.id} ${ok ? "OK  " : "DIFF"} halftime=${r.evaluation.verdict} ${r.evaluation.lineDate} gold=${gold.verdict} ${gold.lineDate} chatbot=${runs[s.id].baseline?.saysEligible} rejected=${r.facts.rejected.length}`
  );
  if (!ok) {
    console.log("   got", JSON.stringify(r.facts.input));
    console.log("   want", JSON.stringify(s.gold));
    for (const x of r.facts.rejected) console.log("   rejected", x.field, x.claim, x.reason);
  }
}
console.log(`${agree}/${samples.length} agree`);
