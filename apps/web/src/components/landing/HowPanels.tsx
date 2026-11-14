import type { ReactNode } from "react";

export interface HowData {
  orderLines: string[];
  quote: { field: string; value: string; text: string };
  checks: { text: string; ok: boolean; reason?: string }[];
  trace: string[];
  draftHeading: string[];
}

/**
 * How it works, as a stack of filed sheets: each step is a sticky panel that slides over the last, with a huge
 * index numeral, a serif lead and a working card made from the real S01 run (its lines, its quote, the verifier's
 * verdict on a real and a planted quote, the engine's trace, the Hindi draft heading).
 */
export function HowPanels({ d }: { d: HowData }) {
  const steps: { n: string; h: string; lead: string; body: string; card: ReactNode; tone: "paper" | "paper2" | "ink" }[] = [
    {
      n: "01", h: "Read", tone: "paper",
      lead: "Hindi or English, typed or scanned.",
      body: "Text-layer PDFs are read in the browser. Scanned pages are transcribed by Claude Opus 5.5, on your own key.",
      card: (
        <div className="relative h-full overflow-hidden bg-paper p-5 font-serif text-[0.95rem] leading-relaxed text-ink">
          {d.orderLines.map((l, i) => <p key={i} className="truncate">{l}</p>)}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 h-16 bg-gradient-to-b from-transparent via-carbon-soft/40 to-transparent motion-safe:[animation:scan_3.2s_linear_infinite]" />
        </div>
      )
    },
    {
      n: "02", h: "Quote", tone: "paper2",
      lead: "Every fact comes with the sentence it came from.",
      body: "Claude Sonnet 5.5 fills a strict schema: charged sections, custody start, first-time status, other cases. A field without a quote is not accepted.",
      card: (
        <div className="h-full bg-ink p-5 font-mono text-[0.85rem] leading-relaxed text-paper">
          <p className="text-paper/60">{"{"}</p>
          <p className="pl-4">&quot;{d.quote.field}&quot;: &quot;<span className="text-stamp-on-ink">{d.quote.value}</span>&quot;,</p>
          <p className="pl-4">&quot;quote&quot;:</p>
          <p className="pl-8 font-serif text-[1.02rem]">
            <span
              className="px-1 text-ink [background-image:linear-gradient(var(--mark),var(--mark))] [background-repeat:no-repeat] [background-size:100%_100%] motion-safe:[animation:marker_2.4s_ease-out_infinite] [box-decoration-break:clone]"
              style={{ color: "var(--ink)" }}
            >
              “{d.quote.text}”
            </span>
          </p>
          <p className="text-paper/60">{"}"}</p>
        </div>
      )
    },
    {
      n: "03", h: "Check", tone: "paper",
      lead: "Code looks for every quote in the papers.",
      body: "Whitespace and Devanagari digits are normalised; nothing else is forgiven. A quote that isn't there, or doesn't contain the date or section claimed, is thrown out and shown to the lawyer.",
      card: (
        <ul className="flex h-full flex-col justify-center gap-4 bg-paper-2 p-5">
          {d.checks.map((c, i) => (
            <li key={i} className={`border-2 bg-paper p-4 ${c.ok ? "border-ok" : "border-stamp"}`}>
              <p className={`font-serif text-[1rem] leading-snug ${c.ok ? "" : "line-through decoration-stamp decoration-2"}`}>“{c.text}”</p>
              <p className={`mt-2 font-mono text-[0.8rem] ${c.ok ? "text-ok" : "text-stamp-text"}`}>
                {c.ok ? "✓ found in the order" : `✕ planted · ${c.reason}`}
              </p>
            </li>
          ))}
        </ul>
      )
    },
    {
      n: "04", h: "Apply", tone: "ink",
      lead: "The law is plain code. No model decides.",
      body: "A tested rules engine applies Section 479 to the checked facts, with every step written out. Multi-offence cases are flagged for a lawyer under 479(2), never decided.",
      card: (
        <ol className="h-full overflow-hidden bg-paper p-5 font-mono text-[0.8rem] leading-relaxed text-ink">
          {d.trace.map((t, i) => (
            <li key={i} className="border-b border-[var(--rule)] py-1 motion-safe:[animation:typein_0.5s_ease-out_both]" style={{ animationDelay: `${i * 90}ms` }}>
              {t}
            </li>
          ))}
        </ol>
      )
    },
    {
      n: "05", h: "Draft", tone: "paper2",
      lead: "The 479(3) application, ready for a lawyer.",
      body: "In Hindi or English: the computation, the provisions, the court's own words, blanks for signatures. Marked as a draft. A lawyer checks it and signs.",
      card: (
        <div className="relative h-full bg-white p-6 font-serif text-ink shadow-[inset_0_0_0_1px_var(--ink)]">
          {d.draftHeading.map((l, i) => <p key={i} className={i === 0 ? "font-[600]" : "text-ink-2"}>{l}</p>)}
          <div className="mt-4 space-y-2">{[90, 75, 82, 60].map((w, i) => <div key={i} className="h-2 bg-paper-3" style={{ width: `${w}%` }} />)}</div>
          <span className="absolute right-5 bottom-5 rotate-[-8deg] border-[3px] border-stamp px-3 py-1 font-sans text-[0.8rem] font-[800] tracking-[0.08em] text-stamp-text uppercase">
            Draft for lawyer review
          </span>
        </div>
      )
    }
  ];

  return (
    <section aria-labelledby="how-h" className="relative">
      <div className="mx-auto max-w-[var(--max)] px-[var(--gutter)] pt-24 pb-10">
        <p className="caps text-ink-3">How it works</p>
        <h2 id="how-h" className="mt-3 max-w-3xl font-sans text-[length:var(--step-5)] leading-[0.88] font-[800] tracking-[-0.03em] [font-stretch:78%]">
          The model proposes. Code disposes.
        </h2>
      </div>
      <ol>
        {steps.map((s, i) => (
          <li
            key={s.n}
            className={`border-t border-ink md:sticky ${s.tone === "ink" ? "on-ink bg-ink text-paper" : s.tone === "paper2" ? "bg-paper-2" : "bg-paper"}`}
            style={{ top: `calc(3rem + ${i * 1.1}rem)` }}
          >
            <div className="mx-auto grid max-w-[var(--max)] grid-cols-[minmax(0,1fr)] gap-8 px-[var(--gutter)] py-12 md:min-h-[78vh] md:grid-cols-12 md:py-16">
              <div className="flex min-w-0 flex-col md:col-span-6">
                <h3 className="font-sans text-[length:var(--step-4)] leading-none font-[780] tracking-[-0.02em] [font-stretch:82%]">{s.h}</h3>
                <p className="mt-6 max-w-md font-serif text-[length:var(--step-1)] leading-snug">{s.lead}</p>
                <p className={`mt-3 max-w-md text-[0.95rem] leading-relaxed ${s.tone === "ink" ? "text-paper/80" : "text-ink-2"}`}>{s.body}</p>
                <svg aria-hidden viewBox="0 0 220 120" className="mt-auto w-[clamp(9rem,24vw,20rem)] pt-10">
                  <text x="0" y="104" fill="none" stroke={s.tone === "ink" ? "rgba(241,236,224,0.35)" : "rgba(18,19,21,0.28)"} strokeWidth="1.5"
                    fontFamily="var(--font-mono), monospace" fontSize="128">{s.n}</text>
                </svg>
              </div>
              <div className="min-w-0 md:col-span-6 md:col-start-7">
                <div className={`h-[340px] overflow-hidden border border-ink md:h-[420px] ${s.tone === "ink" ? "shadow-[8px_8px_0_var(--stamp-on-ink)]" : "shadow-[8px_8px_0_var(--ink)]"}`}>
                  {s.card}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
