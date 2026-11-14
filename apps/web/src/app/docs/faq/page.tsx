import type { Metadata } from "next";
import { ACT_NAMES, type ActCode } from "@halftime/law";
import { A, C, DocPage, P, Section, UL } from "@/components/docs/ui";

export const metadata: Metadata = {
  title: "FAQ and glossary",
  description: "Common questions about HalfTime, the terms it uses (undertrial, BNSS, Section 479, 479(2), 479(3), custody start, DLSA, UTRC, span verifier, MCP), and what it cannot do."
};

const TOC = [
  { id: "faq", title: "Questions" },
  { id: "glossary", title: "Glossary" },
  { id: "cannot", title: "What it can't do" }
];

const ACTS = (Object.keys(ACT_NAMES) as ActCode[]).filter((a) => a !== "OTHER").map((a) => ACT_NAMES[a]);

const FAQ: { q: string; a: React.ReactNode }[] = [
  {
    q: "Does HalfTime decide who is released?",
    a: (
      <>
        No. It finds people whose time in custody has crossed the Section 479 line and drafts paperwork. The jail superintendent applies, a
        lawyer reviews and signs, and a court decides.
      </>
    )
  },
  {
    q: "Why does it say “past the line” and not “eligible”?",
    a: (
      <>
        Because the law puts a duty on the jail (479(3)) and leaves room for the court, and because 479(2) is read differently by different courts.
        “Past the line” says what the arithmetic shows; “flagged” says a lawyer has to weigh 479(2) first. See <A href="/docs/how-it-works#verdicts">the five verdicts</A>.
      </>
    )
  },
  {
    q: "Do I need an API key?",
    a: (
      <>
        Not to use the sample tray, the case pages, the drafts, the playground or the MCP server. Reading new papers on the site needs your own
        Anthropic key, which goes from your browser straight to Anthropic.
      </>
    )
  },
  {
    q: "Does HalfTime see my key or my papers?",
    a: (
      <>
        No. The hosted server holds no key and receives neither. The page is only allowed to connect to itself and to <C>api.anthropic.com</C>.
        See <A href="/docs/security">Security and privacy</A>.
      </>
    )
  },
  {
    q: "What can it read?",
    a: (
      <>
        Bail orders, remand orders and charge sheets in Hindi or English, as text, text-layer PDFs or scans (scans are transcribed by Claude with your
        key). Devanagari digits, Hindi month names and Hindi section suffixes are understood.
      </>
    )
  },
  {
    q: "Which laws are in the tables?",
    a: (
      <>
        {ACTS.join("; ")}. Sections outside the tables lead to “can&apos;t tell”, never to a guess. See <A href="/docs/law#tables">the statute tables</A>.
      </>
    )
  },
  {
    q: "What if the papers don't give the custody date?",
    a: <>The verdict is “can&apos;t tell”, with the custody date listed as missing. The docket agent and the jail pack produce a request for a custody certificate.</>
  },
  {
    q: "What about cases registered before 1 July 2024?",
    a: (
      <>
        Section 479 applies to them too, following the Supreme Court&apos;s order of 23 August 2024. HalfTime shows the old Section 436A CrPC date
        alongside. See <A href="/docs/law#pre-july">Cases before July 2024</A>.
      </>
    )
  },
  {
    q: "Are the sample orders real?",
    a: <>No. They are constructed for demonstration, in the style of Uttar Pradesh district-court bail orders, and the names are masked.</>
  },
  {
    q: "How accurate is it?",
    a: (
      <>
        The full results, including every miss, are on <A href="/docs/evaluation">Evaluation</A> and <A href="/results">/results</A>. They come from
        constructed orders; read the limits there before relying on them.
      </>
    )
  },
  {
    q: "Can I use the law engine without a model?",
    a: (
      <>
        Yes: on <A href="/playground">/playground</A>, through <A href="/docs/api#rules">POST /api/rules</A>, with the MCP tool{" "}
        <C>apply_section_479</C>, or by importing <C>evaluate</C> from <C>packages/law</C>.
      </>
    )
  },
  {
    q: "Can I run my own copy?",
    a: (
      <>
        Yes. The code is MIT-licensed. See <A href="/docs/self-host">Self-hosting</A>.
      </>
    )
  }
];

