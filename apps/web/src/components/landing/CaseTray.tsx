"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { VerdictTag } from "@/components/VerdictTag";
import type { Verdict } from "@halftime/law";

export interface TrayCase {
  id: string; caseNo: string; title: string; language: string; district: string; accused: string;
  verdict: Verdict; note: string; excerpt: string;
}

/**
 * The tray: every sample case as a manila file on a shelf you can drag, swipe or step through. Folders sit a little
 * askew and square up on hover/focus. Native horizontal scroll with snap, so touch, trackpad and keyboard all work.
 */
export function CaseTray({ cases }: { cases: TrayCase[] }) {
  const track = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const onScroll = () => {
      const card = el.querySelector<HTMLElement>("[data-card]");
      if (!card) return;
      setIdx(Math.min(cases.length - 1, Math.round(el.scrollLeft / (card.offsetWidth + 24))));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [cases.length]);

  const go = (d: number) => {
    const el = track.current;
    const card = el?.querySelector<HTMLElement>("[data-card]");
    if (!el || !card) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: Math.max(0, idx + d) * (card.offsetWidth + 24), behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <section aria-labelledby="tray-h" className="overflow-hidden border-y border-ink bg-paper-2 py-20">
      <div className="mx-auto flex max-w-[var(--max)] flex-wrap items-end justify-between gap-6 px-[var(--gutter)]">
        <div>
          <p className="caps text-ink-3">The sample tray · constructed orders, names masked</p>
          <h2 id="tray-h" className="mt-3 font-sans text-[length:var(--step-4)] leading-[0.92] font-[780] tracking-[-0.02em] [font-stretch:82%]">
            Twelve files. Twelve people.
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[0.95rem] tabular" aria-live="polite">
            {String(idx + 1).padStart(2, "0")} / {String(cases.length).padStart(2, "0")}
          </span>
          <button type="button" onClick={() => go(-1)} disabled={idx === 0} aria-label="Previous file"
            className="h-11 w-11 border border-ink bg-paper text-[1.2rem] hover:bg-mark disabled:opacity-40">←</button>
          <button type="button" onClick={() => go(1)} disabled={idx >= cases.length - 1} aria-label="Next file"
            className="h-11 w-11 border border-ink bg-ink text-[1.2rem] text-paper hover:bg-stamp disabled:opacity-40">→</button>
        </div>
      </div>
      <div
        ref={track}
        tabIndex={0}
        role="region"
        aria-label="Sample case files, scroll sideways"
        className="mt-10 flex gap-6 overflow-x-auto scroll-smooth px-[max(var(--gutter),calc((100vw-var(--max))/2+var(--gutter)))] pt-6 pb-8 [scrollbar-width:thin] motion-reduce:scroll-auto"
      >
        {cases.map((c, i) => (
          <Link
            key={c.id}
            data-card
            href={`/case/${c.id}`}
            className={`group relative w-[min(78vw,340px)] shrink-0 transition-transform duration-[var(--ui)] hover:rotate-0 hover:-translate-y-1 focus-visible:rotate-0 ${i % 3 === 0 ? "rotate-[-1.5deg]" : i % 3 === 1 ? "rotate-[1deg]" : "rotate-[-0.5deg]"}`}
          >
            <span aria-hidden className="absolute -top-5 left-4 h-6 w-28 rounded-t-[6px] border border-b-0 border-ink bg-[#d9b979]" />
            <span className="relative block border border-ink bg-[#e3c78d] p-5 shadow-[5px_5px_0_var(--ink)]">
              <span className="flex items-center justify-between font-mono text-[0.75rem] text-ink-2">
                <span>{c.caseNo}</span>
                <span className="uppercase">{c.language} · {c.district}</span>
              </span>
              <span className="mt-4 block border border-ink/40 bg-paper p-3">
                <span className="block font-serif text-[1.35rem] leading-tight">{c.accused}</span>
                <span className="mt-1 block text-[0.9rem] leading-snug text-ink-2">{c.title}</span>
                <span lang={c.language === "hi" ? "hi" : "en"} className="mt-3 line-clamp-3 block font-serif text-[0.85rem] leading-snug text-ink-3">{c.excerpt}</span>
              </span>
              <span className="mt-4 flex items-center justify-between gap-2">
                <VerdictTag verdict={c.verdict} />
                <span className="font-mono text-[0.75rem] text-ink-2">{c.note}</span>
              </span>
              <span aria-hidden className="absolute top-0 right-6 h-full w-[3px] bg-stamp/70" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
