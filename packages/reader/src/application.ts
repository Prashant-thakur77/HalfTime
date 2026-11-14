import { AlignmentType, BorderStyle, Document, Header, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import { describeMonths, humanDate, parseIsoDate, sectionLabel, type Evaluation } from "@halftime/law";

export interface ApplicationData {
  lang: "en" | "hi";
  court: string | null;
  caseNo: string | null;
  accused: string;
  today: string;
  evaluation: Evaluation;
  /** Verbatim quotes from the papers, each with what it supports. */
  quotes: { label: string; text: string }[];
}

const T = {
  en: {
    watermark: "DRAFT FOR LAWYER REVIEW · NOT FILED",
    title: "APPLICATION UNDER SECTION 479(3) OF THE BHARATIYA NAGARIK SURAKSHA SANHITA, 2023",
    to: "To,",
    court: (c: string) => (/^(in\s+)?the\s+court|^court\b/i.test(c.trim()) ? `The Hon'ble ${c.trim().replace(/^(in\s+)?the\s+/i, "")}` : `The Hon'ble Court of ${c}`),
    from: "From: The Superintendent, ______________________ Jail",
    subject: (a: string, c: string) => `Subject: Release of undertrial prisoner ${a} in ${c} on having undergone the period under Section 479(1) BNSS`,
    respectfully: "Respectfully showeth:",
    p1: (a: string, s: string) => `1. The undertrial prisoner ${a} is detained in this jail in connection with the above case, charged under ${s}.`,
    p2: (d: string, days: number) => `2. As per the court record, the prisoner has been in custody since ${d}, that is, ${days} days as of the date of this application.`,
    p3: (m: string, f: string, line: string) => `3. The maximum punishment specified for the offence charged is imprisonment for ${m}. ${f} of that period was completed on ${line}.`,
    p3ft: "The record shows the prisoner has no previous conviction, so the one-third period under the first proviso to Section 479(1) applies.",
    p4: (n: number) => `4. The prisoner has therefore undergone the period required by Section 479(1) BNSS, and has done so ${n} days ago.`,
    p5: "5. Section 479(3) BNSS requires the Superintendent of the jail, where the accused has completed the period mentioned in sub-section (1), to forthwith make an application in writing to the Court for release of such person.",
    p6pre: (d: string) => `6. The case was registered before 1 July 2024. By its order dated ${d} in In Re: Inhuman Conditions in 1382 Prisons, W.P.(C) No. 406 of 2013, the Hon'ble Supreme Court has directed that Section 479 BNSS applies to undertrials in such cases as well.`,
    flags: "Points for the reviewing lawyer before filing:",
    record: "Extracts from the court record relied on:",
    computation: "Computation",
    computationNote: "",
    prayer: "It is therefore prayed that the Hon'ble Court may be pleased to order the release of the undertrial prisoner on bail or bond, on such conditions as the Court deems fit.",
    sigJail: "Superintendent, ______________________ Jail",
    sigLawyer: "Reviewed by legal-aid counsel: ______________________ (name, enrolment no., signature)",
    date: (d: string) => `Date: ${d}`,
    disclaimer: "Prepared with HalfTime as a screening draft. The computation must be checked against the full court record before filing."
  },
  hi: {
    watermark: "अधिवक्ता की जाँच हेतु मसौदा · दाखिल नहीं",
    title: "भारतीय नागरिक सुरक्षा संहिता, 2023 की धारा 479(3) के अन्तर्गत प्रार्थना पत्र",
    to: "सेवा में,",
    court: (c: string) => (c.trim().startsWith("न्यायालय") ? `माननीय ${c.trim()}` : `माननीय न्यायालय ${c}`),
    from: "प्रेषक: अधीक्षक, ______________________ कारागार",
    subject: (a: string, c: string) => `विषय: ${c} में विचाराधीन बन्दी ${a} को धारा 479(1) बीएनएसएस में निर्धारित अवधि पूर्ण होने पर रिहा किए जाने हेतु`,
    respectfully: "सविनय निवेदन है कि:",
    p1: (a: string, s: string) => `1. विचाराधीन बन्दी ${a} उपरोक्त मामले में ${s} के अन्तर्गत आरोपित होकर इस कारागार में निरुद्ध है।`,
    p2: (d: string, days: number) => `2. न्यायालय अभिलेख के अनुसार बन्दी दिनांक ${d} से अभिरक्षा में है, अर्थात इस प्रार्थना पत्र की तिथि तक ${days} दिन।`,
    p3: (m: string, f: string, line: string) => `3. आरोपित अपराध हेतु निर्धारित अधिकतम दण्ड ${m} का कारावास है। इस अवधि का ${f} दिनांक ${line} को पूर्ण हो चुका है।`,
    p3ft: "अभिलेख के अनुसार बन्दी की कोई पूर्व दोषसिद्धि नहीं है, अतः धारा 479(1) के प्रथम परन्तुक की एक-तिहाई अवधि लागू है।",
    p4: (n: number) => `4. अतः बन्दी धारा 479(1) बीएनएसएस में अपेक्षित अवधि ${n} दिन पूर्व पूर्ण कर चुका है।`,
    p5: "5. धारा 479(3) बीएनएसएस के अनुसार, जहाँ अभियुक्त ने उपधारा (1) में उल्लिखित अवधि पूर्ण कर ली है, कारागार अधीक्षक ऐसे व्यक्ति की रिहाई हेतु तत्काल न्यायालय को लिखित प्रार्थना पत्र देगा।",
    p6pre: (d: string) => `6. यह मामला 1 जुलाई 2024 से पूर्व पंजीकृत है। माननीय सर्वोच्च न्यायालय ने In Re: Inhuman Conditions in 1382 Prisons, W.P.(C) No. 406/2013 में दिनांक ${d} के आदेश द्वारा निर्देशित किया है कि धारा 479 बीएनएसएस ऐसे मामलों के विचाराधीन बन्दियों पर भी लागू होगी।`,
    flags: "दाखिल करने से पूर्व अधिवक्ता हेतु बिन्दु:",
    record: "न्यायालय अभिलेख के उद्धरण जिन पर भरोसा किया गया:",
    computation: "गणना",
    computationNote: "(नियम-इंजन का चरणबद्ध विवरण, अंग्रेज़ी में)",
    prayer: "अतः प्रार्थना है कि माननीय न्यायालय विचाराधीन बन्दी को उचित शर्तों पर ज़मानत या बन्धपत्र पर रिहा करने का आदेश पारित करने की कृपा करें।",
    sigJail: "अधीक्षक, ______________________ कारागार",
    sigLawyer: "विधिक सहायता अधिवक्ता द्वारा जाँचा गया: ______________________ (नाम, नामांकन सं., हस्ताक्षर)",
    date: (d: string) => `दिनांक: ${d}`,
    disclaimer: "हाफ़टाइम द्वारा जाँच-मसौदे के रूप में तैयार। दाखिल करने से पूर्व पूरी पत्रावली से गणना का मिलान आवश्यक है।"
  }
};

export function applicationParagraphs(d: ApplicationData) {
  const t = T[d.lang];
  const e = d.evaluation;
  const hi = d.lang === "hi";
  const fmt = (iso: string | null) => (iso ? (hi ? hiDate(iso) : humanDate(parseIsoDate(iso)!)) : "__________");
  const term = (m: number) => (hi ? hiMonths(m) : describeMonths(m));
  const sections = e.sections.filter((s) => s.found).map((x) => (hi ? hiSection(x) : sectionLabel(x))).join(", ") || "__________";
  const caseNo = d.caseNo ?? "Case No. __________";
  const fraction = e.fraction === "1/3" ? (d.lang === "hi" ? "एक-तिहाई" : "One-third") : d.lang === "hi" ? "आधा" : "One-half";
  const body: string[] = [];
  body.push(t.p1(d.accused, sections));
  body.push(t.p2(hi ? fmt(custodyIso(e)) : custodyDate(e) ?? "__________", e.daysDetained ?? 0));
  body.push(`${t.p3(e.maxTermMonths ? term(e.maxTermMonths) : "__________", fraction, fmt(e.lineDate))}${e.fraction === "1/3" ? " " + t.p3ft : ""}`);
  body.push(t.p4(e.daysPast ?? 0));
  body.push(t.p5);
  if (e.provision === "BNSS_479_PRE_JULY_2024") body.push(t.p6pre(hi ? hiDate("2024-08-23") : "23 Aug 2024"));
  return {
    t,
    heading: [t.to, t.court(d.court ?? "__________"), t.from, t.subject(d.accused, caseNo)],
    body,
    flags: e.flags,
    quotes: hi ? d.quotes.map((q) => ({ ...q, label: hiLabel(q.label) })) : d.quotes,
    computation: e.trace.map((s) => s.text)
  };
}

const HI_MONTHS = ["जनवरी", "फ़रवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितम्बर", "अक्टूबर", "नवम्बर", "दिसम्बर"];

/** "20 मई 2024" */
export function hiDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${HI_MONTHS[m! - 1]} ${y}`;
}

/** "3 वर्ष", "1 वर्ष 6 माह" */
export function hiMonths(months: number): string {
  const y = Math.floor(months / 12);
  const m = months % 12;
  return [y ? `${y} वर्ष` : "", m ? `${m} माह` : ""].filter(Boolean).join(" ") || "0 माह";
}

const HI_ACTS: Record<string, string> = {
  IPC: "भारतीय दण्ड संहिता, 1860",
  BNS: "भारतीय न्याय संहिता, 2023",
  NDPS: "स्वापक औषधि एवं मनःप्रभावी पदार्थ अधिनियम, 1985",
  ARMS: "आयुध अधिनियम, 1959",
  POCSO: "लैंगिक अपराधों से बालकों का संरक्षण अधिनियम, 2012",
  SCST: "अनुसूचित जाति एवं अनुसूचित जनजाति (अत्याचार निवारण) अधिनियम, 1989",
  DOWRY: "दहेज प्रतिषेध अधिनियम, 1961",
  GAMBLING: "सार्वजनिक द्यूत अधिनियम, 1867",
  IT: "सूचना प्रौद्योगिकी अधिनियम, 2000",
  EXCISE: "आबकारी अधिनियम",
  GANGSTERS: "उ.प्र. गिरोहबन्द अधिनियम, 1986",
  OTHER: "अन्य विधि"
};

/** "धारा 379 भारतीय दण्ड संहिता, 1860" */
export function hiSection(r: { act: string; canonical: string }): string {
  return `धारा ${r.canonical} ${HI_ACTS[r.act] ?? r.act}`;
}

/** Field labels on quotes, in Hindi. */
export function hiLabel(label: string): string {
  return label
    .replace(/^custody from (\S+)/, (_m, d: string) => `अभिरक्षा प्रारम्भ ${/^\d{4}-\d{2}-\d{2}$/.test(d) ? hiDate(d) : d}`)
    .replace(/^registered (\S+)/, (_m, d: string) => `प्रथम सूचना रिपोर्ट ${/^\d{4}-\d{2}-\d{2}$/.test(d) ? hiDate(d) : d}`)
    .replace(/^first-time offender: true$/, "प्रथम अपराधी: हाँ")
    .replace(/^first-time offender: false$/, "प्रथम अपराधी: नहीं")
    .replace(/^other cases pending: true$/, "अन्य मामले लम्बित: हाँ")
    .replace(/^other cases pending: false$/, "अन्य मामले लम्बित: नहीं")
    .replace(/^IPC /, "भा.द.वि. धारा ")
    .replace(/^BNS /, "बी.एन.एस. धारा ");
}

function custodyIso(e: Evaluation): string | null {
  if (!e.lineDate || !e.trace.length) return null;
  const step = e.trace.find((s) => s.step === "custody");
  const m = step?.text.match(/Custody began (\d{1,2}) (\w{3}) (\d{4})/);
  if (!m) return null;
  const mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].indexOf(m[2]!) + 1;
  return `${m[3]}-${String(mon).padStart(2, "0")}-${m[1]!.padStart(2, "0")}`;
}

function custodyDate(e: Evaluation): string | null {
  const step = e.trace.find((s) => s.step === "custody");
  return step ? step.text.replace(/^Custody began /, "").replace(/\.$/, "") : null;
}

export async function applicationDocx(d: ApplicationData): Promise<Blob> {
  const p = applicationParagraphs(d);
  const font = d.lang === "hi" ? "Noto Sans Devanagari" : "Times New Roman";
  const para = (text: string, opts: { bold?: boolean; center?: boolean; size?: number; italics?: boolean; space?: number } = {}) =>
    new Paragraph({
      alignment: opts.center ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
      spacing: { after: opts.space ?? 160 },
      children: [new TextRun({ text, bold: opts.bold, italics: opts.italics, size: opts.size ?? 24, font })]
    });
  const cell = (text: string) =>
    new TableCell({
      width: { size: 100, type: WidthType.PERCENTAGE },
      children: [new Paragraph({ children: [new TextRun({ text, size: 20, font })] })]
    });
  const doc = new Document({
    creator: "HalfTime",
    title: p.t.title,
    sections: [
      {
        headers: {
          default: new Header({
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: p.t.watermark, bold: true, color: "C2362B", size: 20, font })] })]
          })
        },
        children: [
          para(p.t.title, { bold: true, center: true, size: 26, space: 300 }),
          ...p.heading.map((h) => para(h, { space: 80 })),
          para(p.t.respectfully, { space: 200 }),
          ...p.body.map((b) => para(b)),
          ...(p.quotes.length
            ? [para(p.t.record, { bold: true }), ...p.quotes.map((q) => para(`${q.label}: "${q.text}"`, { italics: true, size: 22 }))]
            : []),
          para(`${p.t.computation} ${p.t.computationNote}`.trim(), { bold: true }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: "8FA2CF" },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: "8FA2CF" },
              left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: "D9D0BA" },
              insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }
            },
            rows: p.computation.map((c) => new TableRow({ children: [cell(c)] }))
          }),
          ...(p.flags.length ? [para(p.t.flags, { bold: true }), ...p.flags.map((f) => para(`• ${f}`, { size: 22 }))] : []),
          para(p.t.prayer, { space: 400 }),
          para(p.t.sigJail, { space: 200 }),
          para(p.t.sigLawyer, { space: 200 }),
          para(p.t.date(d.today)),
          para(p.t.disclaimer, { italics: true, size: 18 })
        ]
      }
    ]
  });
  return Packer.toBlob(doc);
}

/** The draft as plain text, for showing in a chat or saving as .md. */
export function applicationText(d: ApplicationData): string {
  const p = applicationParagraphs(d);
  const out: string[] = [`[${p.t.watermark}]`, "", p.t.title, "", ...p.heading, "", p.t.respectfully, "", ...p.body.flatMap((b) => [b, ""])];
  if (p.quotes.length) out.push(p.t.record, ...p.quotes.map((q) => `  ${q.label}: "${q.text}"`), "");
  out.push(`${p.t.computation} ${p.t.computationNote}`.trim(), ...p.computation.map((c, i) => `  ${String(i + 1).padStart(2, "0")}. ${c}`), "");
  if (p.flags.length) out.push(p.t.flags, ...p.flags.map((f) => `  - ${f}`), "");
  out.push(p.t.prayer, "", p.t.sigJail, "", p.t.sigLawyer, "", p.t.date(d.today), "", p.t.disclaimer);
  return out.join("\n");
}

/** The DOCX as bytes, for writing to disk outside a browser. */
export async function applicationDocxBytes(d: ApplicationData): Promise<Uint8Array> {
  return new Uint8Array(await (await applicationDocx(d)).arrayBuffer());
}
