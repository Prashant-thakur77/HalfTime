import { describe, expect, it } from "vitest";
import { evaluate, type CaseInput } from "@halftime/law";
import { missingRecords, noticeDocx, noticeParagraphs, noticeText, type NoticeData } from "../src/notice.js";

const TODAY = "2026-11-15";
const ev = (input: Partial<CaseInput>) =>
  evaluate({ sections: [{ act: "IPC", section: "379" }], custodyStart: "2024-05-20", firstTimeOffender: "true", otherPendingCases: "false", ...input }, TODAY);

const CASES = {
  PAST_THE_LINE: ev({}),
  PAST_FLAGGED: ev({ sections: [{ act: "IPC", section: "379" }, { act: "IPC", section: "411" }], custodyStart: "2023-03-14" }),
  NOT_YET: ev({ custodyStart: "2026-06-01", firstTimeOffender: "unknown" }),
  CANT_TELL: ev({ sections: [{ act: "IPC", section: "323" }], custodyStart: null }),
  EXCLUDED: ev({ sections: [{ act: "IPC", section: "302" }] })
};

const data = (lang: "en" | "hi", evaluation = CASES.PAST_THE_LINE, extra: Partial<NoticeData> = {}): NoticeData => ({
  lang,
  accused: lang === "hi" ? "दी— कु—" : "D— K—",
  caseNo: "214/2024",
  court: lang === "hi" ? "न्यायालय सत्र न्यायाधीश, कानपुर नगर" : "Sessions Judge, Kanpur Nagar",
  today: TODAY,
  evaluation,
  quotes: [{ label: "custody from 2024-05-20", text: lang === "hi" ? "दिनांक 20.05.2024 से जिला कारागार में निरुद्ध है" : "in jail since 20.05.2024" }],
  ...extra
});

