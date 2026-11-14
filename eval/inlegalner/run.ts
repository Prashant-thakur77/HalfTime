/**
 * Offline benchmark of HalfTime's deterministic reader parts on real, held-out
 * court text: the InLegalNER test split (English Indian judgments, MIT licence).
 * No model, no network. Everything is seeded, so two runs give the same report.
 *
 *   python3 -I eval/inlegalner/convert.py   # parquet -> eval/raw/inlegalner/test.jsonl
 *   pnpm exec tsx eval/inlegalner/run.ts    # -> eval/inlegalner/report.{json,md}
 *
 * or both at once: pnpm eval:inlegalner
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyReadWith,
  expandSections,
  resolveSection,
  type ActCode,
  type PunishmentKind,
  type SectionResolution
} from "../../packages/law/src/index.js";
import {
  DocIndex,
  checkDateQuote,
  checkQuote,
  checkSectionQuote,
  findDates,
  matchKey,
  normalizeText,
  parseDateLoose
} from "../../packages/reader/src/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = join(HERE, "..", "raw", "inlegalner", "test.jsonl");
const SEED = 7;

// ---------------------------------------------------------------- data

interface Entity {
  start: number;
  end: number;
  text: string;
}

interface Row {
  id: string;
  kind: "judgement" | "preamble" | "unknown";
  /** URL of the judgment the row was cut from. */
  doc: string;
  text: string;
  dates: Entity[];
  provisions: Entity[];
  statutes: Entity[];
}

if (!existsSync(DATA)) {
  console.error(`${DATA} not found. Run: python3 -I eval/inlegalner/convert.py`);
  process.exit(1);
}
const rows: Row[] = readFileSync(DATA, "utf8")
  .trim()
  .split("\n")
  .map((l) => JSON.parse(l) as Row);

// ---------------------------------------------------------------- helpers

/** mulberry32: small seeded PRNG so every variant is reproducible. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(SEED);
const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)]!;

interface Rate {
  n: number;
  hit: number;
  pct: number;
}
function rate(hit: number, n: number): Rate {
  return { n, hit, pct: n ? Math.round((1000 * hit) / n) / 10 : 0 };
}
const fmt = (r: Rate) => `${r.pct.toFixed(1)}% (${r.hit}/${r.n})`;

/**
 * Independent containment test used only to drop "adversarial" variants that
 * actually occur in the document: lower-case, all whitespace removed. Deliberately
 * simpler than the verifier's own key so the ground truth doesn't lean on it.
 */
const plain = (s: string) => s.toLowerCase().replace(/\s+/g, "");
const occursIn = (doc: string, quote: string) => plain(doc).includes(plain(quote));

/**
 * Sentence that encloses [start, end): a boundary is whitespace after . ? or !
 * followed by an upper-case letter, digit-free. Rows in the judgement part of
 * InLegalNER are already single sentences, so this mostly returns the whole row.
 */
function enclosingSentence(text: string, start: number, end: number): { start: number; end: number; text: string } {
  const bounds: number[] = [];
  for (const m of text.matchAll(/(?<=[.?!])\s+(?=[A-Z])/g)) bounds.push(m.index! + m[0].length);
  const s = Math.max(0, ...bounds.filter((b) => b <= start));
  const e = Math.min(text.length, ...bounds.filter((b) => b >= end));
  const raw = text.slice(s, e);
  const lead = raw.length - raw.trimStart().length;
  const body = raw.trim();
  return { start: s + lead, end: s + lead + body.length, text: body };
}

// ---------------------------------------------------------------- reference date reader (for gold strings only)

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5, jun: 6, june: 6,
  jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10,
  nov: 11, november: 11, dec: 12, december: 12
};
const MONTH_ALT = Object.keys(MONTHS).sort((a, b) => b.length - a.length).join("|");

type DateShape = "numeric d.m.y" | "day month year" | "month day year" | "not a full date" | "invalid calendar date";

