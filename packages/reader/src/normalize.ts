import { asciiDigits } from "@halftime/law";

const ZERO_WIDTH = /[​-‍⁠﻿­]/g;

/** What the reader shows: the papers as written, minus invisible characters and Windows line endings. */
export function displayText(s: string): string {
  return s.normalize("NFC").replace(ZERO_WIDTH, "").replace(/\r\n?/g, "\n");
}

/** Text normalisation shared by the verifier and the date parser. */
export function normalizeText(s: string): string {
  return asciiDigits(s.normalize("NFC"))
    .replace(ZERO_WIDTH, "")
    .replace(/[‘’‚′`´]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[‐-―−]/g, "-")
    .replace(/।|॥/g, "|")
    .replace(/\r\n?/g, "\n");
}

const EN_MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5, jun: 6, june: 6,
  jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10,
  nov: 11, november: 11, dec: 12, december: 12
};

const HI_MONTHS: Record<string, number> = {
  "जनवरी": 1, "फरवरी": 2, "फ़रवरी": 2, "मार्च": 3, "अप्रैल": 4, "अप्रेल": 4, "मई": 5, "जून": 6,
  "जुलाई": 7, "अगस्त": 8, "सितंबर": 9, "सितम्बर": 9, "अक्टूबर": 10, "अक्तूबर": 10,
  "नवंबर": 11, "नवम्बर": 11, "दिसंबर": 12, "दिसम्बर": 12
};

function fullYear(y: string): number {
  const n = Number(y);
  if (y.length === 4) return n;
  return n < 50 ? 2000 + n : 1900 + n;
}

function iso(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || y < 1900 || y > 2100) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export interface FoundDate {
  iso: string;
  /** The exact text that was read as a date, after normalisation. */
  text: string;
  index: number;
}

/** An English ordinal suffix, optionally after a space: "9th", "9 th". */
const ORDINAL = "(?:\\s?(?:st|nd|rd|th))?";

const MONTH_WORDS = [...Object.keys(EN_MONTHS), ...Object.keys(HI_MONTHS)].sort((a, b) => b.length - a.length).join("|");

/**
 * Find every date written in a passage, in the day-first Indian formats:
 * 12.03.2021, 12/03/2021, 12-3-21, १२/०३/२०२१, 12 March 2021, 12th March, 2021,
 * 9 th of May, 1972, 24th day of August, 2021, March 12, 2021, 12 मार्च 2021, 2021-03-12.
 */
export function findDates(text: string): FoundDate[] {
  const s = normalizeText(text);
  const out: FoundDate[] = [];
  const push = (m: RegExpExecArray, v: string | null) => {
    if (v && !out.some((o) => o.index === m.index)) out.push({ iso: v, text: m[0], index: m.index });
  };
  const isoRe = /(?<!\d)(\d{4})-(\d{1,2})-(\d{1,2})(?!\d)/g;
  for (let m; (m = isoRe.exec(s)); ) push(m, iso(Number(m[1]), Number(m[2]), Number(m[3])));
  // Not glued to a longer number on either side ("1.12.12.2020", "No.12/3/2021/5"), but a dot
  // after letters is fine ("dt.15.9.1989"). Both separators must match, so "13-1/2004" is not a date.
  const numeric = /(?<!\d)(?<!\d[.\/-])(\d{1,2})\s?([.\/-])\s?(\d{1,2})\s?\2\s?(\d{4}|\d{2})(?!\d|[.\/-]\d)/g;
  for (let m; (m = numeric.exec(s)); ) push(m, iso(fullYear(m[4]!), Number(m[3]), Number(m[1])));
  const dayMonth = new RegExp(`(?<!\\d)(\\d{1,2})${ORDINAL}\\s*(?:day\\s+of\\s+|of\\s+)?(${MONTH_WORDS})\\.?,?\\s*(\\d{4})(?!\\d)`, "giu");
  for (let m; (m = dayMonth.exec(s)); ) push(m, iso(Number(m[3]), monthNum(m[2]!), Number(m[1])));
  const monthDay = new RegExp(`(${MONTH_WORDS})\\.?\\s+(\\d{1,2})${ORDINAL},?\\s*(\\d{4})(?!\\d)`, "giu");
  for (let m; (m = monthDay.exec(s)); ) push(m, iso(Number(m[3]), monthNum(m[1]!), Number(m[2])));
  return out.sort((a, b) => a.index - b.index);
}

function monthNum(word: string): number {
  return EN_MONTHS[word.toLowerCase()] ?? HI_MONTHS[word] ?? 0;
}

/** Parse a single date string; null when it isn't exactly one recognisable date. */
export function parseDateLoose(text: string): string | null {
  const found = findDates(text);
  return found.length >= 1 ? found[0]!.iso : null;
}
