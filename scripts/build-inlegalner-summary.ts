/**
 * Builds apps/web/src/data/inlegalner.json: a trimmed copy of
 * eval/inlegalner/report.json for the proof page. Never edit the output by
 * hand; run `pnpm exec tsx scripts/build-inlegalner-summary.ts` after
 * `pnpm eval:inlegalner`.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

type Rate = { n: number; hit: number; pct: number; skippedPresent?: number };
interface Report {
  dataset: string;
  rows: number;
  rowsByKind: Record<string, number>;
  goldEntities: Record<string, number>;
  seed: number;
  dateFinding: {
    rows: number;
    recallAllGoldDates: Rate;
    recallFullGoldDates: Rate;
    precision: Rate;
    parse: { correctFull: Rate };
  };
  verifier: {
    recall: { entityDATE: Rate; entityPROVISION: Rate; enclosingSentence: Rate };
    rejection: Record<string, Record<string, Rate>>;
  };
  sections: { sectionReferences: number; outcomes: Record<string, Rate> };
}

const r = JSON.parse(readFileSync(join(root, "eval", "inlegalner", "report.json"), "utf8")) as Report;

const pick = ({ n, hit, pct }: Rate) => ({ n, hit, pct });
const sum = (rates: Rate[]) => {
  const n = rates.reduce((a, x) => a + x.n, 0);
  const hit = rates.reduce((a, x) => a + x.hit, 0);
  return { n, hit, pct: Math.round((hit / n) * 1000) / 10 };
};

const recall = [r.verifier.recall.entityDATE, r.verifier.recall.entityPROVISION, r.verifier.recall.enclosingSentence];
const rejections = Object.values(r.verifier.rejection).flatMap((byKind) => Object.values(byKind));
const rejectionByKind: Record<string, { n: number; hit: number; pct: number }> = {};
for (const byKind of Object.values(r.verifier.rejection)) {
  for (const [kind, rate] of Object.entries(byKind)) {
    const prev = rejectionByKind[kind];
    rejectionByKind[kind] = prev ? sum([{ ...prev }, rate]) : pick(rate);
  }
}

const summary = {
  generatedBy: "scripts/build-inlegalner-summary.ts",
  from: "eval/inlegalner/report.json",
  dataset: r.dataset,
  rows: r.rows,
  rowsByKind: r.rowsByKind,
  goldEntities: r.goldEntities,
  seed: r.seed,
  dates: {
    rows: r.dateFinding.rows,
    recallAll: pick(r.dateFinding.recallAllGoldDates),
    recallFull: pick(r.dateFinding.recallFullGoldDates),
    precision: pick(r.dateFinding.precision),
    parsedCorrectFull: pick(r.dateFinding.parse.correctFull)
  },
  verifier: {
    recallTotal: sum(recall),
    recall: { date: pick(r.verifier.recall.entityDATE), provision: pick(r.verifier.recall.entityPROVISION), sentence: pick(r.verifier.recall.enclosingSentence) },
    rejectionTotal: sum(rejections),
    rejectionByKind
  },
  sections: {
    references: r.sections.sectionReferences,
    outcomes: Object.fromEntries(Object.entries(r.sections.outcomes).map(([k, v]) => [k, pick(v)]))
  }
};

writeFileSync(join(root, "apps", "web", "src", "data", "inlegalner.json"), JSON.stringify(summary, null, 2) + "\n");
console.log("inlegalner.json written");