function isoOf(y: number, m: number, d: number): string | null {
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (m < 1 || m > 12 || dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return dt.toISOString().slice(0, 10);
}
const yearOf = (y: string) => (y.length === 4 ? Number(y) : Number(y) < 50 ? 2000 + Number(y) : 1900 + Number(y));

/**
 * Classify a gold DATE string. A "full date" is exactly one day, month and year
 * and nothing else: 12.03.2021, 12th March, 2021, the 1st day of May 1999, March 12, 2021.
 * Ranges, month-year, timestamps and similar fall under "not a full date".
 */
function referenceDate(raw: string): { shape: DateShape; iso: string | null } {
  const s = raw.trim().replace(/^the\s+/i, "").replace(/\.$/, "");
  const ordinal = String.raw`\s*(?:st|nd|rd|th)?`;
  const numeric = /^(\d{1,2})\s*[./-]\s*(\d{1,2})\s*[./-]\s*(\d{4}|\d{2})$/.exec(s);
  const dmy = new RegExp(String.raw`^(\d{1,2})${ordinal}\s*(?:day\s+)?(?:of\s+)?(${MONTH_ALT})\.?,?\s*(\d{4})$`, "i").exec(s);
  const mdy = new RegExp(String.raw`^(${MONTH_ALT})\.?\s+(\d{1,2})${ordinal},?\s*(\d{4})$`, "i").exec(s);
  let shape: DateShape = "not a full date";
  let parts: [number, number, number] | null = null;
  if (numeric) [shape, parts] = ["numeric d.m.y", [yearOf(numeric[3]!), Number(numeric[2]), Number(numeric[1])]];
  else if (dmy) [shape, parts] = ["day month year", [Number(dmy[3]), MONTHS[dmy[2]!.toLowerCase()]!, Number(dmy[1])]];
  else if (mdy) [shape, parts] = ["month day year", [Number(mdy[3]), MONTHS[mdy[1]!.toLowerCase()]!, Number(mdy[2])]];
  if (!parts) return { shape, iso: null };
  const iso = isoOf(...parts);
  return iso ? { shape, iso } : { shape: "invalid calendar date", iso: null };
}

function shiftDay(iso: string, days: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

// ---------------------------------------------------------------- (a) date finding

const judgement = rows.filter((r) => r.kind === "judgement");
const shifted = rows.filter((r) => normalizeText(r.text).length !== r.text.length).length;

let goldDates = 0;
let goldDatesFound = 0;
let goldFull = 0;
let goldFullFound = 0;
let predicted = 0;
let predictedMatched = 0;
const falsePositives: string[] = [];
const missedFull: string[] = [];
const overlaps = (a: { start: number; end: number }, b: { start: number; end: number }) => a.start < b.end && b.start < a.end;

for (const r of judgement) {
  const found = findDates(r.text).map((d) => ({ start: d.index, end: d.index + d.text.length, text: d.text }));
  predicted += found.length;
  for (const f of found) {
    if (r.dates.some((g) => overlaps(f, g))) predictedMatched++;
    else falsePositives.push(`${f.text} in "...${r.text.slice(Math.max(0, f.start - 40), f.end + 20).replace(/\s+/g, " ")}..."`);
  }
  for (const g of r.dates) {
    const hit = found.some((f) => overlaps(f, g));
    goldDates++;
    if (hit) goldDatesFound++;
    if (referenceDate(g.text).iso) {
      goldFull++;
      if (hit) goldFullFound++;
      else missedFull.push(g.text);
    }
  }
}

const shapeCounts = new Map<DateShape, { n: number; parsed: number; correct: number; misses: string[] }>();
for (const r of rows) {
  for (const g of r.dates) {
    const ref = referenceDate(g.text);
    const c = shapeCounts.get(ref.shape) ?? { n: 0, parsed: 0, correct: 0, misses: [] };
    c.n++;
    const got = parseDateLoose(g.text);
    if (got) c.parsed++;
    if (ref.iso && got === ref.iso) c.correct++;
    else if (ref.iso) c.misses.push(`${g.text} -> ${got ?? "null"} (expected ${ref.iso})`);
    shapeCounts.set(ref.shape, c);
  }
}
const FULL_SHAPES: DateShape[] = ["numeric d.m.y", "day month year", "month day year"];
const fullAgg = FULL_SHAPES.map((s) => shapeCounts.get(s) ?? { n: 0, parsed: 0, correct: 0, misses: [] });
const fullN = fullAgg.reduce((a, c) => a + c.n, 0);
const fullParsed = fullAgg.reduce((a, c) => a + c.parsed, 0);
const fullCorrect = fullAgg.reduce((a, c) => a + c.correct, 0);
const parseMisses = fullAgg.flatMap((c) => c.misses);

const dateFinding = {
  scope: "judgement rows (preamble rows carry no DATE labels)",
  rows: judgement.length,
  rowsWhereNormalisationShiftsOffsets: shifted,
  recallAllGoldDates: rate(goldDatesFound, goldDates),
  recallFullGoldDates: rate(goldFullFound, goldFull),
  precision: rate(predictedMatched, predicted),
  parse: {
    goldDates: rows.reduce((a, r) => a + r.dates.length, 0),
    fullDates: fullN,
    byShape: Object.fromEntries([...shapeCounts].map(([k, v]) => [k, { n: v.n, parsed: v.parsed, correct: v.correct }])),
    parsedFull: rate(fullParsed, fullN),
    correctFull: rate(fullCorrect, fullN)
  }
};

// ---------------------------------------------------------------- (b) + (c) span verifier

type EntityKind = "DATE" | "PROVISION";
interface Target {
  row: Row;
  index: DocIndex;
  kind: EntityKind;
  entity: Entity;
  sentence: { start: number; end: number; text: string };
}

const targets: Target[] = [];
for (const r of rows) {
  const index = new DocIndex(r.text);
  for (const [kind, list] of [["DATE", r.dates], ["PROVISION", r.provisions]] as const) {
    for (const e of list) targets.push({ row: r, index, kind, entity: e, sentence: enclosingSentence(r.text, e.start, e.end) });
  }
}

const MIN_KEY = 6;
const recall = {
  entity: { DATE: { n: 0, ok: 0, short: 0, shortOk: 0 }, PROVISION: { n: 0, ok: 0, short: 0, shortOk: 0 } },
  sentence: { n: 0, ok: 0 },
  spanPointsAtQuote: { n: 0, ok: 0 }
};
const recallFailures: string[] = [];
for (const t of targets) {
  const bucket = recall.entity[t.kind];
  const res = checkQuote(t.index, t.entity.text);
  if (matchKey(t.entity.text).length < MIN_KEY) {
    bucket.short++;
    if (res.ok) bucket.shortOk++;
  } else {
    bucket.n++;
    if (res.ok) bucket.ok++;
    else recallFailures.push(`${t.kind} ${JSON.stringify(t.entity.text)}`);
  }
  if (res.ok) {
    recall.spanPointsAtQuote.n++;
    if (matchKey(t.index.text.slice(res.span.start, res.span.end)) === matchKey(t.entity.text)) recall.spanPointsAtQuote.ok++;
  }
  recall.sentence.n++;
  const sres = checkQuote(t.index, t.sentence.text);
  if (sres.ok) recall.sentence.ok++;
  else recallFailures.push(`sentence of ${t.kind} ${JSON.stringify(t.sentence.text.slice(0, 80))}`);
}

/** Replace one digit inside [start, end) of text with a different digit. */
function changeDigit(text: string, start: number, end: number): string | null {
  const positions: number[] = [];
  for (let i = start; i < end; i++) if (/\d/.test(text[i]!)) positions.push(i);
  if (!positions.length) return null;
  const at = pick(positions);
  const old = Number(text[at]);
  const neu = (old + 1 + Math.floor(rand() * 9)) % 10;
  return text.slice(0, at) + String(neu) + text.slice(at + 1);
}

const vocabulary = [...new Set(rows.flatMap((r) => r.text.match(/\b[a-z]{4,}\b/g) ?? []))].sort();

/** Replace one word (4+ letters, outside the entity) with a different word from the corpus. */
function swapWord(sentence: string, keepStart: number, keepEnd: number): string | null {
  const words = [...sentence.matchAll(/\b[A-Za-z]{4,}\b/g)].filter((m) => m.index! + m[0].length <= keepStart || m.index! >= keepEnd);
  if (!words.length) return null;
  const w = pick(words);
  let repl = pick(vocabulary);
  while (repl.toLowerCase() === w[0].toLowerCase()) repl = pick(vocabulary);
  return sentence.slice(0, w.index!) + repl + sentence.slice(w.index! + w[0].length);
}

interface Rejection {
  attempted: number;
  skippedPresent: number;
  rejected: number;
}
const newRej = (): Rejection => ({ attempted: 0, skippedPresent: 0, rejected: 0 });
const VARIANTS = ["digit changed in entity (entity quote)", "digit changed in entity (sentence quote)", "word swapped (sentence quote)", "sentence from another judgment"] as const;
type Variant = (typeof VARIANTS)[number];
const rejection: Record<EntityKind, Record<Variant, Rejection>> = {
  DATE: Object.fromEntries(VARIANTS.map((v) => [v, newRej()])) as Record<Variant, Rejection>,
  PROVISION: Object.fromEntries(VARIANTS.map((v) => [v, newRej()])) as Record<Variant, Rejection>
};
const acceptedVariants: string[] = [];

function tryVariant(t: Target, variant: Variant, quote: string | null) {
  if (quote === null) return;
  const r = rejection[t.kind][variant];
  if (occursIn(t.row.text, quote)) {
    r.skippedPresent++;
    return;
  }
  r.attempted++;
  if (!checkQuote(t.index, quote).ok) r.rejected++;
  else acceptedVariants.push(`${t.kind} / ${variant}: ${JSON.stringify(quote.slice(0, 100))}`);
}

for (const t of targets) {
  const { entity, sentence, row } = t;
  const relStart = entity.start - sentence.start;
  const relEnd = entity.end - sentence.start;
  tryVariant(t, VARIANTS[0], changeDigit(entity.text, 0, entity.text.length));
  tryVariant(t, VARIANTS[1], changeDigit(sentence.text, relStart, relEnd));
  tryVariant(t, VARIANTS[2], swapWord(sentence.text, relStart, relEnd));
  let other = pick(rows);
  while (other.doc === row.doc) other = pick(rows);
  const otherEntity = pick([...other.dates, ...other.provisions, { start: 0, end: Math.min(other.text.length, 120), text: "" }]);
  tryVariant(t, VARIANTS[3], enclosingSentence(other.text, otherEntity.start, otherEntity.end).text || null);
}

// Typed checks: right number/date must pass, wrong number/date must fail.
const typed = {
  sectionRight: { n: 0, ok: 0 },
  sectionWrong: { n: 0, rejected: 0, skippedPresent: 0 },
  dateRight: { n: 0, ok: 0 },
  dateWrong: { n: 0, rejected: 0, skippedPresent: 0 }
};
const typedFailures: string[] = [];
for (const t of targets) {
  if (t.kind === "PROVISION") {
    const num = /\d+/.exec(t.entity.text)?.[0];
    if (!num) continue;
    typed.sectionRight.n++;
    if (checkSectionQuote(t.index, num, t.sentence.text).ok) typed.sectionRight.ok++;
    else typedFailures.push(`right section ${num} rejected: ${JSON.stringify(t.sentence.text.slice(0, 100))}`);
    const wrong = String(Number(num) + 1);
    if (new RegExp(`(?<!\\d)${wrong}(?!\\d)`).test(t.sentence.text)) {
      typed.sectionWrong.skippedPresent++;
      continue;
    }
    typed.sectionWrong.n++;
    if (!checkSectionQuote(t.index, wrong, t.sentence.text).ok) typed.sectionWrong.rejected++;
    else typedFailures.push(`wrong section ${wrong} accepted: ${JSON.stringify(t.sentence.text.slice(0, 100))}`);
  } else {
    const iso = referenceDate(t.entity.text).iso;
    if (!iso) continue;
    typed.dateRight.n++;
    if (checkDateQuote(t.index, iso, t.sentence.text).ok) typed.dateRight.ok++;
    else typedFailures.push(`right date ${iso} rejected: ${JSON.stringify(t.entity.text)}`);
    const wrong = shiftDay(iso, 1);
    if (t.row.dates.some((g) => referenceDate(g.text).iso === wrong)) {
      typed.dateWrong.skippedPresent++;
      continue;
    }
    typed.dateWrong.n++;
    if (!checkDateQuote(t.index, wrong, t.sentence.text).ok) typed.dateWrong.rejected++;
    else typedFailures.push(`wrong date ${wrong} accepted: ${JSON.stringify(t.entity.text)}`);
  }
}

const verifier = {
  recall: {
    entityDATE: rate(recall.entity.DATE.ok, recall.entity.DATE.n),
    entityPROVISION: rate(recall.entity.PROVISION.ok, recall.entity.PROVISION.n),
    shortEntitiesRefusedByDesign: {
      DATE: { n: recall.entity.DATE.short, accepted: recall.entity.DATE.shortOk },
      PROVISION: { n: recall.entity.PROVISION.short, accepted: recall.entity.PROVISION.shortOk }
    },
    enclosingSentence: rate(recall.sentence.ok, recall.sentence.n),
    returnedSpanMatchesQuote: rate(recall.spanPointsAtQuote.ok, recall.spanPointsAtQuote.n)
  },
  rejection: Object.fromEntries(
    (["DATE", "PROVISION"] as const).map((k) => [
      k,
      Object.fromEntries(VARIANTS.map((v) => [v, { ...rate(rejection[k][v].rejected, rejection[k][v].attempted), skippedPresent: rejection[k][v].skippedPresent }]))
    ])
  ),
  typed: {
    sectionRightPasses: rate(typed.sectionRight.ok, typed.sectionRight.n),
    sectionWrongRejected: { ...rate(typed.sectionWrong.rejected, typed.sectionWrong.n), skippedPresent: typed.sectionWrong.skippedPresent },
    dateRightPasses: rate(typed.dateRight.ok, typed.dateRight.n),
    dateWrongRejected: { ...rate(typed.dateWrong.rejected, typed.dateWrong.n), skippedPresent: typed.dateWrong.skippedPresent }
  }
};

// ---------------------------------------------------------------- (d) section parsing

/** Statute name -> act code, on a key with dots and spaces removed. Only acts HalfTime has tables for. */
const ACT_RULES: [RegExp, ActCode][] = [
  [/^(ipc|i\.?p\.?c|(the)?indianpenalcode|penalcode)/, "IPC"],
  [/^(bns|(the)?bharatiyanyayasanhita)/, "BNS"],
  [/^(ndps|(the)?narcoticdrugsandpsychotropicsubstances)/, "NDPS"],
  [/^(the)?armsact/, "ARMS"],
  [/^(pocso|(the)?protectionofchildrenfromsexualoffences)/, "POCSO"],
  [/^(sc\/st|sc&st|scst|(the)?scheduledcastesandthescheduledtribes|atrocitiesact)/, "SCST"],
  [/^(the)?dowryprohibition/, "DOWRY"],
  [/gamblingact/, "GAMBLING"],
  [/gangsters/, "GANGSTERS"],
  [/^(the)?informationtechnologyact/, "IT"]
];
function actOf(statute: string): ActCode | null {
  const key = statute.toLowerCase().replace(/[\s.]/g, "");
  return ACT_RULES.find(([re]) => re.test(key))?.[1] ?? null;
}

const KNOWN_MAX: PunishmentKind[] = ["term", "life", "death"];
/** A canonical section the parser isolated cleanly: 302, 304B, 25(1B)(a), 376(2)(n). */
const WELL_FORMED = /^\d+[A-Z]{0,2}(\([0-9A-Za-z]+\))*$/;
type Outcome = "known maximum" | "in tables, maximum depends on another section or fact" | "not in tables (can't tell)" | "unparsed reference (can't tell)";

const sectionOutcomes = new Map<Outcome, number>();
const sectionByAct = new Map<ActCode, { refs: number; known: number }>();
const unresolvedIpc = new Map<string, number>();
const unparsed = new Map<string, number>();
let criminalProvisions = 0;
let provisionsWithStatute = 0;

for (const r of rows) {
  for (const p of r.provisions) {
    const sent = enclosingSentence(r.text, p.start, p.end);
    const inSentence = r.statutes.filter((s) => s.start >= sent.start && s.end <= sent.end);
    if (!inSentence.length) continue;
    provisionsWithStatute++;
    const dist = (s: Entity) => (s.start >= p.end ? s.start - p.end : Math.max(0, p.start - s.end));
    const nearest = [...inSentence].sort((a, b) => dist(a) - dist(b) || a.start - b.start)[0]!;
    const act = actOf(nearest.text);
    if (!act) continue;
    criminalProvisions++;
    const resolved: SectionResolution[] = applyReadWith(expandSections([{ act, section: p.text }]).map(resolveSection));
    for (const res of resolved) {
      const outcome: Outcome = res.found
        ? KNOWN_MAX.includes(res.punishment!.kind)
          ? "known maximum"
          : "in tables, maximum depends on another section or fact"
        : WELL_FORMED.test(res.canonical)
          ? "not in tables (can't tell)"
          : "unparsed reference (can't tell)";
      sectionOutcomes.set(outcome, (sectionOutcomes.get(outcome) ?? 0) + 1);
      const a = sectionByAct.get(act) ?? { refs: 0, known: 0 };
      a.refs++;
      if (outcome === "known maximum") a.known++;
      sectionByAct.set(act, a);
      if (outcome === "not in tables (can't tell)" && act === "IPC") unresolvedIpc.set(res.canonical, (unresolvedIpc.get(res.canonical) ?? 0) + 1);
      if (outcome === "unparsed reference (can't tell)") unparsed.set(`${res.section} -> ${res.canonical}`, (unparsed.get(`${res.section} -> ${res.canonical}`) ?? 0) + 1);
    }
  }
}
const sectionRefs = [...sectionOutcomes.values()].reduce((a, b) => a + b, 0);
const OUTCOMES: Outcome[] = ["known maximum", "in tables, maximum depends on another section or fact", "not in tables (can't tell)", "unparsed reference (can't tell)"];
const byFreq = (m: Map<string, number>, k: number) => [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, k);

const sections = {
  provisionsWithStatuteInSentence: provisionsWithStatute,
  provisionsNearestToTabledAct: criminalProvisions,
  sectionReferences: sectionRefs,
  outcomes: Object.fromEntries(OUTCOMES.map((o) => [o, rate(sectionOutcomes.get(o) ?? 0, sectionRefs)])),
  byAct: Object.fromEntries([...sectionByAct].map(([k, v]) => [k, rate(v.known, v.refs)])),
  topUnresolvedIpc: byFreq(unresolvedIpc, 20).map(([section, count]) => ({ section, count })),
  topUnparsed: byFreq(unparsed, 10).map(([reference, count]) => ({ reference, count }))
};

// ---------------------------------------------------------------- report

const report = {
  dataset: "InLegalNER test split (English Indian judgments, MIT licence)",
  rows: rows.length,
  rowsByKind: { judgement: judgement.length, preamble: rows.filter((r) => r.kind === "preamble").length },
  goldEntities: {
    DATE: rows.reduce((a, r) => a + r.dates.length, 0),
    PROVISION: rows.reduce((a, r) => a + r.provisions.length, 0),
    STATUTE: rows.reduce((a, r) => a + r.statutes.length, 0)
  },
  seed: SEED,
  dateFinding,
  verifier,
  sections,
  examples: {
    dateFalsePositives: falsePositives.slice(0, 10),
    missedFullDates: missedFull.slice(0, 15),
    fullDatesNotParsedCorrectly: parseMisses.slice(0, 15),
    verifierRecallFailures: recallFailures.slice(0, 10),
    adversarialVariantsAccepted: acceptedVariants.slice(0, 10),
    typedCheckFailures: typedFailures.slice(0, 10)
  }
};
writeFileSync(join(HERE, "report.json"), JSON.stringify(report, null, 2) + "\n");

const rejRows = (["DATE", "PROVISION"] as const).flatMap((k) =>
  VARIANTS.map((v) => {
    const r = rejection[k][v];
    return `| ${k} | ${v} | ${fmt(rate(r.rejected, r.attempted))} | ${r.skippedPresent} |`;
  })
);
const list = (xs: string[]) => (xs.length ? xs.map((x) => `- \`${x.replace(/`/g, "'")}\``).join("\n") : "- none");

