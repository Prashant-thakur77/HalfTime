import type { Metadata } from "next";
import Link from "next/link";
import { LawCalculator } from "@/components/playground/LawCalculator";
import { QuoteChecker } from "@/components/playground/QuoteChecker";
import "@/components/playground/playground.css";

export const metadata: Metadata = {
  title: "Try it",
  description:
    "Try HalfTime's two checks in your browser: the verifier that rejects any quote not in the court order, and the engine that applies Section 479 BNSS to the facts you enter. No key, no upload."
};

function SectionHead({ n, id, title, children }: { n: string; id: string; title: string; children: React.ReactNode }) {
  return (
    <header className="grid gap-x-6 gap-y-3 border-t-2 border-ink pt-5 md:grid-cols-12">
      <p aria-hidden className="font-mono text-[length:var(--step-2)] leading-none text-carbon md:col-span-1">
        {n}
      </p>
      <div className="md:col-span-11">
        <h2 id={id} className="scroll-mt-24 font-sans text-[length:var(--step-3)] leading-none font-[750] [font-stretch:88%]">
          {title}
        </h2>
        <p className="mt-3 max-w-3xl font-serif text-[1.12rem] leading-relaxed text-ink-2">{children}</p>
      </div>
    </header>
  );
}

export default function PlaygroundPage() {
  return (
    <div className="mx-auto max-w-[var(--max)] px-[var(--gutter)] pt-10 pb-20">
      <p className="caps text-ink-3">Runs in this tab · no key · nothing sent anywhere</p>
      <h1 className="mt-3 max-w-4xl font-sans text-[length:var(--step-5)] leading-[0.88] font-[800] tracking-[-0.03em] [font-stretch:78%]">Try it.</h1>
      <p className="mt-6 max-w-2xl font-serif text-[length:var(--step-1)] leading-snug text-ink-2">
        HalfTime rests on two pieces of plain code. One refuses any quote that isn&apos;t in the papers. The other applies Section 479 to the facts
        that survive. Both run here, the same code the sweep uses.
      </p>
      <nav aria-label="On this page" className="mt-8 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[0.92rem]">
        <a href="#quote-h" className="underline decoration-carbon-soft underline-offset-4 hover:bg-mark">
          01 Check a quote
        </a>
        <a href="#law-h" className="underline decoration-carbon-soft underline-offset-4 hover:bg-mark">
          02 Apply the law
        </a>
      </nav>

      <section aria-labelledby="quote-h" className="mt-16">
        <SectionHead n="01" id="quote-h" title="Check a quote">
          The model must back every fact with words from the order. Pick a constructed order and paste anything: the verifier looks for it,
          character for character, and marks where it sits.
        </SectionHead>
        <QuoteChecker />
      </section>

      <section aria-labelledby="law-h" className="mt-24">
        <SectionHead n="02" id="law-h" title="Apply the law">
          Enter the charges and the custody date. The engine looks up each section&apos;s maximum term, draws the line, and shows every step it
          took. Slide &ldquo;today&rdquo; to watch the count cross it.
        </SectionHead>
        <LawCalculator />
      </section>

      <p className="mt-16 max-w-3xl text-[0.92rem] text-ink-2">
        A plain demonstration, not legal advice. The sample orders are constructed, not real cases. <Link className="underline" href="/law">How the law is applied</Link> ·{" "}
        <Link className="underline" href="/sweep">Run a jail sweep</Link>
      </p>
    </div>
  );
}
