/**
 * Evaluation: HalfTime vs a regex reader vs a plain chatbot on the same orders.
 *
 *   pnpm eval                       # constructed set, 1 run + repeats from cache
 *   pnpm eval -- --repeats 3        # 3 HalfTime runs (2 fresh model runs), mean ± sd
 *   pnpm eval -- --set iltur        # the real held-out Hindi set, once downloaded
 *   pnpm eval -- --check            # fail if unsafe-PAST rises or field accuracy drops > 1 pt
 *
 * Writes eval/report.json and eval/report.md. Every number on the site comes from here.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { applyReadWith, canonicalSection, evaluate, expandSections, resolveSection, type CaseInput, type Verdict } from "../packages/law/src/index.js";
import { ClaudeReader } from "../packages/reader/src/claude.js";
import { decide, regexExtract, type BaselineAnswer, type Extraction } from "../packages/reader/src/index.js";
import { FileCache, pool } from "../scripts/file-cache.js";

const args = process.argv.slice(2);
const arg = (k: string, d: string) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1]! : d;
};
const SET = arg("set", "constructed");
const REPEATS = Number(arg("repeats", "3"));
const CHECK = args.includes("--check");
const TODAY = "2026-11-15";

interface Order {
  id: string;
  language: "hi" | "en";
  text: string;
  gold: CaseInput;
  traps: string[];
}

const file = SET === "iltur" ? "eval/raw/iltur/orders.jsonl" : "eval/constructed/orders.jsonl";
if (!existsSync(file)) {
  console.error(`${file} not found. ${SET === "iltur" ? "Run eval/download_iltur.py and label the orders first." : ""}`);
  process.exit(1);
}
const orders: Order[] = readFileSync(file, "utf8").trim().split("\n").map((l) => JSON.parse(l));

const PAST = new Set<Verdict>(["PAST_THE_LINE", "PAST_FLAGGED"]);

/** Offence sections as a comparable set: act + canonical section, after read-with rules. */
function sectionSet(input: CaseInput): Set<string> {
  const res = applyReadWith(expandSections(input.sections).map(resolveSection));
  return new Set(res.map((r) => `${r.act}:${r.canonical}`));
}
function f1(gold: Set<string>, pred: Set<string>) {
  const tp = [...pred].filter((x) => gold.has(x)).length;
  return { tp, fp: pred.size - tp, fn: gold.size - tp };
}
const dayDiff = (a: string, b: string) => Math.abs((Date.parse(a) - Date.parse(b)) / 86400000);

interface Pred {
  input: CaseInput;
  verdict: Verdict;
  lineDate: string | null;
  rejected?: number;
  costUsd?: number;
  ms?: number;
}

function score(preds: Pred[]) {
  let tp = 0, fp = 0, fn = 0;
  let custodyN = 0, custodyExact = 0, custody7 = 0;
  let ftOk = 0, ocOk = 0, verdictOk = 0, lineOk = 0, lineN = 0;
  let unsafe = 0, notPastGold = 0, abstain = 0, falseAbstain = 0, missedPast = 0, pastGold = 0, flagBlind = 0, flaggedGold = 0;
  orders.forEach((o, i) => {
    const p = preds[i]!;
    const g = evaluate(o.gold, TODAY);
    const s = f1(sectionSet(o.gold), sectionSet(p.input));
    tp += s.tp; fp += s.fp; fn += s.fn;
    custodyN++;
    if ((o.gold.custodyStart ?? null) === (p.input.custodyStart ?? null)) custodyExact++;
    if (o.gold.custodyStart && p.input.custodyStart ? dayDiff(o.gold.custodyStart, p.input.custodyStart) <= 7 : o.gold.custodyStart === p.input.custodyStart) custody7++;
    if (o.gold.firstTimeOffender === p.input.firstTimeOffender) ftOk++;
    if (o.gold.otherPendingCases === p.input.otherPendingCases) ocOk++;
    if (g.verdict === p.verdict) verdictOk++;
    if (g.lineDate) {
      lineN++;
      if (g.lineDate === p.lineDate) lineOk++;
    }
    if (!PAST.has(g.verdict)) {
      notPastGold++;
      if (PAST.has(p.verdict)) unsafe++;
    } else {
      pastGold++;
      if (!PAST.has(p.verdict)) missedPast++;
    }
    if (g.verdict === "PAST_FLAGGED") {
      flaggedGold++;
      if (p.verdict === "PAST_THE_LINE") flagBlind++;
    }
    if (p.verdict === "CANT_TELL") {
      abstain++;
      if (g.verdict !== "CANT_TELL") falseAbstain++;
    }
  });
  const n = orders.length;
  const pct = (a: number, b: number) => (b ? Math.round((1000 * a) / b) / 10 : 0);
  const prec = tp / Math.max(tp + fp, 1), rec = tp / Math.max(tp + fn, 1);
  return {
    n,
    sectionsF1: pct(2 * prec * rec, Math.max(prec + rec, 1e-9)),
    sectionsPrecision: pct(tp, tp + fp),
    sectionsRecall: pct(tp, tp + fn),
    custodyExact: pct(custodyExact, custodyN),
    custodyWithin7: pct(custody7, custodyN),
    firstTimeAcc: pct(ftOk, n),
    otherCasesAcc: pct(ocOk, n),
    verdictAcc: pct(verdictOk, n),
    lineDateAcc: pct(lineOk, lineN),
    unsafePastRate: pct(unsafe, notPastGold),
    unsafePastCount: unsafe,
    notPastGold,
    missedPastRate: pct(missedPast, pastGold),
    flagBlindRate: pct(flagBlind, flaggedGold),
    abstainRate: pct(abstain, n),
    falseAbstainRate: pct(falseAbstain, n)
  };
}