const md = `# InLegalNER benchmark: deterministic reader parts

Offline, no model, no network. Generated by \`pnpm eval:inlegalner\` (seed ${SEED}); every number below comes from \`report.json\`.

**Data.** ${report.dataset}: ${rows.length} rows (${judgement.length} judgement sentences, ${report.rowsByKind.preamble} preambles) cut from ${new Set(rows.map((r) => r.doc)).size} judgments. Gold entities used: DATE ${report.goldEntities.DATE}, PROVISION ${report.goldEntities.PROVISION}, STATUTE ${report.goldEntities.STATUTE}. Percentages are shown as \`pct (hits/n)\`.

## a. Date finding (\`findDates\`, \`parseDateLoose\`)

Scope: the ${judgement.length} judgement rows; preamble rows are not annotated for DATE, so they would count every date there as a false positive.

| Metric | Value |
|---|---|
| Recall, all gold DATE spans | ${fmt(dateFinding.recallAllGoldDates)} |
| Recall, gold DATE spans that are full dates | ${fmt(dateFinding.recallFullGoldDates)} |
| Precision of \`findDates\` spans | ${fmt(dateFinding.precision)} |
| Gold DATE strings that are full day-month-year dates | ${fullN} of ${dateFinding.parse.goldDates} |
| \`parseDateLoose\` returns a date, full dates | ${fmt(dateFinding.parse.parsedFull)} |
| \`parseDateLoose\` returns the right date, full dates | ${fmt(dateFinding.parse.correctFull)} |

By shape of the gold string:

| Shape | n | parsed | correct |
|---|---|---|---|
${[...shapeCounts].sort((a, b) => b[1].n - a[1].n).map(([k, v]) => `| ${k} | ${v.n} | ${v.parsed} | ${v.correct} |`).join("\n")}

- **Match rule:** a found span and a gold span match when their character ranges overlap.
- **Recall** = gold DATE spans overlapped by at least one found span / gold DATE spans. **Precision** = found spans overlapping at least one gold DATE / found spans. Gold labels can miss dates, so precision is a lower bound; the false positives listed below are worth reading before trusting it.
- **Full date** = the gold string is exactly one day, month and year (\`12.03.2021\`, \`12th March, 2021\`, \`the 1st day of May 1999\`, \`March 12, 2021\`), checked by a small reference reader in \`run.ts\` that also gives the expected ISO date. Month-year, year-only, ranges and timestamps are "not a full date"; \`findDates\` is not meant to read those. "Invalid calendar date" is a full-looking string that is not a real date (e.g. day 31 of a 30-day month).
- **Correct** = \`parseDateLoose(gold)\` equals the reference ISO date. Two-digit years use the library's rule (< 50 is 20xx) in both.

## b. Span verifier recall (\`DocIndex\`, \`checkQuote\`)

Each gold DATE and PROVISION entity, and the sentence that encloses it, is checked against its own row with \`checkQuote\`. These quotes are in the document by construction, so anything under 100% is a verifier miss.

| Quote | Pass rate |
|---|---|
| DATE entity text | ${fmt(verifier.recall.entityDATE)} |
| PROVISION entity text | ${fmt(verifier.recall.entityPROVISION)} |
| Enclosing sentence (DATE and PROVISION) | ${fmt(verifier.recall.enclosingSentence)} |
| Returned span's text equals the quote | ${fmt(verifier.recall.returnedSpanMatchesQuote)} |

Entity rates exclude quotes whose matching key (lower-case, no whitespace) is shorter than ${MIN_KEY} characters, which the verifier refuses by design as too short to prove anything: DATE ${recall.entity.DATE.short} (accepted ${recall.entity.DATE.shortOk}), PROVISION ${recall.entity.PROVISION.short} (accepted ${recall.entity.PROVISION.shortOk}). The enclosing sentence is the stretch between sentence breaks (whitespace after \`.\`, \`?\` or \`!\` before a capital letter); judgement rows are already single sentences, so it is usually the whole row.

## c. Span verifier rejection

For every gold DATE and PROVISION entity, one seeded variant of each kind is built and must be rejected by \`checkQuote\` against the entity's own row:

- **digit changed in entity (entity quote):** one digit of the entity text replaced by a different digit; the quote is the entity alone.
- **digit changed in entity (sentence quote):** the same change made inside the enclosing sentence; the quote is the whole sentence.
- **word swapped:** one word of 4+ letters outside the entity replaced by a different corpus word.
- **sentence from another judgment:** a sentence taken from a row of a different judgment.

A variant that genuinely occurs in the row (case- and whitespace-insensitive substring test, independent of the verifier) is not adversarial and is skipped; the skipped count is shown. Rejection = rejected / attempted.

| Entity | Variant | Rejected | Skipped (present) |
|---|---|---|---|
${rejRows.join("\n")}

Typed checks, quoting the enclosing sentence:

| Check | Value |
|---|---|
| \`checkSectionQuote\` with the provision's own first number passes | ${fmt(verifier.typed.sectionRightPasses)} |
| \`checkSectionQuote\` with that number + 1 is rejected | ${fmt(verifier.typed.sectionWrongRejected)} (skipped ${verifier.typed.sectionWrongRejected.skippedPresent}: sentence also contains number + 1) |
| \`checkDateQuote\` with the gold full date passes | ${fmt(verifier.typed.dateRightPasses)} |
| \`checkDateQuote\` with the gold date + 1 day is rejected | ${fmt(verifier.typed.dateWrongRejected)} (skipped ${verifier.typed.dateWrongRejected.skippedPresent}: row has a gold date equal to it) |

## d. Section parsing (\`expandSections\`, \`canonicalSection\`, \`resolveSection\`)

PROVISION entities are kept when the nearest STATUTE entity in the same sentence (by character distance) names an act HalfTime has tables for (IPC, BNS, NDPS, Arms, POCSO, SC/ST, Dowry, Gambling, Gangsters, IT Act). Of ${provisionsWithStatute} provisions with a statute in their sentence, ${criminalProvisions} qualify. The raw entity text (e.g. \`Sections 452, 294 and 506-B\`) goes through \`expandSections\` then \`resolveSection\` and \`applyReadWith\`, giving ${sectionRefs} section references. In the product the model supplies bare section numbers, so this is a harder input than the parser normally sees.

| Outcome per section reference | Share |
|---|---|
${OUTCOMES.map((o) => `| ${o} | ${fmt(sections.outcomes[o]!)} |`).join("\n")}

- **Known maximum:** found in the tables with a fixed term, life or death.
- **Depends:** found, but the row is a modifier (s.34), derivative (s.120B), companion, struck down, subsection-dependent or NDPS quantity-dependent.
- **Not in tables:** a well-formed section number (\`302\`, \`304B\`, \`25(1B)(a)\`) with no row; the engine says it can't tell, which is the safe outcome.
- **Unparsed:** the parser did not isolate a well-formed number; the engine also says it can't tell.

Known maximum by act: ${Object.entries(sections.byAct).map(([k, v]) => `${k} ${fmt(v)}`).join("; ")}.

Top IPC sections not in the tables (well-formed canonical form, count):

| Section | n |
|---|---|
${sections.topUnresolvedIpc.map((x) => `| ${x.section} | ${x.count} |`).join("\n")}

Most frequent unparsed references (\`raw -> canonical\`, count):

| Reference | n |
|---|---|
${sections.topUnparsed.map((x) => `| \`${x.reference}\` | ${x.count} |`).join("\n")}

