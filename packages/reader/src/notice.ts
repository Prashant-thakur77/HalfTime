import { AlignmentType, Document, Header, Packer, Paragraph, TextRun } from "docx";
import { actShortName, daysBetween, describeMonths, humanDate, parseIsoDate, type ActCode, type Evaluation, type SectionResolution } from "@halftime/law";
import { hiDate, hiMonths, hiSection } from "./application.js";

/**
 * "Know your line": a one-page notice in plain words that a paralegal can read aloud to an undertrial or the family.
 * Built only by code, from the verified facts and the engine's evaluation. No model writes any of it.
 */
export interface NoticeData {
  lang: "en" | "hi";
  accused: string;
  caseNo: string | null;
  court: string | null;
  today: string;
  evaluation: Evaluation;
  /** Verbatim quotes from the papers, each with what it supports (same shape as the 479(3) draft). */
  quotes: { label: string; text: string }[];
  /** The custody start the engine used (after any lawyer edits), when known. */
  custodyStart?: string | null;
}

/** A record someone has to fetch before the line can be worked out. */
export type RecordKind = "custody" | "chargesheet" | "ndps";

export interface MissingRecord {
  kind: RecordKind;
  /** The engine's own words for the gap (English). */
  fact: string;
  /** The section the gap is about, when it is about one. */
  section?: Pick<SectionResolution, "act" | "canonical">;
}

/** Map each fact the engine says is missing to the paper that would supply it. */
export function missingRecords(e: Evaluation): MissingRecord[] {
  const out: MissingRecord[] = [];
  for (const fact of e.missing) {
    if (/custody/i.test(fact)) {
      out.push({ kind: "custody", fact });
      continue;
    }
    const m = fact.match(/^Maximum term for (.+)$/);
    const sec = m ? e.sections.find((s) => `${actShortName(s.act as ActCode)} s.${s.canonical}` === m[1]) : undefined;
    if (sec && (sec.punishment?.kind === "quantity" || sec.act === "NDPS")) out.push({ kind: "ndps", fact, section: { act: sec.act, canonical: sec.canonical } });
    else out.push({ kind: "chargesheet", fact, ...(sec ? { section: { act: sec.act, canonical: sec.canonical } } : {}) });
  }
  return out;
}

