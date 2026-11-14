import type { Metadata } from "next";
import Link from "next/link";
import inlegalner from "@/data/inlegalner.json";
import { facts, inr } from "@/lib/facts";

export const metadata: Metadata = {
  title: "Proof and misses",
  description: "How HalfTime is measured against a regex reader and a plain chatbot on the same orders: unsafe calls, field accuracy, traps and every miss."
};

type Num = number;
interface Scores {
  sectionsF1: Num; sectionsPrecision: Num; sectionsRecall: Num; custodyExact: Num; custodyWithin7: Num; firstTimeAcc: Num; otherCasesAcc: Num;
  verdictAcc: Num; lineDateAcc: Num; unsafePastRate: Num; unsafePastCount: Num; notPastGold: Num; missedPastRate: Num; flagBlindRate: Num; abstainRate: Num; falseAbstainRate: Num;
}
interface Report {
  set: string; constructed: boolean; n: number; languages: { hi: number; en: number }; today: string; ranOn: string; repeats: number;
  models: { extract: string; chatbot: string; judge: string };
  goldVerdicts: Record<string, number>;
  halftime: Scores & { repeats: Record<string, { mean: number; sd: number }>; verifierRejections: number; costPerOrderUsd: number; latencyMsP50: number | null; latencyMsP95: number | null };
  regex: Scores;
  chatbot: { unsafePastRate: Num; unsafePastCount: Num; notPastGold: Num; yesNoAcc: Num; hedgeRate: Num; lineDateWithin7OnPast: Num; flagBlindRate: Num; costPerOrderUsd: Num };
  traps: { trap: string; n: number; halftime: number; regex: number; chatbotNotWrongYes: number }[];
  misses: { id: string; language: string; traps: string[]; gold: string; got: string; unsafe: boolean; why: string; rejected: number }[];
}

const TRAP_NAMES: Record<string, string> = {
  acquitted_old_case: "An old case ended in acquittal",
  co_accused: "A co-accused with different facts",
  injection: "Planted instruction in the text",
  life_in_list: "A life-term section hidden in a list",
  no_custody_date: "No custody date anywhere",
  not_charged: "A section mentioned but not charged",
  two_dates: "Arrest and other dates side by side"
};

