/** Live check: extract one order with Claude, verify the quotes, apply the law. */
import { ClaudeReader } from "../packages/reader/src/claude.js";
import { decide } from "../packages/reader/src/index.js";
import { HINDI_ORDER } from "../packages/reader/test/fixtures.js";

const reader = new ClaudeReader();
const ex = await reader.extract(HINDI_ORDER);
console.log("meta", ex.meta);
console.log(JSON.stringify(ex.value, null, 2));
const r = decide(HINDI_ORDER, ex.value, "2026-11-15");
console.log("rejected", r.facts.rejected);
console.log("verdict", r.evaluation.verdict, r.evaluation.lineDate);
const b = await reader.baseline(HINDI_ORDER);
console.log("baseline", b.value.text.slice(0, 600));
const j = await reader.judgeBaseline(b.value.text);
console.log("judged", j.value.saysEligible, j.value.date, j.meta);
