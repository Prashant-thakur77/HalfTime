import type { SampleRun } from "@/lib/cases";

const DEVANAGARI = "०१२३४५६७८९";

export interface Planted {
  quote: string;
  index: number;
  from: string;
  to: string;
}

/**
 * The same quote with exactly one digit changed (the first digit, moved up by one,
 * in the script it was written in). Null when the quote has no digit.
 */
export function plantDigit(quote: string): Planted | null {
  for (let i = 0; i < quote.length; i++) {
    const ch = quote[i]!;
    const ascii = "0123456789".indexOf(ch);
    const deva = DEVANAGARI.indexOf(ch);
    if (ascii < 0 && deva < 0) continue;
    const n = ((ascii >= 0 ? ascii : deva) + 1) % 10;
    const to = ascii >= 0 ? String(n) : DEVANAGARI[n]!;
    return { quote: quote.slice(0, i) + to + quote.slice(i + 1), index: i, from: ch, to };
  }
  return null;
}

export interface RealQuote {
  quote: string;
  /** What the quote was offered as evidence for. */
  field: "custody_start" | "section";
  /** The date the reader claimed from it, when it is the custody quote. */
  date: string | null;
  /** The section the reader claimed from it, when it is a section quote. */
  section: string | null;
}

/** A quote the reader really took from this order: the custody line if it has one, else the first charge. */
export function realQuote(run: SampleRun | undefined): RealQuote | null {
  if (!run) return null;
  const ex = run.extraction;
  if (ex.custody_start.quote && /[0-9०-९]/.test(ex.custody_start.quote)) {
    return { quote: ex.custody_start.quote, field: "custody_start", date: ex.custody_start.date, section: null };
  }
  const s = ex.sections.find((x) => /[0-9०-९]/.test(x.quote));
  return s ? { quote: s.quote, field: "section", date: null, section: s.section } : null;
}

/** Hand-written paraphrases of the custody sentence: the same meaning, not the same words. */
export const PARAPHRASES: Record<string, { quote: string; gloss: string }> = {
  S01: { quote: "प्रार्थी 14 मार्च 2023 से आगरा जेल में बंद है।", gloss: "“The applicant has been in Agra jail since 14 March 2023.”" },
  S02: { quote: "अभियुक्त 20 मई 2024 से जेल में है।", gloss: "“The accused has been in jail since 20 May 2024.”" }
};