/** One metric, three systems: thin horizontal bars, labelled directly, values in text ink. */
function BarSet({ title, note, rows, lowerIsBetter }: { title: string; note: string; rows: { name: string; value: number; us?: boolean }[]; lowerIsBetter?: boolean }) {
  return (
    <figure className="border border-ink bg-paper p-5">
      <figcaption>
        <p className="font-sans text-[1.1rem] font-[700]">{title}</p>
        <p className="text-[0.82rem] text-ink-3">{note} {lowerIsBetter ? "Lower is better." : "Higher is better."}</p>
      </figcaption>
      <ul className="mt-4 space-y-3">
        {rows.map((r) => (
          <li key={r.name} className="group grid grid-cols-[minmax(0,10rem)_1fr_3.5rem] items-center gap-3" title={`${r.name}: ${r.value}%`}>
            <span className={`text-[0.85rem] ${r.us ? "font-[700]" : "text-ink-2"}`}>{r.name}</span>
            <span className="relative h-3 bg-paper-2">
              <span
                className={`absolute inset-y-0 left-0 rounded-r-[4px] ${r.us ? "bg-carbon" : "bg-ink-3"} transition-opacity group-hover:opacity-80`}
                style={{ width: `${Math.max(r.value, 0.6)}%` }}
              />
            </span>
            <span className="text-right font-mono text-[0.9rem] tabular">{r.value}%</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}

const OUTCOME_NAMES: Record<string, string> = {
  "known maximum": "Maximum term known",
  "in tables, maximum depends on another section or fact": "In the tables, but the maximum depends on another section or fact",
  "not in tables (can't tell)": "Not in the tables: says “can't tell”",
  "unparsed reference (can't tell)": "Reference not parsed: says “can't tell”"
};

const VARIANT_NAMES: Record<string, string> = {
  "digit changed in entity (entity quote)": "One digit changed in the date or section",
  "digit changed in entity (sentence quote)": "One digit changed, inside the whole sentence",
  "word swapped (sentence quote)": "One word swapped in the sentence",
  "sentence from another judgment": "A sentence taken from another judgment"
};

type Rate = { n: number; hit: number; pct: number };
const rate = (x: Rate) => `${x.pct}% (${inr(x.hit)}/${inr(x.n)})`;

/** The deterministic reader on real judgments: no model, no network. */
function RealJudgments() {
  const j = inlegalner;
  const rows: [string, string][] = [
    ["Dates found, all labelled dates", rate(j.dates.recallAll)],
    ["Dates found, full day-month-year dates", rate(j.dates.recallFull)],
    ["Found spans that are labelled dates (precision)", rate(j.dates.precision)],
    ["Full dates read to the right calendar day", rate(j.dates.parsedCorrectFull)],
    ["Real quotes accepted by the verifier", rate(j.verifier.recallTotal)],
    ["Altered quotes rejected by the verifier", rate(j.verifier.rejectionTotal)]
  ];
  return (
    <section aria-labelledby="real-h" className="mt-16">
      <h2 id="real-h" className="font-sans text-[length:var(--step-3)] font-[750] [font-stretch:88%]">On real judgments (no model)</h2>
      <p className="mt-2 max-w-3xl text-ink-2">
        The parts of HalfTime that are plain code, run on {inr(j.rows)} rows of real Indian court text with labels written by people: the{" "}
        {j.dataset.replace(/ \(.*\)$/, "")}, English Indian judgments, MIT licence. {inr(j.rowsByKind.judgement)} judgment sentences and{" "}
        {inr(j.rowsByKind.preamble)} preambles; {inr(j.goldEntities.DATE)} labelled dates and {inr(j.goldEntities.PROVISION)} labelled provisions.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[
          { v: `${j.verifier.recallTotal.pct}%`, l: `of ${inr(j.verifier.recallTotal.n)} real quotes accepted`, s: "Quotes copied from the judgment are always found." },
          { v: `${j.verifier.rejectionTotal.pct}%`, l: `of ${inr(j.verifier.rejectionTotal.n)} altered quotes rejected`, s: "A changed digit, a swapped word or a borrowed sentence never passes." },
          { v: `${j.dates.recallFull.pct}%`, l: `of ${inr(j.dates.recallFull.n)} full dates found`, s: `Precision ${j.dates.precision.pct}% over ${inr(j.dates.precision.n)} found spans.` }
        ].map((x) => (
          <div key={x.l} className="border border-ink bg-paper p-5">
            <p className="font-mono text-[clamp(2.2rem,4vw,3.2rem)] leading-none tabular">{x.v}</p>
            <p className="mt-2 font-sans text-[1rem] font-[700]">{x.l}</p>
            <p className="mt-1 text-[0.85rem] text-ink-3">{x.s}</p>
          </div>
        ))}
      </div>

      <div tabIndex={0} role="region" aria-label="Real judgments table" className="mt-6 overflow-x-auto border border-ink">
        <table className="w-full min-w-[560px] border-collapse text-[0.9rem]">
          <thead className="bg-ink text-left text-paper">
            <tr>
              <th scope="col" className="p-3 font-[600]">Measure</th>
              <th scope="col" className="p-3 font-[600]">Result (hits / n)</th>
            </tr>
          </thead>
          <tbody className="font-mono tabular">
            {rows.map(([k, v]) => (
              <tr key={k} className="border-t border-[var(--rule)] odd:bg-paper-2/60">
                <th scope="row" className="p-3 text-left font-sans font-[500]">{k}</th>
                <td className="p-3">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div tabIndex={0} role="region" aria-label="Altered quotes table" className="overflow-x-auto border border-ink">
          <table className="w-full min-w-[480px] border-collapse text-[0.9rem]">
            <thead className="bg-paper-2 text-left">
              <tr>
                <th scope="col" className="p-3">Altered quote (dates and provisions)</th>
                <th scope="col" className="p-3">Rejected</th>
              </tr>
            </thead>
            <tbody className="font-mono tabular">
              {Object.entries(j.verifier.rejectionByKind).map(([k, v]) => (
                <tr key={k} className="border-t border-[var(--rule)]">
                  <th scope="row" className="p-3 text-left font-sans font-[500]">{VARIANT_NAMES[k] ?? k}</th>
                  <td className="p-3">{rate(v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div tabIndex={0} role="region" aria-label="Section parsing table" className="overflow-x-auto border border-ink">
          <table className="w-full min-w-[480px] border-collapse text-[0.9rem]">
            <thead className="bg-paper-2 text-left">
              <tr>
                <th scope="col" className="p-3">Section reference ({inr(j.sections.references)} from acts HalfTime covers)</th>
                <th scope="col" className="p-3">Share</th>
              </tr>
            </thead>
            <tbody className="font-mono tabular">
              {Object.entries(j.sections.outcomes).map(([k, v]) => (
                <tr key={k} className="border-t border-[var(--rule)]">
                  <th scope="row" className="p-3 text-left font-sans font-[500]">{OUTCOME_NAMES[k] ?? k}</th>
                  <td className="p-3">{rate(v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8 grid max-w-5xl gap-6 font-serif text-[1.05rem] leading-relaxed md:grid-cols-2">
        <div>
          <p className="caps text-ok">What this shows</p>
          <p className="mt-2">
            On real court English, the code that finds dates, reads section numbers and checks every quote the model gives does its job. A quote
            that is really in the papers passes; a quote with one digit or one word changed does not. Sections it cannot price are marked
            “can&apos;t tell”, never guessed.
          </p>
        </div>
        <div>
          <p className="caps text-flag">What it does not show</p>
          <p className="mt-2">
            No model ran here, so it says nothing about how well the model picks the custody date or the charged sections. These are High Court and
            Supreme Court judgments, not district-court bail orders, and they are English only: Hindi text, Devanagari dates and scan noise are not
            tested. Labels mark that a span is a date, not which date matters.
          </p>
        </div>
      </div>
      <p className="mt-4 text-[0.85rem] text-ink-3">
        Reproduce: <code className="font-mono">pnpm eval:inlegalner</code> writes <code className="font-mono">eval/inlegalner/report.json</code> (seed {j.seed}); the full report is{" "}
        <code className="font-mono">eval/inlegalner/report.md</code>, and <code className="font-mono">scripts/build-inlegalner-summary.ts</code> feeds this section.
      </p>
    </section>
  );
}

export default function ResultsPage() {
  const r = facts.eval as unknown as Report | null;
  if (!r) return <p className="px-[var(--gutter)] py-24 font-mono">The evaluation report has not been generated yet.</p>;
  const h = r.halftime, x = r.regex, c = r.chatbot;
  const rep = (k: string) => (h.repeats[k] ? `${h.repeats[k]!.mean} ± ${h.repeats[k]!.sd}` : "–");

  return (
    <div className="mx-auto max-w-[var(--max)] px-[var(--gutter)] pt-10 pb-16">
      <p className="caps text-ink-3">Proof · {r.set}</p>
      <h1 className="mt-3 max-w-4xl font-sans text-[length:var(--step-5)] leading-[0.88] font-[800] tracking-[-0.03em] [font-stretch:78%]">Measured, with the misses.</h1>

      {r.constructed && (
        <div className="mt-8 max-w-3xl border-l-4 border-flag bg-flag-bg p-4 text-[0.95rem]">
          <strong>Read this first.</strong> These {r.n} orders ({r.languages.hi} Hindi, {r.languages.en} English) were written for testing, in the style of
          Uttar Pradesh district-court bail orders, so the right answer for each is known by construction. They are not real cases. About a quarter
          carry a deliberate trap. The same script runs on real held-out Hindi orders (IL-TUR BAIL) once that dataset is available; this page
          will then show those numbers instead.
        </div>
      )}

      <div className="mt-12 grid gap-4 lg:grid-cols-3">
        <BarSet
          title="Says “past the line” when it isn't"
          note={`Out of ${h.notPastGold} people who are not past the line.`}
          lowerIsBetter
          rows={[
            { name: "HalfTime", value: h.unsafePastRate, us: true },
            { name: "Regex + same engine", value: x.unsafePastRate },
            { name: "Plain chatbot", value: c.unsafePastRate }
          ]}
        />
        <BarSet
          title="Calls a 479(2) case simply eligible"
          note="Past the line, but more than one offence or other cases."
          lowerIsBetter
          rows={[
            { name: "HalfTime", value: h.flagBlindRate, us: true },
            { name: "Regex + same engine", value: x.flagBlindRate },
            { name: "Plain chatbot", value: c.flagBlindRate }
          ]}
        />
        <BarSet
          title="Right verdict"
          note="All five verdicts; the chatbot is scored on its yes/no."
          rows={[
            { name: "HalfTime", value: h.verdictAcc, us: true },
            { name: "Regex + same engine", value: x.verdictAcc },
            { name: "Plain chatbot (yes/no)", value: c.yesNoAcc }
          ]}
        />
      </div>

      <section aria-labelledby="table-h" className="mt-16">
        <h2 id="table-h" className="font-sans text-[length:var(--step-3)] font-[750] [font-stretch:88%]">Every number</h2>
        <div tabIndex={0} role="region" aria-label="All measures table" className="mt-4 overflow-x-auto border border-ink">
          <table className="w-full min-w-[720px] border-collapse text-[0.9rem]">
            <thead className="bg-ink text-left text-paper">
              <tr>
                <th scope="col" className="p-3 font-[600]">Measure</th>
                <th scope="col" className="p-3 font-[600]">HalfTime</th>
                <th scope="col" className="p-3 font-[600]">HalfTime, {r.repeats} runs (mean ± sd)</th>
                <th scope="col" className="p-3 font-[600]">Regex + same engine</th>
                <th scope="col" className="p-3 font-[600]">Plain chatbot</th>
              </tr>
            </thead>
            <tbody className="font-mono tabular">
              {[
                ["Unsafe “past the line”", `${h.unsafePastRate}% (${h.unsafePastCount}/${h.notPastGold})`, rep("unsafePastRate"), `${x.unsafePastRate}% (${x.unsafePastCount}/${x.notPastGold})`, `${c.unsafePastRate}% (${c.unsafePastCount}/${c.notPastGold})`],
                ["Verdict accuracy", `${h.verdictAcc}%`, rep("verdictAcc"), `${x.verdictAcc}%`, `yes/no ${c.yesNoAcc}%`],
                ["Misses the 479(2) flag", `${h.flagBlindRate}%`, rep("flagBlindRate"), `${x.flagBlindRate}%`, `${c.flagBlindRate}%`],
                ["Misses someone past the line", `${h.missedPastRate}%`, rep("missedPastRate"), `${x.missedPastRate}%`, "–"],
                ["Charged sections, F1", `${h.sectionsF1}%`, rep("sectionsF1"), `${x.sectionsF1}%`, "–"],
                ["Sections precision / recall", `${h.sectionsPrecision}% / ${h.sectionsRecall}%`, "", `${x.sectionsPrecision}% / ${x.sectionsRecall}%`, "–"],
                ["Custody date exact", `${h.custodyExact}%`, rep("custodyExact"), `${x.custodyExact}%`, "–"],
                ["Custody date within 7 days", `${h.custodyWithin7}%`, rep("custodyWithin7"), `${x.custodyWithin7}%`, "–"],
                ["First-time status", `${h.firstTimeAcc}%`, rep("firstTimeAcc"), `${x.firstTimeAcc}%`, "–"],
                ["Other cases pending", `${h.otherCasesAcc}%`, rep("otherCasesAcc"), `${x.otherCasesAcc}%`, "–"],
                ["Line date exact", `${h.lineDateAcc}%`, rep("lineDateAcc"), `${x.lineDateAcc}%`, `±7 days on past cases: ${c.lineDateWithin7OnPast}%`],
                ["Says “can't tell”", `${h.abstainRate}%`, rep("abstainRate"), `${x.abstainRate}%`, `hedges ${c.hedgeRate}%`],
                ["Says “can't tell” wrongly", `${h.falseAbstainRate}%`, rep("falseAbstainRate"), `${x.falseAbstainRate}%`, "–"],
                ["Cost per order", `$${h.costPerOrderUsd}`, "", "$0", `$${c.costPerOrderUsd}`],
                ["Latency p50 / p95 (uncached)", h.latencyMsP50 ? `${(h.latencyMsP50 / 1000).toFixed(1)} s / ${((h.latencyMsP95 ?? 0) / 1000).toFixed(1)} s` : "–", "", "instant", "–"]
              ].map((row) => (
                <tr key={row[0]} className="border-t border-[var(--rule)] odd:bg-paper-2/60">
                  <th scope="row" className="p-3 text-left font-sans font-[500]">{row[0]}</th>
                  {row.slice(1).map((v, i) => (
                    <td key={i} className="p-3">{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[0.85rem] text-ink-3">
          The verifier rejected {h.verifierRejections} model claims across run 1 (quotes not in the papers, or not containing the claimed date or section).
        </p>
      </section>

      <section aria-labelledby="traps-h" className="mt-16">
        <h2 id="traps-h" className="font-sans text-[length:var(--step-3)] font-[750] [font-stretch:88%]">Traps</h2>
        <div tabIndex={0} role="region" aria-label="Traps table" className="mt-4 overflow-x-auto border border-ink">
          <table className="w-full min-w-[620px] border-collapse text-[0.9rem]">
            <thead className="bg-paper-2 text-left">
              <tr>
                <th scope="col" className="p-3">Trap</th>
                <th scope="col" className="p-3">Orders</th>
                <th scope="col" className="p-3">HalfTime right</th>
                <th scope="col" className="p-3">Regex right</th>
                <th scope="col" className="p-3">Chatbot avoided a wrong “yes”</th>
              </tr>
            </thead>
            <tbody className="font-mono tabular">
              {r.traps.map((t) => (
                <tr key={t.trap} className="border-t border-[var(--rule)]">
                  <th scope="row" className="p-3 text-left font-sans font-[500]">{TRAP_NAMES[t.trap] ?? t.trap}</th>
                  <td className="p-3">{t.n}</td>
                  <td className="p-3">{t.halftime}/{t.n}</td>
                  <td className="p-3">{t.regex}/{t.n}</td>
                  <td className="p-3">{t.chatbotNotWrongYes}/{t.n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="misses-h" className="mt-16">
        <h2 id="misses-h" className="font-sans text-[length:var(--step-3)] font-[750] [font-stretch:88%]">Every HalfTime miss ({r.misses.length})</h2>
        <p className="mt-2 max-w-3xl text-ink-2">Shown in the same detail as the wins. “Unsafe” means it said past the line when the answer key says otherwise.</p>
        {r.misses.length === 0 ? (
          <p className="mt-4 font-mono">No misses in run 1.</p>
        ) : (
          <div tabIndex={0} role="region" aria-label="Misses table" className="mt-4 overflow-x-auto border border-ink">
            <table className="w-full min-w-[760px] border-collapse text-[0.88rem]">
              <thead className="bg-paper-2 text-left">
                <tr>
                  <th scope="col" className="p-3">Order</th>
                  <th scope="col" className="p-3">Answer key</th>
                  <th scope="col" className="p-3">HalfTime</th>
                  <th scope="col" className="p-3">Unsafe?</th>
                  <th scope="col" className="p-3">Why</th>
                </tr>
              </thead>
              <tbody>
                {r.misses.map((m) => (
                  <tr key={m.id} className={`border-t border-[var(--rule)] ${m.unsafe ? "bg-[#f6ddd6]" : ""}`}>
                    <td className="p-3 font-mono">{m.id} · {m.language}{m.traps.length ? ` · ${m.traps.join(", ")}` : ""}</td>
                    <td className="p-3 font-mono">{m.gold}</td>
                    <td className="p-3 font-mono">{m.got}</td>
                    <td className="p-3">{m.unsafe ? "yes" : "no"}</td>
                    <td className="p-3">{m.why}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <RealJudgments />

      <section aria-labelledby="method-h" className="mt-16 grid gap-8 md:grid-cols-12">
        <h2 id="method-h" className="font-sans text-[length:var(--step-3)] font-[750] [font-stretch:88%] md:col-span-4">Method</h2>
        <ul className="list-disc space-y-3 pl-5 font-serif text-[1.05rem] leading-relaxed md:col-span-8">
          <li>
            Three systems on the same {r.n} orders. <strong>HalfTime</strong>: {r.models.extract} extracts facts with quotes, code verifies every quote, a rules engine decides.{" "}
            <strong>Regex reader</strong>: keyword and date patterns feeding the same engine. <strong>Plain chatbot</strong>: the same model asked “Is the accused eligible for release under
            Section 479 of the BNSS? If yes, from what date?”; {r.models.judge} reads each answer into yes / no / doesn&apos;t commit.
          </li>
          <li>The answer key is the engine applied to the true facts written into each order, with “today” fixed at {r.today}.</li>
          <li>
            The extraction prompt was tuned only on the 12 sample-tray orders (clarifying “no criminal history” and “in custody since”), before this set was run.
            It was not changed after seeing these results.
          </li>
          <li>HalfTime ran {r.repeats} times (the model is not deterministic); the table shows run 1 and the mean ± sd.</li>
          <li>
            Reproduce: <code className="font-mono text-[0.9rem]">pnpm eval</code> rebuilds <code className="font-mono text-[0.9rem]">eval/report.json</code>, and{" "}
            <code className="font-mono text-[0.9rem]">pnpm facts</code> feeds this page. Run on {r.ranOn}.
          </li>
        </ul>
      </section>

      <p className="mt-16">
        <Link className="underline" href="/sweep">Run the sample sweep yourself</Link>
      </p>
    </div>
  );
}
