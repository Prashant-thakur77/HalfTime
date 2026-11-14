import Link from "next/link";
import type { ReactNode } from "react";
import { CopyBlock } from "@/components/connect/CopyBlock";
import { neighbours } from "@/lib/docs/nav";

export interface TocItem {
  id: string;
  title: string;
}

/** One docs page: kicker, title, lead, "On this page", the body and prev/next. */
export function DocPage({ href, kicker, title, lead, toc, children }: { href: string; kicker: string; title: string; lead: ReactNode; toc: TocItem[]; children: ReactNode }) {
  const { prev, next } = neighbours(href);
  return (
    <article className="min-w-0">
      <header className="border-b border-ink pb-8">
        <p className="caps text-ink-3">{kicker}</p>
        <h1 className="mt-3 font-sans text-[length:var(--step-4)] leading-[0.95] font-[750] tracking-[-0.02em] [font-stretch:88%]">{title}</h1>
        <div className="mt-5 max-w-[44rem] font-serif text-[length:var(--step-1)] leading-snug text-ink-2">{lead}</div>
      </header>

      <div className="mt-10 grid gap-10 xl:grid-cols-[minmax(0,1fr)_13rem]">
        <nav aria-label="On this page" className="xl:order-last">
          <div className="xl:sticky xl:top-16">
            <p className="caps text-ink-3">On this page</p>
            <ol className="mt-2 columns-1 gap-6 space-y-1.5 border-l border-[var(--rule)] pl-3 text-[0.9rem] sm:columns-2 xl:columns-1">
              {toc.map((t) => (
                <li key={t.id} className="break-inside-avoid">
                  <a className="text-ink-2 underline decoration-carbon-soft underline-offset-4 hover:bg-mark hover:text-ink" href={`#${t.id}`}>
                    {t.title}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </nav>

        <div className="min-w-0 space-y-14">{children}</div>
      </div>

      <nav aria-label="Previous and next" className="mt-16 grid gap-3 border-t border-ink pt-6 sm:grid-cols-2">
        {prev ? (
          <Link href={prev.href} className="group border border-ink bg-paper p-4 transition-colors duration-[var(--ui)] hover:bg-mark">
            <span className="caps block text-ink-3">← Previous</span>
            <span className="mt-1 block font-sans text-[1.05rem] font-[700]">{prev.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={next.href} className="group border border-ink bg-paper p-4 text-right transition-colors duration-[var(--ui)] hover:bg-mark sm:col-start-2">
            <span className="caps block text-ink-3">Next →</span>
            <span className="mt-1 block font-sans text-[1.05rem] font-[700]">{next.title}</span>
          </Link>
        ) : null}
      </nav>
    </article>
  );
}

/** A top-level section with its anchor heading. */
export function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="scroll-mt-20">
      <h2 id={id} className="scroll-mt-20 font-sans text-[length:var(--step-2)] leading-tight font-[750] [font-stretch:88%]">
        <a href={`#${id}`} className="hover:underline hover:decoration-carbon-soft hover:underline-offset-4">
          {title}
        </a>
      </h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

export function H3({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h3 id={id} className="scroll-mt-20 pt-2 font-sans text-[1.15rem] font-[700]">
      {children}
    </h3>
  );
}

/** Body text in the editorial face, as on /law. */
export function P({ children, muted }: { children: ReactNode; muted?: boolean }) {
  return <p className={`max-w-[46rem] font-serif text-[1.08rem] leading-relaxed ${muted ? "text-ink-2" : ""}`}>{children}</p>;
}

export function UL({ children }: { children: ReactNode }) {
  return <ul className="max-w-[46rem] list-disc space-y-2 pl-6 font-serif text-[1.06rem] leading-relaxed marker:text-ink-3">{children}</ul>;
}

export function OL({ children }: { children: ReactNode }) {
  return <ol className="max-w-[46rem] list-decimal space-y-2 pl-6 font-serif text-[1.06rem] leading-relaxed marker:font-mono marker:text-[0.85em] marker:text-ink-3">{children}</ol>;
}

/** Inline code: section numbers, paths, field names. */
export function C({ children }: { children: ReactNode }) {
  return <code className="bg-paper-2 px-1 py-px font-mono text-[0.84em] [overflow-wrap:anywhere]">{children}</code>;
}

/** An internal link (next/link) or an external one, in the carbon-ink link style. */
export function A({ href, children }: { href: string; children: ReactNode }) {
  const cls = "text-carbon underline decoration-carbon-soft underline-offset-[3px] hover:bg-mark";
  if (href.startsWith("/") || href.startsWith("#")) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={cls} rel="noopener noreferrer" target="_blank">
      {children}
    </a>
  );
}

/** A copyable code block. */
export function Code({ label, children, tall }: { label: string; children: string; tall?: boolean }) {
  return (
    <div className={`max-w-full min-w-0 ${tall ? "[&_pre]:max-h-[28rem] [&_pre]:overflow-y-auto" : ""}`}>
      <CopyBlock label={label} value={children} />
    </div>
  );
}

/** A note set apart with a coloured rule. */
export function Note({ tone = "carbon", title, children }: { tone?: "carbon" | "flag" | "stamp" | "ok"; title?: string; children: ReactNode }) {
  const border = { carbon: "border-carbon", flag: "border-flag", stamp: "border-stamp", ok: "border-ok" }[tone];
  const bg = tone === "flag" ? "bg-flag-bg" : "bg-paper-2";
  const head = { carbon: "text-carbon", flag: "text-flag", stamp: "text-stamp-text", ok: "text-ok" }[tone];
  return (
    <div className={`max-w-[46rem] border-l-4 ${border} ${bg} p-4 text-[0.97rem] leading-relaxed`}>
      {title && <p className={`caps mb-1 ${head}`}>{title}</p>}
      {children}
    </div>
  );
}

/** A table in the /results style, scrolling inside a focusable region on small screens. */
export function Table({ label, head, rows, minWidth = 560, mono = [], nowrap = [] }: { label: string; head: ReactNode[]; rows: ReactNode[][]; minWidth?: number; mono?: number[]; nowrap?: number[] }) {
  return (
    <div tabIndex={0} role="region" aria-label={label} className="overflow-x-auto border border-ink">
      <table className="w-full border-collapse text-[0.9rem]" style={{ minWidth: head.length <= 2 ? Math.min(minWidth, 330) : minWidth }}>
        <thead className="bg-ink text-left text-paper">
          <tr>
            {head.map((h, i) => (
              <th key={i} scope="col" className="p-3 align-bottom font-[600]">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-[var(--rule)] align-top odd:bg-paper-2/60">
              {r.map((c, j) =>
                j === 0 ? (
                  <th key={j} scope="row" className={`p-3 text-left font-[500] ${mono.includes(0) ? "font-mono text-[0.85rem]" : ""}`}>
                    {c}
                  </th>
                ) : (
                  <td key={j} className={`p-3 ${mono.includes(j) ? "font-mono text-[0.85rem] tabular" : ""} ${nowrap.includes(j) ? "whitespace-nowrap" : ""}`}>
                    {c}
                  </td>
                )
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** A diagram: the drawing scrolls sideways inside a focusable frame on narrow screens; the caption stays put. */
export function Figure({ label, caption, children }: { label: string; caption: ReactNode; children: ReactNode }) {
  return (
    <figure className="min-w-0">
      <div tabIndex={0} role="region" aria-label={label} className="overflow-x-auto border border-ink bg-paper">
        {children}
      </div>
      <figcaption className="mt-2 max-w-[46rem] text-[0.85rem] leading-snug text-ink-3">
        <span className="md:hidden">Scroll sideways to see the whole diagram. </span>
        {caption}
      </figcaption>
    </figure>
  );
}

/** A small grid of figures with labels. */
export function Stats({ items }: { items: { value: string; label: string; note?: string }[] }) {
  return (
    <dl className="grid gap-px border border-ink bg-ink sm:grid-cols-2 lg:grid-cols-4">
      {items.map((s) => (
        <div key={s.label} className="bg-paper p-4">
          <dt className="text-[0.85rem] leading-snug text-ink-2">{s.label}</dt>
          <dd className="mt-1 font-mono text-[1.6rem] leading-none tabular">{s.value}</dd>
          {s.note && <dd className="mt-1.5 text-[0.78rem] leading-snug text-ink-3">{s.note}</dd>}
        </div>
      ))}
    </dl>
  );
}
