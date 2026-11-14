import Link from "next/link";
import { humanDate, parseIsoDate } from "@halftime/law";
import type { DocketEntry } from "@halftime/reader/agent";
import { VerdictTag } from "@/components/VerdictTag";

const RECORD_NAMES: Record<string, string> = {
  custody_certificate: "Custody certificate",
  charge_sheet_copy: "Charge-sheet copy",
  criminal_history_report: "Criminal history report"
};

function days(d: DocketEntry) {
  if (d.daysPast !== null) return { text: `+${d.daysPast}`, note: "days past the line" };
  if (d.daysToGo !== null) return { text: `${d.daysToGo}`, note: "days to go" };
  if (d.verdict === "CANT_TELL") return { text: `${d.missing.length}`, note: d.missing.length === 1 ? "fact missing" : "facts missing" };
  return { text: "—", note: "" };
}

/** The priority docket, built by code from verified state. */
export function DocketTable({ docket, linkCases, caption }: { docket: DocketEntry[]; linkCases: boolean; caption: string }) {
  return (
    <div tabIndex={0} role="region" aria-label={caption} className="relative overflow-x-auto border border-ink bg-paper">
      <table className="w-full min-w-[900px] border-collapse text-[0.88rem]">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-ink text-left text-paper">
          <tr>
            <th scope="col" className="p-3 font-[600]">#</th>
            <th scope="col" className="p-3 font-[600]">File</th>
            <th scope="col" className="p-3 font-[600]">Code&apos;s verdict</th>
            <th scope="col" className="p-3 font-[600]">Days</th>
            <th scope="col" className="p-3 font-[600]">Quotes verified</th>
            <th scope="col" className="p-3 font-[600]">Rejected, then fixed</th>
            <th scope="col" className="p-3 font-[600]">Records requested</th>
            <th scope="col" className="p-3 font-[600]">Draft</th>
          </tr>
        </thead>
        <tbody>
          {docket.map((d) => {
            const dd = days(d);
            return (
              <tr key={d.id} data-docket-row={d.id} data-verdict={d.verdict} className="border-t border-[var(--rule)] align-top odd:bg-paper-2/50">
                <td className="p-3 font-mono tabular text-ink-3">{String(d.rank).padStart(2, "0")}</td>
                <th scope="row" className="p-3 text-left font-[500]">
                  {linkCases ? (
                    <Link href={`/case/${d.id}`} className="font-mono font-[600] text-carbon underline underline-offset-2">
                      {d.id}
                    </Link>
                  ) : (
                    <span className="font-mono font-[600]">{d.id}</span>
                  )}
                  <span className="mt-0.5 block font-serif text-[1rem] whitespace-nowrap">{d.accused}</span>
                  {d.caseNo && <span className="block font-mono text-[0.72rem] text-ink-3">{d.caseNo}</span>}
                </th>
                <td className="p-3 whitespace-nowrap">
                  <VerdictTag verdict={d.verdict} />
                  {d.lineDate && <span className="mt-1 block font-mono text-[0.72rem] text-ink-3">line {humanDate(parseIsoDate(d.lineDate)!)}</span>}
                  {!d.submitted && <span className="mt-1 block text-[0.75rem] text-ink-3">not read by the agent</span>}
                </td>
                <td className="p-3">
                  <span className="font-mono text-[1.05rem] tabular">{dd.text}</span>
                  {dd.note && <span className="block text-[0.72rem] text-ink-3">{dd.note}</span>}
                </td>
                <td className="p-3 font-mono tabular">{d.quotes.length}</td>
                <td className="p-3 font-mono tabular">
                  {d.rejectedClaims === 0 ? (
                    <span className="text-ink-3">0</span>
                  ) : (
                    <>
                      <span className="text-stamp-text">{d.rejectedClaims}</span>
                      <span aria-hidden> → </span>
                      <span className="sr-only">, fixed </span>
                      <span className="text-ok">{d.fixedOnRetry}</span>
                    </>
                  )}
                </td>
                <td className="p-3 text-[0.82rem]">
                  {d.records.length ? (
                    <ul className="space-y-1">
                      {d.records.map((r) => (
                        <li key={r.what}>
                          <details>
                            <summary className="cursor-pointer text-carbon underline underline-offset-2">{RECORD_NAMES[r.what] ?? r.what}</summary>
                            <pre className="mt-2 max-w-[22rem] border border-ink bg-paper-2 p-2 font-mono text-[0.7rem] leading-relaxed whitespace-pre-wrap">{r.note}</pre>
                          </details>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-ink-3">—</span>
                  )}
                </td>
                <td className="p-3 text-[0.82rem]">
                  {d.draft ? (
                    linkCases ? (
                      <Link href={`/case/${d.id}/application`} className="text-carbon underline underline-offset-2">
                        {d.draft.lang === "hi" ? "Hindi" : "English"} draft
                      </Link>
                    ) : (
                      <details>
                        <summary className="cursor-pointer text-carbon underline underline-offset-2">{d.draft.lang === "hi" ? "Hindi" : "English"} draft</summary>
                        <pre className="mt-2 max-h-64 max-w-[26rem] overflow-auto border border-ink bg-paper-2 p-2 font-mono text-[0.7rem] whitespace-pre-wrap">{d.draft.text}</pre>
                      </details>
                    )
                  ) : (
                    <span className="text-ink-3">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function StatTiles({ stats }: { stats: { files: number; toolCalls: number; rejectedClaims: number; fixedOnRetry: number; recordsRequested: number; drafts: number; costUsd: number; ms: number } }) {
  const tiles = [
    { v: stats.files, l: "files read" },
    { v: stats.toolCalls, l: "tool calls" },
    { v: stats.rejectedClaims, l: "claims rejected by the verifier", tone: stats.rejectedClaims ? "text-stamp-text" : "" },
    { v: stats.fixedOnRetry, l: "fixed on retry with an exact quote", tone: stats.fixedOnRetry ? "text-ok" : "" },
    { v: stats.recordsRequested, l: "records requested" },
    { v: stats.drafts, l: "479(3) drafts written" },
    { v: `$${stats.costUsd.toFixed(2)}`, l: "model cost, whole docket" },
    { v: `${Math.round(stats.ms / 1000)}s`, l: "model and tool time" }
  ];
  return (
    <dl className="grid grid-cols-2 border-t border-l border-ink md:grid-cols-4">
      {tiles.map((t) => (
        <div key={t.l} className="border-r border-b border-ink bg-paper p-4 md:p-5">
          <dt className="text-[0.82rem] text-ink-2">{t.l}</dt>
          <dd className={`order-first font-mono text-[clamp(1.8rem,3.4vw,2.8rem)] leading-none tabular ${t.tone ?? ""}`}>{t.v}</dd>
        </div>
      ))}
    </dl>
  );
}
