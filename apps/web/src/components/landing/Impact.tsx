import Link from "next/link";
import { inr } from "@/lib/facts";

/**
 * What it changes, in measured numbers only: the people held longest (NCRB), and what reading a whole jail costs at
 * HalfTime's measured per-order cost and median time. The jail-size figure is arithmetic on measured values and is
 * labelled as an estimate.
 */
export function Impact({ over2y, over5y, costPerOrder, msPerOrder, sourceLabel, sourceUrl }: {
  over2y: number; over5y: number; costPerOrder: number; msPerOrder: number; sourceLabel: string; sourceUrl: string;
}) {
  const files = 500, parallel = 6;
  const cost = Math.round(files * costPerOrder);
  const minutes = Math.ceil((files * msPerOrder) / parallel / 60000);
  return (
    <section aria-labelledby="impact-h" className="border-y border-ink bg-paper-2 py-24">
      <div className="mx-auto max-w-[var(--max)] px-[var(--gutter)]">
        <p className="caps text-ink-3">What it changes</p>
        <h2 id="impact-h" className="mt-3 max-w-4xl font-sans text-[length:var(--step-4)] leading-[0.92] font-[780] tracking-[-0.02em] [font-stretch:82%]">
          Every day past the line is a day the law says should be spent at home.
        </h2>
        <div className="mt-12 grid gap-px border border-ink bg-ink md:grid-cols-3">
          <div className="bg-paper p-6">
            <p className="font-mono text-[clamp(2.6rem,5.5vw,4.4rem)] leading-none tabular">{inr(over2y)}</p>
            <p className="mt-3 text-[0.95rem] text-ink-2">undertrials held for more than two years at the end of 2024; {inr(over5y)} for more than five.</p>
            <a className="mt-3 block text-[0.75rem] text-ink-3 underline" href={sourceUrl} target="_blank" rel="noopener noreferrer">{sourceLabel}</a>
          </div>
          <div className="bg-paper p-6">
            <p className="font-mono text-[clamp(2.6rem,5.5vw,4.4rem)] leading-none tabular">~${cost}</p>
            <p className="mt-3 text-[0.95rem] text-ink-2">
              to read a {files}-file jail, and about {minutes} minutes with {parallel} files at a time. Estimate from the measured ${costPerOrder} and{" "}
              {(msPerOrder / 1000).toFixed(1)} s median per order.
            </p>
          </div>
          <div className="on-ink bg-ink p-6 text-paper">
            <p className="font-sans text-[length:var(--step-2)] leading-tight font-[750] [font-stretch:88%]">From finding one person to sweeping a whole jail.</p>
            <p className="mt-3 text-[0.95rem] text-paper/80">
              A legal-aid lawyer gets a sorted list with the proof attached, a records request for every missing fact and a 479(3) draft for every person
              past the line. The time goes into checking and filing, not into searching.
            </p>
          </div>
        </div>
        <ul className="mt-10 grid gap-4 text-[0.98rem] leading-relaxed text-ink-2 md:grid-cols-3">
          <li><strong className="text-ink">Legal-aid lawyers</strong> start from a list sorted by who has waited longest past the line, not from a stack of files.</li>
          <li><strong className="text-ink">Jail superintendents</strong> get the 479(3) application the section asks them to file, drafted from the court record.</li>
          <li><strong className="text-ink">Legal services authorities</strong> can sweep a jail before a review meeting and see who needs a lawyer first. <Link className="underline" href="/story">Why it exists</Link></li>
        </ul>
      </div>
    </section>
  );
}
