"use client";
import { useState } from "react";

export function CopyBlock({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="border border-ink bg-ink text-paper on-ink">
      <div className="flex items-center justify-between gap-3 border-b border-paper/20 px-3 py-1.5">
        <span className="font-mono text-[0.72rem] text-paper/70">{label}</span>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {}
          }}
          className="px-2 py-0.5 text-[0.75rem] underline decoration-paper/40 hover:text-mark"
          aria-label={`Copy ${label}`}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre tabIndex={0} className="overflow-x-auto px-3 py-3 font-mono text-[0.82rem] leading-relaxed whitespace-pre">{value}</pre>
    </div>
  );
}
