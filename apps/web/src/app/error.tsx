"use client";
import Link from "next/link";

/** Any unexpected error: say so plainly, offer a retry, never show a stack trace. */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="mx-auto max-w-[var(--max)] px-[var(--gutter)] py-28">
      <p className="caps text-stamp-text">Something went wrong</p>
      <h1 className="mt-4 max-w-3xl font-sans text-[length:var(--step-5)] leading-[0.9] font-[800] tracking-[-0.03em] [font-stretch:78%]">
        This page didn&apos;t load.
      </h1>
      <p className="mt-6 max-w-xl font-serif text-[length:var(--step-1)] leading-snug text-ink-2">
        Nothing you entered has left your browser. Try again; if it keeps happening, the sample sweep still works.
      </p>
      <div className="mt-10 flex flex-wrap gap-3">
        <button type="button" onClick={reset} className="flex h-12 items-center border border-ink bg-ink px-5 text-paper hover:bg-stamp"><span className="caps">Try again</span></button>
        <Link href="/sweep" className="flex h-12 items-center border border-ink px-5 hover:bg-mark"><span className="caps">Run the sample sweep</span></Link>
      </div>
    </section>
  );
}
