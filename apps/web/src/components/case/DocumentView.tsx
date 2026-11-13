"use client";
import { useEffect, useMemo, useRef } from "react";
import type { VerifiedSpan } from "@halftime/reader";

const FIELD_COLOR: Record<string, string> = {
  section: "bg-mark",
  custody_start: "bg-[#cfe0ff]",
  first_time_offender: "bg-[#d7ecd9]",
  other_pending_cases: "bg-[#d7ecd9]",
  registered_on: "bg-[#ece2f7]",
  ndps_quantity: "bg-mark"
};

/** The court paper, with every verified quote marked where it sits in the text. */
export function DocumentView({ text, spans, active, onHover }: { text: string; spans: VerifiedSpan[]; active: number | null; onHover: (id: number | null) => void }) {
  const root = useRef<HTMLDivElement>(null);
  const segments = useMemo(() => {
    const cuts = new Set<number>([0, text.length]);
    for (const s of spans) {
      cuts.add(s.start);
      cuts.add(s.end);
    }
    const pts = [...cuts].sort((a, b) => a - b);
    const out: { from: number; to: number; ids: number[] }[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const from = pts[i]!;
      const to = pts[i + 1]!;
      out.push({ from, to, ids: spans.filter((s) => s.start <= from && s.end >= to).map((s) => s.id) });
    }
    return out;
  }, [text, spans]);

  useEffect(() => {
    if (active === null || !root.current) return;
    const el = root.current.querySelector(`[data-span~="${active}"]`);
    el?.scrollIntoView({ block: "nearest", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [active]);

  return (
    <div
      ref={root}
      className="ruled relative max-h-[70vh] overflow-auto border border-ink bg-paper py-6 pr-5 pl-14 font-serif text-[1.02rem] leading-[1.75rem] whitespace-pre-wrap shadow-[6px_6px_0_var(--paper-3)]"
      tabIndex={0}
      aria-label="Court order text"
    >
      {segments.map((seg) => {
        const t = text.slice(seg.from, seg.to);
        if (!seg.ids.length) return <span key={seg.from}>{t}</span>;
        const first = spans[seg.ids[0]!]!;
        const isActive = active !== null && seg.ids.includes(active);
        return (
          <mark
            key={seg.from}
            data-span={seg.ids.join(" ")}
            title={seg.ids.map((i) => spans[i]!.label).join(" · ")}
            onMouseEnter={() => onHover(seg.ids[0]!)}
            onMouseLeave={() => onHover(null)}
            className={`${FIELD_COLOR[first.field] ?? "bg-mark"} rounded-[2px] px-[1px] text-ink transition-[box-shadow] duration-[var(--tick)] ${isActive ? "shadow-[0_0_0_2px_var(--stamp)]" : ""}`}
          >
            {t}
          </mark>
        );
      })}
    </div>
  );
}