const EXPECTED: Record<keyof typeof CASES, { en: RegExp[]; hi: RegExp[] }> = {
  PAST_THE_LINE: {
    en: [/You have crossed the line, 544 days ago\./, /Section 479\(3\), the jail superintendent must apply to the court/, /legal-aid lawyer, or the jail's legal-aid clinic/],
    hi: [/आप यह रेखा 544 दिन पहले पार कर चुके हैं।/, /धारा 479\(3\) के अनुसार जेल अधीक्षक/, /विधिक सहायता क्लिनिक/]
  },
  PAST_FLAGGED: {
    en: [/You have crossed the line/, /more than one offence is charged against you/, /Section 479\(2\) a court will decide/, /Ask a lawyer/],
    hi: [/पार कर चुके हैं/, /एक से अधिक अपराध/, /धारा 479\(2\) के अनुसार फ़ैसला न्यायालय करेगा/, /वकील/]
  },
  NOT_YET: {
    en: [/The line falls on 1 Dec 2027, 381 days from today\./, /If this is your first offence, the line falls earlier, on 1 Jun 2027/],
    hi: [/रेखा दिनांक 1 दिसम्बर 2027 को पड़ेगी, यानी आज से 381 दिन बाद।/, /दिनांक 1 जून 2027/]
  },
  CANT_TELL: {
    en: [/We cannot work out your line yet/, /the date your custody began/, /a custody certificate from the jail/],
    hi: [/अभी आपकी रेखा का हिसाब नहीं लग सकता/, /हिरासत किस दिन शुरू हुई/, /हिरासत का प्रमाण-पत्र/]
  },
  EXCLUDED: {
    en: [/Section 479 does not cover offences that can be punished with death or with imprisonment for life/, /Other routes to bail may still exist\. Ask a lawyer\./],
    hi: [/धारा 479 उन अपराधों पर लागू नहीं होती/, /ज़मानत के दूसरे रास्ते/]
  }
};

const ENGLISH_MONTHS = /\b(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\b/;
const FLAT_CLAIMS = /eligible|will be released|पात्र|रिहा हो जाएँगे|रिहा कर दिया जाएगा|रिहाई तय/i;

describe("know-your-line notice", () => {
  for (const [verdict, ev] of Object.entries(CASES) as [keyof typeof CASES, (typeof CASES)[keyof typeof CASES]][]) {
    it(`${verdict}: the right sentence in English and Hindi, no flat claims`, () => {
      expect(ev.verdict).toBe(verdict);
      for (const lang of ["en", "hi"] as const) {
        const text = noticeText(data(lang, ev));
        for (const re of EXPECTED[verdict][lang]) expect(text).toMatch(re);
        expect(text).not.toMatch(FLAT_CLAIMS);
        expect(text).toContain(lang === "en" ? "This is not legal advice; a lawyer must check it." : "यह कानूनी सलाह नहीं है; किसी वकील को इसे जाँचना होगा।");
        expect(text.trimEnd().split("\n").slice(-3)[0]).toBe(noticeParagraphs(data(lang, ev)).closing);
      }
    });

    it(`${verdict}: the Hindi notice has no English month names or Latin letters`, () => {
      const text = noticeText(data("hi", ev));
      expect(text).not.toMatch(ENGLISH_MONTHS);
      expect(text).not.toMatch(/[A-Za-z]/);
    });
  }

  it("numbers match the evaluation", () => {
    const e = CASES.PAST_THE_LINE;
    const en = noticeText(data("en", e));
    expect(en).toContain(`inside for ${e.daysDetained} days`);
    expect(en).toContain(`${e.daysPast} days ago`);
    expect(en).toContain("20 May 2024");
    expect(en).toContain("20 May 2025"); // one-third of 3 years
    expect(en).toContain("3 years in prison");
    expect(en).toContain("one-third of that term");
    const hi = noticeText(data("hi", e));
    expect(hi).toContain(`${e.daysDetained} दिन अंदर`);
    expect(hi).toContain("20 मई 2024");
    expect(hi).toContain("20 मई 2025");
    expect(hi).toContain("3 वर्ष");
    expect(hi).toContain("धारा 379 भारतीय दण्ड संहिता, 1860");
    const n = CASES.NOT_YET;
    expect(noticeText(data("en", n))).toContain(`${n.daysToGo} days from today`);
    expect(noticeText(data("en", n))).toContain("one-half of that term");
  });

  it("quotes the court record for the custody date", () => {
    const n = noticeParagraphs(data("hi", CASES.PAST_THE_LINE));
    expect(n.blocks[1]).toEqual({ kind: "quote", text: "“दिनांक 20.05.2024 से जिला कारागार में निरुद्ध है”" });
    // An English quote is not pasted into the Hindi notice; it says the record is in English instead.
    const mixed = noticeParagraphs(data("hi", CASES.PAST_THE_LINE, { quotes: [{ label: "custody from 2024-05-20", text: "in custody since 20 May 2024" }] }));
    expect(mixed.blocks[1]!.text).toContain("अंग्रेज़ी में");
  });

  it("CANT_TELL still counts days inside when custody is known, and asks for the right papers", () => {
    const ndps = evaluate({ sections: [{ act: "NDPS", section: "20", quantity: "unknown" }], custodyStart: "2025-01-10", firstTimeOffender: "true", otherPendingCases: "false" }, TODAY);
    expect(ndps.verdict).toBe("CANT_TELL");
    expect(missingRecords(ndps).map((r) => r.kind)).toEqual(["ndps"]);
    const en = noticeText(data("en", ndps, { custodyStart: "2025-01-10" }));
    expect(en).toContain("inside for 674 days");
    expect(en).toContain("the chemical examiner's report");
    expect(missingRecords(CASES.CANT_TELL).map((r) => r.kind)).toEqual(["custody"]);
    const dowry = evaluate({ sections: [{ act: "DOWRY", section: "3" }], custodyStart: "2025-01-10", firstTimeOffender: "true", otherPendingCases: "false" }, TODAY);
    if (dowry.verdict === "CANT_TELL") expect(missingRecords(dowry)[0]!.kind).toBe("chargesheet");
  });

  it("builds a Word file", async () => {
    const blob = await noticeDocx(data("hi"));
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(bytes[0]).toBe(0x50); // "PK": a ZIP container
    expect(bytes[1]).toBe(0x4b);
  });
});