const GLOSSARY: [string, React.ReactNode][] = [
  ["Undertrial", "A person held in custody while the investigation, inquiry or trial is still going on: not convicted."],
  ["BNSS", "The Bharatiya Nagarik Suraksha Sanhita, 2023: India's code of criminal procedure since 1 July 2024, replacing the CrPC."],
  ["BNS", "The Bharatiya Nyaya Sanhita, 2023, which replaced the Indian Penal Code (IPC) for offences from 1 July 2024."],
  ["Section 479", "The BNSS section on the maximum period an undertrial may be detained: release on bail after half the maximum term (one-third for a first-time offender), never beyond the full maximum. It replaced Section 436A of the CrPC."],
  ["479(2)", "Where an investigation, inquiry or trial in more than one offence or in multiple cases is pending, the court shall not release the person under 479(1). HalfTime flags these cases for a lawyer."],
  ["479(3)", "The jail superintendent's duty to apply to the court as soon as the half or one-third mark is reached. HalfTime drafts this application."],
  ["The line", "HalfTime's word for the date on which half (or one-third) of the maximum term has been served."],
  ["Custody start", "The date the person was arrested, remanded or surrendered in this case. Not the FIR date and not the order date."],
  ["First-time offender", "A person never convicted of any offence before. The one-third line applies only when the papers say so."],
  ["Accused delay", "Days of delay in proceedings caused by the accused; the law does not count them. A person enters them; the model never does."],
  ["DLSA", "District Legal Services Authority: the body that provides free legal aid in a district."],
  ["UTRC", "Under Trial Review Committee: a district committee that periodically reviews the cases of undertrials."],
  ["Span verifier", <>HalfTime&apos;s code that checks every quote the model gives against the papers (<C>verify.ts</C>). A fact whose quote is not found becomes unknown.</>],
  ["Rule trace", "The engine's step-by-step record of how it reached a verdict, each step with the statute it rests on."],
  ["MCP", "Model Context Protocol: an open protocol through which Claude and other clients use a server's tools. HalfTime's tools are available over it."],
  ["Constructed order", "An order written for testing, with known true facts. Not a real case."]
];

export default function FaqDocs() {
  return (
    <DocPage
      href="/docs/faq"
      kicker="Operate"
      title="FAQ and glossary."
      lead={<p>Short answers, the words the site uses, and the limits worth knowing before relying on any result.</p>}
      toc={TOC}
    >
      <Section id="faq" title="Questions">
        <div className="max-w-[46rem] divide-y divide-[var(--rule)] border-y border-ink">
          {FAQ.map((f) => (
            <details key={f.q} className="group py-1">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 py-2 font-sans text-[1.02rem] font-[650] hover:bg-mark [&::-webkit-details-marker]:hidden">
                {f.q}
                <span aria-hidden className="font-mono text-ink-3 transition-transform duration-[var(--ui)] group-open:rotate-45">
                  +
                </span>
              </summary>
              <div className="pb-3 font-serif text-[1.04rem] leading-relaxed text-ink-2">{f.a}</div>
            </details>
          ))}
        </div>
      </Section>

      <Section id="glossary" title="Glossary">
        <dl className="max-w-[52rem] divide-y divide-[var(--rule)] border-y border-ink">
          {GLOSSARY.map(([t, d]) => (
            <div key={t} className="grid gap-1 py-3 sm:grid-cols-[11rem_1fr] sm:gap-4">
              <dt className="font-sans font-[700]">{t}</dt>
              <dd className="font-serif text-[1.02rem] leading-relaxed text-ink-2">{d}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section id="cannot" title="What it can't do">
        <UL>
          <li>It does not release anyone. It finds people and drafts paperwork; a court decides and a lawyer signs.</li>
          <li>It knows only what the papers say. Days of delay caused by the accused must be entered by a person.</li>
          <li>It does not decide 479(2). Multi-offence and other-case situations are flagged, never decided.</li>
          <li>
            State excise laws, the UP Gangsters Act and some special-act limbs need a lawyer to enter the maximum term; NDPS offences need the
            quantity class from the papers.
          </li>
          <li>It does not check the jail&apos;s own records. A missing custody date or criminal history has to come from them.</li>
          <li>
            The headline evaluation uses constructed orders. The real-judgment benchmark covers the deterministic parts only; the end-to-end run on
            real Hindi bail orders is waiting on dataset access.
          </li>
          <li>The statute tables are written from the bare acts and should be reviewed by counsel before use in a real jail.</li>
        </UL>
        <P muted>HalfTime is a screening aid, not legal advice. Every output is a draft for a qualified lawyer to check against the full court record.</P>
      </Section>
    </DocPage>
  );
}
