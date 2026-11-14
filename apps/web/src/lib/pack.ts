import JSZip from "jszip";
import { humanDate, parseIsoDate, sectionLabel, type Evaluation, type Verdict } from "@halftime/law";
import { applicationDocx } from "@halftime/reader/application";
import { missingRecords, noticeDocx, type RecordKind } from "@halftime/reader/notice";
import { esc } from "./csv";

/**
 * The jail pack: everything a DLSA secretary or legal-aid clinic needs after a sweep, in one ZIP.
 * Pure: give it the rows and today's date, get a ZIP back. Built in the browser; nothing is sent anywhere.
 */
export interface PackRow {
  id: string;
  caseNo: string | null;
  accused: string;
  court: string | null;
  evaluation: Evaluation;
  /** Verbatim quotes from the papers (label + text), as the 479(3) draft takes them. */
  quotes: { label: string; text: string }[];
  /** The custody start the engine used, when known. */
  custodyStart: string | null;
  /** True for the constructed sample orders. */
  constructed: boolean;
}

export interface PackOptions {
  today: string;
}

/** Lanes in the order a legal-aid team should act on them. */
export const PACK_LANES: { verdict: Verdict; title: string; note: string }[] = [
  { verdict: "PAST_THE_LINE", title: "Past the line", note: "Sec 479(3): the jail superintendent must apply to the court. A lawyer reviews and signs the draft." },
  { verdict: "PAST_FLAGGED", title: "Past the line · flagged", note: "Sec 479(2) may apply (more than one offence, or other cases). A lawyer decides before applying." },
  { verdict: "CANT_TELL", title: "Can't tell", note: "The papers don't give enough. Fetch the record named against each person." },
  { verdict: "NOT_YET", title: "Not yet", note: "Not yet past the line. The date it falls on and the days to go." },
  { verdict: "EXCLUDED", title: "Outside 479", note: "A charged offence allows death or life imprisonment. Other bail routes may exist; a lawyer advises." }
];

const RANK: Record<Verdict, number> = { PAST_THE_LINE: 0, PAST_FLAGGED: 1, CANT_TELL: 2, NOT_YET: 3, EXCLUDED: 4 };

/** Priority order: past the line (most days past first), flagged (same), can't tell, not yet (fewest days to go first), outside 479. */
export function orderRows<T extends Pick<PackRow, "id" | "evaluation">>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const ea = a.evaluation;
    const eb = b.evaluation;
    if (RANK[ea.verdict] !== RANK[eb.verdict]) return RANK[ea.verdict] - RANK[eb.verdict];
    if (ea.verdict === "PAST_THE_LINE" || ea.verdict === "PAST_FLAGGED") return (eb.daysPast ?? 0) - (ea.daysPast ?? 0) || a.id.localeCompare(b.id);
    if (ea.verdict === "NOT_YET") return (ea.daysToGo ?? 0) - (eb.daysToGo ?? 0) || a.id.localeCompare(b.id);
    return a.id.localeCompare(b.id);
  });
}

const VERDICT_TEXT: Record<Verdict, string> = {
  PAST_THE_LINE: "Past the line",
  PAST_FLAGGED: "Past the line, flagged 479(2)",
  CANT_TELL: "Can't tell",
  NOT_YET: "Not yet",
  EXCLUDED: "Outside 479"
};

const custodyQuote = (r: PackRow) => r.quotes.find((q) => /^custody from\b/.test(q.label))?.text.trim() ?? "";
const human = (iso: string | null) => (iso && parseIsoDate(iso) ? humanDate(parseIsoDate(iso)!) : "");