const T = {
  en: {
    title: "Know your line",
    subtitle: "Section 479 of the Bharatiya Nagarik Suraksha Sanhita, 2023",
    watermark: "NOT LEGAL ADVICE",
    name: "Name",
    caseNo: "Case",
    court: "Court",
    date: "Date of this notice",
    custody: (d: string) => `1. Your custody in this case began on ${d}. This comes from the court record:`,
    custodyUnknown: "1. The papers we have do not show the date your custody began.",
    max: (y: string, s: string) => `2. The longest prison term the law gives for the offence charged against you${s ? ` (${s})` : ""} is ${y}.`,
    maxExcluded: (s: string) => `2. The offence charged against you${s ? ` (${s})` : ""} can be punished with death or with imprisonment for life.`,
    maxUnknown: "2. The papers we have do not show the longest prison term for the offence charged.",
    line: (third: boolean, d: string) =>
      third
        ? `3. The law draws a line at one-third of that term, because the record says this is your first offence. For you, that line falls on ${d}.`
        : `3. The law draws a line at one-half of that term (one-third if it is your first offence). For you, that line falls on ${d}.`,
    inside: (today: string, n: number) => `4. Today, ${today}, you have been inside for ${n} days.`,
    past: (n: number) => `You have crossed the line, ${n} days ago.`,
    pastAct:
      "Under Section 479(3), the jail superintendent must apply to the court for your release on bail. Ask your legal-aid lawyer, or the jail's legal-aid clinic, about this application.",
    flagWhy: (offences: boolean, other: boolean) =>
      `But ${[offences ? "more than one offence is charged against you" : "", other ? "the papers do not settle whether you have other cases pending" : ""].filter(Boolean).join(", and ")}, so under Section 479(2) a court will decide. Ask a lawyer to take this up.`,
    notYet: (d: string, n: number) => `The line falls on ${d}, ${n} days from today.`,
    notYetFirst: (d: string) => `If this is your first offence, the line falls earlier, on ${d}. Tell your lawyer.`,
    cantTell: "We cannot work out your line yet. The papers do not show:",
    cantAsk: "Ask the jail or the court for these papers:",
    excluded: "Section 479 does not cover offences that can be punished with death or with imprisonment for life.",
    excludedAct: "Other routes to bail may still exist. Ask a lawyer.",
    gaps: {
      custody: "the date your custody began",
      chargesheet: (s?: string) => (s ? `the exact charge and its punishment under ${s}` : "the offence charged and its punishment"),
      ndps: (s?: string) => `the quantity of the drug seized${s ? ` (${s})` : ""}`
    },
    asks: {
      custody: "a custody certificate from the jail (or the remand order)",
      chargesheet: "a copy of the charge-sheet, or of the charges framed by the court",
      ndps: "the report on the quantity of the drug seized (the chemical examiner's report)"
    },
    quoteNote: "",
    closing: "This is not legal advice; a lawyer must check it.",
    madeBy: "Worked out by HalfTime from the court papers and the law. It is a screening aid for a lawyer."
  },
  hi: {
    title: "अपनी रेखा जानिए",
    subtitle: "भारतीय नागरिक सुरक्षा संहिता, 2023 की धारा 479",
    watermark: "कानूनी सलाह नहीं",
    name: "नाम",
    caseNo: "मुक़दमा",
    court: "न्यायालय",
    date: "इस सूचना की तिथि",
    custody: (d: string) => `1. इस मुक़दमे में आपकी हिरासत दिनांक ${d} से शुरू हुई। यह न्यायालय के अभिलेख में लिखा है:`,
    custodyUnknown: "1. हमारे पास जो काग़ज़ हैं, उनमें यह नहीं लिखा कि आपकी हिरासत किस दिन शुरू हुई।",
    max: (y: string, s: string) => `2. आप पर लगे अपराध${s ? ` (${s})` : ""} के लिए कानून में सबसे लम्बी क़ैद ${y} की है।`,
    maxExcluded: (s: string) => `2. आप पर लगे अपराध${s ? ` (${s})` : ""} की सज़ा मृत्युदण्ड या आजीवन कारावास हो सकती है।`,
    maxUnknown: "2. हमारे पास जो काग़ज़ हैं, उनसे आप पर लगे अपराध की सबसे लम्बी सज़ा पता नहीं चलती।",
    line: (third: boolean, d: string) =>
      third
        ? `3. कानून इस सज़ा के एक-तिहाई पर एक रेखा खींचता है, क्योंकि अभिलेख के अनुसार यह आपका पहला अपराध है। आपके लिए यह रेखा दिनांक ${d} को पड़ती है।`
        : `3. कानून इस सज़ा के आधे पर एक रेखा खींचता है (पहला अपराध हो तो एक-तिहाई पर)। आपके लिए यह रेखा दिनांक ${d} को पड़ती है।`,
    inside: (today: string, n: number) => `4. आज, दिनांक ${today} तक, आप ${n} दिन अंदर रह चुके हैं।`,
    past: (n: number) => `आप यह रेखा ${n} दिन पहले पार कर चुके हैं।`,
    pastAct:
      "धारा 479(3) के अनुसार जेल अधीक्षक को आपकी ज़मानत पर रिहाई के लिए न्यायालय में आवेदन देना होता है। इस आवेदन के बारे में अपने विधिक सहायता वकील से, या जेल के विधिक सहायता क्लिनिक से पूछिए।",
    flagWhy: (offences: boolean, other: boolean) =>
      `लेकिन ${[offences ? "आप पर एक से अधिक अपराध लगे हैं" : "", other ? "काग़ज़ों से यह साफ़ नहीं है कि आप पर कोई और मुक़दमा चल रहा है या नहीं" : ""].filter(Boolean).join(", और ")}, इसलिए धारा 479(2) के अनुसार फ़ैसला न्यायालय करेगा। किसी वकील से इस बारे में बात कीजिए।`,
    notYet: (d: string, n: number) => `रेखा दिनांक ${d} को पड़ेगी, यानी आज से ${n} दिन बाद।`,
    notYetFirst: (d: string) => `अगर यह आपका पहला अपराध है, तो रेखा पहले, दिनांक ${d} को, पड़ती है। अपने वकील को बताइए।`,
    cantTell: "अभी आपकी रेखा का हिसाब नहीं लग सकता। काग़ज़ों में यह नहीं लिखा:",
    cantAsk: "जेल या न्यायालय से ये काग़ज़ माँगिए:",
    excluded: "धारा 479 उन अपराधों पर लागू नहीं होती जिनकी सज़ा मृत्युदण्ड या आजीवन कारावास हो सकती है।",
    excludedAct: "ज़मानत के दूसरे रास्ते फिर भी हो सकते हैं। किसी वकील से पूछिए।",
    gaps: {
      custody: "आपकी हिरासत किस दिन शुरू हुई",
      chargesheet: (s?: string) => (s ? `${s} में ठीक-ठीक आरोप क्या है और उसकी सज़ा कितनी है` : "कौन-सा अपराध लगा है और उसकी सज़ा कितनी है"),
      ndps: (s?: string) => `पकड़े गए मादक पदार्थ की मात्रा कितनी थी${s ? ` (${s})` : ""}`
    },
    asks: {
      custody: "जेल से हिरासत का प्रमाण-पत्र (या रिमाण्ड का आदेश)",
      chargesheet: "आरोप-पत्र की प्रति, या न्यायालय द्वारा तय किए गए आरोपों की प्रति",
      ndps: "पकड़े गए मादक पदार्थ की मात्रा की रिपोर्ट (रासायनिक परीक्षक की रिपोर्ट)"
    },
    quoteNote: "(न्यायालय के अभिलेख में यह बात अंग्रेज़ी में लिखी है।)",
    closing: "यह कानूनी सलाह नहीं है; किसी वकील को इसे जाँचना होगा।",
    madeBy: "हाफ़टाइम ने न्यायालय के काग़ज़ों और कानून से यह हिसाब लगाया है। यह वकील की मदद के लिए एक जाँच-सूची है।"
  }
};

