import { addDays, addFractionOfMonths, addMonths, daysBetween, describeMonths, humanDate, parseIsoDate, toIso } from "./dates.js";
import { applyReadWith, expandSections, resolveSection, sectionLabel } from "./sections.js";
import type { CaseInput, Evaluation, SectionResolution, TraceStep, Verdict } from "./types.js";

/** BNSS came into force on this date; earlier cases get the old-law comparison. */
export const BNSS_START = "2024-07-01";
/** Supreme Court order applying Sec 479 to undertrials in cases registered before 1 Jul 2024. */
export const SC_ORDER_DATE = "2024-08-23";

const OFFENCE_KINDS = new Set(["term", "life", "death", "derivative", "detail", "quantity"]);

function dedupe(res: SectionResolution[]): SectionResolution[] {
  const seen = new Set<string>();
  return res.filter((r) => {
    const k = `${r.act}:${r.canonical}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function describeSection(r: SectionResolution): string {
  const label = sectionLabel(r);
  if (!r.found) return `${label}: not in the tables, so its maximum is unknown`;
  const p = r.punishment!;
  switch (p.kind) {
    case "term":
      return `${label} (${r.title}) → max ${describeMonths(p.months!)}`;
    case "life":
      return `${label} (${r.title}) → up to imprisonment for life`;
    case "death":
      return `${label} (${r.title}) → up to death`;
    case "modifier":
      return `${label} (${r.title}) → not a separate offence`;
    case "derivative":
      return `${label} (${r.title}) → punished as the main offence`;
    case "companion":
      return `${label} (${r.title}) → adjusts the main offence's term`;
    case "struck":
      return `${label} (${r.title}) → struck down, cannot found a charge`;
    case "detail":
      return `${label} (${r.title}) → maximum depends on details the section number doesn't give`;
    case "quantity":
      return `${label} (${r.title}) → maximum depends on the quantity class`;
  }
}

/**
 * Apply Section 479 BNSS to one undertrial's facts.
 * Pure and deterministic: same input and `today` always give the same output.
 */
export function evaluate(input: CaseInput, todayIso: string): Evaluation {
  const today = parseIsoDate(todayIso);
  if (!today) throw new Error(`Invalid today date: ${todayIso}`);

  const trace: TraceStep[] = [];
  const flags: string[] = [];
  const missing: string[] = [];

  const sections = dedupe(applyReadWith(expandSections(input.sections).map(resolveSection)));
  for (const r of sections) {
    trace.push({
      step: "section",
      text: describeSection(r) + (r.note ? `. ${r.note}` : ""),
      ...(r.source ? { source: r.source } : {}),
      ...(r.spanId !== undefined ? { spanId: r.spanId } : {})
    });
  }

  const registered = parseIsoDate(input.registeredOn ?? null);
  const preJuly =
    registered !== null ? toIso(registered) < BNSS_START : sections.some((r) => r.act === "IPC");
  const provision: Evaluation["provision"] = preJuly ? "BNSS_479_PRE_JULY_2024" : "BNSS_479";
  trace.push({
    step: "provision",
    text: preJuly
      ? `Case from before ${humanDate(parseIsoDate(BNSS_START)!)}: Sec 479 BNSS still applies, per the Supreme Court order of ${humanDate(parseIsoDate(SC_ORDER_DATE)!)}. Old Sec 436A CrPC (half line, no first-time benefit) shown for comparison.`
      : "Sec 479 BNSS applies.",
    source: preJuly ? "SC order, W.P.(C) 406/2013, 23 Aug 2024" : "BNSS 2023 s.479"
  });

  const custody = parseIsoDate(input.custodyStart);
  const delay = Math.max(0, Math.floor(input.accusedDelayDays ?? 0));
  const daysDetained = custody ? Math.max(0, daysBetween(custody, today) - delay) : null;

  const base = {
    provision,
    sections,
    trace,
    flags,
    missing,
    daysDetained,
    firstTimeLineDate: null,
    oldLawLineDate: null,
    daysPast: null,
    daysToGo: null,
    beyondMaximum: false,
    pastIfFirstTime: false
  };

  // 1. Death or life in any charged section: Sec 479 does not apply at all.
  const excluded = sections.filter((r) => r.punishment?.kind === "death" || r.punishment?.kind === "life");
  if (excluded.length > 0) {
    trace.push({
      step: "excluded",
      text: `${excluded.map(sectionLabel).join(", ")} allow${excluded.length === 1 ? "s" : ""} ${excluded.some((r) => r.punishment!.kind === "death") ? "death" : "imprisonment for life"}. Sec 479(1) does not cover such offences.`,
      source: "BNSS 2023 s.479(1)"
    });
    trace.push({ step: "result", text: "EXCLUDED: Sec 479 does not apply to this case." });
    return { ...base, verdict: "EXCLUDED", maxTermMonths: null, fraction: null, lineDate: null };
  }

  // 2. Work out the maximum term.
  for (const r of sections.filter((s) => s.punishment?.kind === "struck")) {
    flags.push(`${sectionLabel(r)} has been struck down and cannot found a charge.`);
  }
  const terms = sections.filter((r) => r.punishment?.kind === "term");
  const unknownTerm = sections.filter((r) => !r.found || r.punishment!.kind === "detail" || r.punishment!.kind === "quantity");
  const needsMain = sections.filter((r) => r.punishment?.kind === "derivative" || r.punishment?.kind === "companion");

  const override = input.maxTermOverrideMonths;
  const hasOverride = typeof override === "number" && Number.isFinite(override) && override > 0;
  let maxTermMonths: number | null = null;

  if (hasOverride) {
    maxTermMonths = override!;
    trace.push({ step: "max_term", text: `Maximum term entered by the reviewing lawyer: ${describeMonths(override!)}.` });
  } else {
    for (const r of unknownTerm) missing.push(`Maximum term for ${sectionLabel(r)}`);
    if (terms.length === 0 && unknownTerm.length === 0) {
      missing.push(
        needsMain.length > 0
          ? `The main offence for ${needsMain.map(sectionLabel).join(", ")}`
          : "A charged section with a known punishment"
      );
    }
    if (missing.length === 0) {
      const top = terms.reduce((a, b) => (b.punishment!.months! > a.punishment!.months! ? b : a));
      maxTermMonths = top.punishment!.months!;
      trace.push({
        step: "max_term",
        text:
          terms.length > 1
            ? `Longest maximum among the charges: ${describeMonths(maxTermMonths)} (${sectionLabel(top)}).`
            : `Maximum term: ${describeMonths(maxTermMonths)} (${sectionLabel(top)}).`,
        source: top.source!
      });
      if (sections.some((r) => r.punishment?.kind === "companion")) {
        trace.push({
          step: "max_term",
          text: "An attempt/aggravation section is charged; the engine uses the main offence's full term, which can only make the line later (safer)."
        });
      }
    }
  }

  if (!custody) {
    missing.push(input.custodyStart ? `A valid custody start date (got "${input.custodyStart}")` : "The date custody began");
  } else if (custody > today) {
    missing.push(`A custody start date on or before today (got ${humanDate(custody)})`);
  }

  if (missing.length > 0 || maxTermMonths === null || !custody) {
    for (const m of missing) trace.push({ step: "missing", text: `Missing: ${m}.` });
    trace.push({ step: "result", text: "CAN'T TELL: the papers don't give enough to apply the law. A person must fill the gaps." });
    return { ...base, verdict: "CANT_TELL", maxTermMonths, fraction: null, lineDate: null, daysDetained: null };
  }

  // 3. The line.
  const halfLine = addDays(addFractionOfMonths(custody, maxTermMonths, 1, 2), delay);
  const thirdLine = addDays(addFractionOfMonths(custody, maxTermMonths, 1, 3), delay);
  const ft = input.firstTimeOffender;
  const lineDate = ft === "true" ? thirdLine : halfLine;
  const fraction: Evaluation["fraction"] = ft === "true" ? "1/3" : "1/2";

  trace.push({
    step: "fraction",
    text:
      ft === "true"
        ? `First-time offender (per the papers): one-third of ${describeMonths(maxTermMonths)}.`
        : ft === "false"
          ? `Not a first-time offender (per the papers): one-half of ${describeMonths(maxTermMonths)}.`
          : `First-time status not stated: using one-half of ${describeMonths(maxTermMonths)} (the safe line); one-third shown as the line if first-time is confirmed.`,
    source: "BNSS 2023 s.479(1) and first proviso"
  });
  trace.push({
    step: "custody",
    text: `Custody began ${humanDate(custody)}.`,
    ...(input.custodySpanId !== undefined ? { spanId: input.custodySpanId } : {})
  });
  if (delay > 0) {
    trace.push({
      step: "delay",
      text: `${delay} day${delay === 1 ? "" : "s"} of delay caused by the accused excluded, pushing the line back.`,
      source: "BNSS 2023 s.479, Explanation"
    });
  }
  trace.push({ step: "line", text: `Line: ${humanDate(lineDate)}.` });

  const firstTimeLineDate = ft !== "false" ? toIso(thirdLine) : null;
  if (ft === "unknown") trace.push({ step: "line", text: `If first-time is confirmed: ${humanDate(thirdLine)}.` });
  const oldLawLineDate = preJuly ? toIso(halfLine) : null;

  const fullTermEnd = addDays(addMonths(custody, maxTermMonths), delay);
  const beyondMaximum = today >= fullTermEnd;
  const past = today >= lineDate;
  trace.push({ step: "today", text: `Today: ${humanDate(today)}; ${daysDetained} days detained.` });

  if (!past) {
    const daysToGo = daysBetween(today, lineDate);
    const pastIfFirstTime = ft === "unknown" && today >= thirdLine;
    if (pastIfFirstTime) {
      flags.push("Past the one-third line: if the papers or the jail confirm a first-time offender, the line is already crossed.");
    }
    trace.push({ step: "result", text: `NOT YET: ${daysToGo} day${daysToGo === 1 ? "" : "s"} to the line.` });
    return {
      ...base,
      verdict: "NOT_YET",
      maxTermMonths,
      fraction,
      lineDate: toIso(lineDate),
      firstTimeLineDate,
      oldLawLineDate,
      daysToGo,
      pastIfFirstTime
    };
  }

  const daysPast = daysBetween(lineDate, today);
  if (beyondMaximum) {
    flags.push("Detained for the full maximum term or longer: Sec 479(1) second proviso bars any further detention.");
    trace.push({ step: "flag", text: "Detention has reached the full maximum term.", source: "BNSS 2023 s.479(1), second proviso" });
  }

  // 4. Sec 479(2): more than one offence, or other cases pending.
  const offences = sections.filter((r) => r.found && OFFENCE_KINDS.has(r.punishment!.kind));
  const blocking: string[] = [];
  if (offences.length > 1) {
    blocking.push(`More than one offence is charged (${offences.map(sectionLabel).join(", ")}).`);
  }
  if (input.otherPendingCases === "true") blocking.push("The papers say other cases are pending.");
  if (input.otherPendingCases === "unknown") blocking.push("The papers don't say whether other cases are pending.");
  for (const b of blocking) {
    flags.push(b);
    trace.push({ step: "flag", text: `Sec 479(2): ${b}`, source: "BNSS 2023 s.479(2)" });
  }

  const verdict: Verdict = blocking.length > 0 ? "PAST_FLAGGED" : "PAST_THE_LINE";
  trace.push({
    step: "result",
    text:
      verdict === "PAST_THE_LINE"
        ? `PAST THE LINE by ${daysPast} day${daysPast === 1 ? "" : "s"}: the jail superintendent must apply under Sec 479(3). A lawyer reviews and signs.`
        : `PAST THE LINE by ${daysPast} day${daysPast === 1 ? "" : "s"}, FLAGGED under Sec 479(2): a lawyer decides how 479(2) applies before the application.`
  });

  return {
    ...base,
    verdict,
    maxTermMonths,
    fraction,
    lineDate: toIso(lineDate),
    firstTimeLineDate,
    oldLawLineDate,
    daysPast,
    beyondMaximum
  };
}