const reader = (salt: string) => new ClaudeReader({ cache: new FileCache(), cacheSalt: salt });

async function runHalfTime(salt: string): Promise<Pred[]> {
  const r = reader(salt);
  return pool(orders, 6, async (o, i) => {
    const t0 = Date.now();
    const ex = await r.extract(o.text);
    const check = await r.selfCheck(o.text, ex.value.sections);
    const known = new Set(ex.value.sections.map((s) => `${s.act}:${s.section}`));
    const extraction: Extraction = { ...ex.value, sections: [...ex.value.sections, ...check.value.filter((s) => !known.has(`${s.act}:${s.section}`))] };
    const d = decide(o.text, extraction, TODAY);
    if ((i + 1) % 20 === 0) console.log(`  halftime[${salt || "1"}] ${i + 1}/${orders.length}`);
    return {
      input: d.facts.input,
      verdict: d.evaluation.verdict,
      lineDate: d.evaluation.lineDate,
      rejected: d.facts.rejected.length,
      costUsd: ex.meta.costUsd + check.meta.costUsd,
      ms: ex.meta.cached ? (ex.meta as { ms: number }).ms : Date.now() - t0
    };
  });
}

function runRegex(): Pred[] {
  return orders.map((o) => {
    const input = regexExtract(o.text);
    const e = evaluate(input, TODAY);
    return { input, verdict: e.verdict, lineDate: e.lineDate };
  });
}

async function runChatbot(): Promise<{ answer: BaselineAnswer; costUsd: number; ms: number }[]> {
  const r = reader("");
  return pool(orders, 6, async (o, i) => {
    const b = await r.baseline(o.text);
    const j = await r.judgeBaseline(b.value.text);
    if ((i + 1) % 20 === 0) console.log(`  chatbot ${i + 1}/${orders.length}`);
    return { answer: j.value, costUsd: b.meta.costUsd + j.meta.costUsd, ms: b.meta.ms };
  });
}

function chatbotScore(answers: BaselineAnswer[]) {
  let unsafe = 0, notPast = 0, saysYesOnFlagged = 0, flagged = 0, correctCall = 0, dateRight = 0, pastN = 0, hedged = 0;
  orders.forEach((o, i) => {
    const g = evaluate(o.gold, TODAY);
    const a = answers[i]!;
    const goldPast = PAST.has(g.verdict);
    if (a.saysEligible === null) hedged++;
    if (!goldPast) {
      notPast++;
      if (a.saysEligible === true) unsafe++;
      if (a.saysEligible === false) correctCall++;
    } else {
      pastN++;
      if (a.saysEligible === true) correctCall++;
      if (a.saysEligible === true && a.date && g.lineDate && dayDiff(a.date, g.lineDate) <= 7) dateRight++;
    }
    if (g.verdict === "PAST_FLAGGED") {
      flagged++;
      if (a.saysEligible === true) saysYesOnFlagged++;
    }
  });
  const pct = (a: number, b: number) => (b ? Math.round((1000 * a) / b) / 10 : 0);
  return {
    unsafePastRate: pct(unsafe, notPast),
    unsafePastCount: unsafe,
    notPastGold: notPast,
    yesNoAcc: pct(correctCall, orders.length),
    hedgeRate: pct(hedged, orders.length),
    lineDateWithin7OnPast: pct(dateRight, pastN),
    flagBlindRate: pct(saysYesOnFlagged, flagged)
  };
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = (xs: number[]) => (xs.length < 2 ? 0 : Math.sqrt(xs.reduce((a, b) => a + (b - mean(xs)) ** 2, 0) / (xs.length - 1)));
const pctl = (xs: number[], p: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]!;
};

