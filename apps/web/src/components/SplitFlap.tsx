"use client";
import { useEffect, useRef, useState } from "react";

/**
 * A split-flap number. Each digit sits in its own tile with a hinge line; when
 * it changes, the top half folds down (about 80 ms). Reduced motion: no fold.
 */
export function SplitFlap({ value, digits, className = "", label }: { value: number; digits?: number; className?: string; label?: string }) {
  const text = String(Math.max(0, Math.round(value))).padStart(digits ?? 0, "0");
  return (
    <span className={`inline-flex gap-[0.07em] font-mono tabular ${className}`} role="img" aria-label={label ?? text}>
      {text.split("").map((d, i) => (
        <Flap key={`${text.length}-${i}`} digit={d} />
      ))}
    </span>
  );
}

function Flap({ digit }: { digit: string }) {
  const [shown, setShown] = useState(digit);
  const [prev, setPrev] = useState(digit);
  const [flipping, setFlipping] = useState(false);
  const last = useRef(digit);
  useEffect(() => {
    if (digit === last.current) return;
    setPrev(last.current);
    last.current = digit;
    setFlipping(true);
    setShown(digit);
    const id = setTimeout(() => setFlipping(false), 80);
    return () => clearTimeout(id);
  }, [digit]);
  return (
    <span aria-hidden className="relative inline-block h-[1.18em] w-[0.74em] overflow-hidden rounded-[0.08em] bg-[#24262b] text-paper shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] [perspective:3em]">
      <span className="absolute inset-0 flex items-center justify-center leading-none">{shown}</span>
      {flipping && (
        <span className="absolute inset-x-0 top-0 h-1/2 origin-bottom overflow-hidden bg-[#24262b] [animation:flap_80ms_ease-in_forwards] motion-reduce:hidden">
          <span className="absolute inset-x-0 top-0 flex h-[1.18em] items-center justify-center leading-none">{prev}</span>
        </span>
      )}
      <span className="pointer-events-none absolute inset-x-0 top-1/2 h-[0.035em] min-h-px -translate-y-1/2 bg-paper/30" />
      <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-white/[0.05]" />
    </span>
  );
}
