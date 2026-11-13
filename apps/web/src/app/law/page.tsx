import type { Metadata } from "next";
import Link from "next/link";
import { facts } from "@/lib/facts";

export const metadata: Metadata = {
  title: "Section 479, plainly",
  description: "Section 479 BNSS and old Section 436A CrPC in plain English: the half line, the one-third line, who is excluded, the jail's duty, and the 479(2) question."
};

const READINGS = [
  {
    name: "Wide reading",
    who: "Karnataka High Court, K. Ramakrishna v. Assistant Director, Directorate of Enforcement",
    url: "https://www.verdictum.in/court-updates/high-courts/karnataka-mr-k-ramakrishna-vs-the-assistant-director-no-bail-under-section-479-bnss-in-multiple-cases-1559297",
    text: "Sub-sections (1) and (2) are read together. Where more than one case is registered, or the offences are different, the person cannot claim release under Section 479, including the one-third benefit."
  },
  {
    name: "Narrow reading",
    who: "Commentary arguing for a narrower bar (LiveLaw; IJLMH)",
    url: "https://livelaw.in/articles/when-exceptions-swallow-rule-problem-section-479-bnss-307288",
    text: "Treating every multi-section charge sheet as “more than one offence” would swallow the rule, since most charge sheets list several sections for one act. The bar should reach separate offences and separate cases, not every section in one FIR."
  }
];

function H({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="scroll-mt-24 font-sans text-[length:var(--step-3)] leading-none font-[750] [font-stretch:88%]">
      {children}
    </h2>
  );
}

