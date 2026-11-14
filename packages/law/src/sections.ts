import { BNS_ALIASES, NDPS_QUANTITY_MONTHS, actShortName, lookupRow } from "./tables/index.js";
import type { ActCode, ChargedSection, SectionResolution } from "./types.js";

const DEVANAGARI_DIGITS = "०१२३४५६७८९";

/** Devanagari letter suffixes used for lettered sections (304ख, 498ए, 120बी). Longest first. */
const HINDI_SUFFIX: [string, string][] = [
  ["बी", "B"],
  ["सी", "C"],
  ["डी", "D"],
  ["ए", "A"],
  ["क", "A"],
  ["ख", "B"],
  ["ग", "C"],
  ["घ", "D"],
  ["ङ", "E"]
];

export function asciiDigits(s: string): string {
  return s.replace(/[०-९]/g, (d) => String(DEVANAGARI_DIGITS.indexOf(d)));
}

/**
 * Canonical section form: "304A", "25(1B)(a)", "303(2)", "3(1)(r)".
 * Handles Devanagari digits and letters, hyphens and stray spaces.
 */
export function canonicalSection(raw: string): string {
  let s = asciiDigits(raw.normalize("NFC")).trim();
  s = s.replace(/^(sec(tion)?s?|ss|s|u\/s|धारा)\.?\s*/i, "");
  for (const [hi, en] of HINDI_SUFFIX) s = s.split(hi).join(en);
  s = s.replace(/\s+/g, "");
  // 304-A -> 304A ; 354-d -> 354D (only directly after the main number)
  s = s.replace(/^(\d+)-?([a-zA-Z]{1,2})(?=$|\()/, (_m, n: string, l: string) => `${n}${l.toUpperCase()}`);
  // Inside brackets: (1-b) -> (1B), (1aa) -> (1AA), (a) stays (a), (iv) stays (iv)
  s = s.replace(/\(([^()]*)\)/g, (_m, inner: string) => {
    const t = inner.replace(/-/g, "");
    if (/^\d+[a-zA-Z]+$/.test(t)) return `(${t.replace(/[a-zA-Z]+$/, (x) => x.toUpperCase())})`;
    return `(${t.toLowerCase()})`;
  });
  return s;
}

/**
 * An act name written after the section: "IPC", "I.P.C.", "of the Arms Act",
 * "of the Indian Penal Code", "Scheduled Castes and ... Act, 1989".
 * The act is already known from `ChargedSection.act`, so the name is dropped.
 */
const ACT_NAME =
  /\s+(?:(?:[a-z(][\w().]*)\s+)*(?:act|code|sanhita)\b(?:,?\s*\d{4})?|\s*\b(?:I\.?P\.?C|B\.?N\.?S\.?S?|Cr\.?P\.?C|N\.?D\.?P\.?S|POCSO)\b\.?/gi;

/**
 * Split compound references such as "3/25", "379/411", "8/20", "302 r/w 34",
 * "307 read with 149", "302 or 304" into separate sections of the same act.
 * A "u/s" prefix and a trailing act name are dropped first.
 */
export function expandSections(list: ChargedSection[]): ChargedSection[] {
  const out: ChargedSection[] = [];
  for (const item of list) {
    const parts = asciiDigits(item.section)
      .replace(ACT_NAME, "")
      .replace(/\bu\s*\/\s*s{1,2}\b\.?/gi, " ")
      .replace(/r\s*\/\s*w|\bread\s+with\b/gi, ",")
      .replace(/सपठित|पठित/g, ",")
      .split(/[\/,&]|\b(?:and|or)\b|\s+व\s+/i)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    for (const p of parts) out.push({ ...item, section: p });
  }
  return out;
}

/** Strip the last bracket group: 376(2)(n) -> 376(2) -> 376. */
function parentOf(canonical: string): string | null {
  const m = /^(.*)\([^()]*\)$/.exec(canonical);
  return m ? m[1]! : null;
}

export function resolveSection(item: ChargedSection): SectionResolution {
  const canonical = canonicalSection(item.section);
  const base = { act: item.act, section: item.section, canonical, ...(item.spanId !== undefined ? { spanId: item.spanId } : {}) };

  const candidates: { key: string; via?: string }[] = [];
  let cur: string | null = canonical;
  while (cur) {
    candidates.push({ key: cur });
    if (item.act === "BNS" && BNS_ALIASES[cur]) candidates.push({ key: BNS_ALIASES[cur]!, via: cur });
    cur = parentOf(cur);
  }

  for (const c of candidates) {
    const row = lookupRow(item.act, c.key);
    if (!row) continue;
    const res: SectionResolution = {
      ...base,
      canonical: c.key,
      found: true,
      title: row.title,
      punishment: row.punishment,
      source: row.source
    };
    const notes: string[] = [];
    if (row.note) notes.push(row.note);
    if (c.via) notes.push(`Bare "${c.via}" read as ${c.key}, the limb with the longest term (the safer reading).`);
    else if (c.key !== canonical) notes.push(`"${canonical}" read under its parent section ${c.key}.`);
    if (row.punishment.kind === "quantity") {
      const q = item.quantity ?? "unknown";
      res.quantity = q;
      if (q !== "unknown") {
        res.punishment = { kind: "term", months: NDPS_QUANTITY_MONTHS[q] };
        notes.push(`Quantity class "${q}" from the papers.`);
      } else {
        notes.push("The term depends on the quantity class (small / intermediate / commercial), which the papers don't give.");
      }
    }
    if (notes.length) res.note = notes.join(" ");
    return res;
  }
  return { ...base, found: false, note: `${actShortName(item.act)} s.${canonical} is not in the tables.` };
}

/**
 * Arms Act: a prohibition (s.3/4/5) read with a bare s.25 points at one punishing limb.
 * Returns the resolutions with the bare s.25 narrowed when the pairing makes it clear.
 */
export function applyReadWith(res: SectionResolution[]): SectionResolution[] {
  const arms = res.filter((r) => r.act === "ARMS");
  const bare25 = arms.find((r) => r.canonical === "25");
  if (!bare25) return res;
  const has = (s: string) => arms.some((r) => r.canonical === s);
  const limb = has("3") ? "25(1B)(a)" : has("4") ? "25(1B)(b)" : has("5") ? "25(1)(a)" : null;
  if (!limb) return res;
  const row = lookupRow("ARMS", limb)!;
  return res.map((r) =>
    r === bare25
      ? {
          ...r,
          canonical: limb,
          title: row.title,
          punishment: row.punishment,
          source: row.source,
          note: `s.25 read with s.${has("3") ? "3" : has("4") ? "4" : "5"} points to s.${limb}.`
        }
      : r
  );
}

export function sectionLabel(r: Pick<SectionResolution, "act" | "canonical">): string {
  return `${actShortName(r.act as ActCode)} s.${r.canonical}`;
}
