import { evaluate, type ActCode, type CaseInput, type Evaluation, type NdpsQuantity, type Tri } from "@halftime/law";
import type { Extraction } from "./schema.js";
import { DocIndex, checkDateQuote, checkQuote, checkSectionQuote, type Span } from "./verify.js";

export type FieldName = "section" | "custody_start" | "first_time_offender" | "other_pending_cases" | "registered_on" | "ndps_quantity";

export interface VerifiedSpan extends Span {
  id: number;
  field: FieldName;
  label: string;
}

export interface Rejection {
  field: FieldName;
  claim: string;
  quote: string | null;
  reason: string;
}

export interface VerifiedFacts {
  input: CaseInput;
  spans: VerifiedSpan[];
  rejected: Rejection[];
}

const isoOk = (s: string | null) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

/**
 * The span verifier. Every model claim must be backed by a quote that is
 * really in the document (and, for dates and sections, contains the value).
 * Anything unbacked is dropped to "unknown" and recorded as rejected.
 */
export function verifyExtraction(source: string, ex: Extraction): VerifiedFacts {
  const doc = new DocIndex(source);
  const spans: VerifiedSpan[] = [];
  const rejected: Rejection[] = [];
  const addSpan = (field: FieldName, label: string, span: Span) => {
    const id = spans.length;
    spans.push({ id, field, label, ...span });
    return id;
  };

  const sections: CaseInput["sections"] = [];
  for (const s of ex.sections) {
    const r = checkSectionQuote(doc, s.section, s.quote);
    if (!r.ok) {
      rejected.push({ field: "section", claim: `${s.act} ${s.section}`, quote: s.quote, reason: r.reason });
      continue;
    }
    const spanId = addSpan("section", `${s.act} ${s.section}`, r.span);
    const q = s.act === "NDPS" ? (s.ndps_quantity as NdpsQuantity) : undefined;
    sections.push({ act: s.act as ActCode, section: s.section, spanId, ...(q ? { quantity: q } : {}) });
  }

  let custodyStart: string | null = null;
  let custodySpanId: number | undefined;
  const c = ex.custody_start;
  if (c.date !== null) {
    const r = isoOk(c.date) ? checkDateQuote(doc, c.date, c.quote) : ({ ok: false, reason: `"${c.date}" is not a YYYY-MM-DD date.` } as const);
    if (r.ok) {
      custodyStart = c.date;
      custodySpanId = addSpan("custody_start", `custody from ${c.date}`, r.span);
    } else rejected.push({ field: "custody_start", claim: c.date, quote: c.quote, reason: r.reason });
  }

  const tri = (field: "first_time_offender" | "other_pending_cases"): Tri => {
    const f = ex[field];
    if (f.value === "unknown") return "unknown";
    const r = checkQuote(doc, f.quote);
    if (!r.ok) {
      rejected.push({ field, claim: f.value, quote: f.quote, reason: r.reason });
      return "unknown";
    }
    addSpan(field, `${field === "first_time_offender" ? "first-time offender" : "other cases pending"}: ${f.value}`, r.span);
    return f.value;
  };
  const firstTimeOffender = tri("first_time_offender");
  const otherPendingCases = tri("other_pending_cases");

  let registeredOn: string | null = null;
  const reg = ex.registered_on;
  if (reg.date !== null) {
    const r = isoOk(reg.date) ? checkDateQuote(doc, reg.date, reg.quote) : ({ ok: false, reason: `"${reg.date}" is not a YYYY-MM-DD date.` } as const);
    if (r.ok) {
      registeredOn = reg.date;
      addSpan("registered_on", `registered ${reg.date}`, r.span);
    } else rejected.push({ field: "registered_on", claim: reg.date, quote: reg.quote, reason: r.reason });
  }

  return {
    input: {
      sections,
      custodyStart,
      ...(custodySpanId !== undefined ? { custodySpanId } : {}),
      firstTimeOffender,
      otherPendingCases,
      registeredOn
    },
    spans,
    rejected
  };
}

export interface CaseResult {
  extraction: Extraction;
  facts: VerifiedFacts;
  evaluation: Evaluation;
  /** The normalised document text that span offsets point into. */
  text: string;
}

/** Verify a model extraction against the document, then let code apply the law. */
export function decide(source: string, extraction: Extraction, today: string, edits: Partial<CaseInput> = {}): CaseResult {
  const facts = verifyExtraction(source, extraction);
  const evaluation = evaluate({ ...facts.input, ...edits }, today);
  return { extraction, facts, evaluation, text: new DocIndex(source).text };
}
