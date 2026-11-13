"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { parseIsoDate } from "@halftime/law";
import { decide, type Extraction } from "@halftime/reader";
import { applicationParagraphs } from "@/lib/application";
import { RUNS, getSample } from "@/lib/cases";
import { edits as editStore, uploads } from "@/lib/store";

/** Print view of the 479(3) draft. "Save as PDF" from the print dialog keeps Devanagari shaping intact. */
export function ApplicationPrint({ id }: { id: string }) {
  const params = useSearchParams();
  const today = params.get("today") && parseIsoDate(params.get("today")) ? params.get("today")! : new Date().toISOString().slice(0, 10);
  const [lang, setLang] = useState<"en" | "hi">("en");
  const [src, setSrc] = useState<{ text: string; extraction: Extraction } | null>(null);

  useEffect(() => {
    const s = getSample(id);
    if (s && RUNS[id]) setSrc({ text: s.text, extraction: RUNS[id]!.extraction });
    else {
      const u = uploads.get(id);
      if (u) setSrc({ text: u.text, extraction: u.extraction });
    }
  }, [id]);

  const doc = useMemo(() => {
    if (!src) return null;
    const r = decide(src.text, src.extraction, today, editStore.get(id));
    const quotes = r.facts.spans.map((s) => ({ label: s.label, text: r.text.slice(s.start, s.end) }));
    return applicationParagraphs({ lang, court: src.extraction.court, caseNo: src.extraction.case_no, accused: src.extraction.accused_name_masked, today, evaluation: r.evaluation, quotes });
  }, [src, lang, today, id]);

  if (!doc) return <p className="px-[var(--gutter)] py-20 font-mono">Preparing the draft…</p>;

  return (
    <div className="mx-auto max-w-[820px] px-[var(--gutter)] py-8">
      <div className="mb-6 flex flex-wrap items-center gap-3 print:hidden">
        <Link href={`/case/${id}?today=${today}`} className="underline">Back to the case</Link>
        <span className="flex-1" />
        <button type="button" onClick={() => setLang(lang === "en" ? "hi" : "en")} className="h-11 border border-ink px-4 hover:bg-mark">
          {lang === "en" ? "हिन्दी में" : "In English"}
        </button>
        <button type="button" onClick={() => window.print()} className="h-11 border border-ink bg-ink px-4 text-paper hover:bg-stamp">
          <span className="caps">Print or save as PDF</span>
        </button>
      </div>
      <article lang={lang} className="relative overflow-hidden border border-ink bg-white p-8 font-serif text-[1rem] leading-relaxed text-ink print:border-0 print:p-0 md:p-14">
        <p aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden text-center font-sans text-[3.2rem] font-[900] uppercase leading-none tracking-[0.1em] text-stamp/[0.09] [transform:rotate(-28deg)]">
          {doc.t.watermark}
        </p>
        <p className="mb-6 text-center text-[0.8rem] font-[700] tracking-[0.12em] text-stamp-text">{doc.t.watermark}</p>
        <h1 className="mb-8 text-center text-[1.1rem] font-[700]">{doc.t.title}</h1>
        {doc.heading.map((h) => (
          <p key={h} className="mb-1">{h}</p>
        ))}
        <p className="mt-6 mb-3">{doc.t.respectfully}</p>
        {doc.body.map((b) => (
          <p key={b} className="mb-3 text-justify">{b}</p>
        ))}
        {doc.quotes.length > 0 && (
          <>
            <h2 className="mt-6 mb-2 font-[700]">{doc.t.record}</h2>
            {doc.quotes.map((q, i) => (
              <p key={i} className="mb-2 border-l-2 border-carbon-soft pl-3 text-[0.92rem] italic">
                <span className="not-italic font-mono text-[0.75rem] text-ink-3">{q.label}</span> “{q.text}”
              </p>
            ))}
          </>
        )}
        <h2 className="mt-6 mb-2 font-[700]">{doc.t.computation}</h2>
        <ol className="mb-4 border-y border-carbon-soft font-mono text-[0.78rem]">
          {doc.computation.map((c, i) => (
            <li key={i} className="border-b border-paper-3 py-1 last:border-0">{c}</li>
          ))}
        </ol>
        {doc.flags.length > 0 && (
          <>
            <h2 className="mt-4 mb-2 font-[700]">{doc.t.flags}</h2>
            <ul className="mb-4 list-disc pl-5">{doc.flags.map((f) => <li key={f}>{f}</li>)}</ul>
          </>
        )}
        <p className="mt-6 mb-12">{doc.t.prayer}</p>
        <p className="mb-8">{doc.t.sigJail}</p>
        <p className="mb-8">{doc.t.sigLawyer}</p>
        <p>{doc.t.date(today)}</p>
        <p className="mt-8 text-[0.8rem] italic text-ink-3">{doc.t.disclaimer}</p>
      </article>
    </div>
  );
}
