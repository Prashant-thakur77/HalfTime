import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { DocIndex, checkDateQuote, checkQuote, checkSectionQuote, matchKey } from "../src/index.js";
import { ENGLISH_ORDER, HINDI_ORDER } from "./fixtures.js";

const doc = new DocIndex(HINDI_ORDER);

describe("DocIndex.find", () => {
  it("finds an exact quote and maps the span", () => {
    const q = "अभियुक्त का कोई आपराधिक इतिहास नहीं है";
    const span = doc.find(q)!;
    expect(doc.text.slice(span.start, span.end)).toBe(q);
  });
  it("tolerates whitespace differences", () => {
    expect(doc.find("अभियुक्त  का\nकोई आपराधिक इतिहास  नहीं है")).not.toBeNull();
    expect(doc.find("धारा 379,411 भा.द.वि.")).not.toBeNull();
  });
  it("tolerates Devanagari vs ASCII digits", () => {
    expect(doc.find("दिनांक १२.०३.२०२३ को गिरफ्तार")).not.toBeNull();
    expect(doc.find("आदेश दिनांक 15.09.2024")).not.toBeNull();
  });
  it("tolerates case in English", () => {
    expect(new DocIndex(ENGLISH_ORDER).find("THE APPLICANT HAS NO CRIMINAL ANTECEDENTS")).not.toBeNull();
  });
  it("rejects paraphrase", () => {
    expect(doc.find("अभियुक्त का कोई पूर्व आपराधिक इतिहास नहीं है")).toBeNull();
    expect(doc.find("the accused has no criminal history")).toBeNull();
  });
  it("rejects trivially short quotes", () => {
    expect(doc.find("379")).toBeNull();
    expect(doc.find("")).toBeNull();
    expect(doc.find(null)).toBeNull();
  });
});

describe("checks", () => {
  it("checkQuote reasons", () => {
    expect(checkQuote(doc, null)).toEqual({ ok: false, reason: "No supporting quote given." });
    expect(checkQuote(doc, "यह वाक्य दस्तावेज़ में नहीं है")).toEqual({ ok: false, reason: "The quoted text is not in the document." });
  });
  it("section quote must contain the number", () => {
    expect(checkSectionQuote(doc, "379", "अन्तर्गत धारा 379, 411 भा.द.वि.").ok).toBe(true);
    expect(checkSectionQuote(doc, "411", "अन्तर्गत धारा 379, 411 भा.द.वि.").ok).toBe(true);
    const r = checkSectionQuote(doc, "302", "अन्तर्गत धारा 379, 411 भा.द.वि.");
    expect(r).toEqual({ ok: false, reason: "The quote doesn't mention section 302." });
  });
  it("section numbers match whole numbers only", () => {
    expect(checkSectionQuote(doc, "37", "अन्तर्गत धारा 379, 411 भा.द.वि.").ok).toBe(false);
    expect(checkSectionQuote(doc, "41", "अन्तर्गत धारा 379, 411 भा.द.वि.").ok).toBe(false);
  });
  it("rejects a non-number section", () => {
    expect(checkSectionQuote(doc, "abc", "अन्तर्गत धारा 379, 411 भा.द.वि.")).toEqual({ ok: false, reason: '"abc" is not a section number.' });
  });
  it("passes through a missing quote for sections and dates", () => {
    expect(checkSectionQuote(doc, "379", null).ok).toBe(false);
    expect(checkDateQuote(doc, "2023-03-12", null).ok).toBe(false);
  });
  it("date quote must contain the claimed date", () => {
    expect(checkDateQuote(doc, "2023-03-12", "अभियुक्त को दिनांक 12.03.2023 को गिरफ्तार कर").ok).toBe(true);
    expect(checkDateQuote(doc, "2023-06-20", "अभियुक्त को दिनांक 12.03.2023 को गिरफ्तार कर")).toEqual({
      ok: false,
      reason: "The quote gives 2023-03-12, not 2023-06-20."
    });
    expect(checkDateQuote(doc, "2023-03-12", "अभियुक्त का कोई आपराधिक इतिहास नहीं है")).toEqual({ ok: false, reason: "The quote contains no date." });
  });
});

/** 50 planted fake quotes: each is a real sentence from the order, mutated so it says something the order doesn't. */
describe("planted fake quotes are always rejected", () => {
  const real = [
    "अभियुक्त को दिनांक 12.03.2023 को गिरफ्तार कर जिला कारागार भेजा गया",
    "अभियुक्त का कोई आपराधिक इतिहास नहीं है",
    "अन्तर्गत धारा 379, 411 भा.द.वि., थाना कल्याणपुर",
    "आरोप पत्र दिनांक 20.06.2023 को प्रेषित किया जा चुका है",
    "वादी के घर से मोटरसाइकिल चोरी हो गई",
    "पत्रावली के अवलोकन से स्पष्ट है कि आरोप पत्र",
    "जमानत प्रार्थना पत्र संख्या 1123/2024"
  ];
  const mutations: [string, (s: string) => string][] = [
    ["change a digit", (s) => s.replace(/\d/, (d) => String((Number(d) + 1) % 10))],
    ["swap day and month", (s) => s.replace(/(\d{2})\.(\d{2})/, "$2.$1")],
    ["insert a negation", (s) => s.replace("है", "नहीं है")],
    ["drop a word", (s) => s.split(" ").filter((_, i) => i !== 2).join(" ")],
    ["append a claim", (s) => `${s} तथा 3 अन्य मुकदमे लंबित हैं`],
    ["prepend a claim", (s) => `धारा 302 भा.द.वि. ${s}`],
    ["replace a word", (s) => s.replace(/अभियुक्त|आरोप|अन्तर्गत|वादी/, "सह-अभियुक्त")],
    ["translate to English", () => "The accused was arrested on 12.03.2023 and has no criminal history"],
    ["change the year", (s) => s.replace(/20(2\d)/, (_m, y: string) => `20${Number(y) - 1}`)],
    ["reorder words", (s) => s.split(" ").reverse().join(" ")]
  ];
  let n = 0;
  for (const r of real) {
    it(`control: the real quote is found — ${r.slice(0, 30)}`, () => expect(doc.find(r)).not.toBeNull());
    for (const [name, mutate] of mutations) {
      const fake = mutate(r);
      if (matchKey(fake) === matchKey(r)) continue;
      n++;
      it(`#${n} ${name}: ${fake.slice(0, 40)}`, () => expect(doc.find(fake)).toBeNull());
    }
  }
  it("planted at least 50 distinct fakes", () => expect(n).toBeGreaterThanOrEqual(50));
});

describe("verifier properties", () => {
  it("any substring of the document of 6+ key chars is found, and maps back to itself", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: doc.text.length - 20 }), fc.integer({ min: 8, max: 60 }), (start, len) => {
        const sub = doc.text.slice(start, start + len);
        if (matchKey(sub).length < 6) return;
        const span = doc.find(sub)!;
        expect(span).not.toBeNull();
        expect(matchKey(doc.text.slice(span.start, span.end))).toBe(matchKey(sub));
      }),
      { numRuns: 300 }
    );
  });
  it("random strings are not found", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 12, maxLength: 40 }), (s) => {
        expect(doc.find(`ZZ${s}QQ`)).toBeNull();
      }),
      { numRuns: 300 }
    );
  });
});
