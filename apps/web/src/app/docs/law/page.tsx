import type { Metadata } from "next";
import {
  ACT_NAMES,
  ALL_ROWS,
  BNSS_START,
  IPC_TO_BNS,
  SC_ORDER_DATE,
  addFractionOfMonths,
  describeMonths,
  evaluate,
  humanDate,
  parseIsoDate,
  resolveSection,
  toIso,
  type ActCode,
  type CaseInput
} from "@halftime/law";
import { decide } from "@halftime/reader";
import { LineTimeline } from "@/components/docs/diagrams";
import { A, C, DocPage, Figure, H3, Note, P, Section, Stats, Table, UL } from "@/components/docs/ui";
import { RUNS, SAMPLES } from "@/lib/cases";
import { EXAMPLE_TODAY } from "@/lib/docs/live";

export const metadata: Metadata = {
  title: "How Section 479 is computed",
  description:
    "How HalfTime's engine applies Section 479 BNSS: fractions, calendar rounding, unknown first-time status, accused delay, pre-July-2024 cases, the 479(2) flag, exclusions and the statute tables, with a worked example computed by the engine."
};

const TOC = [
  { id: "rule", title: "The rule in one paragraph" },
  { id: "order", title: "The order of the steps" },
  { id: "rounding", title: "Fractions and rounding" },
  { id: "first-time", title: "First-time status unknown" },
  { id: "delay", title: "Delay caused by the accused" },
  { id: "pre-july", title: "Cases before July 2024" },
  { id: "flags", title: "The 479(2) flag and other flags" },
  { id: "exclusions", title: "Exclusions and can't tell" },
  { id: "tables", title: "The statute tables" },
  { id: "worked", title: "Worked example: S01" }
];

const FIELD: Record<string, string> = {
  section: "Charged section",
  custody_start: "Custody began",
  first_time_offender: "First-time offender",
  other_pending_cases: "Other cases pending",
  registered_on: "Case registered",
  ndps_quantity: "NDPS quantity"
};
/** The verifier's span label without its field prefix: "custody from 2023-03-14" → "2023-03-14". */
const factValue = (label: string) => label.replace(/^(custody from|registered)\s+/, "").replace(/^[^:]*:\s*/, "");

const d = (iso: string | null) => (iso ? humanDate(parseIsoDate(iso)!) : "—");

