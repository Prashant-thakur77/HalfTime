"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { decide, type Extraction } from "@halftime/reader";
import { noticeParagraphs } from "@halftime/reader/notice";
import { RUNS, getSample } from "@/lib/cases";
import { edits as editStore, uploads } from "@/lib/store";
import { useTodayParam } from "@/lib/today";

/** Large-print view of the "Know your line" notice, for reading aloud or printing. */
export function NoticePrint({ id }: { id: string }) {
  const today = useTodayParam();
  const [lang, setLang] = useState<"en" | "hi">("hi");
  const [src, setSrc] = useState<{ text: string; extraction: Extraction } | null>(() => {
    const s = getSample(id);
    return s && RUNS[id] ? { text: s.text, extraction: RUNS[id]!.extraction } : null;
  });

  useEffect(() => {
    const l = new URLSearchParams(window.location.search).get("lang");
    if (l === "en" || l === "hi") setLang(l);
    if (getSample(id)) return;
    const u = uploads.get(id);
    if (u) setSrc({ text: u.text, extraction: u.extraction });
  }, [id]);

  const switchLang = (next: "en" | "hi") => {
    setLang(next);
    const url = new URL(window.location.href);
    url.searchParams.set("lang", next);
    window.history.replaceState(null, "", url);
  };

  const doc = useMemo(() => {
    if (!src) return null;
    const ed = typeof window === "undefined" ? {} : editStore.get(id);
    const r = decide(src.text, src.extraction, today, ed);
    const quotes = r.facts.spans.map((s) => ({ label: s.label, text: r.text.slice(s.start, s.end) }));
    return noticeParagraphs({
      lang,
      court: src.extraction.court,
      caseNo: src.extraction.case_no,
      accused: src.extraction.accused_name_masked,
      today,
      evaluation: r.evaluation,
      quotes,
      custodyStart: { ...r.facts.input, ...ed }.custodyStart ?? null
    });
  }, [src, lang, today, id]);

  if (!doc) return <p className="px-[var(--gutter)] py-20 font-mono">Preparing the notice…</p>;
  const hi = lang === "hi";

  return (
    <div className="mx-auto max-w-[820px] px-[var(--gutter)] py-8">
      <div className="mb-6 flex flex-wrap items-center gap-3 print:hidden">
        <Link href={`/case/${id}?today=${today}`} className="underline">Back to the case</Link>
        <span className="flex-1" />
        <button type="button" onClick={() => switchLang(hi ? "en" : "hi")} className="h-11 border border-ink px-4 hover:bg-mark">
          {hi ? "In English" : <span lang="hi">हिन्दी में</span>}
        </button>
        <button type="button" onClick={() => window.print()} className="h-11 border border-ink bg-ink px-4 text-paper hover:bg-stamp">
          <span className="caps">Print</span>
        </button>
      </div>
      <article
        lang={lang}
        aria-labelledby="notice-title"
        className={`relative overflow-hidden border border-ink bg-white p-6 text-ink print:border-0 print:p-0 sm:p-10 md:p-14 ${hi ? "font-serif text-[1.3rem] leading-[1.75] sm:text-[1.45rem]" : "font-sans text-[1.2rem] leading-[1.6] sm:text-[1.35rem]"}`}
      >
        {/* Drawn as SVG so it stays a graphic, not text that screen readers or contrast checks treat as content. */}
        <svg aria-hidden focusable="false" viewBox="0 0 600 600" preserveAspectRatio="xMidYMid meet" className="pointer-events-none absolute inset-0 h-full w-full text-stamp opacity-[0.08]">
          <g transform="rotate(-28 300 300)" fill="currentColor" textAnchor="middle">
            <text x="300" y="290" className="font-sans" fontSize="50" fontWeight="900" letterSpacing="4">NOT LEGAL ADVICE</text>
            <text x="300" y="355" className="font-serif" fontSize="46" fontWeight="700">कानूनी सलाह नहीं</text>
          </g>
        </svg>
        <p className="mb-4 border-y-2 border-stamp-text py-1 text-center font-sans text-[0.85rem] font-[700] tracking-[0.14em] text-stamp-text">{doc.watermark}</p>
        <h1 id="notice-title" className={`text-center leading-tight font-[700] ${hi ? "text-[2.2rem]" : "font-sans text-[2.1rem] [font-stretch:92%]"}`}>{doc.title}</h1>
        <p className="mt-1 mb-6 text-center text-[0.95rem] text-ink-2">{doc.subtitle}</p>
        <dl className="mb-6 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-y border-carbon-soft py-3 text-[1rem]">
          {doc.meta.map((m) => (
            <div key={m.label} className="contents">
              <dt className="text-ink-2">{m.label}</dt>
              <dd className="m-0 font-[600]">{m.value}</dd>
            </div>
          ))}
        </dl>
        {doc.blocks.map((b, i) => {
          if (b.kind === "list")
            return (
              <ul key={i} className="mb-5 list-disc space-y-1 pl-8">
                {b.items!.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            );
          if (b.kind === "quote")
            return (
              <blockquote key={i} className="mb-5 ml-4 border-l-4 border-carbon-soft bg-mark/40 py-1 pl-4 font-serif italic">
                {b.text}
              </blockquote>
            );
          if (b.kind === "verdict")
            return (
              <p key={i} className="mb-5 border-l-[6px] border-ink pl-4 font-[700]">
                {b.text}
              </p>
            );
          return (
            <p key={i} className="mb-5">
              {b.text}
            </p>
          );
        })}
        <p className="mt-8 border-2 border-stamp-text p-3 text-center font-[700] text-stamp-text">{doc.closing}</p>
        <p className="mt-4 text-[0.85rem] italic text-ink-3">{doc.madeBy}</p>
      </article>
    </div>
  );
}