export interface NoticeBlock {
  /** "p": a numbered fact; "quote": the record's own words; "verdict": the plain verdict sentence(s); "list": items to read out. */
  kind: "p" | "quote" | "verdict" | "list";
  text?: string;
  items?: string[];
}

export interface NoticeLayout {
  lang: "en" | "hi";
  title: string;
  subtitle: string;
  watermark: string;
  meta: { label: string; value: string }[];
  blocks: NoticeBlock[];
  closing: string;
  madeBy: string;
}

function custodyFromTrace(e: Evaluation): string | null {
  const step = e.trace.find((s) => s.step === "custody");
  const m = step?.text.match(/Custody began (\d{1,2}) (\w{3}) (\d{4})/);
  if (!m) return null;
  const mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].indexOf(m[2]!) + 1;
  return `${m[3]}-${String(mon).padStart(2, "0")}-${m[1]!.padStart(2, "0")}`;
}

/** The section whose term sets the maximum (the longest fixed term among the charges). */
function topSection(e: Evaluation): SectionResolution | undefined {
  const terms = e.sections.filter((s) => s.found && s.punishment?.kind === "term");
  return terms.length ? terms.reduce((a, b) => (b.punishment!.months! > a.punishment!.months! ? b : a)) : undefined;
}

const enSection = (s: Pick<SectionResolution, "act" | "canonical">) => `Section ${s.canonical}, ${actShortName(s.act as ActCode)}`;
const hasLatin = (s: string) => /[A-Za-z]/.test(s);

