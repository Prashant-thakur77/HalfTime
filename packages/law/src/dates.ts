import { addDays, addMonths, differenceInCalendarDays, format, getDaysInMonth, isValid, parseISO } from "date-fns";

/** Parse a strict YYYY-MM-DD date. Returns null for anything else. */
export function parseIsoDate(s: string | null | undefined): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = parseISO(s);
  if (!isValid(d) || format(d, "yyyy-MM-dd") !== s) return null;
  return d;
}

export function toIso(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function humanDate(d: Date): string {
  return format(d, "d MMM yyyy");
}

/**
 * Add a fraction of a term (in whole months) to a start date, calendar-exact.
 * Whole months are added with month arithmetic (12 Mar + 18 months = 12 Sep).
 * A leftover part-month (e.g. half of 3 months = 1.5 months) becomes days of the
 * following month, rounded up, so the line can only land later, never earlier.
 */
export function addFractionOfMonths(start: Date, months: number, numerator: number, denominator: number): Date {
  const totalNumer = months * numerator;
  const whole = Math.floor(totalNumer / denominator);
  const remNumer = totalNumer - whole * denominator;
  const afterWhole = addMonths(start, whole);
  if (remNumer === 0) return afterWhole;
  const days = Math.ceil((getDaysInMonth(afterWhole) * remNumer) / denominator);
  return addDays(afterWhole, days);
}

export function daysBetween(from: Date, to: Date): number {
  return differenceInCalendarDays(to, from);
}

export { addDays, addMonths };

/** "18 months", "3 years", "1 year 6 months", "1.5 months". */
export function describeMonths(months: number): string {
  if (!Number.isInteger(months)) return `${trim(months)} months`;
  const y = Math.floor(months / 12);
  const mo = months % 12;
  const parts: string[] = [];
  if (y) parts.push(`${y} year${y === 1 ? "" : "s"}`);
  if (mo) parts.push(`${mo} month${mo === 1 ? "" : "s"}`);
  return parts.length ? parts.join(" ") : "0 months";
}

function trim(n: number): string {
  return String(Math.round(n * 100) / 100);
}