export default function LawPage() {
  return (
    <article className="mx-auto max-w-[var(--max)] px-[var(--gutter)] pt-10 pb-16">
      <p className="caps text-ink-3">Bharatiya Nagarik Suraksha Sanhita, 2023 · Section 479</p>
      <h1 className="mt-3 max-w-4xl font-sans text-[length:var(--step-5)] leading-[0.88] font-[800] tracking-[-0.03em] [font-stretch:78%]">Section 479, plainly.</h1>

      <div className="mt-14 grid gap-14 md:grid-cols-12">
        <nav aria-label="On this page" className="md:col-span-3">
          <ol className="sticky top-20 space-y-2 font-serif text-[1.05rem]">
            {[
              ["half", "The half line"],
              ["third", "One-third for first-timers"],
              ["out", "Who is outside it"],
              ["duty", "The jail's duty"],
              ["conflict", "The 479(2) question"],
              ["old", "Cases before July 2024"],
              ["engine", "How HalfTime applies it"]
            ].map(([id, t]) => (
              <li key={id}>
                <a className="underline decoration-carbon-soft underline-offset-4 hover:bg-mark" href={`#${id}`}>
                  {t}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="space-y-16 font-serif text-[1.12rem] leading-relaxed md:col-span-8 md:col-start-5">
          <section aria-labelledby="half">
            <H id="half">The half line</H>
            <p className="mt-4">
              Someone held in custody during investigation, inquiry or trial, for an offence that is not punishable with death or life imprisonment,
              who has been detained for up to <strong>one-half of the maximum term</strong> of imprisonment for that offence, shall be released by
              the court on bail. The court may, after hearing the prosecutor and for reasons in writing, order continued detention.
            </p>
            <p className="mt-3">No one can be held during investigation, inquiry or trial for longer than the maximum term itself.</p>
            <p className="mt-3 text-ink-2">Days of delay caused by the accused are not counted.</p>
          </section>

          <section aria-labelledby="third">
            <H id="third">One-third for first-time offenders</H>
            <p className="mt-4">
              If the person has never been convicted of any offence before, the line is <strong>one-third</strong> of the maximum term, and the
              court shall release them on bond.
            </p>
            <p className="mt-3 text-ink-2">
              When the papers don&apos;t say whether the person is a first-time offender, HalfTime uses the half line (the safe one) and shows the
              one-third date as “if first-time is confirmed”.
            </p>
          </section>

          <section aria-labelledby="out">
            <H id="out">Who is outside it</H>
            <p className="mt-4">Any offence that can be punished with death or imprisonment for life. One such charge takes the whole case outside Section 479.</p>
          </section>

          <section aria-labelledby="duty">
            <H id="duty">The jail&apos;s duty: Section 479(3)</H>
            <blockquote className="mt-4 border-l-4 border-stamp pl-5">
              The Superintendent of jail, where the accused person is detained, on completion of one-half or one-third of the period mentioned in
              sub-section (1), as the case may be, shall forthwith make an application in writing to the Court to proceed under sub-section (1) for
              the release of such person on bail.
            </blockquote>
            <p className="mt-3">
              That is why HalfTime never says “eligible” on its own. It says <em>past the line: the jail must apply</em>, and drafts that application for
              a legal-aid lawyer to check and sign.
            </p>
          </section>

          <section aria-labelledby="conflict">
            <H id="conflict">The 479(2) question</H>
            <p className="mt-4">
              Section 479(2) says that where an investigation, inquiry or trial in <strong>more than one offence or in multiple cases</strong> is pending,
              the person shall not be released on bail by the court under sub-section (1). How wide that bar is, is contested:
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {READINGS.map((r) => (
                <div key={r.name} className="border border-ink bg-paper-2 p-5 font-sans text-[0.98rem]">
                  <p className="caps text-flag">{r.name}</p>
                  <p className="mt-2 leading-relaxed">{r.text}</p>
                  <a className="mt-3 block text-[0.82rem] text-carbon underline" href={r.url} rel="noopener noreferrer" target="_blank">
                    {r.who}
                  </a>
                </div>
              ))}
            </div>
            <p className="mt-4">
              HalfTime takes no side. Any case past the line with more than one charged offence, or with other cases pending or not ruled out by the
              papers, goes to <strong>Past the line · flagged</strong>, so a lawyer decides before anything is filed.
            </p>
          </section>

          <section aria-labelledby="old">
            <H id="old">Cases registered before 1 July 2024</H>
            <p className="mt-4">
              The old law, Section 436A of the CrPC, set only the half line, with no one-third benefit. By its order of 23 August 2024, the Supreme Court
              directed that Section 479 applies to undertrials in cases registered before the BNSS came into force too. HalfTime applies Section 479 and
              shows the old 436A date alongside for those cases.{" "}
              <a className="text-[0.9rem] text-carbon underline" href={facts.sources.scOrder!.url} rel="noopener noreferrer" target="_blank">
                Report of the order
              </a>
            </p>
          </section>

          <section aria-labelledby="engine">
            <H id="engine">How HalfTime applies it</H>
            <ol className="mt-4 list-decimal space-y-2 pl-6">
              <li>Every charged section is looked up in tables built from the bare acts (IPC, BNS and common special acts), each row citing its source.</li>
              <li>Any life or death offence: outside 479. A section whose maximum can&apos;t be known from the papers: can&apos;t tell.</li>
              <li>The longest maximum among the charges sets the line. Half, or one-third if the papers say first-time; calendar-exact, rounding later, never earlier.</li>
              <li>Accused delay entered by a person pushes the line back.</li>
              <li>Past the line with one offence and no other cases: the jail must apply. Otherwise: flagged for a lawyer.</li>
            </ol>
            <p className="mt-4">
              <Link className="underline" href="/results">
                The engine has over a thousand tests and full branch coverage; the proof page explains how the reading is measured.
              </Link>
            </p>
            <p className="mt-6 text-[0.95rem] text-ink-3">
              Source text:{" "}
              <a className="underline" href={facts.sources.bnss479!.url} rel="noopener noreferrer" target="_blank">
                {facts.sources.bnss479!.label}
              </a>
              . This page is a plain summary, not legal advice.
            </p>
          </section>
        </div>
      </div>
    </article>
  );
}
