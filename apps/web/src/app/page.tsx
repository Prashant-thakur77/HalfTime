import Link from "next/link";
import { humanDate, parseIsoDate, sectionLabel } from "@halftime/law";
import { decide } from "@halftime/reader";
import { Hero } from "@/components/landing/Hero";
import { LedgerOfDays } from "@/components/landing/LedgerOfDays";
import { Stamp } from "@/components/Stamp";
import { VerdictTag } from "@/components/VerdictTag";
import { RUNS, SAMPLES } from "@/lib/cases";
import { facts, inr } from "@/lib/facts";
import { LANES, VERDICT_STYLE } from "@/lib/verdict";

const TODAY = new Date().toISOString().slice(0, 10);

function caseOf(id: string) {
  const s = SAMPLES.find((x) => x.id === id)!;
  const r = decide(s.text, RUNS[id]!.extraction, TODAY);
  const lines = s.text.split("\n").filter((l) => l.trim().length > 40);
  return { s, r, excerpt: lines.slice(0, 4).join(" ") };
}

interface EvalSummary {
  n: number;
  constructed: boolean;
  halftime: { unsafePastRate: number; verdictAcc: number; sectionsF1: number; custodyExact: number; flagBlindRate: number; unsafePastCount: number; notPastGold: number };
  regex: { unsafePastRate: number; verdictAcc: number; sectionsF1: number; custodyExact: number };
  chatbot: { unsafePastRate: number; flagBlindRate: number; yesNoAcc: number };
  misses: unknown[];
}

