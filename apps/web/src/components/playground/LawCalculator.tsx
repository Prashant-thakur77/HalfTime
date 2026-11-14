"use client";
import { useEffect, useId, useMemo, useState } from "react";
import {
  ALL_ROWS,
  actShortName,
  applyReadWith,
  describeMonths,
  evaluate,
  expandSections,
  humanDate,
  parseIsoDate,
  resolveSection,
  sectionLabel,
  toIso,
  type ActCode,
  type Evaluation,
  type NdpsQuantity,
  type SectionResolution,
  type Tri
} from "@halftime/law";
import { addDays, addMonths } from "date-fns";
import { ACTS } from "@halftime/reader";
import { SplitFlap } from "@/components/SplitFlap";
import { Stamp } from "@/components/Stamp";
import { VerdictTag } from "@/components/VerdictTag";
import { CALC_PRESETS, fromPreset, newKey, type CalcState, type SectionDraft } from "@/lib/playground/presets";
import { useToday } from "@/lib/today";
import { VERDICT_STYLE } from "@/lib/verdict";
import { Timeline } from "./Timeline";

const SUGGESTIONS: Record<string, { section: string; title: string }[]> = {};
for (const r of ALL_ROWS) (SUGGESTIONS[r.act] ??= []).push({ section: r.section, title: r.title });

const INPUT = "h-11 w-full border border-ink bg-paper px-2.5 font-mono text-[0.95rem]";

