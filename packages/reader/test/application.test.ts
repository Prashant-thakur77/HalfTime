import { describe, expect, it } from "vitest";
import { evaluate } from "@halftime/law";
import { applicationParagraphs, applicationText, hiDate, hiLabel, hiMonths, hiSection } from "../src/application.js";

const TODAY = "2026-11-15";
const evaluation = evaluate(
  { sections: [{ act: "IPC", section: "379" }], custodyStart: "2024-05-20", firstTimeOffender: "true", otherPendingCases: "false" },
  TODAY
);
const base = { court: "न्यायालय सत्र न्यायाधीश, कानपुर नगर", caseNo: "214/2024", accused: "दी— कु—", today: TODAY, evaluation, quotes: [{ label: "custody from 2024-05-20", text: "दिनांक 20.05.2024 से जिला कारागार में निरुद्ध है" }] };

describe("Hindi helpers", () => {
  it("formats dates, terms, labels and sections in Hindi", () => {
    expect(hiDate("2024-05-20")).toBe("20 मई 2024");
    expect(hiMonths(36)).toBe("3 वर्ष");
    expect(hiMonths(18)).toBe("1 वर्ष 6 माह");
    expect(hiMonths(0)).toBe("0 माह");
    expect(hiLabel("custody from 2024-05-20")).toBe("अभिरक्षा प्रारम्भ 20 मई 2024");
    expect(hiLabel("first-time offender: true")).toBe("प्रथम अपराधी: हाँ");
    expect(hiLabel("other cases pending: false")).toBe("अन्य मामले लम्बित: नहीं");
    expect(hiSection({ act: "IPC", canonical: "379" })).toBe("धारा 379 भारतीय दण्ड संहिता, 1860");
  });
});

describe("application drafts", () => {
  it("Hindi body has no English dates or terms", () => {
    const p = applicationParagraphs({ ...base, lang: "hi" });
    const body = p.body.join("\n");
    expect(body).not.toMatch(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/);
    expect(body).not.toMatch(/\byears?\b|IPC 1860/);
    expect(body).toContain("20 मई 2024");
    expect(body).toContain("3 वर्ष");
    expect(p.quotes[0]!.label).toBe("अभिरक्षा प्रारम्भ 20 मई 2024");
  });

  it("does not repeat the court word", () => {
    expect(applicationParagraphs({ ...base, lang: "hi" }).heading[1]).toBe("माननीय न्यायालय सत्र न्यायाधीश, कानपुर नगर");
    expect(applicationParagraphs({ ...base, lang: "en", court: "IN THE COURT OF SESSIONS JUDGE, LUCKNOW" }).heading[1]).toBe("The Hon'ble COURT OF SESSIONS JUDGE, LUCKNOW");
    expect(applicationParagraphs({ ...base, lang: "en", court: "Sessions Judge, Lucknow" }).heading[1]).toBe("The Hon'ble Court of Sessions Judge, Lucknow");
  });

  it("text version carries the watermark, the SC order and the signature blanks", () => {
    const en = applicationText({ ...base, lang: "en" });
    expect(en).toContain("DRAFT FOR LAWYER REVIEW");
    expect(en).toContain("23 Aug 2024");
    expect(en).toContain("Reviewed by legal-aid counsel");
    const hi = applicationText({ ...base, lang: "hi" });
    expect(hi).toContain("23 अगस्त 2024");
    expect(hi).toContain("(नियम-इंजन का चरणबद्ध विवरण, अंग्रेज़ी में)");
  });
});
