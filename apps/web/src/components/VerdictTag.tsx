import type { Verdict } from "@halftime/law";
import { VERDICT_STYLE } from "@/lib/verdict";

export function VerdictTag({ verdict, className = "" }: { verdict: Verdict; className?: string }) {
  const s = VERDICT_STYLE[verdict];
  return (
    <span className={`inline-flex items-center gap-1.5 border px-2 py-0.5 text-[0.78rem] font-[650] uppercase tracking-[0.06em] ${s.text} ${s.bg} ${s.border} ${className}`}>
      <span aria-hidden className={`inline-block h-1.5 w-1.5 ${verdict.startsWith("PAST") ? "bg-current" : "border border-current"}`} />
      {s.short}
    </span>
  );
}
