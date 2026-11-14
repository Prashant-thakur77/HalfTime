"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { DOCS, DOC_GROUPS } from "@/lib/docs/nav";

function List({ path }: { path: string }) {
  return (
    <div className="space-y-6">
      {DOC_GROUPS.map((g) => (
        <div key={g}>
          <p className="caps text-ink-3">{g}</p>
          <ul className="mt-2 border-l border-ink">
            {DOCS.filter((d) => d.group === g).map((d) => {
              const here = path === d.href;
              return (
                <li key={d.href}>
                  <Link
                    href={d.href}
                    aria-current={here ? "page" : undefined}
                    className="-ml-px block border-l-2 border-transparent py-1.5 pr-2 pl-3 text-[0.95rem] leading-snug text-ink-2 transition-colors duration-[var(--ui)] hover:bg-mark hover:text-ink aria-[current=page]:border-stamp aria-[current=page]:font-[650] aria-[current=page]:text-ink"
                  >
                    {d.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <div>
        <p className="caps text-ink-3">Live</p>
        <ul className="mt-2 border-l border-ink">
          <li>
            <Link
              href="/status"
              className="-ml-px block border-l-2 border-transparent py-1.5 pr-2 pl-3 text-[0.95rem] text-ink-2 hover:bg-mark hover:text-ink"
            >
              Status
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}

/** The docs index: a sticky column from md up, a collapsed disclosure on phones. */
export function DocsNav() {
  const path = usePathname() ?? "/docs";
  const details = useRef<HTMLDetailsElement>(null);
  const current = DOCS.find((d) => d.href === path);

  // Close the phone index after navigating.
  useEffect(() => {
    if (details.current) details.current.open = false;
  }, [path]);

  return (
    <>
      <details ref={details} className="group border border-ink bg-paper-2 md:hidden">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2 [&::-webkit-details-marker]:hidden">
          <span>
            <span className="caps block text-ink-3">Docs</span>
            <span className="block text-[0.98rem] font-[650]">{current?.title ?? "Index"}</span>
          </span>
          <span aria-hidden className="font-mono text-[1.1rem] transition-transform duration-[var(--ui)] group-open:rotate-45">
            +
          </span>
        </summary>
        <nav aria-label="Documentation" className="border-t border-ink bg-paper px-4 py-5">
          <List path={path} />
        </nav>
      </details>
      <nav aria-label="Documentation" className="sticky top-16 hidden max-h-[calc(100vh-5rem)] overflow-y-auto pb-8 md:block">
        <Link href="/docs" className="mb-6 block font-sans text-[1.35rem] leading-none font-[800] tracking-[-0.02em] [font-stretch:80%]">
          Docs
        </Link>
        <List path={path} />
      </nav>
    </>
  );
}