## Examples

Date false positives (first 10):
${list(report.examples.dateFalsePositives)}

Full gold dates missed by \`findDates\` (first 15):
${list(report.examples.missedFullDates)}

Full gold dates not parsed to the reference date (first 15):
${list(report.examples.fullDatesNotParsedCorrectly)}

Verifier recall failures:
${list(report.examples.verifierRecallFailures)}

Adversarial variants accepted:
${list(report.examples.adversarialVariantsAccepted)}

Typed check failures:
${list(report.examples.typedCheckFailures)}

## Limits

InLegalNER is English only, while HalfTime's main input is Hindi bail orders from district courts; nothing here measures Devanagari dates, Hindi section words or OCR noise. The text is High Court and Supreme Court judgments, not bail orders, so the mix of dates and sections differs from production (many civil, tax and constitutional provisions; fewer charge-sheet sections). The rows are single sentences or preambles, so "document" for the verifier means one row, which is shorter than a real order and makes accidental matches less likely. Entity labels mark spans, not facts: a DATE label says "this is a date", not "this is the custody date", so nothing here tests whether HalfTime picks the right date or the right charge. The statute-to-provision link is a nearest-span heuristic, not a gold relation. Gold labels are themselves imperfect, which mostly lowers the precision figure.
`;
writeFileSync(join(HERE, "report.md"), md);
console.log(`wrote eval/inlegalner/report.json and report.md (${rows.length} rows)`);
