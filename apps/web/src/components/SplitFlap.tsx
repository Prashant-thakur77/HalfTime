"use client";
import { useEffect, useRef, useState } from "react";

/**
 * A split-flap number. Each digit flips through to its target with a short
 * mechanical stagger; with reduced motion it just shows the number.
 */
export function SplitFlap({ value, digits, className = "", label }: { value: number; digits?: number; className?: string; label?: string }) {
  const text = String(Math.max(0, Math.round(value))).padStart(digits ?? 0, "0");
  return (
    <span className={`inline-flex gap-[0.08em] font-mono tabular ${className}`} role="img" aria-label={label ?? text}>
      {text.split("").map((d, i) => (
        <Flap key={`${text.length}-${i}`} digit={d} />
      ))}
    </span>
  );
}

function Flap({ digit }: { digit: string }) {
  const [shown, setShown] = useState(digit);
  const [flipping, setFlipping] = useState(false);
  const prev = useRef(digit);
  useEffect(() => {
    if (digit === prev.current) return;
    prev.current = digit;
    setFlipping(true);
    const id = setTimeout(() => {
      setShown(digit);
      setFlipping(false);
    }, 90);
    return () => clearTimeout(id);
  }, [digit]);
  return (
    <span aria-hidden className="relative inline-block min-w-[0.68em] overflow-hidden rounded-[3px] bg-ink px-[0.06em] text-center leading-[1.08] text-paper shadow-[inset_0_-0.5em_0_rgba(255,255,255,0.04)]">
      <span className={`block transition-transform duration-[90ms] ease-in ${flipping ? "[transform:rotateX(70deg)]" : ""}`}>{shown}</span>
      <span className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-paper/25" />
    </span>
  );
}