console.log(`Evaluating ${orders.length} orders (${SET}), today = ${TODAY}`);
const regex = runRegex();
const ht: Pred[][] = [];
for (let r = 0; r < REPEATS; r++) ht.push(await runHalfTime(r === 0 ? "" : `repeat-${r}`));
const chat = await runChatbot();

const htScores = ht.map(score);
const keys = Object.keys(htScores[0]!) as (keyof (typeof htScores)[0])[];
const htSummary = Object.fromEntries(keys.map((k) => [k, { mean: Math.round(mean(htScores.map((s) => s[k] as number)) * 10) / 10, sd: Math.round(sd(htScores.map((s) => s[k] as number)) * 10) / 10 }]));

const main = ht[0]!;
const traps = [...new Set(orders.flatMap((o) => o.traps))].sort();
const trapTable = traps.map((t) => {
  const idx = orders.map((o, i) => (o.traps.includes(t) ? i : -1)).filter((i) => i >= 0);
  const golds = idx.map((i) => evaluate(orders[i]!.gold, TODAY));
  const htOk = idx.filter((i, k) => main[i]!.verdict === golds[k]!.verdict).length;
  const rxOk = idx.filter((i, k) => regex[i]!.verdict === golds[k]!.verdict).length;
  const chatOk = idx.filter((i, k) => (PAST.has(golds[k]!.verdict) ? chat[i]!.answer.saysEligible === true : chat[i]!.answer.saysEligible !== true)).length;
  return { trap: t, n: idx.length, halftime: htOk, regex: rxOk, chatbotNotWrongYes: chatOk };
});

const misses = orders
  .map((o, i) => {
    const g = evaluate(o.gold, TODAY);
    const p = main[i]!;
    if (g.verdict === p.verdict && g.lineDate === p.lineDate) return null;
    const why: string[] = [];
    const gs = sectionSet(o.gold), ps = sectionSet(p.input);
    const missing = [...gs].filter((x) => !ps.has(x)), extra = [...ps].filter((x) => !gs.has(x));
    if (missing.length) why.push(`missed sections ${missing.join(", ")}`);
    if (extra.length) why.push(`extra sections ${extra.join(", ")}`);
    if ((o.gold.custodyStart ?? null) !== (p.input.custodyStart ?? null)) why.push(`custody ${p.input.custodyStart ?? "none"} vs ${o.gold.custodyStart ?? "none"}`);
    if (o.gold.firstTimeOffender !== p.input.firstTimeOffender) why.push(`first-time ${p.input.firstTimeOffender} vs ${o.gold.firstTimeOffender}`);
    if (o.gold.otherPendingCases !== p.input.otherPendingCases) why.push(`other cases ${p.input.otherPendingCases} vs ${o.gold.otherPendingCases}`);
    return {
      id: o.id,
      language: o.language,
      traps: o.traps,
      gold: g.verdict,
      got: p.verdict,
      unsafe: !PAST.has(g.verdict) && PAST.has(p.verdict),
      why: why.join("; ") || "same facts, different line date",
      rejected: p.rejected ?? 0
    };
  })
  .filter((x) => x !== null);

const costs = main.map((p) => p.costUsd ?? 0);
const lat = main.map((p) => p.ms ?? 0).filter((x) => x > 0);
const report = {
  set: SET === "iltur" ? "IL-TUR BAIL held-out (real Hindi orders, labelled)" : "Constructed orders (synthetic, ground truth known by construction)",
  constructed: SET !== "iltur",
  n: orders.length,
  languages: { hi: orders.filter((o) => o.language === "hi").length, en: orders.filter((o) => o.language === "en").length },
  today: TODAY,
  ranOn: new Date().toISOString().slice(0, 10),
  models: { extract: "claude-sonnet-5-5", chatbot: "claude-sonnet-5-5", judge: "claude-haiku-5-5" },
  repeats: REPEATS,
  goldVerdicts: Object.fromEntries(["PAST_THE_LINE", "PAST_FLAGGED", "NOT_YET", "EXCLUDED", "CANT_TELL"].map((v) => [v, orders.filter((o) => evaluate(o.gold, TODAY).verdict === v).length])),
  halftime: { ...htScores[0], repeats: htSummary, verifierRejections: main.reduce((a, p) => a + (p.rejected ?? 0), 0), costPerOrderUsd: Math.round(mean(costs) * 10000) / 10000, latencyMsP50: lat.length ? pctl(lat, 50) : null, latencyMsP95: lat.length ? pctl(lat, 95) : null },
  regex: score(regex),
  chatbot: { ...chatbotScore(chat.map((c) => c.answer)), costPerOrderUsd: Math.round(mean(chat.map((c) => c.costUsd)) * 10000) / 10000 },
  traps: trapTable,
  misses
};

