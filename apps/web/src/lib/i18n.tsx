"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "hi";

const DICT = {
  "nav.index": { en: "Index", hi: "सूची" },
  "nav.sweep": { en: "Run a jail sweep", hi: "जेल स्वीप चलाएँ" },
  "nav.home": { en: "Home", hi: "मुखपृष्ठ" },
  "nav.vs": { en: "Chatbot vs HalfTime", hi: "चैटबॉट बनाम हाफ़टाइम" },
  "nav.results": { en: "Proof", hi: "प्रमाण" },
  "nav.law": { en: "The law", hi: "क़ानून" },
  "nav.connect": { en: "Use it from Claude", hi: "Claude से उपयोग करें" },
  "nav.playground": { en: "Try it yourself", hi: "ख़ुद जाँचें" },
  "nav.story": { en: "Why it exists", hi: "यह क्यों है" },
  "nav.close": { en: "Close", hi: "बंद करें" },
  "lang.toggle": { en: "हिन्दी", hi: "English" },
  "lane.past": { en: "Past the line", hi: "रेखा पार" },
  "lane.notyet": { en: "Not yet", hi: "अभी नहीं" },
  "lane.cant": { en: "Can't tell", hi: "तय नहीं हो सकता" },
  "lane.excluded": { en: "Outside 479", hi: "479 से बाहर" },
  "verdict.PAST_THE_LINE": { en: "Past the line", hi: "रेखा पार" },
  "verdict.PAST_FLAGGED": { en: "Past the line · flagged", hi: "रेखा पार · चिह्नित" },
  "verdict.NOT_YET": { en: "Not yet", hi: "अभी नहीं" },
  "verdict.EXCLUDED": { en: "Outside 479", hi: "479 से बाहर" },
  "verdict.CANT_TELL": { en: "Can't tell", hi: "तय नहीं हो सकता" },
  "sweep.run": { en: "Sweep the sample jail", hi: "नमूना जेल की जाँच करें" },
  "sweep.rerun": { en: "Sweep again", hi: "फिर से जाँचें" },
  "sweep.upload": { en: "Add your own papers", hi: "अपने काग़ज़ जोड़ें" },
  "sweep.csv": { en: "Download CSV for the DLSA", hi: "DLSA के लिए CSV" },
  "sweep.today": { en: "What if today is", hi: "अगर आज की तारीख़ हो" },
  "case.open": { en: "Open case", hi: "मामला खोलें" },
  "case.application": { en: "Draft 479(3) application", hi: "479(3) आवेदन का मसौदा" },
  "disclaimer": {
    en: "HalfTime is a screening aid, not legal advice. Every result is a draft for a legal-aid lawyer to check and sign.",
    hi: "हाफ़टाइम एक जाँच-सहायक है, क़ानूनी सलाह नहीं। हर परिणाम विधिक-सहायता अधिवक्ता की जाँच और हस्ताक्षर के लिए मसौदा है।"
  }
} as const;

export type Key = keyof typeof DICT;

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: Key) => string }>({
  lang: "en",
  setLang: () => {},
  t: (k) => DICT[k].en
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ht-lang");
      if (saved === "hi" || saved === "en") setLangState(saved);
    } catch {}
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("ht-lang", l);
    } catch {}
  }, []);
  const t = useCallback((k: Key) => DICT[k][lang], [lang]);
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export function useLang() {
  return useContext(Ctx);
}