export default function LawDocs() {
  const today = EXAMPLE_TODAY;

  // The worked example: sample S01, read by Claude once, verified and decided by the same code the site runs.
  const s01 = SAMPLES.find((s) => s.id === "S01")!;
  const r = decide(s01.text, RUNS.S01!.extraction, today);
  const e = r.evaluation;
  const input = r.facts.input;
  const custody = input.custodyStart!;
  const fullTerm = toIso(addFractionOfMonths(parseIsoDate(custody)!, e.maxTermMonths!, 1, 1));
  const ftUnknown = evaluate({ ...input, firstTimeOffender: "unknown" }, today);
  const withDelay = evaluate({ ...input, accusedDelayDays: 45 }, today);

  // Rounding: half of a 3-month maximum, from the last day of January 2024.
  const roundInput: CaseInput = { sections: [{ act: "IPC", section: "186" }], custodyStart: "2024-01-31", firstTimeOffender: "false", otherPendingCases: "false", registeredOn: "2024-01-30" };
  const round = evaluate(roundInput, today);
  const roundRow = resolveSection({ act: "IPC", section: "186" });

  // Exclusion and can't-tell examples, from the engine.
  const excluded = evaluate({ sections: [{ act: "IPC", section: "379" }, { act: "IPC", section: "307" }], custodyStart: "2024-01-10", firstTimeOffender: "true", otherPendingCases: "false" }, today);
  const ndps = evaluate({ sections: [{ act: "NDPS", section: "20" }], custodyStart: "2024-01-10", firstTimeOffender: "true", otherPendingCases: "false" }, today);
  const ndpsMonths = (["small", "intermediate", "commercial"] as const).map((q) => [q, resolveSection({ act: "NDPS", section: "20", quantity: q }).punishment?.months ?? null] as const);

  const byAct = new Map<ActCode, number>();
  for (const row of ALL_ROWS) byAct.set(row.act, (byAct.get(row.act) ?? 0) + 1);
  const kinds = new Map<string, number>();
  for (const row of ALL_ROWS) kinds.set(row.punishment.kind, (kinds.get(row.punishment.kind) ?? 0) + 1);

  return (
    <DocPage
      href="/docs/law"
      kicker="How it works · packages/law"
      title="How Section 479 is computed."
      lead={
        <p>
          The engine is one pure function, <C>evaluate(input, today)</C>. It never reads the papers and never calls a model. Every date and number
          on this page was computed by that function when the page was built, as of {d(today)}.
        </p>
      }
      toc={TOC}
    >
      <Section id="rule" title="The rule in one paragraph">
        <P>
          An undertrial held for an offence not punishable with death or life imprisonment is to be released on bail once detained for half the
          maximum term for that offence, or one-third if they have never been convicted of any offence (the first proviso to 479(1)). No one may be
          held for longer than the maximum term itself (second proviso). Days of delay caused by the accused are not counted (Explanation). The
          jail superintendent must apply to the court when the line is crossed (479(3)). Where an investigation, inquiry or trial in more than one
          offence or in multiple cases is pending, the court shall not release the person under 479(1) (479(2)). Plain-language summary:{" "}
          <A href="/law">/law</A>.
        </P>
      </Section>

      <Section id="order" title="The order of the steps">
        <Table
          label="Engine steps"
          head={["Step", "What the engine does", "Trace label"]}
          minWidth={640}
          mono={[2]}
          rows={[
            ["1", "Splits compound references (379/411, 3/25, 302 r/w 34), reads each section in a canonical form (Devanagari digits and letters, hyphens, sub-clauses), and looks it up in the tables.", "section"],
            ["2", "Decides the provision: Section 479, with the pre-July-2024 note where it applies.", "provision"],
            ["3", "If any section allows death or life: outside 479. Stops here.", "excluded"],
            ["4", "Finds the maximum term: the longest among the charged sections, or a maximum a lawyer entered. Anything unknown is listed as missing.", "max_term"],
            ["5", "Needs a custody start date on or before today. Without it, or with any missing fact: can't tell. Stops here.", "missing"],
            ["6", "Picks the fraction, adds it to the custody date, and adds any accused delay.", "fraction · custody · delay · line"],
            ["7", "Compares with today. Not yet: days to go. Past: days past, then the flags.", "today · flag · result"]
          ]}
        />
      </Section>

      <Section id="rounding" title="Fractions and rounding">
        <P>
          Terms are held in whole months. The line is the custody date plus one-half or one-third of the maximum, done on the calendar, not by
          counting 30-day months (<C>addFractionOfMonths</C> in <C>packages/law/src/dates.ts</C>):
        </P>
        <UL>
          <li>Whole months are added with month arithmetic: 12 March plus 18 months is 12 September. A month end lands on the last day of a shorter month.</li>
          <li>
            A leftover part-month becomes days of the month that follows, <strong>rounded up</strong>. So the line can only move later, never
            earlier, and the engine never calls someone past the line a day early.
          </li>
        </UL>
        <Note title="Example, computed by the engine">
          {roundRow.title} (<C>IPC 186</C>) has a maximum of {describeMonths(roundRow.punishment!.months!)}; half is{" "}
          {describeMonths(roundRow.punishment!.months! / 2)}. From custody on {d(roundInput.custodyStart)}, one whole month lands on the last day of
          February, and the half-month left over becomes days of the next month, rounded up. Line: <strong>{d(round.lineDate)}</strong>.
        </Note>
      </Section>

      <Section id="first-time" title="First-time status unknown">
        <P>
          The one-third line applies only when the papers say the person has no previous conviction or criminal history. When they say nothing,
          the engine uses the half line, which is the safe one, and also returns the one-third date as <C>firstTimeLineDate</C>, shown on screen as
          “if first-time is confirmed”. If today is already past that earlier line, a <C>NOT_YET</C> result carries a flag saying so, and the
          docket agent may request a criminal-history report.
        </P>
        <P muted>
          In the worked example below, if the papers had said nothing about S01&apos;s history, the line would be {d(ftUnknown.lineDate)} (half)
          instead of {d(e.lineDate)}, with {d(ftUnknown.firstTimeLineDate)} shown as the line if first-time status is confirmed.
        </P>
      </Section>

      <Section id="delay" title="Delay caused by the accused">
        <P>
          The papers rarely state this, so the model is never asked for it. A person enters it on the case page (or as <C>accusedDelayDays</C> in
          the API, <C>accused_delay_days</C> in MCP). The engine subtracts those days from the days detained and pushes every line date back by the
          same number of days. It can only make the line later.
        </P>
        <P muted>
          S01 with 45 days of accused delay: line {d(withDelay.lineDate)} instead of {d(e.lineDate)}; {withDelay.daysDetained} days counted as
          detained instead of {e.daysDetained}.
        </P>
      </Section>

      <Section id="pre-july" title="Cases registered before July 2024">
        <P>
          The BNSS came into force on {d(BNSS_START)}. The old law, Section 436A of the CrPC, set only the half line, with no one-third benefit.
          By its order of {d(SC_ORDER_DATE)} in W.P.(C) 406/2013, the Supreme Court directed that Section 479 applies to undertrials in cases
          registered before that date too. So the engine applies Section 479 to every case, and for older cases it also returns the old 436A date
          (<C>oldLawLineDate</C>, the half line) for comparison.
        </P>
        <P>
          A case counts as older when its registration date is before {d(BNSS_START)}. When the registration date is not known, a charge under the
          IPC (which the BNSS replaced) is taken as a sign of an older case. The provision is returned as <C>BNSS_479_PRE_JULY_2024</C> or{" "}
          <C>BNSS_479</C>.
        </P>
      </Section>

      <Section id="flags" title="The 479(2) flag and other flags">
        <P>Past the line becomes <strong>past the line · flagged</strong> when any of these hold:</P>
        <UL>
          <li>
            More than one offence is charged. Sections that are not offences on their own (common intention, definitions, prohibitions read with a
            penal section, aggravations) are not counted.
          </li>
          <li>The papers say other cases are pending.</li>
          <li>The papers don&apos;t say whether other cases are pending.</li>
        </UL>
        <P>
          A lawyer decides how 479(2) applies before anything is filed; the draft carries a note saying so. Two more flags are added where they
          apply: detention has reached the full maximum term (the second proviso bars any further detention), and a charged section has been
          struck down and cannot found a charge.
        </P>
      </Section>

      <Section id="exclusions" title="Exclusions and can't tell">
        <P>
          <strong>Outside 479.</strong> One section that allows death or life imprisonment takes the whole case outside Section 479, whatever
          else is charged. For example IPC 379 with IPC 307: <C>{excluded.verdict}</C>. This check runs before anything else, so it holds even
          when the custody date is missing.
        </P>
        <P>
          <strong>Can&apos;t tell.</strong> The engine refuses to guess. It returns <C>CANT_TELL</C> with a list of what is missing when there is
          no valid custody date (or one in the future); when a section is not in the tables; when the maximum depends on details the section
          number doesn&apos;t give (state excise laws, the UP Gangsters Act, some limbs of special acts); and for NDPS offences when the quantity
          class isn&apos;t in the papers. NDPS s.20 with no quantity:{" "}
          <C>{ndps.verdict}</C>, missing “{ndps.missing.join("; ")}”. With a quantity class the term is known:{" "}
          {ndpsMonths.map(([q, m], i) => (
            <span key={q}>
              {i > 0 ? ", " : ""}
              {q} {m ? describeMonths(m) : "—"}
            </span>
          ))}
          .
        </P>
        <P muted>
          A lawyer can enter the maximum by hand (<C>maxTermOverrideMonths</C>); the trace then says the maximum was entered by the reviewing
          lawyer.
        </P>
      </Section>

      <Section id="tables" title="The statute tables">
        <Stats
          items={[
            { value: String(ALL_ROWS.length), label: "Table rows", note: "IPC, BNS and special acts" },
            { value: String(byAct.get("IPC") ?? 0), label: "IPC sections" },
            { value: String(byAct.get("BNS") ?? 0), label: "BNS sections" },
            { value: String(IPC_TO_BNS.length), label: "IPC→BNS mappings" }
          ]}
        />
        <P>
          The tables live in <C>packages/law/src/tables/</C>. Each row is a section, its title and its maximum, and each carries a source citation
          (for example <C>IPC 1860 s.379</C>) that the trace prints next to the step that used it. The maximum is the longest imprisonment the
          section allows across its sub-clauses. Rows are written from the bare acts; they should be reviewed by counsel before use in a real jail.
        </P>
        <Table
          label="Rows by act"
          head={["Act", "Rows"]}
          minWidth={420}
          mono={[1]}
          rows={[...byAct.entries()].map(([act, n]) => [ACT_NAMES[act], n])}
        />
        <P>Not every row is a fixed term. The kind of punishment decides how the engine treats it:</P>
        <Table
          label="Punishment kinds"
          head={["Kind", "Rows", "Meaning", "Engine"]}
          minWidth={700}
          mono={[0, 1]}
          rows={[
            ["term", kinds.get("term") ?? 0, "A fixed maximum term", "Used for the line"],
            ["life / death", (kinds.get("life") ?? 0) + (kinds.get("death") ?? 0), "Allows life imprisonment or death", "Outside 479"],
            ["modifier", kinds.get("modifier") ?? 0, "Not an offence on its own (common intention, definitions, prohibitions)", "Ignored for the term and the 479(2) count"],
            ["derivative", kinds.get("derivative") ?? 0, "Punished as the main offence (conspiracy, abetment)", "Needs the main offence"],
            ["companion", kinds.get("companion") ?? 0, "Raises or lowers the main offence's term (attempt, aggravation)", "Main offence's full term: later, safer"],
            ["detail", kinds.get("detail") ?? 0, "Term depends on a fact the section number doesn't give", "Can't tell, or a lawyer enters it"],
            ["quantity", kinds.get("quantity") ?? 0, "NDPS: term depends on the quantity class", "Term from the class, or can't tell"],
            ["struck", kinds.get("struck") ?? 0, "Struck down by a constitutional court", "Flagged"]
          ]}
        />
        <P muted>
          A sub-clause that is not in the tables is read under its parent section (376(2)(n) → 376(2) → 376). A bare BNS section with several
          limbs is read as the limb with the longest term. Arms Act s.25 read with s.3, 4 or 5 is narrowed to the matching limb. The IPC→BNS map
          marks each mapping one-to-one, split, merged or dropped. Look any section up with the MCP tool <C>lookup_section</C>.
        </P>
      </Section>

      <Section id="worked" title="Worked example: S01">
        <P>
          S01 is a constructed Hindi bail order from the sample tray (not a real case; names masked): theft of a motorcycle and receiving it. The
          facts below are the ones the verifier accepted from Claude&apos;s reading; the engine did the rest.
        </P>
        <Table
          label="S01 facts"
          head={["Fact", "Value", "Quote from the order"]}
          minWidth={680}
          rows={r.facts.spans.map((s) => [FIELD[s.field] ?? s.field, factValue(s.label), <span key={s.id} className="font-serif">{r.text.slice(s.start, s.end)}</span>])}
        />
        <Stats
          items={[
            { value: describeMonths(e.maxTermMonths!), label: "Maximum term", note: "longest among the charges" },
            { value: e.fraction ?? "—", label: "Fraction", note: "first-time, per the papers" },
            { value: d(e.lineDate), label: "Line date" },
            { value: String(e.daysPast ?? "—"), label: "Days past the line", note: `as of ${d(today)}` }
          ]}
        />
        <Figure label="S01 timeline" caption={`S01 on one axis. Every date is computed by the engine as of ${d(today)}.`}>
          <LineTimeline
            title="S01: custody, the lines and today"
            desc={`Custody began ${d(custody)}. The one-third line is ${d(e.lineDate)}. The half line, which is also the old Section 436A date, is ${d(e.oldLawLineDate)}. The full maximum term ended ${d(fullTerm)}. Today is ${d(today)}.`}
            marks={[
              { iso: custody, label: "Custody began", tone: "ink" },
              { iso: e.lineDate!, label: "One-third line", tone: "stamp" },
              { iso: e.oldLawLineDate!, label: "Half line (old 436A)", tone: "carbon" },
              { iso: fullTerm, label: "Full maximum", tone: "flag" },
              { iso: today, label: "Today", tone: "ink" }
            ]}
          />
        </Figure>
        <H3 id="worked-trace">The rule trace, as the engine wrote it</H3>
        <ol className="max-w-[52rem] divide-y divide-[var(--rule)] border-y border-ink">
          {e.trace.map((t, i) => (
            <li key={i} className="grid grid-cols-[2.2rem_1fr] gap-2 py-2.5 text-[0.95rem] sm:grid-cols-[2.2rem_6.5rem_1fr]">
              <span className="font-mono text-[0.78rem] text-ink-3">{String(i + 1).padStart(2, "0")}</span>
              <span className="hidden font-mono text-[0.78rem] text-ink-3 sm:block">{t.step}</span>
              <span>
                {t.text}
                {t.source && <span className="mt-0.5 block font-mono text-[0.75rem] text-ink-3">{t.source}</span>}
              </span>
            </li>
          ))}
        </ol>
        <P>
          Result: <C>{e.verdict}</C>, {e.daysPast} days past the line as of {d(today)}. The engine raised {e.flags.length} flag
          {e.flags.length === 1 ? "" : "s"} for the lawyer:
        </P>
        <UL>
          {e.flags.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </UL>
        <P>
          Open the case at <A href="/case/S01">/case/S01</A> to see the quotes marked in the order and to change any fact.
        </P>
      </Section>
    </DocPage>
  );
}
