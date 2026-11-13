import { asciiDigits, canonicalSection } from "@halftime/law";
import { findDates, normalizeText } from "./normalize.js";

export interface Span {
  start: number;
  end: number;
}

const PUNCT_EQUIV: Record<string, string> = { "|": ".", "।": ".", ";": ",", ":": "," };
const MIN_KEY = 6;

/** Matching key: lower-case, no whitespace, a few punctuation marks unified. */
function keyChar(ch: string): string {
  if (/\s/.test(ch)) return "";
  const lower = ch.toLowerCase();
  return PUNCT_EQUIV[lower] ?? (lower.length === 1 ? lower : ch);
}

export function matchKey(s: string): string {
  let k = "";
  for (const ch of normalizeText(s)) k += keyChar(ch);
  return k;
}

/**
 * Index of a normalised document, so a quote can be found whitespace- and
 * Unicode-tolerantly and its span mapped back into the document text.
 */
export class DocIndex {
  readonly text: string;
  private key = "";
  private map: number[] = [];

  constructor(source: string) {
    this.text = normalizeText(source);
    for (let i = 0; i < this.text.length; i++) {
      const k = keyChar(this.text[i]!);
      for (let j = 0; j < k.length; j++) {
        this.key += k[j];
        this.map.push(i);
      }
    }
  }

  /** Find a quote. Exact (normalised) match only: no paraphrase, no fuzzy edit distance. */
  find(quote: string | null | undefined): Span | null {
    if (!quote) return null;
    const q = matchKey(quote);
    if (q.length < MIN_KEY) return null;
    const at = this.key.indexOf(q);
    if (at < 0) return null;
    return { start: this.map[at]!, end: this.map[at + q.length - 1]! + 1 };
  }
}

export type CheckResult = { ok: true; span: Span } | { ok: false; reason: string };

/** The quote must be in the document. */
export function checkQuote(doc: DocIndex, quote: string | null | undefined): CheckResult {
  if (!quote || matchKey(quote).length < MIN_KEY) return { ok: false, reason: "No supporting quote given." };
  const span = doc.find(quote);
  return span ? { ok: true, span } : { ok: false, reason: "The quoted text is not in the document." };
}

/** The quote must be in the document and must contain the section number. */
export function checkSectionQuote(doc: DocIndex, section: string, quote: string | null | undefined): CheckResult {
  const r = checkQuote(doc, quote);
  if (!r.ok) return r;
  const num = /^\d+/.exec(canonicalSection(section))?.[0];
  if (!num) return { ok: false, reason: `"${section}" is not a section number.` };
  const digits = asciiDigits(normalizeText(quote!));
  if (!new RegExp(`(?<!\\d)${num}(?!\\d)`).test(digits)) {
    return { ok: false, reason: `The quote doesn't mention section ${num}.` };
  }
  return r;
}

/** The quote must be in the document and must contain the claimed date. */
export function checkDateQuote(doc: DocIndex, isoDate: string, quote: string | null | undefined): CheckResult {
  const r = checkQuote(doc, quote);
  if (!r.ok) return r;
  const dates = findDates(quote!).map((d) => d.iso);
  if (!dates.includes(isoDate)) {
    return { ok: false, reason: dates.length ? `The quote gives ${dates.join(", ")}, not ${isoDate}.` : `The quote contains no date.` };
  }
  return r;
}
