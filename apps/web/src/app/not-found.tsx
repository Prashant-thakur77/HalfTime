import Link from "next/link";

export const metadata = { title: "Not found" };

/** 404 in the site's language: a file that isn't in the tray. */
export default function NotFound() {
  return (
    <section className="mx-auto max-w-[var(--max)] px-[var(--gutter)] py-28">
      <p className="caps text-ink-3">Error 404 · not in the tray</p>
      <h1 className="mt-4 max-w-3xl font-sans text-[length:var(--step-5)] leading-[0.9] font-[800] tracking-[-0.03em] [font-stretch:78%]">
        This file isn&apos;t in the papers.
      </h1>
      <p className="mt-6 max-w-xl font-serif text-[length:var(--step-1)] leading-snug text-ink-2">
        The page you asked for doesn&apos;t exist. The twelve sample cases, the sweep and the law are all still here.
      </p>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/" className="flex h-12 items-center border border-ink bg-ink px-5 text-paper hover:bg-stamp"><span className="caps">Back to the start</span></Link>
        <Link href="/sweep" className="flex h-12 items-center border border-ink px-5 hover:bg-mark"><span className="caps">Run a jail sweep</span></Link>
      </div>
    </section>
  );
}