export default function Home() {
  const hero = caseOf("S01");
  const ledger = caseOf("S02");
  const vs = caseOf("S01");
  const ev = facts.eval as unknown as EvalSummary | null;
  const counts: Record<string, number> = { past: 0, notyet: 0, cant: 0, excluded: 0 };
  for (const s of SAMPLES) if (RUNS[s.id]) counts[VERDICT_STYLE[decide(s.text, RUNS[s.id]!.extraction, TODAY).evaluation.verdict].lane]!++;

  return (
    <>
      <Hero
        c={{
          id: hero.s.id,
          accused: hero.r.extraction.accused_name_masked,
          sections: hero.r.evaluation.sections.filter((x) => x.found).map(sectionLabel).join(" + "),
          custodyStart: hero.r.facts.input.custodyStart!,
          lineDate: hero.r.evaluation.lineDate!,
          excerpt: hero.excerpt
        }}
      />

      {/* The law already says go home */}
      <section aria-labelledby="law-h" className="mx-auto max-w-[var(--max)] px-[var(--gutter)] py-24">
        <div className="grid gap-10 md:grid-cols-12">
          <h2 id="law-h" className="font-sans text-[length:var(--step-4)] leading-[0.92] font-[780] tracking-[-0.02em] [font-stretch:82%] md:col-span-5">
            The law already says go home.
          </h2>
          <div className="space-y-5 font-serif text-[length:var(--step-1)] leading-snug md:col-span-6 md:col-start-7">
            <p>
              Under Section 479 of the BNSS, an undertrial who has spent <strong>half the maximum sentence</strong> for the offence in custody is
              to be released on bail. A first-time offender, after <strong>one-third</strong>.
            </p>
            <p>
              Section 479(3) puts the duty on the jail: the superintendent <em>must</em> apply to the court. Nobody has to ask.
            </p>
            <p className="text-ink-2">
              The jail&apos;s own register often doesn&apos;t say which sections still stand or when custody began. That is written in the court papers,
              in Hindi, in scans, across thousands of files.
            </p>
          </div>
        </div>

        <dl className="mt-16 grid gap-px border border-ink bg-ink md:grid-cols-3">
          {[
            { v: inr(facts.undertrials_2024.value), l: `undertrials in India's prisons, ${facts.undertrial_share_2024.value}% of all prisoners`, s: "ncrb" },
            { v: inr(facts.identified_479_2024.value), l: "people identified under Section 479 in all of 2024", s: "table74" },
            { v: inr(facts.applications_479_2024.value), l: "applications actually filed", s: "table74" }
          ].map((x) => (
            <div key={x.l} className="bg-paper p-6">
              <dt className="order-2 mt-2 text-[0.95rem] text-ink-2">{x.l}</dt>
              <dd className="font-mono text-[clamp(2.4rem,5vw,4.2rem)] leading-none tabular">{x.v}</dd>
              <a className="mt-3 block text-[0.75rem] text-ink-3 underline" href={facts.sources[x.s]!.url} rel="noopener noreferrer" target="_blank">
                {facts.sources[x.s]!.label}
              </a>
            </div>
          ))}
        </dl>
      </section>

      <LedgerOfDays
        c={{
          id: ledger.s.id,
          accused: ledger.r.extraction.accused_name_masked,
          section: ledger.r.evaluation.sections.filter((x) => x.found).map(sectionLabel).join(" + "),
          maxTermMonths: ledger.r.evaluation.maxTermMonths!,
          fraction: ledger.r.evaluation.fraction!,
          custodyStart: ledger.r.facts.input.custodyStart!,
          lineDate: ledger.r.evaluation.lineDate!,
          excerpt: ledger.excerpt
        }}
      />

      {/* The sweep */}
      <section aria-labelledby="sweep-h" className="bg-paper py-24">
        <div className="mx-auto max-w-[var(--max)] px-[var(--gutter)]">
          <div className="grid gap-6 md:grid-cols-12 md:items-end">
            <h2 id="sweep-h" className="font-sans text-[length:var(--step-4)] leading-[0.92] font-[780] tracking-[-0.02em] [font-stretch:82%] md:col-span-6">
              One sweep. Every person sorted by the law.
            </h2>
            <p className="font-serif text-[length:var(--step-1)] leading-snug text-ink-2 md:col-span-5 md:col-start-8">
              Give it a jail&apos;s papers. It reads each one and files the person into one of four drawers, with the reason written on the card.
            </p>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-4">
            {LANES.map((l, i) => (
              <Link
                key={l.id}
                href="/sweep"
                className="group register relative flex min-h-[220px] flex-col justify-between border border-ink bg-paper-2 p-5 transition-transform duration-[var(--ui)] hover:-translate-y-1"
                style={{ transitionDelay: `${i * 30}ms` }}
              >
                <span className="font-mono text-[clamp(3rem,6vw,5rem)] leading-none tabular">{String(counts[l.id]).padStart(2, "0")}</span>
                <span>
                  <span className="block font-sans text-[1.35rem] font-[700]">{l.id === "past" ? "Past the line" : l.id === "notyet" ? "Not yet" : l.id === "cant" ? "Can't tell" : "Outside 479"}</span>
                  <span className="text-[0.85rem] text-ink-2">{l.note}</span>
                </span>
              </Link>
            ))}
          </div>
          <p className="mt-4 text-[0.85rem] text-ink-3">Counts from the {SAMPLES.length} constructed sample orders, as of {humanDate(parseIsoDate(TODAY)!)}.</p>
          <Link href="/sweep" className="mt-8 inline-flex h-12 items-center border border-ink bg-ink px-5 text-paper hover:bg-stamp">
            <span className="caps">Run the sample sweep</span>
          </Link>
        </div>
      </section>

      {/* Chatbot vs HalfTime */}
      <section aria-labelledby="vs-h" className="on-ink bg-ink py-24 text-paper">
        <div className="mx-auto max-w-[var(--max)] px-[var(--gutter)]">
          <h2 id="vs-h" className="max-w-4xl font-sans text-[length:var(--step-4)] leading-[0.92] font-[780] tracking-[-0.02em] [font-stretch:82%]">
            Same papers. Same model. One of them shows its working.
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <div className="border border-paper/30 p-6">
              <p className="caps text-paper/60">A plain chatbot, asked “is he eligible under 479?”</p>
              <blockquote className="mt-4 line-clamp-[10] font-serif text-[1.05rem] leading-relaxed text-paper/90">{RUNS[vs.s.id]!.baseline?.text}</blockquote>
              <p className="mt-4 inline-block border border-paper/40 px-2 py-1 font-mono text-[0.8rem]">Says: eligible. Misses Sec 479(2).</p>
            </div>
            <div className="border border-paper bg-paper p-6 text-ink">
              <p className="caps text-ink-3">HalfTime, on the same order</p>
              <ol className="mt-4 space-y-1.5 font-mono text-[0.82rem]">
                {vs.r.evaluation.trace.slice(0, 9).map((t, i) => (
                  <li key={i} className={t.step === "flag" ? "text-flag" : t.step === "result" ? "font-[600]" : ""}>
                    {t.text}
                  </li>
                ))}
              </ol>
              <div className="mt-5 flex items-center gap-4">
                <VerdictTag verdict={vs.r.evaluation.verdict} />
                <Link href="/vs-chatbot" className="text-[0.9rem] underline">
                  Run it on any sample
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Proof */}
      <section aria-labelledby="proof-h" className="mx-auto max-w-[var(--max)] px-[var(--gutter)] py-24">
        <div className="grid gap-6 md:grid-cols-12">
          <h2 id="proof-h" className="font-sans text-[length:var(--step-4)] leading-[0.92] font-[780] tracking-[-0.02em] [font-stretch:82%] md:col-span-6">
            Measured, with the misses.
          </h2>
          <p className="font-serif text-[length:var(--step-1)] leading-snug text-ink-2 md:col-span-5 md:col-start-8">
            The number that matters most: how often it says someone is past the line when they are not. That error sends a lawyer chasing a
            wrong application; HalfTime would rather say “can&apos;t tell”.
          </p>
        </div>
        {ev ? (
          <>
            <div className="mt-12 grid gap-px border border-ink bg-ink md:grid-cols-3">
              {[
                { name: "HalfTime", unsafe: ev.halftime.unsafePastRate, acc: ev.halftime.verdictAcc, strong: true },
                { name: "Regex reader, same law engine", unsafe: ev.regex.unsafePastRate, acc: ev.regex.verdictAcc },
                { name: "Plain chatbot, same model", unsafe: ev.chatbot.unsafePastRate, acc: null }
              ].map((r) => (
                <div key={r.name} className={`p-6 ${r.strong ? "bg-ink text-paper" : "bg-paper"}`}>
                  <p className={`caps ${r.strong ? "text-paper/70" : "text-ink-3"}`}>{r.name}</p>
                  <p className="mt-4 font-mono text-[clamp(2.6rem,6vw,4.6rem)] leading-none tabular">{r.unsafe}%</p>
                  <p className={`mt-2 text-[0.9rem] ${r.strong ? "text-paper/80" : "text-ink-2"}`}>unsafe “past the line” calls</p>
                  {r.acc !== null && <p className="mt-4 font-mono text-[0.95rem]">{r.acc}% verdicts right</p>}
                </div>
              ))}
            </div>
            <p className="mt-4 max-w-3xl text-[0.85rem] text-ink-3">
              {ev.n} {ev.constructed ? "constructed orders (synthetic, ground truth known by construction; not real cases)" : "held-out real orders"}. The
              chatbot calls a Sec 479(2) case simply eligible {ev.chatbot.flagBlindRate}% of the time. {ev.misses.length} HalfTime misses are listed in full.{" "}
              <Link className="underline" href="/results">How it was measured</Link>
            </p>
          </>
        ) : (
          <p className="mt-10 font-mono">Evaluation report not generated yet.</p>
        )}
      </section>

      {/* How it works */}
      <section aria-labelledby="how-h" className="border-y border-ink bg-paper-2 py-24">
        <div className="mx-auto max-w-[var(--max)] px-[var(--gutter)]">
          <h2 id="how-h" className="max-w-3xl font-sans text-[length:var(--step-4)] leading-[0.92] font-[780] tracking-[-0.02em] [font-stretch:82%]">
            The model proposes. Code disposes.
          </h2>
          <ol className="mt-14 grid gap-px bg-ink md:grid-cols-4">
            {[
              { h: "Read", p: "Hindi or English, typed or scanned. Text-layer PDFs are read in the browser; scanned pages are transcribed by Claude." },
              { h: "Quote", p: "Claude pulls out the charged sections, the custody date, first-time status and other cases. Each with the exact sentence it came from." },
              { h: "Check", p: "Code looks for every quote in the papers. A quote that isn't there, or doesn't contain the date or section claimed, is thrown out." },
              { h: "Apply", p: "A tested rules engine applies Section 479 to the checked facts and writes out every step. Then it drafts the 479(3) application for a lawyer." }
            ].map((s, i) => (
              <li key={s.h} className="bg-paper p-6">
                <span className="font-mono text-[0.8rem] text-ink-3">Step {i + 1}</span>
                <h3 className="mt-2 font-sans text-[length:var(--step-2)] font-[750] [font-stretch:88%]">{s.h}</h3>
                <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-2">{s.p}</p>
              </li>
            ))}
          </ol>
          <p className="mt-6 max-w-3xl text-[0.95rem] text-ink-2">
            The model never decides who is eligible. If it is wrong about a fact, the quote check usually catches it; if it is missing a fact, the case
            goes to “can&apos;t tell” for a person to look at.
          </p>
        </div>
      </section>

      {/* Limits */}
      <section aria-labelledby="limits-h" className="mx-auto max-w-[var(--max)] px-[var(--gutter)] py-24">
        <div className="grid gap-10 md:grid-cols-12">
          <h2 id="limits-h" className="font-sans text-[length:var(--step-3)] leading-none font-[750] [font-stretch:88%] md:col-span-4">
            What it can&apos;t do
          </h2>
          <ul className="space-y-4 font-serif text-[1.1rem] leading-snug md:col-span-7 md:col-start-6">
            <li>It doesn&apos;t release anyone. It finds people and drafts paperwork; a court decides.</li>
            <li>It reads only what the papers say. Days lost to adjournments sought by the accused must be entered by a person.</li>
            <li>Sec 479(2) is read differently by different courts. Multi-offence cases are flagged for a lawyer, never decided.</li>
            <li>State excise laws, the Gangsters Act and some special-act limbs are marked “can&apos;t tell” until a lawyer enters the maximum.</li>
            <li>The proof on this site uses constructed orders. The real-order evaluation runs as soon as the held-out dataset is available.</li>
          </ul>
        </div>
        <div className="mt-20 flex flex-col items-start gap-6 border-t border-ink pt-12 md:flex-row md:items-center md:justify-between">
          <p className="max-w-2xl font-sans text-[length:var(--step-3)] leading-tight font-[700] [font-stretch:88%]">
            Run a sweep on the sample jail, or bring your own papers.
          </p>
          <div className="flex items-center gap-6">
            <Stamp className="hidden rotate-[-6deg] text-[0.95rem] md:inline-flex" />
            <Link href="/sweep" className="flex h-14 items-center border border-ink bg-ink px-6 text-paper hover:bg-stamp">
              <span className="caps">Run a jail sweep</span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
