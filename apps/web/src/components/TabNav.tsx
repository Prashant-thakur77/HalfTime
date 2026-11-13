"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/i18n";
import { Wordmark } from "./Wordmark";

const LINKS = [
  { href: "/", key: "nav.home" },
  { href: "/sweep", key: "nav.sweep" },
  { href: "/vs-chatbot", key: "nav.vs" },
  { href: "/results", key: "nav.results" },
  { href: "/law", key: "nav.law" }
] as const;

/** Folder tabs hanging from the top edge: index on the left, the main action on the right. */
export function TabNav() {
  const { t, lang, setLang } = useLang();
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    panel.current?.querySelector("a")?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-ink bg-paper">
      <nav aria-label="Main" className="relative mx-auto flex h-12 max-w-[var(--max)] items-start justify-between px-[var(--gutter)]">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="index-panel"
          className="flex h-11 min-w-[44px] items-center gap-2.5 rounded-b-[10px] border border-t-0 border-ink bg-paper-2 px-4 text-ink transition-colors duration-[var(--ui)] hover:bg-mark"
        >
          <span aria-hidden className="flex flex-col gap-[3px]">
            <span className={`block h-[2px] w-4 bg-ink transition-transform duration-[var(--ui)] ${open ? "translate-y-[5px] rotate-45" : ""}`} />
            <span className={`block h-[2px] w-4 bg-ink transition-opacity duration-[var(--ui)] ${open ? "opacity-0" : ""}`} />
            <span className={`block h-[2px] w-4 bg-ink transition-transform duration-[var(--ui)] ${open ? "-translate-y-[5px] -rotate-45" : ""}`} />
          </span>
          <span className="caps">{open ? t("nav.close") : t("nav.index")}</span>
        </button>

        <Link href="/" className="mt-2.5 text-[1.25rem] text-ink" aria-label="HalfTime home">
          <Wordmark />
        </Link>

        <div className="flex items-start gap-2">
          <button
            type="button"
            onClick={() => setLang(lang === "en" ? "hi" : "en")}
            className="hidden h-11 rounded-b-[10px] border border-t-0 border-ink bg-paper-2 px-3 text-[0.85rem] text-ink transition-colors duration-[var(--ui)] hover:bg-mark sm:block"
            aria-label={lang === "en" ? "Switch to Hindi" : "Switch to English"}
          >
            {t("lang.toggle")}
          </button>
          <Link
            href="/sweep"
            className="flex h-11 items-center rounded-b-[10px] border border-t-0 border-ink bg-ink px-4 text-paper transition-colors duration-[var(--ui)] hover:bg-stamp"
          >
            <span className="caps hidden sm:inline">{t("nav.sweep")}</span>
            <span className="caps sm:hidden">Sweep</span>
          </Link>
        </div>

        <div
          id="index-panel"
          ref={panel}
          hidden={!open}
          className="absolute left-[var(--gutter)] top-12 w-[min(92vw,420px)] border border-ink bg-paper p-2 shadow-[6px_6px_0_var(--ink)]"
        >
          <ol className="register">
            {LINKS.map((l, i) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={path === l.href ? "page" : undefined}
                  className="group flex items-baseline gap-4 border-b border-[var(--rule)] px-3 py-3 font-serif text-[1.6rem] leading-none text-ink hover:bg-mark aria-[current=page]:text-stamp-text"
                >
                  <span className="font-mono text-[0.75rem] text-ink-3">{String(i + 1).padStart(2, "0")}</span>
                  {t(l.key)}
                </Link>
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={() => setLang(lang === "en" ? "hi" : "en")}
            className="mt-2 w-full px-3 py-2 text-left text-[0.9rem] underline sm:hidden"
          >
            {t("lang.toggle")}
          </button>
        </div>
      </nav>
    </header>
  );
}