/** The notice, laid out as blocks. Every number is the engine's. */
export function noticeParagraphs(d: NoticeData): NoticeLayout {
  const hi = d.lang === "hi";
  const t = T[d.lang];
  const e = d.evaluation;
  const date = (iso: string) => (hi ? hiDate(iso) : humanDate(parseIsoDate(iso)!));
  const term = (m: number) => (hi ? hiMonths(m) : `${describeMonths(m)} in prison`);
  const sec = (s: Pick<SectionResolution, "act" | "canonical">) => (hi ? hiSection(s) : enSection(s));

  const custody = d.custodyStart && parseIsoDate(d.custodyStart) ? d.custodyStart : custodyFromTrace(e);
  const today = parseIsoDate(d.today)!;
  const custodyOk = custody !== null && parseIsoDate(custody)! <= today;
  const daysInside = e.daysDetained ?? (custodyOk ? daysBetween(parseIsoDate(custody)!, today) : null);

  const blocks: NoticeBlock[] = [];

  // 1. Custody, with the record's own words.
  if (custodyOk) {
    blocks.push({ kind: "p", text: t.custody(date(custody!)) });
    const q = d.quotes.find((x) => /^custody from\b/.test(x.label));
    if (q) {
      if (hi && hasLatin(q.text)) blocks.push({ kind: "quote", text: t.quoteNote });
      else blocks.push({ kind: "quote", text: `“${q.text.trim()}”` });
    }
  } else blocks.push({ kind: "p", text: t.custodyUnknown });

  // 2. The maximum.
  if (e.verdict === "EXCLUDED") {
    const grave = e.sections.filter((s) => s.punishment?.kind === "death" || s.punishment?.kind === "life");
    blocks.push({ kind: "p", text: t.maxExcluded(grave.map(sec).join(", ")) });
  } else if (e.maxTermMonths !== null) {
    const top = topSection(e);
    const shown = top && top.punishment!.months === e.maxTermMonths ? sec(top) : "";
    blocks.push({ kind: "p", text: t.max(term(e.maxTermMonths), shown) });
  } else blocks.push({ kind: "p", text: t.maxUnknown });

  // 3. The line, 4. days inside.
  if (e.lineDate) blocks.push({ kind: "p", text: t.line(e.fraction === "1/3", date(e.lineDate)) });
  if (daysInside !== null) blocks.push({ kind: "p", text: t.inside(date(d.today), daysInside) });

  // The verdict, in plain words.
  switch (e.verdict) {
    case "PAST_THE_LINE":
      blocks.push({ kind: "verdict", text: `${t.past(e.daysPast ?? 0)} ${t.pastAct}` });
      break;
    case "PAST_FLAGGED": {
      const offences = e.flags.some((f) => /^More than one offence/.test(f));
      const other = e.flags.some((f) => /other cases (are )?pending/i.test(f));
      blocks.push({ kind: "verdict", text: `${t.past(e.daysPast ?? 0)} ${t.flagWhy(offences || !other, other)}` });
      break;
    }
    case "NOT_YET":
      blocks.push({ kind: "verdict", text: t.notYet(date(e.lineDate!), e.daysToGo ?? 0) });
      if (e.firstTimeLineDate && e.firstTimeLineDate !== e.lineDate) blocks.push({ kind: "verdict", text: t.notYetFirst(date(e.firstTimeLineDate)) });
      break;
    case "CANT_TELL": {
      const recs = missingRecords(e);
      blocks.push({ kind: "verdict", text: t.cantTell });
      blocks.push({
        kind: "list",
        items: recs.map((r) =>
          r.kind === "custody" ? t.gaps.custody : r.kind === "ndps" ? t.gaps.ndps(r.section && sec(r.section)) : t.gaps.chargesheet(r.section && sec(r.section))
        )
      });
      blocks.push({ kind: "verdict", text: t.cantAsk });
      blocks.push({ kind: "list", items: [...new Set(recs.map((r) => t.asks[r.kind]))] });
      break;
    }
    case "EXCLUDED":
      blocks.push({ kind: "verdict", text: `${t.excluded} ${t.excludedAct}` });
      break;
  }

  return {
    lang: d.lang,
    title: t.title,
    subtitle: t.subtitle,
    watermark: t.watermark,
    meta: [
      { label: t.name, value: d.accused },
      ...(d.caseNo ? [{ label: t.caseNo, value: d.caseNo }] : []),
      ...(d.court ? [{ label: t.court, value: d.court }] : []),
      { label: t.date, value: date(d.today) }
    ],
    blocks,
    closing: t.closing,
    madeBy: t.madeBy
  };
}

