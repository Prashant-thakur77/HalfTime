import type { ActCode, CaseInput, Tri } from "@halftime/law";
import { findDates, normalizeText } from "./normalize.js";

/**
 * Baseline A: a keyword/regex reader feeding the same law engine.
 * It is what a careful script can do without a language model.
 */
const ACT_HINTS: [RegExp, ActCode][] = [
  [/n\.?d\.?p\.?s|एन\s*\.?\s*डी\s*\.?\s*पी\s*\.?\s*एस|स्वापक/i, "NDPS"],
  [/arms\s*act|आयुध|आर्म्स|शस्त्र\s*अधिनियम/i, "ARMS"],
  [/pocso|पॉक्सो|पोक्सो|लैंगिक\s*अपराधों/i, "POCSO"],
  [/sc\s*\/\s*st|अनुसूचित\s*जाति/i, "SCST"],
  [/dowry|दहेज/i, "DOWRY"],
  [/gambling|जुआ/i, "GAMBLING"],
  [/i\.?\s*t\.?\s*act|information\s*technology|सूचना\s*प्रौद्योगिकी/i, "IT"],
  [/excise|आबकारी/i, "EXCISE"],
  [/gangster|गैंगस्टर|गिरोहबंद/i, "GANGSTERS"],
  [/b\.?\s*n\.?\s*s\b|bharatiya\s*nyaya|भारतीय\s*न्याय\s*संहिता|बी\.?\s*एन\.?\s*एस/i, "BNS"],
  [/i\.?\s*p\.?\s*c|indian\s*penal|भा\.?\s*द\.?\s*(वि|सं)|भारतीय\s*दण्?ड\s*संहिता|आई\.?\s*पी\.?\s*सी/i, "IPC"]
];

const SECTION_LIST = String.raw`(\d{1,3}(?:\s?-?\s?[A-Za-zकखगघएबीसीडी]{1,2})?(?:\s?\([0-9A-Za-z-]+\))*(?:\s*(?:\/|,|&|and|व|r\/w|सपठित)\s*\d{1,3}(?:\s?-?\s?[A-Za-zकखगघएबीसीडी]{1,2})?(?:\s?\([0-9A-Za-z-]+\))*)*)`;
const SECTION_RE = new RegExp(String.raw`(?:धारा|धाराओं|धाराएं|u\/s|under\s+sections?|sections?|sec\.?|s\.)\s*` + SECTION_LIST + String.raw`([^\n.|]{0,60})`, "giu");

export function regexExtract(source: string): CaseInput {
  const text = normalizeText(source);
  const sections: CaseInput["sections"] = [];
  for (let m; (m = SECTION_RE.exec(text)); ) {
    const after = m[2] ?? "";
    const act = ACT_HINTS.find(([re]) => re.test(after))?.[1] ?? "IPC";
    for (const part of m[1]!.split(/\/|,|&|\band\b|\s+व\s+|r\/w|सपठित/)) {
      const sec = part.trim();
      if (sec && !sections.some((s) => s.act === act && s.section === sec)) sections.push({ act, section: sec });
    }
  }

  let custodyStart: string | null = null;
  const custodyRe = /(गिरफ्तार|गिरफ़्तार|हिरासत|अभिरक्षा|जेल\s*में|arrested|custody|remand)/i;
  for (const line of text.split(/[\n|]/)) {
    if (custodyRe.test(line)) {
      const d = findDates(line)[0];
      if (d) {
        custodyStart = d.iso;
        break;
      }
    }
  }

  const clean = /(कोई\s*(भी\s*)?(पूर्व\s*)?आपराधिक\s*इतिहास\s*नहीं|no\s*(previous\s*)?criminal\s*(history|antecedents?)|not\s*previously\s*convicted)/i;
  const history = /(आपराधिक\s*इतिहास\s*(है|रहा)|criminal\s*history\s*of|previously\s*convicted|other\s*cases\s*(are\s*)?pending|अन्य\s*मुकदम)/i;
  const firstTimeOffender: Tri = clean.test(text) ? "true" : history.test(text) ? "false" : "unknown";
  const otherPendingCases: Tri = clean.test(text) ? "false" : history.test(text) ? "true" : "unknown";

  return { sections, custodyStart, firstTimeOffender, otherPendingCases };
}
