import { sectionLabel, type Evaluation } from "@halftime/law";

export interface CsvRow {
  id: string;
  caseNo: string | null;
  accused: string;
  evaluation: Evaluation;
}

export const esc = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** One row per person, the columns a DLSA secretary needs to act. */
export function toCsv(rows: CsvRow[], today: string): string {
  const head = ["id", "case_no", "accused_masked", "verdict", "sections", "max_term_months", "fraction", "line_date", "days_past", "days_to_go", "flags", "missing", "computed_on"];
  const lines = rows.map((r) => {
    const e = r.evaluation;
    return [
      r.id,
      r.caseNo,
      r.accused,
      e.verdict,
      e.sections.map(sectionLabel).join("; "),
      e.maxTermMonths,
      e.fraction,
      e.lineDate,
      e.daysPast,
      e.daysToGo,
      e.flags.join(" | "),
      e.missing.join(" | "),
      today
    ]
      .map(esc)
      .join(",");
  });
  return [head.join(","), ...lines].join("\n") + "\n";
}

export function download(name: string, data: Blob) {
  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
