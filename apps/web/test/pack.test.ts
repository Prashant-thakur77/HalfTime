import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { decide } from "@halftime/reader";
import { RUNS, SAMPLES } from "@/lib/cases";
import { buildPack, docketCsv, docketHtml, orderRows, packReadme, recordsRequest, type PackRow } from "@/lib/pack";

const TODAY = "2026-11-14";

const rows: PackRow[] = SAMPLES.filter((s) => RUNS[s.id]).map((s) => {
  const ex = RUNS[s.id]!.extraction;
  const r = decide(s.text, ex, TODAY);
  return {
    id: s.id,
    caseNo: ex.case_no,
    accused: ex.accused_name_masked,
    court: ex.court,
    evaluation: r.evaluation,
    quotes: r.facts.spans.map((sp) => ({ label: sp.label, text: r.text.slice(sp.start, sp.end) })),
    custodyStart: r.facts.input.custodyStart,
    constructed: true
  };
});

const byVerdict = (v: string) => rows.filter((r) => r.evaluation.verdict === v).map((r) => r.id);
const FLAT = /eligible|will be released|पात्र/i;

describe("jail pack", () => {
  it("orders people: past by days past, flagged, can't tell, not yet by days to go, outside 479", () => {
    const ordered = orderRows(rows);
    const verdicts = ordered.map((r) => r.evaluation.verdict);
    const rank = ["PAST_THE_LINE", "PAST_FLAGGED", "CANT_TELL", "NOT_YET", "EXCLUDED"];
    expect(verdicts.map((v) => rank.indexOf(v))).toEqual([...verdicts.map((v) => rank.indexOf(v))].sort((a, b) => a - b));
    const past = ordered.filter((r) => r.evaluation.verdict === "PAST_THE_LINE").map((r) => r.evaluation.daysPast!);
    expect(past).toEqual([...past].sort((a, b) => b - a));
    const flagged = ordered.filter((r) => r.evaluation.verdict === "PAST_FLAGGED").map((r) => r.evaluation.daysPast!);
    expect(flagged).toEqual([...flagged].sort((a, b) => b - a));
    const notYet = ordered.filter((r) => r.evaluation.verdict === "NOT_YET").map((r) => r.evaluation.daysToGo!);
    expect(notYet).toEqual([...notYet].sort((a, b) => a - b));
    // Concretely, for the sample jail on this date.
    expect(ordered.map((r) => r.id)).toEqual(["S02", "S03", "S07", "S01", "S11", "S09", "S05", "S10", "S12", "S06", "S08", "S04"]);
  });

  it("docket.csv carries verdict, line, days, missing facts and the custody quote, in priority order", () => {
    const csv = docketCsv(rows, TODAY);
    const lines = csv.trim().split("\n");
    expect(lines[0]).toBe(
      "rank,id,case_no,accused_masked,verdict,sections,max_term_months,fraction,line_date,days_past,days_to_go,flags,missing,records_to_request,custody_start,custody_source_quote,constructed_sample,computed_on"
    );
    expect(lines).toHaveLength(rows.length + 1);
    expect(lines[1]).toMatch(/^1,S02,.*,Past the line,.*,2025-05-20,543,,/);
    expect(lines.find((l) => l.includes(",S05,"))).toContain("The date custody began");
    expect(lines.find((l) => l.includes(",S05,"))).toContain("Custody certificate");
    const s02 = rows.find((r) => r.id === "S02")!;
    expect(lines[1]).toContain(s02.quotes.find((q) => q.label.startsWith("custody from"))!.text.trim());
  });

  it("docket.html has one page per lane, the date and the constructed-sample note", () => {
    const h = docketHtml(rows, TODAY);
    expect(h).toContain("Docket for 14 Nov 2026");
    expect(h).toContain("Constructed sample orders");
    expect(h.match(/<section class="lane /g)).toHaveLength(5);
    expect(h).toContain("break-after:page");
    expect(h.indexOf("Past the line</h2>")).toBeLessThan(h.indexOf("Can&#39;t tell</h2>"));
    expect(docketHtml(rows.map((r) => ({ ...r, constructed: false })), TODAY)).not.toContain("Constructed sample orders");
  });

  it("records requests name the missing record", () => {
    const s05 = rows.find((r) => r.id === "S05")!;
    const letter = recordsRequest(s05, TODAY);
    expect(letter).toContain("The Superintendent");
    expect(letter).toContain("custody certificate");
    expect(letter).toContain("The date custody began.");
    const s10 = rows.find((r) => r.id === "S10")!;
    expect(recordsRequest(s10, TODAY)).toContain("charge-sheet");
  });

  it("zips the expected files for each verdict and never says eligible", async () => {
    const zip = await buildPack(rows, { today: TODAY });
    const data = await zip.generateAsync({ type: "uint8array" });
    const opened = await JSZip.loadAsync(data);
    const names = Object.keys(opened.files).filter((n) => !opened.files[n]!.dir).sort();

    const expected = ["README.txt", "docket.csv", "docket.html"];
    for (const id of [...byVerdict("PAST_THE_LINE"), ...byVerdict("PAST_FLAGGED")]) expected.push(`applications/${id}-en.docx`, `applications/${id}-hi.docx`);
    for (const r of rows) expected.push(`notices/${r.id}-hi.docx`, `notices/${r.id}-en.docx`);
    for (const id of byVerdict("CANT_TELL")) expected.push(`records-requests/${id}.txt`);
    expect(names).toEqual(expected.sort());
    expect(names.filter((n) => n.startsWith("applications/"))).toHaveLength(12); // 6 past × 2 languages
    expect(names.filter((n) => n.startsWith("records-requests/"))).toEqual(["records-requests/S05.txt", "records-requests/S10.txt"]);

    for (const n of names) {
      let text: string;
      if (n.endsWith(".docx")) {
        const inner = await JSZip.loadAsync(await opened.file(n)!.async("uint8array"));
        text = await inner.file("word/document.xml")!.async("string");
      } else text = await opened.file(n)!.async("string");
      expect(text, n).not.toMatch(FLAT);
    }
    // Flagged drafts carry the 479(2) points.
    const s01 = await JSZip.loadAsync(await opened.file("applications/S01-en.docx")!.async("uint8array"));
    expect(await s01.file("word/document.xml")!.async("string")).toContain("More than one offence is charged");
  });

  it("README explains the folder", () => {
    const r = packReadme(rows, TODAY);
    for (const s of ["docket.csv", "docket.html", "applications/", "notices/", "records-requests/", "constructed sample orders"]) expect(r).toContain(s);
  });
});
