/**
 * Runs the real pipeline (extraction + self-check + plain-chatbot baseline) on
 * the sample tray and writes the results for the site, so demos play from
 * cache and never wait on the model.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ClaudeReader } from "../packages/reader/src/claude.js";
import { FileCache, pool } from "./file-cache.js";

const root = process.cwd();
const samples = JSON.parse(readFileSync(join(root, "data/samples/samples.json"), "utf8")) as { id: string; text: string }[];
const reader = new ClaudeReader({ cache: new FileCache() });

const runs = await pool(samples, 4, async (s) => {
  const ex = await reader.extract(s.text);
  const check = await reader.selfCheck(s.text, ex.value.sections);
  const known = new Set(ex.value.sections.map((x) => `${x.act}:${x.section}`));
  const added = check.value.filter((x) => !known.has(`${x.act}:${x.section}`));
  const b = await reader.baseline(s.text);
  const j = await reader.judgeBaseline(b.value.text);
  const cost = [ex, check, b, j].reduce((a, r) => a + r.meta.costUsd, 0);
  console.log(`${s.id}: ${ex.value.sections.length}+${added.length} sections, chatbot says ${j.value.saysEligible}, $${cost.toFixed(4)}`);
  return [
    s.id,
    {
      extraction: { ...ex.value, sections: [...ex.value.sections, ...added] },
      baseline: j.value,
      model: ex.meta.model,
      ranOn: new Date().toISOString().slice(0, 10),
      costUsd: cost,
      ms: ex.meta.ms + check.meta.ms
    }
  ] as const;
});

writeFileSync(join(root, "apps/web/src/data/sample-runs.json"), JSON.stringify(Object.fromEntries(runs), null, 2) + "\n");
writeFileSync(join(root, "apps/web/src/data/samples.json"), JSON.stringify(samples, null, 2) + "\n");
console.log(`wrote ${runs.length} runs`);
