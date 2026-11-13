"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { daysBetween, humanDate, parseIsoDate } from "@halftime/law";
import { SplitFlap } from "@/components/SplitFlap";

export interface HeroCase {
  id: string;
  accused: string;
  sections: string;
  custodyStart: string;
  lineDate: string;
  excerpt: string;
}

/** Days since a date, recomputed every minute so the counter is live. */
function useDaysSince(iso: string) {
  const [days, setDays] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setDays(daysBetween(parseIsoDate(iso)!, new Date(new Date().toISOString().slice(0, 10))));
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [iso]);
  return days;
}

export function Hero({ c }: { c: HeroCase }) {
  const served = useDaysSince(c.custodyStart);
  const past = useDaysSince(c.lineDate);
  return (
    <section aria-labelledby="hero-h" className="relative isolate -mt-11 overflow-hidden pt-11">
      {/* The half-line: a hard diagonal splitting paper (time served) from ink (time owed). */}
      <div aria-hidden className="absolute inset-0 -z-10 bg-ink [clip-path:polygon(64%_0,100%_0,100%_100%,38%_100%)] max-md:[clip-path:polygon(100%_52%,100%_100%,0_100%,0_78%)]" />
      <div aria-hidden className="absolute inset-0 -z-10 register opacity-60 [clip-path:polygon(0_0,64%_0,38%_100%,0_100%)]" />

      <div className="mx-auto grid max-w-[var(--max)] gap-10 px-[var(--gutter)] pt-14 pb-6 md:grid-cols-12 md:pt-20">
        <div className="md:col-span-5">
          <p className="caps text-ink-3">Section 479, Bharatiya Nagarik Suraksha Sanhita</p>
          <h1 id="hero-h" className="mt-4 font-sans text-[length:var(--step-5)] leading-[0.88] font-[800] tracking-[-0.03em] [font-stretch:78%]">
            Served half.
            <br />
            Still inside.
          </h1>
          <p className="mt-6 max-w-md font-serif text-[length:var(--step-1)] leading-snug text-ink-2">
            The law says the jail must apply for their release. HalfTime reads the court papers, finds who has crossed the line, and shows its working.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/sweep" className="flex h-12 items-center border border-ink bg-ink px-5 text-paper transition-colors duration-[var(--ui)] hover:bg-stamp">
              <span className="caps">Run a jail sweep</span>
            </Link>
            <Link href="/vs-chatbot" className="flex h-12 items-center border border-ink bg-paper px-5 transition-colors duration-[var(--ui)] hover:bg-mark">
              <span className="caps">Watch a chatbot get it wrong</span>
            </Link>
          </div>
        </div>

        <figure className="relative md:col-span-4 md:col-start-6 md:mt-10">
          <div className="ruled relative rotate-[-1.2deg] border border-ink bg-paper py-5 pr-4 pl-14 shadow-[10px_10px_0_var(--ink)]">
            <p className="font-mono text-[0.7rem] text-ink-3">{c.id} · constructed sample · names masked</p>
            <p lang="hi" className="mt-2 line-clamp-6 font-serif text-[1rem] leading-[1.75rem]">
              {c.excerpt}
            </p>
            <div className="mt-4 border-t border-ink pt-3">
              <p className="caps text-ink-3">Days in custody</p>
              <SplitFlap value={served ?? 0} digits={4} className="mt-1 text-[clamp(2.2rem,5vw,3.4rem)]" label={`${served ?? 0} days in custody`} />
              <p className="mt-2 font-mono text-[0.78rem]">
                {c.sections} · line crossed {humanDate(parseIsoDate(c.lineDate)!)} · <span className="text-stamp-text">{past ?? 0} days ago</span>
              </p>
            </div>
          </div>
          <figcaption className="sr-only">A constructed sample order with a live count of days in custody.</figcaption>
        </figure>

        <div className="self-end md:col-span-3 md:pb-6">
          <p className="max-w-xs text-[0.98rem] leading-relaxed text-paper max-md:text-ink md:text-paper/90">
            A model reads Hindi or English papers and quotes its sources. Code checks every quote and applies the law. A lawyer signs.
          </p>
        </div>
      </div>

      <div aria-hidden className="relative select-none overflow-hidden px-[var(--gutter)] leading-[0.8] font-[850] tracking-[-0.045em] [font-stretch:125%] text-[length:var(--step-6)]">
        <div className="text-carbon [clip-path:polygon(0_0,52%_0,46%_100%,0_100%)] max-md:[clip-path:none]">HALFTIME</div>
        <div className="absolute inset-0 px-[var(--gutter)] text-stamp [clip-path:polygon(52%_0,100%_0,100%_100%,46%_100%)] max-md:hidden">HALFTIME</div>
      </div>
    </section>
  );
}