const prev = existsSync("eval/report.json") ? JSON.parse(readFileSync("eval/report.json", "utf8")) : null;
if (CHECK && prev && prev.set === report.set) {
  const bad: string[] = [];
  if (report.halftime.unsafePastRate! > prev.halftime.unsafePastRate) bad.push(`unsafe-PAST rose ${prev.halftime.unsafePastRate} -> ${report.halftime.unsafePastRate}`);
  for (const k of ["sectionsF1", "custodyExact", "firstTimeAcc", "otherCasesAcc", "verdictAcc"] as const) {
    if ((report.halftime[k] as number) < prev.halftime[k] - 1) bad.push(`${k} dropped ${prev.halftime[k]} -> ${report.halftime[k]}`);
  }
  if (bad.length) {
    console.error("Eval regression:\n" + bad.join("\n"));
    process.exit(1);
  }
}

writeFileSync("eval/report.json", JSON.stringify(report, null, 2) + "\n");
const h = report.halftime, x = report.regex, c = report.chatbot;
const md = `# Evaluation report

Set: **${report.set}**, ${report.n} orders (${report.languages.hi} Hindi, ${report.languages.en} English). "Today" fixed at ${TODAY}. Run on ${report.ranOn}. Models: extraction and chatbot ${report.models.extract}; chatbot answers read by ${report.models.judge}.
${report.constructed ? "\n> These are constructed orders written for testing, with the right answer known by construction. They are not real cases. The real-order evaluation (IL-TUR held-out Hindi bail orders) runs with `pnpm eval -- --set iltur` once the dataset is downloaded and labelled.\n" : ""}
| | HalfTime | Regex reader + same engine | Plain chatbot (same model) |
|---|---|---|---|
| Unsafe "past the line" rate (says past when it isn't) | **${h.unsafePastRate}%** (${h.unsafePastCount}/${h.notPastGold}) | ${x.unsafePastRate}% (${x.unsafePastCount}/${x.notPastGold}) | ${c.unsafePastRate}% (${c.unsafePastCount}/${c.notPastGold}) |
| Verdict accuracy | **${h.verdictAcc}%** | ${x.verdictAcc}% | yes/no right ${c.yesNoAcc}% |
| Misses 479(2) flag (calls a flagged case simply eligible) | ${h.flagBlindRate}% | ${x.flagBlindRate}% | ${c.flagBlindRate}% |
| Sections F1 | ${h.sectionsF1}% | ${x.sectionsF1}% | – |
| Custody date exact / ±7 days | ${h.custodyExact}% / ${h.custodyWithin7}% | ${x.custodyExact}% / ${x.custodyWithin7}% | – |
| First-time status / other cases | ${h.firstTimeAcc}% / ${h.otherCasesAcc}% | ${x.firstTimeAcc}% / ${x.otherCasesAcc}% | – |
| Line date exact (where one exists) | ${h.lineDateAcc}% | ${x.lineDateAcc}% | ±7 days on past cases: ${c.lineDateWithin7OnPast}% |
| Abstains (can't tell) / wrongly | ${h.abstainRate}% / ${h.falseAbstainRate}% | ${x.abstainRate}% / ${x.falseAbstainRate}% | hedges ${c.hedgeRate}% |
| Cost per order | $${h.costPerOrderUsd} | $0 | $${c.costPerOrderUsd} |

HalfTime over ${REPEATS} runs (mean ± sd): verdict ${h.repeats.verdictAcc!.mean}% ± ${h.repeats.verdictAcc!.sd}, unsafe-PAST ${h.repeats.unsafePastRate!.mean}% ± ${h.repeats.unsafePastRate!.sd}, sections F1 ${h.repeats.sectionsF1!.mean}% ± ${h.repeats.sectionsF1!.sd}. Latency p50 ${h.latencyMsP50} ms, p95 ${h.latencyMsP95} ms. Verifier rejected ${h.verifierRejections} model claims.

## Traps
| Trap | Orders | HalfTime right | Regex right | Chatbot avoided a wrong "yes" |
|---|---|---|---|---|
${report.traps.map((t) => `| ${t.trap} | ${t.n} | ${t.halftime} | ${t.regex} | ${t.chatbotNotWrongYes} |`).join("\n")}

## Misses (HalfTime, run 1)
${report.misses.length ? `| Order | Lang | Answer key | HalfTime | Unsafe? | Why |\n|---|---|---|---|---|---|\n${report.misses.map((m) => `| ${m.id} | ${m.language} | ${m.gold} | ${m.got} | ${m.unsafe ? "yes" : "no"} | ${m.why} |`).join("\n")}` : "None."}
`;
writeFileSync("eval/report.md", md);
console.log(md);
