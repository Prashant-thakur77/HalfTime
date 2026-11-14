"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Numbers that roll into place like a counter wheel when the band scrolls into view: each digit is a column of
 * 0-9 that turns to its value, the later digits turning longer. Text stays in the DOM for readers.
 * Reduced motion: the final numbers, still.
 */
export function Odometer({ items }: { items: { value: string; label: string; tone?: "stamp" }[] }) {
  const root = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setOn(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e?.isIntersecting) { setOn(true); io.disconnect(); } }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={root} className="grid gap-px border border-ink bg-ink sm:grid-cols-2 lg:grid-cols-4">
      {items.map((it) => (
        <div key={it.label} className="bg-paper p-6">
          <p className="sr-only">{it.value} {it.label}</p>
          <p aria-hidden className={`flex font-mono text-[clamp(3rem,6.5vw,5.6rem)] leading-none tabular ${it.tone === "stamp" ? "text-stamp-text" : ""}`}>
            {it.value.split("").map((ch, i) =>
              /\d/.test(ch) ? (
                <span key={i} className="relative inline-block h-[1em] overflow-hidden">
                  <span
                    className="flex flex-col transition-transform ease-[cubic-bezier(.2,.9,.1,1)] motion-reduce:transition-none"
                    style={{ transform: `translateY(${on ? -Number(ch) - 10 : 0}em)`, transitionDuration: `${900 + i * 260}ms` }}
                  >
                    {[...Array(20)].map((_, k) => <span key={k} className="h-[1em] leading-none">{k % 10}</span>)}
                  </span>
                </span>
              ) : (
                <span key={i}>{ch}</span>
              )
            )}
          </p>
          <p aria-hidden className="mt-3 text-[0.95rem] leading-snug text-ink-2">{it.label}</p>
        </div>
      ))}
    </div>
  );
}
