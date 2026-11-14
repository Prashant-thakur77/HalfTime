import Link from "next/link";
import type { AgentEvent, EventKind } from "@halftime/reader/agent";

/** How each kind of step looks in the log. Colours are the site's verdict inks, all AA on paper. */
const KIND: Record<EventKind, { label: string; tag: string; row: string }> = {
  model: { label: "Agent", tag: "text-ink-3 border-ink-3", row: "" },
  list: { label: "List files", tag: "text-carbon border-carbon", row: "" },
  read: { label: "Read file", tag: "text-carbon border-carbon", row: "" },
  accepted: { label: "Verified", tag: "text-ok border-ok", row: "" },
  rejected: { label: "Rejected", tag: "text-stamp-text border-stamp bg-[#f6ddd6]", row: "border-l-4 border-l-stamp bg-[#f6ddd6]/50" },
  fixed: { label: "Fixed on retry", tag: "text-ok border-ok bg-[#e3eee6]", row: "border-l-4 border-l-ok" },
  lookup: { label: "Statute table", tag: "text-carbon border-carbon", row: "" },
  record: { label: "Records request", tag: "text-carbon border-carbon bg-[#dfe4f1]", row: "border-l-4 border-l-carbon" },
  draft: { label: "479(3) draft", tag: "text-stamp-text border-stamp", row: "border-l-4 border-l-stamp" },
  refused: { label: "Refused by code", tag: "text-flag border-flag bg-flag-bg", row: "border-l-4 border-l-flag" },
  finish: { label: "Finish", tag: "text-paper border-ink bg-ink", row: "" },
  stopped: { label: "Stopped", tag: "text-flag border-flag bg-flag-bg", row: "" },
  error: { label: "Error", tag: "text-stamp-text border-stamp", row: "border-l-4 border-l-stamp" }
};

function money(n: number) {
  return n < 0.01 ? `$${n.toFixed(4)}` : `$${n.toFixed(3)}`;
}

export function EventRow({ e, linkFiles }: { e: AgentEvent; linkFiles: boolean }) {
  const k = KIND[e.kind];
  const tokens = e.tokens ? e.tokens.inputTokens + e.tokens.cacheReadTokens + e.tokens.cacheWriteTokens : 0;
  return (
    <li data-kind={e.kind} className={`grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-3 border-t border-[var(--rule)] px-3 py-2.5 first:border-t-0 ${k.row}`}>
      <span className="pt-0.5 font-mono text-[0.72rem] text-ink-3 tabular" aria-label={`Turn ${e.step}`}>
        {String(e.step).padStart(2, "0")}
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={`border px-1.5 py-px text-[0.7rem] font-[650] uppercase tracking-[0.06em] ${k.tag}`}>{k.label}</span>
          {e.tool && e.kind !== "model" && <span className="font-mono text-[0.72rem] text-ink-3">{e.tool}</span>}
          {e.fileId &&
            (linkFiles ? (
              <Link href={`/case/${e.fileId}`} className="font-mono text-[0.78rem] font-[600] text-carbon underline underline-offset-2">
                {e.fileId}
              </Link>
            ) : (
              <span className="font-mono text-[0.78rem] font-[600]">{e.fileId}</span>
            ))}
          {e.kind === "model" && e.tokens && (
            <span className="font-mono text-[0.72rem] text-ink-3 tabular">
              {tokens.toLocaleString("en-IN")} in · {e.tokens.outputTokens.toLocaleString("en-IN")} out{e.costUsd !== undefined ? ` · ${money(e.costUsd)}` : ""}
            </span>
          )}
        </div>
        {e.input && <p className="mt-1 font-mono text-[0.75rem] break-words text-ink-2">{e.input}</p>}
        <p className={`mt-1 text-[0.86rem] leading-snug break-words ${e.kind === "rejected" ? "text-stamp-text" : e.kind === "model" ? "text-ink-2 italic" : "text-ink"}`}>
          {e.kind === "finish" ? "The agent called finish. Its own summary is not used: code builds the docket from verified facts." : e.output}
        </p>
      </div>
    </li>
  );
}
