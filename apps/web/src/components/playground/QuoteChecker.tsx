"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { DocIndex, checkDateQuote, checkQuote, checkSectionQuote, matchKey, type CheckResult } from "@halftime/reader";
import { RUNS, SAMPLES } from "@/lib/cases";
import { PARAPHRASES, plantDigit, realQuote } from "@/lib/playground/quotes";

type PresetKind = "real" | "planted" | "paraphrase";

const MIN_KEY = 6;

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

export function QuoteChecker() {
  const uid = useId();
  const [sampleId, setSampleId] = useState(SAMPLES[0]!.id);
  const [quote, setQuote] = useState("");
  const [claimDate, setClaimDate] = useState("");
  const [claimSection, setClaimSection] = useState("");
  const [preset, setPreset] = useState<PresetKind | null>(null);
  const docRef = useRef<HTMLDivElement>(null);

  const sample = SAMPLES.find((s) => s.id === sampleId)!;
  const doc = useMemo(() => new DocIndex(sample.text), [sample.text]);
  const real = useMemo(() => realQuote(RUNS[sampleId]), [sampleId]);
  const planted = useMemo(() => (real ? plantDigit(real.quote) : null), [real]);
  const paraphrase = PARAPHRASES[sampleId];

  const q = useDebounced(quote, 160);
  const d = useDebounced(claimDate, 160);
  const sec = useDebounced(claimSection.trim(), 160);

  const result = useMemo(() => {
    const keyLen = matchKey(q).length;
    if (keyLen === 0) return { state: "empty" as const };
    if (keyLen < MIN_KEY) return { state: "short" as const, keyLen };
    const base = checkQuote(doc, q);
    const date: CheckResult | null = d ? checkDateQuote(doc, d, q) : null;
    const section: CheckResult | null = sec ? checkSectionQuote(doc, sec, q) : null;
    return { state: "checked" as const, base, date, section };
  }, [doc, q, d, sec]);

  const span = result.state === "checked" && result.base.ok ? result.base.span : null;

  // Bring the match into view inside the document only, so the page itself doesn't jump while typing.
  useEffect(() => {
    const box = docRef.current;
    if (!box || !span) return;
    const mark = box.querySelector("mark");
    if (!mark) return;
    const target = (mark as HTMLElement).offsetTop - box.clientHeight / 3;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    box.scrollTo({ top: Math.max(0, target), behavior: reduce ? "auto" : "smooth" });
  }, [span]);

  const choose = (id: string) => {
    setSampleId(id);
    setQuote("");
    setClaimDate("");
    setClaimSection("");
    setPreset(null);
    docRef.current?.scrollTo({ top: 0 });
  };

  const applyPreset = (kind: PresetKind) => {
    setPreset(kind);
    if (kind === "real" && real) {
      setQuote(real.quote);
      setClaimDate(real.date ?? "");
      setClaimSection(real.section ?? "");
    } else if (kind === "planted" && planted && real) {
      setQuote(planted.quote);
      setClaimDate(real.date ?? "");
      setClaimSection(real.section ?? "");
    } else if (kind === "paraphrase" && paraphrase) {
      setQuote(paraphrase.quote);
      setClaimDate("");
      setClaimSection("");
    }
  };

  const hi = sample.language === "hi";
  const text = doc.text;

  return (
    <div className="mt-8">
      <fieldset>
        <legend className="caps text-ink-3">Constructed sample order</legend>
        <div className="mt-2 grid grid-cols-6 gap-1.5 sm:grid-cols-12">
          {SAMPLES.map((s) => {
            const on = s.id === sampleId;
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={on}
                aria-label={`${s.id}: ${s.title}`}
                onClick={() => choose(s.id)}
                className={`group relative flex h-12 flex-col items-center justify-center rounded-[2px] border font-mono text-[0.85rem] leading-none transition-[background-color,color,transform] duration-[var(--tick)] ease-[var(--snap)] ${
                  on ? "-translate-y-0.5 border-ink bg-ink text-paper" : "border-ink/40 bg-paper-2 text-ink hover:border-ink hover:bg-paper-3"
                }`}
              >
                <span>{s.id}</span>
                <span aria-hidden className={`mt-1 text-[0.62rem] tracking-[0.08em] ${on ? "text-paper/80" : "text-ink-3"}`}>
                  {s.language === "hi" ? "हिन्दी" : "EN"}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>
      <p className="mt-3 text-[0.95rem] text-ink-2">
        <span className="font-[650] text-ink">{sample.title}.</span> {sample.gloss}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-12 lg:gap-8">
        <div className="order-2 min-w-0 lg:order-1 lg:col-span-7">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="caps" id={`${uid}-doc`}>
              The order · {hi ? "Hindi" : "English"}
            </h3>
            <span className="caps text-ink-3">Constructed · not a real case</span>
          </div>
          <div
            ref={docRef}
            tabIndex={0}
            role="region"
            aria-labelledby={`${uid}-doc`}
            lang={hi ? "hi" : "en"}
            className="ruled relative mt-2 max-h-[min(34rem,60vh)] overflow-auto border border-ink bg-paper py-6 pr-5 pl-14 font-serif text-[1.02rem] leading-[1.75rem] whitespace-pre-wrap shadow-[6px_6px_0_var(--paper-3)]"
          >
            {span ? (
              <>
                {text.slice(0, span.start)}
                <mark className="pg-mark rounded-[2px] px-[1px] text-ink shadow-[0_0_0_2px_var(--ok)]">{text.slice(span.start, span.end)}</mark>
                {text.slice(span.end)}
              </>
            ) : (
              text
            )}
          </div>
        </div>

        <div className="order-1 min-w-0 space-y-5 lg:order-2 lg:col-span-5">
          <div>
            <label htmlFor={`${uid}-q`} className="caps block">
              Quote to check
            </label>
            <textarea
              id={`${uid}-q`}
              value={quote}
              onChange={(e) => {
                setQuote(e.target.value);
                setPreset(null);
              }}
              rows={4}
              lang={hi ? "hi" : undefined}
              placeholder={hi ? "Paste a line from the order, e.g. धारा 379…" : "Paste a line from the order…"}
              aria-describedby={`${uid}-rule`}
              className="mt-2 block w-full resize-y border border-ink bg-paper px-3 py-2.5 font-serif text-[1.05rem] leading-relaxed placeholder:text-ink-3"
            />
            <p id={`${uid}-rule`} className="mt-2 text-[0.85rem] text-ink-2">
              The verifier ignores whitespace and accepts Devanagari or ASCII digits. Nothing fuzzy: one wrong character and it fails.
            </p>
          </div>

          <div role="group" aria-label="Try a preset quote" className="flex flex-wrap gap-2">
            {real && (
              <PresetButton on={preset === "real"} onClick={() => applyPreset("real")}>
                A real quote
              </PresetButton>
            )}
            {planted && (
              <PresetButton on={preset === "planted"} onClick={() => applyPreset("planted")}>
                A planted quote
              </PresetButton>
            )}
            {paraphrase && (
              <PresetButton on={preset === "paraphrase"} onClick={() => applyPreset("paraphrase")}>
                A paraphrase
              </PresetButton>
            )}
          </div>
          {preset === "planted" && planted && (
            <p className="-mt-2 text-[0.85rem] text-ink-2">
              One digit changed: <span className="font-mono">{planted.from}</span> became <span className="font-mono">{planted.to}</span>. Everything else is the real quote.
            </p>
          )}
          {preset === "paraphrase" && paraphrase && <p className="-mt-2 text-[0.85rem] text-ink-2">Same meaning, different words: {paraphrase.gloss}</p>}


          <div aria-live="polite" aria-atomic="true">
            <Verdict result={result} quoteText={span ? text.slice(span.start, span.end) : null} claimDate={d} claimSection={sec} />
          </div>

          <details className="group border-y border-ink/30 py-3" open={Boolean(claimDate || claimSection) || undefined}>
            <summary className="cursor-pointer list-none text-[0.92rem] font-[600] marker:hidden [&::-webkit-details-marker]:hidden">
              <span aria-hidden className="mr-2 inline-block font-mono transition-transform duration-[var(--tick)] group-open:rotate-90">›</span>
              Also check what the quote is said to prove
            </summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor={`${uid}-d`} className="block text-[0.82rem] text-ink-2">
                  Claimed date
                </label>
                <input
                  id={`${uid}-d`}
                  type="date"
                  value={claimDate}
                  onChange={(e) => setClaimDate(e.target.value)}
                  className="mt-1 h-11 w-full border border-ink bg-paper px-2 font-mono"
                />
              </div>
              <div>
                <label htmlFor={`${uid}-s`} className="block text-[0.82rem] text-ink-2">
                  Claimed section
                </label>
                <input
                  id={`${uid}-s`}
                  type="text"
                  inputMode="text"
                  value={claimSection}
                  placeholder="e.g. 379"
                  onChange={(e) => setClaimSection(e.target.value)}
                  className="mt-1 h-11 w-full border border-ink bg-paper px-2 font-mono placeholder:text-ink-3"
                />
              </div>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}

function PresetButton({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`h-10 rounded-full border px-4 text-[0.88rem] font-[600] transition-colors duration-[var(--tick)] ${
        on ? "border-carbon bg-carbon text-paper" : "border-carbon text-carbon hover:bg-[#dfe4f1]"
      }`}
    >
      {children}
    </button>
  );
}

type Result =
  | { state: "empty" }
  | { state: "short"; keyLen: number }
  | { state: "checked"; base: CheckResult; date: CheckResult | null; section: CheckResult | null };

function Verdict({ result, quoteText, claimDate, claimSection }: { result: Result; quoteText: string | null; claimDate: string; claimSection: string }) {
  if (result.state === "empty") {
    return (
      <div className="border border-dashed border-ink-3 p-4 text-[0.95rem] text-ink-2">
        Type or paste a line, or try a preset. The result appears here as you type.
      </div>
    );
  }
  if (result.state === "short") {
    return (
      <div className="border border-dashed border-ink-3 p-4 text-[0.95rem] text-ink-2">
        Keep going: the verifier needs at least {MIN_KEY} characters, not counting spaces ({result.keyLen} so far).
      </div>
    );
  }
  const { base, date, section } = result;
  return (
    <div key={base.ok ? "ok" : "no"} className={`pg-result border-l-[6px] p-4 ${base.ok ? "border-ok bg-[#e1ece4]" : "border-stamp bg-[#f6ddd6]"}`}>
      <p className={`flex items-center gap-2 font-sans text-[length:var(--step-1)] leading-tight font-[750] [font-stretch:92%] ${base.ok ? "text-ok" : "text-stamp-text"}`}>
        <Mark ok={base.ok} />
        {base.ok ? "Found in the order" : "Not in the order"}
      </p>
      {base.ok ? (
        <p className="mt-1 text-[0.9rem] text-ink-2">
          Highlighted in the order, characters <span className="font-mono">{base.span.start.toLocaleString("en-IN")}–{base.span.end.toLocaleString("en-IN")}</span>.
          {quoteText && quoteText.length < 220 && (
            <span className="mt-1 block font-serif text-ink">As written: “{quoteText}”</span>
          )}
        </p>
      ) : (
        <p className="mt-1 text-[0.9rem] text-ink">
          <span className="text-ink-2">Verifier: </span>
          {base.reason} A claim resting on this quote is dropped to “unknown”.
        </p>
      )}
      {base.ok && (date || section) && (
        <ul className="mt-3 space-y-1.5 border-t border-ink/20 pt-3 text-[0.88rem]">
          {date && <SubCheck label={`Date ${claimDate}`} r={date} />}
          {section && <SubCheck label={`Section ${claimSection}`} r={section} />}
        </ul>
      )}
    </div>
  );
}

function SubCheck({ label, r }: { label: string; r: CheckResult }) {
  return (
    <li className="flex gap-2">
      <Mark ok={r.ok} small />
      <span>
        <span className="font-mono">{label}</span>
        {r.ok ? <span className="text-ok"> · in the quote</span> : <span className="text-stamp-text"> · {r.reason}</span>}
      </span>
    </li>
  );
}

/** A drawn tick or cross, so the state doesn't rest on colour alone. */
function Mark({ ok, small = false }: { ok: boolean; small?: boolean }) {
  const s = small ? 14 : 20;
  return (
    <svg aria-hidden width={s} height={s} viewBox="0 0 20 20" className={`mt-[0.15em] shrink-0 ${ok ? "text-ok" : "text-stamp-text"}`} fill="none" stroke="currentColor" strokeWidth={small ? 2.4 : 2.6} strokeLinecap="square">
      {ok ? <path d="M3.5 10.5l4.2 4.2L16.5 5.5" className={small ? "" : "pg-draw"} /> : <path d="M4.5 4.5l11 11M15.5 4.5l-11 11" className={small ? "" : "pg-draw"} />}
    </svg>
  );
}
