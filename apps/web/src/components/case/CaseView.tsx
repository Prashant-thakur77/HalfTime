"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { describeMonths, evaluate, humanDate, parseIsoDate, sectionLabel, type CaseInput, type Tri } from "@halftime/law";
import { decide, type Extraction } from "@halftime/reader";
import { Stamp } from "@/components/Stamp";
import { VerdictTag } from "@/components/VerdictTag";
import { applicationDocx } from "@/lib/application";
import { RUNS, getSample } from "@/lib/cases";
import { download } from "@/lib/csv";
import { edits as editStore, uploads } from "@/lib/store";
import { useTodayParam } from "@/lib/today";
import { VERDICT_STYLE } from "@/lib/verdict";
import { DocumentView } from "./DocumentView";
import { TypedTrace } from "./TypedTrace";

interface Loaded {
  id: string;
  title: string;
  gloss: string;
  text: string;
  extraction: Extraction;
  constructed: boolean;
  gold?: CaseInput;
}

function fromSample(id: string): Loaded | undefined {
  const s = getSample(id);
  const run = RUNS[id];
  return s && run ? { id, title: s.title, gloss: s.gloss, text: s.text, extraction: run.extraction, constructed: true, gold: s.gold } : undefined;
}

export function CaseView({ id }: { id: string }) {
  const today = useTodayParam();
  const [loaded, setLoaded] = useState<Loaded | null | undefined>(() => fromSample(id));
  const [edits, setEdits] = useState<Partial<CaseInput>>({});
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    if (!fromSample(id)) {
      const u = uploads.get(id);
      setLoaded(u ? { id, title: u.name, gloss: u.extraction.english_gloss, text: u.text, extraction: u.extraction, constructed: false } : null);
    }
    setEdits(editStore.get(id));
  }, [id]);

  const result = useMemo(() => (loaded ? decide(loaded.text, loaded.extraction, today, edits) : null), [loaded, today, edits]);

  if (loaded === undefined) return <p className="px-[var(--gutter)] py-20 font-mono">Opening the file…</p>;
  if (loaded === null || !result)
    return (
      <div className="mx-auto max-w-2xl px-[var(--gutter)] py-24">
        <h1 className="font-serif text-[length:var(--step-3)]">This case isn&apos;t here.</h1>
        <p className="mt-3">Uploaded cases live only in the browser tab that added them. <Link className="underline" href="/sweep">Back to the sweep</Link>.</p>
      </div>
    );

  const e = result.evaluation;
  const f = result.facts;
  const base = f.input;
  const cur: CaseInput = { ...base, ...edits };
  const setEdit = (patch: Partial<CaseInput>) => {
    const next = { ...edits, ...patch };
    setEdits(next);
    editStore.set(id, next);
  };
  const ex = loaded.extraction;
  const style = VERDICT_STYLE[e.verdict];
  const goldVerdict = loaded.gold ? evaluate(loaded.gold, today).verdict : null;
  const quotes = f.spans.map((s) => ({ label: s.label, text: result.text.slice(s.start, s.end) }));

  const getDocx = async (lang: "en" | "hi") => {
    const blob = await applicationDocx({ lang, court: ex.court, caseNo: ex.case_no, accused: ex.accused_name_masked, today, evaluation: e, quotes });
    download(`479-3-application-${id}-${lang}.docx`, blob);
  };

  return (
    <div className="mx-auto max-w-[var(--max)] px-[var(--gutter)] pt-8 pb-10">
      <nav aria-label="Breadcrumb" className="text-[0.85rem]">
        <Link className="underline" href="/sweep">Sweep</Link> <span aria-hidden>/</span> <span className="font-mono">{ex.case_no ?? id}</span>
      </nav>

      <header className="mt-4 grid gap-6 border-b border-ink pb-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <p className="caps text-ink-3">{loaded.constructed ? "Constructed sample order · not a real case" : "Your upload · kept only in this tab"}</p>
          <h1 className="mt-2 font-serif text-[length:var(--step-4)] leading-[1.02]">{ex.accused_name_masked}</h1>
          <p className="mt-2 max-w-2xl text-ink-2">{loaded.gloss}</p>
          <p className="mt-1 text-[0.85rem] text-ink-3">{ex.court}</p>
        </div>
        <div className="flex flex-col items-start gap-3 lg:col-span-4 lg:items-end">
          {e.verdict === "PAST_THE_LINE" && <Stamp className="rotate-[-4deg] text-[1.05rem]" />}
          {e.verdict === "PAST_FLAGGED" && <Stamp tone="flag" main="PAST · FLAGGED" bottom="LAWYER DECIDES 479(2)" className="rotate-[-4deg] text-[1.05rem]" />}
          {!e.verdict.startsWith("PAST") && <VerdictTag verdict={e.verdict} className="text-[1rem]" />}
          <p className={`max-w-sm text-[0.92rem] lg:text-right ${style.text}`}>{style.long}</p>
        </div>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <h2 className="caps mb-3">The papers, with what was read from them</h2>
          <DocumentView text={result.text} spans={f.spans} active={active} onHover={setActive} />
          {f.rejected.length > 0 && (
            <div className="mt-6 border-2 border-stamp bg-[#f6ddd6] p-4">
              <h3 className="font-sans text-[1.05rem] font-[700] text-stamp-text">Model claims rejected by the verifier ({f.rejected.length})</h3>
              <p className="mt-1 text-[0.85rem]">These were dropped to “unknown”. A claim only counts if its quote is really in the papers.</p>
              <ul className="mt-3 space-y-2">
                {f.rejected.map((r, i) => (
                  <li key={i} className="border-t border-stamp/30 pt-2 text-[0.88rem]">
                    <span className="font-mono line-through decoration-stamp decoration-2">{r.field}: {r.claim}</span>
                    {r.quote && <span className="block font-serif text-ink-2">“{r.quote}”</span>}
                    <span className="block text-stamp-text">{r.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <aside className="space-y-8 lg:col-span-5">
          <section aria-labelledby="facts-h" className="border border-ink bg-paper-2 p-4">
            <h2 id="facts-h" className="caps">Facts · edit to recompute</h2>
            <dl className="mt-3 divide-y divide-[var(--rule)]">
              <Field label="Charged sections">
                <ul className="space-y-1">
                  {e.sections.map((s) => (
                    <li key={`${s.act}${s.canonical}`}>
                      <button
                        type="button"
                        onMouseEnter={() => setActive(s.spanId ?? null)}
                        onFocus={() => setActive(s.spanId ?? null)}
                        onMouseLeave={() => setActive(null)}
                        className="text-left font-mono text-[0.85rem] underline decoration-carbon-soft decoration-dotted underline-offset-4 hover:bg-mark"
                      >
                        {sectionLabel(s)}
                      </button>
                      <span className="ml-2 text-[0.8rem] text-ink-3">
                        {s.punishment?.kind === "term" ? `max ${describeMonths(s.punishment.months!)}` : s.punishment?.kind ?? "not in tables"}
                      </span>
                    </li>
                  ))}
                  {e.sections.length === 0 && <li className="text-ink-3">None read</li>}
                </ul>
              </Field>
              <Field label="Custody began" htmlFor="custody">
                <input
                  id="custody"
                  type="date"
                  value={cur.custodyStart ?? ""}
                  onChange={(ev) => setEdit({ custodyStart: ev.target.value || null })}
                  onFocus={() => setActive(base.custodySpanId ?? null)}
                  className="w-full border border-ink bg-paper px-2 py-1.5 font-mono"
                />
              </Field>
              <Field label="First-time offender" htmlFor="ft">
                <TriSelect id="ft" value={cur.firstTimeOffender} onChange={(v) => setEdit({ firstTimeOffender: v })} />
              </Field>
              <Field label="Other cases pending" htmlFor="other">
                <TriSelect id="other" value={cur.otherPendingCases} onChange={(v) => setEdit({ otherPendingCases: v })} />
              </Field>
              <Field label="Delay caused by accused (days)" htmlFor="delay">
                <input
                  id="delay"
                  type="number"
                  min={0}
                  value={cur.accusedDelayDays ?? 0}
                  onChange={(ev) => setEdit({ accusedDelayDays: Math.max(0, Number(ev.target.value) || 0) })}
                  className="w-full border border-ink bg-paper px-2 py-1.5 font-mono"
                />
              </Field>
              <Field label="Max term override (months)" htmlFor="override">
                <input
                  id="override"
                  type="number"
                  min={1}
                  placeholder="from the tables"
                  value={cur.maxTermOverrideMonths ?? ""}
                  onChange={(ev) => setEdit({ maxTermOverrideMonths: ev.target.value ? Number(ev.target.value) : null })}
                  className="w-full border border-ink bg-paper px-2 py-1.5 font-mono"
                />
              </Field>
            </dl>
            {Object.keys(edits).length > 0 && (
              <button type="button" className="mt-3 text-[0.85rem] underline" onClick={() => { setEdits({}); editStore.set(id, {}); }}>
                Undo my edits
              </button>
            )}
          </section>

          <section aria-labelledby="numbers-h" className="grid grid-cols-2 gap-px border border-ink bg-ink">
            <h2 id="numbers-h" className="sr-only">Key numbers</h2>
            <Num label="Days detained" value={e.daysDetained} />
            <Num label="Line" text={e.lineDate ? humanDate(parseIsoDate(e.lineDate)!) : "—"} />
            <Num label={e.daysToGo !== null ? "Days to go" : "Days past"} value={e.daysToGo ?? e.daysPast} />
            <Num label="If first-time" text={e.firstTimeLineDate ? humanDate(parseIsoDate(e.firstTimeLineDate)!) : "—"} />
          </section>

          <section aria-labelledby="trace-h">
            <h2 id="trace-h" className="caps mb-2">Rule trace · code, not the model</h2>
            <TypedTrace steps={e.trace} onHover={setActive} />
          </section>

          {e.flags.length > 0 && (
            <section className="border-l-4 border-flag bg-flag-bg p-4">
              <h2 className="caps text-flag">For the lawyer</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[0.9rem]">
                {e.flags.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              {e.verdict === "PAST_FLAGGED" && (
                <p className="mt-3 text-[0.85rem]">
                  Courts have read “more than one offence” in Sec 479(2) differently. <Link className="underline" href="/law#conflict">How the readings differ</Link>.
                </p>
              )}
            </section>
          )}

          <section aria-labelledby="app-h" className="border border-ink p-4">
            <h2 id="app-h" className="caps">Sec 479(3) application · draft for a lawyer</h2>
            <p className="mt-2 text-[0.88rem] text-ink-2">
              Pre-filled with the case details, the computation, the provisions{e.provision === "BNSS_479_PRE_JULY_2024" ? ", the Supreme Court order of 23 Aug 2024" : ""} and the quotes from the papers. Blanks for signatures. Marked “Draft for lawyer review”.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => void getDocx("en")} className="h-11 border border-ink bg-ink px-4 text-paper hover:bg-stamp">
                <span className="caps">DOCX · English</span>
              </button>
              <button type="button" onClick={() => void getDocx("hi")} className="h-11 border border-ink px-4 hover:bg-mark">
                <span className="caps">DOCX · हिन्दी</span>
              </button>
              <Link href={`/case/${id}/application?today=${today}`} className="flex h-11 items-center border border-ink px-4 hover:bg-mark">
                <span className="caps">PDF / print</span>
              </Link>
            </div>
          </section>

          {goldVerdict && (
            <p className="text-[0.82rem] text-ink-3">
              Answer key for this constructed order: <VerdictTag verdict={goldVerdict} />{" "}
              {goldVerdict === e.verdict ? "HalfTime agrees." : "HalfTime differs; see the trace and the rejected claims."}
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,9rem)_1fr] items-start gap-3 py-2.5">
      <dt className="text-[0.82rem] text-ink-2">{htmlFor ? <label htmlFor={htmlFor}>{label}</label> : label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function TriSelect({ id, value, onChange }: { id: string; value: Tri; onChange: (v: Tri) => void }) {
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value as Tri)} className="w-full border border-ink bg-paper px-2 py-1.5">
      <option value="true">Yes (papers say so)</option>
      <option value="false">No (papers say so)</option>
      <option value="unknown">Not stated</option>
    </select>
  );
}

function Num({ label, value, text }: { label: string; value?: number | null; text?: string }) {
  return (
    <div className="bg-paper p-3">
      <p className="text-[0.75rem] text-ink-3">{label}</p>
      <p className="font-mono text-[1.35rem] tabular">{text ?? (value === null || value === undefined ? "—" : value.toLocaleString("en-IN"))}</p>
    </div>
  );
}
