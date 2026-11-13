"use client";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { daysBetween, describeMonths, humanDate, parseIsoDate } from "@halftime/law";
import { SplitFlap } from "@/components/SplitFlap";
import { Stamp } from "@/components/Stamp";

gsap.registerPlugin(ScrollTrigger);

export interface LedgerCase {
  id: string;
  accused: string;
  section: string;
  maxTermMonths: number;
  fraction: "1/2" | "1/3";
  custodyStart: string;
  lineDate: string;
  excerpt: string;
}

/**
 * The signature moment. Scrolling counts the days served; the half-line sweeps
 * across the order; when the count crosses it, the 479(3) stamp comes down and
 * the page turns to ink.
 */
export function LedgerOfDays({ c }: { c: LedgerCase }) {
  const root = useRef<HTMLElement>(null);
  const stamp = useRef<HTMLDivElement>(null);
  const [today, setToday] = useState<string | null>(null);
  const [days, setDays] = useState(0);
  const [crossed, setCrossed] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => setToday(new Date().toISOString().slice(0, 10)), []);
  const start = parseIsoDate(c.custodyStart)!;
  const lineDays = daysBetween(start, parseIsoDate(c.lineDate)!);
  const total = today ? daysBetween(start, parseIsoDate(today)!) : lineDays;
  const lineAt = lineDays / Math.max(total, 1);

  useEffect(() => {
    const el = root.current;
    if (!el || !today) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: reduce)", () => {
      setReduced(true);
      setDays(total);
      setCrossed(true);
    });
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      setReduced(false);
      const st = ScrollTrigger.create({
        trigger: el,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.6,
        onUpdate: (self) => {
          const p = Math.min(1, self.progress / 0.85);
          setDays(Math.round(p * total));
          el.style.setProperty("--p", String(p));
          setCrossed(p >= lineAt);
        }
      });
      return () => st.kill();
    });
    return () => mm.revert();
  }, [today, total, lineAt]);

  useEffect(() => {
    if (!crossed || reduced || !stamp.current) return;
    gsap.fromTo(
      stamp.current,
      { scale: 2.6, opacity: 0, rotate: -14 },
      { scale: 1, opacity: 1, rotate: -6, duration: 0.42, ease: "back.out(2.2)" }
    );
  }, [crossed, reduced]);

  return (
    <section
      ref={root}
      aria-labelledby="ledger-h"
      className={`relative ${reduced ? "" : "h-[260vh] max-md:h-[200vh]"} transition-colors duration-[var(--story)] ${crossed ? "bg-ink text-paper on-ink" : "bg-paper"}`}
      style={{ ["--p" as string]: reduced ? 1 : 0 }}
    >
      <div className={`${reduced ? "" : "sticky top-0 h-[100svh]"} flex items-center overflow-hidden`}>
        <div className="mx-auto grid w-full max-w-[var(--max)] gap-8 px-[var(--gutter)] py-14 md:grid-cols-12 md:items-center">
          <div className="md:col-span-5">
            <p className={`caps ${crossed ? "text-paper/60" : "text-ink-3"}`}>The ledger of days</p>
            <h2 id="ledger-h" className="mt-3 font-sans text-[length:var(--step-4)] leading-[0.92] font-[780] tracking-[-0.02em] [font-stretch:82%]">
              Every day inside is written down somewhere.
            </h2>
            <p className={`mt-5 max-w-md font-serif text-[length:var(--step-1)] leading-snug ${crossed ? "text-paper/85" : "text-ink-2"}`}>
              {c.section} carries at most {describeMonths(c.maxTermMonths)}. {c.fraction === "1/3" ? "The papers say first-time offender, so one-third of that is the line." : "Half of that is the line."} Scroll to count the days {c.accused} has
              served since {humanDate(start)}.
            </p>
            <div className="mt-8">
              <p className={`caps ${crossed ? "text-paper/60" : "text-ink-3"}`}>Days served</p>
              <SplitFlap value={days} digits={4} className="mt-2 text-[clamp(3rem,9vw,7rem)]" label={`${days} days served`} />
              <p className="mt-3 font-mono text-[0.85rem] tabular">
                Line at day {lineDays} · {humanDate(parseIsoDate(c.lineDate)!)}
              </p>
            </div>
          </div>

          <div className="relative md:col-span-6 md:col-start-7">
            <div className="ruled relative overflow-hidden border border-ink bg-paper py-6 pr-5 pl-14 text-ink shadow-[10px_10px_0_var(--carbon)]">
              <p className="font-mono text-[0.7rem] text-ink-3">{c.id} · constructed sample</p>
              <p lang="hi" className="mt-2 line-clamp-[9] font-serif text-[1rem] leading-[1.75rem]">
                {c.excerpt}
              </p>
              {/* The half-line sweeping across the paper with the count. */}
              <div
                aria-hidden
                className="pointer-events-none absolute -inset-x-10 top-0 h-full origin-left"
                style={{ transform: `translateX(calc((var(--p) * 100%) - 100%))` }}
              >
                <div className="absolute top-0 right-0 h-full w-[3px] skew-x-[-14deg] bg-stamp shadow-[0_0_0_6px_rgba(194,54,43,0.12)]" />
                <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(243,220,107,0.18))]" />
              </div>
            </div>

            <div className="mt-5 h-3 border border-current">
              <div className="h-full bg-stamp transition-[width] duration-[var(--tick)]" style={{ width: `calc(var(--p) * 100%)` }} />
              <div className="relative -mt-3 h-3">
                <span className="absolute top-[-6px] h-6 w-[2px] bg-current" style={{ left: `${lineAt * 100}%` }} aria-hidden />
              </div>
            </div>
            <div className="mt-2 flex justify-between font-mono text-[0.72rem] tabular">
              <span>{humanDate(start)}</span>
              <span>{c.fraction === "1/3" ? "one-third" : "half"} of {describeMonths(c.maxTermMonths)}</span>
              <span>today</span>
            </div>

            <div ref={stamp} className={`absolute -top-6 right-2 md:-right-6 ${crossed ? "" : "opacity-0"}`} aria-live="polite">
              {crossed && <Stamp tone="onInk" className="text-[clamp(1rem,2.4vw,1.5rem)]" />}
            </div>
            {crossed && (
              <p className="mt-6 max-w-md text-[0.95rem] text-paper/90">
                Past the line. Under Sec 479(3) the jail superintendent must now apply to the court. HalfTime drafts that application for a
                legal-aid lawyer to check and sign.{" "}
                <Link href={`/case/${c.id}`} className="underline decoration-mark underline-offset-4 hover:text-mark">
                  Open this case
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
