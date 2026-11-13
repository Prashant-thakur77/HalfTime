"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { evaluate, humanDate, parseIsoDate, type Verdict } from "@halftime/law";
import { decide, type BaselineAnswer } from "@halftime/reader";
import { VerdictTag } from "@/components/VerdictTag";
import { RUNS, SAMPLES } from "@/lib/cases";

const PAST = new Set<Verdict>(["PAST_THE_LINE", "PAST_FLAGGED"]);

function chatbotClaim(a: BaselineAnswer | null) {
  if (!a) return "No answer";
  if (a.saysEligible === true) return `Eligible${a.date ? ` from ${humanDate(parseIsoDate(a.date) ?? new Date(a.date))}` : ""}`;
  if (a.saysEligible === false) return "Not eligible";
  return "Doesn't commit";
}

/** Does the chatbot's answer hold up against the answer key? */
function chatbotHolds(a: BaselineAnswer | null, gold: Verdict): { ok: boolean; why: string } {
  if (!a || a.saysEligible === null) return { ok: gold === "CANT_TELL", why: gold === "CANT_TELL" ? "Right not to commit." : "Hedges where the papers are clear." };
  if (a.saysEligible && gold === "PAST_FLAGGED") return { ok: false, why: "Says eligible but misses Sec 479(2): more than one offence or other cases." };
  if (a.saysEligible && !PAST.has(gold)) return { ok: false, why: "Says eligible when the person is not past the line. The unsafe error." };
  if (!a.saysEligible && PAST.has(gold)) return { ok: false, why: "Says not eligible when the person is past the line." };
  return { ok: true, why: "Holds up." };
}

export function VsChatbot() {
  const ids = SAMPLES.filter((s) => RUNS[s.id]).map((s) => s.id);
  const [id, setId] = useState(ids[0] ?? "");
  const [live, setLive] = useState<Record<string, BaselineAnswer>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const s = SAMPLES.find((x) => x.id === id);
  const run = RUNS[id];
  if (!s || !run) return null;
  const r = decide(s.text, run.extraction, today);
  const gold = evaluate(s.gold, today);
  const answer = live[id] ?? run.baseline;
  const holds = chatbotHolds(answer, gold.verdict);

  async function rerun() {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/baseline", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: s!.text }) });
      const j = (await res.json()) as { answer?: BaselineAnswer; error?: string };
      if (!res.ok || !j.answer) throw new Error(j.error ?? "Failed");
      setLive((l) => ({ ...l, [id]: j.answer! }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-[var(--max)] px-[var(--gutter)] pt-10 pb-16">
      <p className="caps text-ink-3">Same order · same model · different method</p>
      <h1 className="mt-3 max-w-4xl font-sans text-[length:var(--step-4)] leading-[0.92] font-[780] tracking-[-0.02em] [font-stretch:82%]">
        A chatbot answers. HalfTime shows its working.
      </h1>

      <div className="mt-8 flex flex-wrap gap-2" role="tablist" aria-label="Sample orders">
        {ids.map((x) => {
          const sm = SAMPLES.find((y) => y.id === x)!;
          return (
            <button
              key={x}
              role="tab"
              aria-selected={x === id}
              onClick={() => setId(x)}
              className="border border-ink px-3 py-2 text-left text-[0.82rem] transition-colors duration-[var(--ui)] hover:bg-mark aria-selected:bg-ink aria-selected:text-paper"
            >
              <span className="font-mono">{x}</span> · {sm.title}
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid border border-ink md:grid-cols-3" aria-live="polite">
        <Cell label="Chatbot says" value={chatbotClaim(answer)} bad={!holds.ok} />
        <Cell label="HalfTime says" value={<VerdictTag verdict={r.evaluation.verdict} />} />
        <Cell label="Answer key (constructed)" value={<VerdictTag verdict={gold.verdict} />} />
      </div>
      <p className={`mt-2 text-[0.95rem] ${holds.ok ? "text-ok" : "text-stamp-text"}`}>Chatbot: {holds.why}</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="bot-h" className="border border-ink bg-ink p-6 text-paper on-ink">
          <div className="flex items-center justify-between gap-3">
            <h2 id="bot-h" className="caps text-paper/70">Plain chatbot</h2>
            <button type="button" onClick={rerun} disabled={busy} className="border border-paper/50 px-3 py-1.5 text-[0.8rem] hover:bg-paper hover:text-ink disabled:opacity-50">
              {busy ? "Asking…" : "Ask it live"}
            </button>
          </div>
          <p className="mt-3 font-mono text-[0.75rem] text-paper/60">Prompt: “Read this court order. Is the accused eligible for release under Section 479 of the BNSS? If yes, from what date? Answer in one paragraph.”</p>
          <div className="mt-4 max-h-[60vh] overflow-auto font-serif text-[1.02rem] leading-relaxed whitespace-pre-wrap text-paper/90">{answer?.text}</div>
          {err && <p className="mt-3 text-mark">{err}</p>}
          <p className="mt-4 text-[0.78rem] text-paper/55">No quotes. No checks. Nothing a lawyer can verify line by line.</p>
        </section>

        <section aria-labelledby="ht-h" className="border border-ink bg-paper p-6">
          <h2 id="ht-h" className="caps text-ink-3">HalfTime</h2>
          <ol className="register mt-4 border border-ink font-mono text-[0.8rem]">
            {r.evaluation.trace.map((t, i) => (
              <li key={i} className={`border-b border-[var(--rule)] px-2 py-1.5 ${t.step === "flag" ? "text-flag" : ""} ${t.step === "result" ? "bg-ink text-paper" : ""}`}>
                {t.text}
              </li>
            ))}
          </ol>
          {r.facts.rejected.length > 0 && <p className="mt-3 text-[0.9rem] text-stamp-text">Verifier rejected {r.facts.rejected.length} model claim(s) on this order.</p>}
          <Link href={`/case/${id}`} className="mt-4 inline-block underline">
            Open the case with the papers and quotes
          </Link>
        </section>
      </div>
    </div>
  );
}

function Cell({ label, value, bad }: { label: string; value: React.ReactNode; bad?: boolean }) {
  return (
    <div className={`border-ink p-4 max-md:border-b md:border-r md:last:border-r-0 ${bad ? "bg-[#f6ddd6]" : ""}`}>
      <p className="text-[0.78rem] text-ink-3">{label}</p>
      <div className="mt-1 font-sans text-[1.15rem] font-[650]">{value}</div>
    </div>
  );
}