/** The notice as plain text, for reading out or pasting into a message. */
export function noticeText(d: NoticeData): string {
  const n = noticeParagraphs(d);
  const out: string[] = [`[${n.watermark}]`, "", n.title.toUpperCase(), n.subtitle, "", ...n.meta.map((m) => `${m.label}: ${m.value}`), ""];
  for (const b of n.blocks) {
    if (b.kind === "list") out.push(...b.items!.map((i) => `  - ${i}`), "");
    else if (b.kind === "quote") out.push(`    ${b.text}`, "");
    else out.push(b.text!, "");
  }
  out.push(n.closing, "", n.madeBy);
  return out.join("\n");
}

/** Large-print Word file (16 pt body), one page. */
export async function noticeDocx(d: NoticeData): Promise<Blob> {
  const n = noticeParagraphs(d);
  const font = d.lang === "hi" ? "Noto Sans Devanagari" : "Arial";
  const run = (text: string, o: { bold?: boolean; italics?: boolean; size?: number; color?: string } = {}) =>
    new TextRun({ text, bold: o.bold, italics: o.italics, size: o.size ?? 32, color: o.color, font });
  const para = (children: TextRun[], o: { center?: boolean; after?: number; indent?: number } = {}) =>
    new Paragraph({
      alignment: o.center ? AlignmentType.CENTER : AlignmentType.LEFT,
      spacing: { after: o.after ?? 200, line: 320 },
      ...(o.indent ? { indent: { left: o.indent } } : {}),
      children
    });
  const body: Paragraph[] = [];
  for (const b of n.blocks) {
    if (b.kind === "list") body.push(...b.items!.map((i) => para([run(`•  ${i}`)], { indent: 400, after: 120 })));
    else if (b.kind === "quote") body.push(para([run(b.text!, { italics: true, size: 28 })], { indent: 600 }));
    else if (b.kind === "verdict") body.push(para([run(b.text!, { bold: true, size: 34 })], { after: 240 }));
    else body.push(para([run(b.text!)]));
  }
  const doc = new Document({
    creator: "HalfTime",
    title: n.title,
    sections: [
      {
        properties: { page: { margin: { top: 1000, bottom: 1000, left: 1100, right: 1100 } } },
        headers: {
          default: new Header({ children: [para([run(n.watermark, { bold: true, color: "A82A20", size: 22 })], { center: true, after: 0 })] })
        },
        children: [
          para([run(n.title, { bold: true, size: 48 })], { center: true, after: 60 }),
          para([run(n.subtitle, { size: 24 })], { center: true, after: 300 }),
          ...n.meta.map((m) => para([run(`${m.label}: `, { bold: true, size: 26 }), run(m.value, { size: 26 })], { after: 60 })),
          para([run("")], { after: 120 }),
          ...body,
          para([run(n.closing, { bold: true, size: 32, color: "A82A20" })], { after: 200 }),
          para([run(n.madeBy, { italics: true, size: 22 })])
        ]
      }
    ]
  });
  return Packer.toBlob(doc);
}

/** The DOCX as bytes, for writing to disk or into a ZIP outside a browser. */
export async function noticeDocxBytes(d: NoticeData): Promise<Uint8Array> {
  return new Uint8Array(await (await noticeDocx(d)).arrayBuffer());
}