export function LawCalculator() {
  const uid = useId();
  const realToday = useToday();
  const [presetId, setPresetId] = useState<string | null>(CALC_PRESETS[0]!.id);
  const [state, setState] = useState<CalcState>(() => fromPreset(CALC_PRESETS[0]!));
  const today = state.today ?? realToday;

  const set = (patch: Partial<CalcState>) => {
    setPresetId(null);
    setState((s) => ({ ...s, ...patch }));
  };
  const setSection = (key: number, patch: Partial<SectionDraft>) =>
    set({ sections: state.sections.map((s) => (s.key === key ? { ...s, ...patch } : s)) });

  const evaluation: Evaluation = useMemo(
    () =>
      evaluate(
        {
          sections: state.sections
            .filter((s) => s.section.trim())
            .map((s) => ({ act: s.act, section: s.section.trim(), ...(s.act === "NDPS" && s.quantity ? { quantity: s.quantity } : {}) })),
          custodyStart: state.custodyStart || null,
          firstTimeOffender: state.firstTime,
          otherPendingCases: state.otherCases,
          accusedDelayDays: state.delayDays
        },
        today
      ),
    [state, today]
  );

  const style = VERDICT_STYLE[evaluation.verdict];
  const summary = summarize(evaluation);
  const [spoken, setSpoken] = useState(summary);
  useEffect(() => {
    const id = setTimeout(() => setSpoken(summary), 450);
    return () => clearTimeout(id);
  }, [summary]);

  // The "today" slider runs from custody start to a little past the full maximum term.
  const custody = parseIsoDate(state.custodyStart);
  const sliderStart = custody ?? addDays(parseIsoDate(realToday)!, -3 * 365);
  const fullEnd = custody && evaluation.maxTermMonths ? addDays(addMonths(custody, evaluation.maxTermMonths), state.delayDays) : null;
  const ends = [fullEnd, parseIsoDate(realToday), parseIsoDate(today)].filter((d): d is Date => d !== null).map((d) => d.getTime());
  const sliderEnd = addDays(new Date(Math.max(...ends)), 120);
  const span = Math.max(1, Math.round((sliderEnd.getTime() - sliderStart.getTime()) / 86_400_000));
  const pos = Math.round((parseIsoDate(today)!.getTime() - sliderStart.getTime()) / 86_400_000);

  return (
    <div className="mt-8">
      <div role="group" aria-label="Load an example" className="flex flex-wrap gap-2">
        <span className="caps mr-1 self-center text-ink-3">Examples</span>
        {CALC_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={presetId === p.id}
            onClick={() => {
              setPresetId(p.id);
              setState(fromPreset(p));
            }}
            className={`min-h-10 rounded-full border px-4 py-1.5 text-left text-[0.88rem] font-[600] transition-colors duration-[var(--tick)] ${
              presetId === p.id ? "border-carbon bg-carbon text-paper" : "border-carbon text-carbon hover:bg-[#dfe4f1]"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <p className="mt-2 min-h-[1.5em] text-[0.88rem] text-ink-2">{CALC_PRESETS.find((p) => p.id === presetId)?.note ?? "Your own facts. Change anything; the result follows."}</p>

      <div className="mt-6 grid gap-8 lg:grid-cols-12">
        <form className="min-w-0 space-y-6 self-start border border-ink bg-paper-2 p-4 sm:p-5 lg:col-span-5" onSubmit={(e) => e.preventDefault()} aria-label="Facts of the case">
          <fieldset>
            <legend className="caps">Charged sections</legend>
            <ul className="mt-3 space-y-4">
              {state.sections.map((s, i) => (
                <li key={s.key} className="border-l-2 border-carbon pl-3">
                  <div className="grid grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)_auto] items-end gap-2">
                    <div>
                      <label htmlFor={`${uid}-act-${i}`} className="block text-[0.78rem] text-ink-2">
                        Act
                      </label>
                      <select
                        id={`${uid}-act-${i}`}
                        value={s.act}
                        onChange={(e) => setSection(s.key, { act: e.target.value as ActCode })}
                        className={`${INPUT} mt-1 font-sans`}
                      >
                        {ACTS.map((a) => (
                          <option key={a} value={a}>
                            {a === "OTHER" ? "Other law" : actShortName(a)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor={`${uid}-sec-${i}`} className="block text-[0.78rem] text-ink-2">
                        Section
                      </label>
                      <input
                        id={`${uid}-sec-${i}`}
                        value={s.section}
                        list={SUGGESTIONS[s.act] ? `${uid}-dl-${s.act}` : undefined}
                        autoComplete="off"
                        spellCheck={false}
                        placeholder="e.g. 379"
                        onChange={(e) => setSection(s.key, { section: e.target.value })}
                        className={`${INPUT} mt-1 placeholder:text-ink-3`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => set({ sections: state.sections.filter((x) => x.key !== s.key) })}
                      aria-label={`Remove ${s.section ? `section ${s.section}` : "this section"}`}
                      className="grid h-11 w-11 place-items-center border border-ink/40 text-ink-2 hover:border-ink hover:bg-paper"
                    >
                      <svg aria-hidden width="14" height="14" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="2">
                        <path d="M2 2l10 10M12 2L2 12" />
                      </svg>
                    </button>
                  </div>
                  {s.act === "NDPS" && (
                    <div className="mt-2">
                      <label htmlFor={`${uid}-qty-${i}`} className="block text-[0.78rem] text-ink-2">
                        Quantity class
                      </label>
                      <select
                        id={`${uid}-qty-${i}`}
                        value={s.quantity ?? "unknown"}
                        onChange={(e) => setSection(s.key, { quantity: e.target.value as NdpsQuantity })}
                        className={`${INPUT} mt-1 font-sans`}
                      >
                        <option value="unknown">Not stated</option>
                        <option value="small">Small</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="commercial">Commercial</option>
                      </select>
                    </div>
                  )}
                  <Resolved draft={s} />
                </li>
              ))}
            </ul>
            {Object.entries(SUGGESTIONS)
              .filter(([act]) => state.sections.some((s) => s.act === act))
              .map(([act, rows]) => (
                <datalist key={act} id={`${uid}-dl-${act}`}>
                  {rows.map((r) => (
                    <option key={r.section} value={r.section} label={r.title} />
                  ))}
                </datalist>
              ))}
            <button
              type="button"
              onClick={() => set({ sections: [...state.sections, { key: newKey(), act: state.sections.at(-1)?.act ?? "IPC", section: "" }] })}
              className="mt-4 inline-flex h-10 items-center gap-2 border border-dashed border-ink px-3 text-[0.88rem] font-[600] hover:bg-paper"
            >
              <span aria-hidden className="font-mono">+</span> Add a section
            </button>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={`${uid}-custody`} className="caps block">
                Custody began
              </label>
              <input
                id={`${uid}-custody`}
                type="date"
                value={state.custodyStart}
                onChange={(e) => set({ custodyStart: e.target.value })}
                className={`${INPUT} mt-2`}
              />
            </div>
            <div>
              <label htmlFor={`${uid}-delay`} className="caps block">
                Delay caused by accused
              </label>
              <div className="relative mt-2">
                <input
                  id={`${uid}-delay`}
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={state.delayDays}
                  onChange={(e) => set({ delayDays: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
                  className={`${INPUT} pr-12`}
                />
                <span aria-hidden className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[0.8rem] text-ink-3">
                  days
                </span>
              </div>
            </div>
          </div>

          <TriField legend="First-time offender" value={state.firstTime} onChange={(v) => set({ firstTime: v })} />
          <TriField legend="Other cases pending" value={state.otherCases} onChange={(v) => set({ otherCases: v })} />

          <div>
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor={`${uid}-today`} className="caps">
                Today
              </label>
              <output htmlFor={`${uid}-today`} className="font-mono text-[0.95rem] tabular">
                {humanDate(parseIsoDate(today)!)}
              </output>
            </div>
            <input
              id={`${uid}-today`}
              type="range"
              className="pg-range mt-1"
              min={0}
              max={span}
              step={1}
              value={Math.min(span, Math.max(0, pos))}
              aria-valuetext={humanDate(parseIsoDate(today)!)}
              onChange={(e) => set({ today: toIso(addDays(sliderStart, Number(e.target.value))) })}
            />
            <div className="flex items-center justify-between text-[0.78rem] text-ink-3">
              <span className="font-mono">{humanDate(sliderStart)}</span>
              {state.today !== null && (
                <button type="button" onClick={() => set({ today: null })} className="text-[0.82rem] text-carbon underline underline-offset-4">
                  Back to the real date
                </button>
              )}
              <span className="font-mono">{humanDate(sliderEnd)}</span>
            </div>
          </div>
        </form>

        <section aria-labelledby={`${uid}-out`} className="min-w-0 lg:col-span-7">
          <h3 id={`${uid}-out`} className="sr-only">
            Result
          </h3>
          <p className="sr-only" aria-live="polite" aria-atomic="true">
            {spoken}
          </p>

          <div className="relative overflow-hidden border border-ink bg-paper">
            <div className="grid gap-6 p-5 sm:grid-cols-[1fr_auto] sm:items-start sm:p-6">
              <div className="min-w-0">
                <p className="caps text-ink-3">Days in custody, counted</p>
                <SplitFlap
                  value={evaluation.daysDetained ?? 0}
                  digits={4}
                  className="mt-2 text-[clamp(2.6rem,9vw,4.4rem)]"
                  label={evaluation.daysDetained === null ? "Unknown" : `${evaluation.daysDetained} days`}
                />
                <p className="mt-3 font-mono text-[0.95rem] tabular">
                  {evaluation.daysPast !== null && <span className={style.text}>{evaluation.daysPast.toLocaleString("en-IN")} days past the line</span>}
                  {evaluation.daysToGo !== null && <span className="text-carbon">{evaluation.daysToGo.toLocaleString("en-IN")} days to the line</span>}
                  {evaluation.daysPast === null && evaluation.daysToGo === null && <span className="text-ink-3">No line to count to</span>}
                </p>
              </div>
              <div className="flex min-h-[7rem] items-center sm:justify-end">
                <VerdictMark e={evaluation} />
              </div>
            </div>

            <div className="border-t border-ink/20 px-5 py-5 sm:px-6">
              <Timeline e={evaluation} custodyStart={state.custodyStart} delayDays={state.delayDays} firstTime={state.firstTime} today={today} />
            </div>

            <div className={`border-t border-ink px-5 py-4 sm:px-6 ${style.bg}`}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <VerdictTag verdict={evaluation.verdict} className="bg-paper" />
                {evaluation.verdict === "PAST_FLAGGED" && <span className="font-mono text-[0.82rem] font-[600] text-flag">flagged · 479(2)</span>}
              </div>
              <p className={`mt-2 text-[0.95rem] ${style.text}`}>{style.long}</p>
              {evaluation.flags.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-[0.88rem] text-ink">
                  {evaluation.flags.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              )}
              {evaluation.missing.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-[0.88rem] text-ink">
                  {evaluation.missing.map((m) => (
                    <li key={m}>Missing: {m}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <h3 className="caps mt-8 mb-2">Rule trace · code, not a model</h3>
          <ol className="register border border-ink bg-paper font-mono text-[0.8rem] leading-relaxed" aria-label="Rule trace">
            {evaluation.trace.map((s, i) => (
              <li
                key={i}
                className={`grid grid-cols-[2.2rem_1fr] gap-2 border-b border-[var(--rule)] px-2.5 py-1.5 last:border-b-0 ${
                  s.step === "result" ? "bg-ink text-paper" : s.step === "flag" ? "text-flag" : s.step === "missing" ? "text-stamp-text" : ""
                }`}
              >
                <span className={s.step === "result" ? "text-paper/70" : "text-ink-3"}>{String(i + 1).padStart(2, "0")}</span>
                <span className="min-w-0 break-words">
                  {s.text}
                  {s.source && <span className={`block text-[0.72rem] ${s.step === "result" ? "text-paper/70" : "text-carbon"}`}>{s.source}</span>}
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}

function summarize(e: Evaluation): string {
  switch (e.verdict) {
    case "PAST_THE_LINE":
      return `Past the line by ${e.daysPast} days. The jail must apply under Section 479(3); a lawyer reviews and signs.`;
    case "PAST_FLAGGED":
      return `Past the line by ${e.daysPast} days, flagged under Section 479(2). A lawyer decides before applying.`;
    case "NOT_YET":
      return `Not yet: ${e.daysToGo} days to the line.`;
    case "EXCLUDED":
      return "Outside Section 479: a charged offence allows life imprisonment or death.";
    case "CANT_TELL":
      return `Can't tell. Missing: ${e.missing.join("; ")}.`;
  }
}

function VerdictMark({ e }: { e: Evaluation }) {
  if (e.verdict === "PAST_THE_LINE") return <Stamp key="past" className="pg-slam text-[1.05rem]" />;
  if (e.verdict === "PAST_FLAGGED")
    return <Stamp key="flag" tone="flag" top="PAST THE LINE" main="FLAGGED · 479(2)" bottom="A LAWYER DECIDES" className="pg-slam text-[1rem]" />;
  if (e.verdict === "EXCLUDED") return <Stamp key="ex" tone="ink" top="SEC 479(1)" main="OUTSIDE 479" bottom="LIFE OR DEATH OFFENCE" className="rotate-[-2deg] text-[0.95rem] opacity-80" />;
  if (e.verdict === "NOT_YET")
    return (
      <div className="text-left sm:text-right">
        <p className="caps text-ink-3">The line</p>
        <p className="mt-1 font-mono text-[1.35rem] text-carbon tabular">{e.lineDate ? humanDate(parseIsoDate(e.lineDate)!) : "—"}</p>
      </div>
    );
  return (
    <div className="border border-dashed border-ink-3 px-4 py-3 text-left text-[0.9rem] text-ink-2 sm:max-w-[14rem]">
      Can&apos;t draw a line until the gaps are filled.
    </div>
  );
}

function TriField({ legend, value, onChange }: { legend: string; value: Tri; onChange: (v: Tri) => void }) {
  const name = useId();
  const opts: [Tri, string][] = [
    ["true", "Yes"],
    ["false", "No"],
    ["unknown", "Not stated"]
  ];
  return (
    <fieldset>
      <legend className="caps">{legend}</legend>
      <div className="mt-2 grid grid-cols-3 border border-ink">
        {opts.map(([v, label], i) => (
          <label key={v} className={`relative cursor-pointer ${i > 0 ? "border-l border-ink" : ""}`}>
            <input type="radio" name={name} value={v} checked={value === v} onChange={() => onChange(v)} className="peer sr-only" />
            <span className="flex h-11 items-center justify-center px-2 text-[0.9rem] font-[600] transition-colors duration-[var(--tick)] peer-checked:bg-ink peer-checked:text-paper peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-carbon hover:bg-paper peer-checked:hover:bg-ink">
              {label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Resolved({ draft }: { draft: SectionDraft }) {
  const text = draft.section.trim();
  if (!text) return <p className="mt-2 text-[0.82rem] text-ink-3">Type a section number; suggestions come from the law tables.</p>;
  const parts = applyReadWith(expandSections([{ act: draft.act, section: text, ...(draft.quantity ? { quantity: draft.quantity } : {}) }]).map(resolveSection));
  return (
    <ul className="mt-2 space-y-1">
      {parts.map((r, i) => (
        <li key={i} className="text-[0.85rem] leading-snug">
          <ResolvedLine r={r} />
        </li>
      ))}
    </ul>
  );
}

function ResolvedLine({ r }: { r: SectionResolution }) {
  const label = <span className="font-mono text-ink">{sectionLabel(r)}</span>;
  if (!r.found)
    return (
      <>
        {label} <span className="text-stamp-text">· not in the tables → unknown → can&apos;t tell</span>
      </>
    );
  const p = r.punishment!;
  const what =
    p.kind === "term" ? (
      <span className="font-[650]">max {describeMonths(p.months!)}</span>
    ) : p.kind === "life" || p.kind === "death" ? (
      <span className="font-[650]">up to {p.kind === "life" ? "life" : "death"} → outside 479</span>
    ) : p.kind === "detail" || p.kind === "quantity" ? (
      <span className="text-stamp-text">maximum depends on details → can&apos;t tell</span>
    ) : p.kind === "modifier" ? (
      <span>not a separate offence</span>
    ) : p.kind === "derivative" ? (
      <span>punished as the main offence</span>
    ) : p.kind === "companion" ? (
      <span>adjusts the main offence&apos;s term</span>
    ) : (
      <span className="text-stamp-text">struck down</span>
    );
  return (
    <>
      {label} <span className="text-ink-2">{r.title}</span> · {what}
      {r.source && <span className="block font-mono text-[0.74rem] text-carbon">source: {r.source}</span>}
    </>
  );
}
