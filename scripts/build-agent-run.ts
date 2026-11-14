/**
 * Runs the docket agent for real on the twelve constructed sample orders and
 * writes the run (events, docket, stats) for the /agent page. Responses are
 * cached under .cache/claude, so a second run replays the same conversation
 * without calling the API. Spend is capped.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { anthropicModelClient, runDocketAgent } from "../packages/reader/src/agent.js";
import { FileCache } from "./file-cache.js";

const root = process.cwd();
const TODAY = "2026-11-15";
const BUDGET_USD = 2.5;

const samples = JSON.parse(readFileSync(join(root, "data/samples/samples.json"), "utf8")) as { id: string; text: string }[];
const client = anthropicModelClient({ cache: new FileCache(), effort: "medium", budgetUsd: BUDGET_USD });

const t0 = Date.now();
const run = await runDocketAgent({
  files: samples.map((s) => ({ id: s.id, text: s.text })),
  today: TODAY,
  client,
  onEvent: (e) => {
    const where = e.fileId ? ` ${e.fileId}` : "";
    const cost = e.costUsd !== undefined ? ` $${e.costUsd.toFixed(4)}` : "";
    console.log(`#${e.step} ${e.kind}${e.tool ? ` ${e.tool}` : ""}${where}: ${e.output.slice(0, 160)}${cost}`);
  }
});

const out = { label: "Recorded run on the 12 constructed sample orders", ranOn: new Date().toISOString().slice(0, 10), ...run };
writeFileSync(join(root, "apps/web/src/data/agent-run.json"), JSON.stringify(out, null, 1) + "\n");
console.log(
  `\n${run.stats.stoppedBy} after ${run.stats.steps} turns, ${run.stats.toolCalls} tool calls · rejected ${run.stats.rejectedClaims}, fixed ${run.stats.fixedOnRetry}, records ${run.stats.recordsRequested}, drafts ${run.stats.drafts}, refusals ${run.stats.refusals} · $${run.stats.costUsd.toFixed(3)} recorded, $${client.spentUsd.toFixed(3)} spent now · ${Math.round((Date.now() - t0) / 1000)}s`
);