/** docket.csv: one row per person, in priority order. */
export function docketCsv(rows: PackRow[], today: string): string {
  const head = ["rank", "id", "case_no", "accused_masked", "verdict", "sections", "max_term_months", "fraction", "line_date", "days_past", "days_to_go", "flags", "missing", "records_to_request", "custody_start", "custody_source_quote", "constructed_sample", "computed_on"];
  const lines = orderRows(rows).map((r, i) => {
    const e = r.evaluation;
    return [
      i + 1,
      r.id,
      r.caseNo,
      r.accused,
      VERDICT_TEXT[e.verdict],
      e.sections.map(sectionLabel).join("; "),
      e.maxTermMonths,
      e.fraction,
      e.lineDate,
      e.daysPast,
      e.daysToGo,
      e.flags.join(" | "),
      e.missing.join(" | "),
      [...new Set(missingRecords(e).map((m) => RECORD_NAME[m.kind]))].join(" | "),
      r.custodyStart,
      custodyQuote(r),
      r.constructed ? "yes" : "no",
      today
    ]
      .map(esc)
      .join(",");
  });
  return [head.join(","), ...lines].join("\n") + "\n";
}

const html = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** docket.html: a printable report, one page per lane, in the HalfTime paper-and-ink style. */
export function docketHtml(rows: PackRow[], today: string): string {
  const ordered = orderRows(rows);
  const anySample = rows.some((r) => r.constructed);
  const lanes = PACK_LANES.map((lane) => {
    const people = ordered.filter((r) => r.evaluation.verdict === lane.verdict);
    const body = people.length
      ? `<table><thead><tr><th scope="col">Case</th><th scope="col">Person</th><th scope="col">Sections</th><th scope="col">Line</th><th scope="col">${lane.verdict === "NOT_YET" ? "Days to go" : lane.verdict === "CANT_TELL" ? "Missing · ask for" : lane.verdict === "EXCLUDED" ? "Why" : "Days past"}</th></tr></thead><tbody>${people
          .map((r) => {
            const e = r.evaluation;
            const last =
              lane.verdict === "NOT_YET"
                ? String(e.daysToGo)
                : lane.verdict === "CANT_TELL"
                  ? `${e.missing.map(html).join("<br>")}<br><em>${[...new Set(missingRecords(e).map((m) => RECORD_NAME[m.kind]))].map(html).join("; ")}</em>`
                  : lane.verdict === "EXCLUDED"
                    ? "Death or life offence charged"
                    : `+${e.daysPast}${e.flags.length ? `<br><em>${e.flags.map(html).join("<br>")}</em>` : ""}`;
            const quote = custodyQuote(r);
            return `<tr><td class="mono">${html(r.caseNo ?? r.id)}<br><span class="dim">${html(r.id)}</span></td><td class="serif">${html(r.accused)}${quote ? `<br><span class="quote">custody: “${html(quote)}”</span>` : ""}</td><td class="mono">${html(e.sections.map(sectionLabel).join(", "))}</td><td class="mono">${html(human(e.lineDate) || "—")}</td><td class="mono">${last}</td></tr>`;
          })
          .join("")}</tbody></table>`
      : `<p class="dim">No one in this lane.</p>`;
    return `<section class="lane lane-${lane.verdict.toLowerCase()}"><header><h2>${html(lane.title)}</h2><span class="count">${String(people.length).padStart(2, "0")}</span></header><p class="note">${html(lane.note)}</p>${body}</section>`;
  }).join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>HalfTime docket · ${html(human(today))}</title>
<style>
:root{--paper:#F1ECE0;--paper-2:#E6DFCE;--ink:#121315;--ink-3:#55534c;--carbon:#23306B;--carbon-soft:#8FA2CF;--stamp:#C2362B;--stamp-text:#A82A20;--flag:#7A4F10}
*{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.5 Archivo,"Helvetica Neue",Arial,sans-serif}
main{max-width:1000px;margin:0 auto;padding:32px 16px}
.mast{border-bottom:2px solid var(--ink);padding-bottom:16px;margin-bottom:8px}
.mast h1{margin:0;font-size:32px;line-height:1;letter-spacing:-.01em}
.caps{font-size:12px;letter-spacing:.12em;text-transform:uppercase}
.sample{display:inline-block;margin-top:8px;border:1.5px solid var(--stamp-text);color:var(--stamp-text);padding:2px 8px}
.lane{padding-top:24px;break-after:page;page-break-after:always}
.lane:last-of-type{break-after:auto;page-break-after:auto}
.lane header{display:flex;justify-content:space-between;align-items:baseline;border-top:3px solid var(--ink);padding-top:8px}
.lane h2{margin:0;font-size:22px}
.lane-past_the_line h2{color:var(--stamp-text)}.lane-past_flagged h2{color:var(--flag)}.lane-not_yet h2{color:var(--carbon)}
.count{font:600 22px "IBM Plex Mono",ui-monospace,monospace}
.note{margin:4px 0 12px;color:var(--ink-3);font-size:13px}
table{width:100%;border-collapse:collapse;background:#fff;font-size:13px}
th{text-align:left;font-weight:600;border-bottom:2px solid var(--ink);padding:6px 8px;font-size:11px;letter-spacing:.08em;text-transform:uppercase}
td{border-bottom:1px solid var(--carbon-soft);padding:8px;vertical-align:top}
.mono{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:12px}
.serif{font-family:"Tiro Devanagari Hindi","Noto Serif Devanagari",Georgia,serif;font-size:15px}
.quote{font-size:12px;color:var(--ink-3);font-style:italic}
.dim{color:var(--ink-3)}
em{color:var(--ink-3)}
footer{margin-top:24px;border-top:1px solid var(--ink);padding-top:8px;font-size:12px;color:var(--ink-3)}
@media print{body{background:#fff}main{padding:0}}
</style>
</head>
<body>
<main>
<div class="mast">
<p class="caps">HalfTime · Section 479 BNSS screening docket</p>
<h1>Docket for ${html(human(today))}</h1>
<p>${rows.length} people screened, in the order to act on them. Every line date and day count was computed by code from quotes verified in the papers. A lawyer checks each one before anything is filed.</p>
${anySample ? `<p class="sample caps">Constructed sample orders · not real cases</p>` : ""}
</div>
${lanes}
<footer>Screening aid for a lawyer, not legal advice. Computed on ${html(human(today))}. Files in this pack: docket.csv, applications/, notices/, records-requests/.</footer>
</main>
</body>
</html>
`;
}

const RECORD_NAME: Record<RecordKind, string> = {
  custody: "Custody certificate",
  chargesheet: "Charge-sheet copy",
  ndps: "NDPS quantity report"
};

const RECORD_ASK: Record<RecordKind, string> = {
  custody: "A custody certificate showing the date the undertrial was first taken into custody in this case (or a copy of the first remand order).",
  chargesheet: "A copy of the charge-sheet, or of the charges framed by the court, showing each section and sub-section charged.",
  ndps: "A copy of the chemical examiner's (FSL) report and the seizure memo showing the quantity of the substance seized."
};

/** A short formal letter asking for the record that would let the line be worked out. Template, filled by code. */
export function recordsRequest(r: PackRow, today: string): string {
  const recs = missingRecords(r.evaluation);
  const kinds = [...new Set(recs.map((m) => m.kind))];
  const toCourt = kinds.some((k) => k !== "custody");
  const caseRef = r.caseNo ?? "case number __________";
  return [
    "To,",
    "The Superintendent, ______________________ Jail",
    ...(toCourt ? [`and the Presiding Officer, ${r.court ?? "______________________ Court"}`] : []),
    "",
    `Subject: Request for records of undertrial prisoner ${r.accused}, ${caseRef}`,
    "",
    "Sir / Madam,",
    "",
    `The legal-aid panel is reviewing the custody of the undertrial prisoner named above under Section 479 of the Bharatiya Nagarik Suraksha Sanhita, 2023. The period under Section 479(1) cannot be worked out from the papers available, because the following is not stated in them:`,
    "",
    ...r.evaluation.missing.map((m, i) => `  ${i + 1}. ${m}.`),
    "",
    "We request that the following be provided at the earliest:",
    "",
    ...kinds.map((k, i) => `  ${i + 1}. ${RECORD_ASK[k]}`),
    "",
    "Yours faithfully,",
    "",
    "______________________",
    "Legal-aid counsel / paralegal volunteer (name, designation, signature)",
    "",
    `Date: ${human(today)}`,
    "",
    `Reference: HalfTime screening ${r.id}. Prepared as a draft for review by a lawyer before it is sent.${r.constructed ? " Constructed sample order, not a real case." : ""}`,
    ""
  ].join("\n");
}

/** README.txt: what is in the folder and what to do with it. */
export function packReadme(rows: PackRow[], today: string): string {
  const count = (v: Verdict) => rows.filter((r) => r.evaluation.verdict === v).length;
  const anySample = rows.some((r) => r.constructed);
  return [
    "HALFTIME JAIL PACK",
    `Computed on ${human(today)} for ${rows.length} people.`,
    ...(anySample ? ["", "NOTE: this pack includes constructed sample orders. They are not real cases."] : []),
    "",
    `  Past the line:            ${count("PAST_THE_LINE")}`,
    `  Past the line, flagged:   ${count("PAST_FLAGGED")}`,
    `  Can't tell:               ${count("CANT_TELL")}`,
    `  Not yet:                  ${count("NOT_YET")}`,
    `  Outside 479:              ${count("EXCLUDED")}`,
    "",
    "WHAT IS IN THIS FOLDER",
    "",
    "docket.csv        Everyone, in the order to act on them: past the line (most days past first), flagged,",
    "                  can't tell, not yet (soonest first), outside 479. Includes the line date, days past or",
    "                  to go, the missing facts and the court record's own words for the custody date.",
    "docket.html       The same docket as a printable report, one page per lane. Open in a browser and print.",
    "applications/     Draft Sec 479(3) applications, English (-en) and Hindi (-hi), for everyone past the line.",
    "                  Drafts for flagged people carry the Sec 479(2) points a lawyer must decide first.",
    "notices/          'Know your line' notices, Hindi (-hi) and English (-en), for everyone: a one-page",
    "                  plain-language sheet a paralegal can read aloud to the person or the family.",
    "records-requests/ For each person whose line can't be worked out yet: a letter asking the jail or the",
    "                  court for the missing record (custody certificate, charge-sheet copy, NDPS quantity report).",
    "",
    "HOW IT WAS MADE",
    "",
    "A model read the papers and quoted the sentence behind each fact. Code checked every quote against the",
    "papers and applied Section 479 BNSS with a fixed set of rules. No document in this pack says anyone",
    "will be let out: each is a screening aid and a draft. A lawyer must check every one before it is filed,",
    "sent or read out.",
    ""
  ].join("\n");
}

const fileId = (id: string) => id.replace(/[^A-Za-z0-9_-]/g, "_");
const bytes = async (b: Blob) => new Uint8Array(await b.arrayBuffer());

/** Build the whole pack as a JSZip. */
export async function buildPack(rows: PackRow[], { today }: PackOptions): Promise<JSZip> {
  const zip = new JSZip();
  zip.file("README.txt", packReadme(rows, today));
  zip.file("docket.csv", docketCsv(rows, today));
  zip.file("docket.html", docketHtml(rows, today));
  for (const r of orderRows(rows)) {
    const e = r.evaluation;
    const base = { court: r.court, caseNo: r.caseNo, accused: r.accused, today, evaluation: e, quotes: r.quotes };
    const id = fileId(r.id);
    if (e.verdict === "PAST_THE_LINE" || e.verdict === "PAST_FLAGGED") {
      for (const lang of ["en", "hi"] as const) zip.file(`applications/${id}-${lang}.docx`, await bytes(await applicationDocx({ ...base, lang })));
    }
    for (const lang of ["hi", "en"] as const) zip.file(`notices/${id}-${lang}.docx`, await bytes(await noticeDocx({ ...base, lang, custodyStart: r.custodyStart })));
    if (e.verdict === "CANT_TELL") zip.file(`records-requests/${id}.txt`, recordsRequest(r, today));
  }
  return zip;
}

/** The pack as a browser Blob, ready to download. */
export async function packBlob(rows: PackRow[], opts: PackOptions): Promise<Blob> {
  const zip = await buildPack(rows, opts);
  return zip.generateAsync({ type: "blob", mimeType: "application/zip", compression: "DEFLATE" });
}
