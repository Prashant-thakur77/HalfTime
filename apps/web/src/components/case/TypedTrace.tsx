"use client";
import { useEffect, useState } from "react";
import type { TraceStep } from "@halftime/law";

/** The rule trace types itself out line by line, like a clerk filling the register. */
export function TypedTrace({ steps, onHover }: { steps: TraceStep[]; onHover: (id: number | null) => void }) {
  const key = steps.map((s) => s.text).join("|");
  const [shown, setShown] = useState(steps.length);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(steps.length);
      return;
    }
    setShown(0);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setShown(i);
      if (i >= steps.length) clearInterval(id);
    }, 110);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <ol className="register border border-ink bg-paper font-mono text-[0.8rem] leading-relaxed" aria-label="Rule trace">
      {steps.map((s, i) => (
        <li
          key={i}
          onMouseEnter={() => s.spanId !== undefined && onHover(s.spanId)}
          onMouseLeave={() => onHover(null)}
          className={`grid grid-cols-[2.2rem_1fr] gap-2 border-b border-[var(--rule)] px-2 py-1.5 transition-opacity duration-[var(--tick)] ${i < shown ? "opacity-100" : "opacity-0"} ${s.step === "result" ? "bg-ink text-paper" : ""} ${s.step === "flag" ? "text-flag" : ""}`}
        >
          <span className={s.step === "result" ? "text-paper/60" : "text-ink-3"}>{String(i + 1).padStart(2, "0")}</span>
          <span>
            {s.text}
            {s.source && <span className={`block text-[0.7rem] ${s.step === "result" ? "text-paper/60" : "text-carbon"}`}>{s.source}</span>}
            {s.spanId !== undefined && <span className="ml-1 text-[0.7rem] text-ink-3">[quote #{s.spanId + 1}]</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}
