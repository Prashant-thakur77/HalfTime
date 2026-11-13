"use client";
import { addDays, format, parseISO } from "date-fns";
import gsap from "gsap";
import { Flip } from "gsap/Flip";
import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { evaluate, humanDate, parseIsoDate, sectionLabel, type Evaluation } from "@halftime/law";
import { decide, type Extraction } from "@halftime/reader";
import { VerdictTag } from "@/components/VerdictTag";
import { RUNS, SAMPLES } from "@/lib/cases";
import { download, toCsv } from "@/lib/csv";
import { useLang } from "@/lib/i18n";
import { edits, uploads, type UploadedCase } from "@/lib/store";
import { LANES, VERDICT_STYLE } from "@/lib/verdict";
import { UploadPanel } from "./UploadPanel";

gsap.registerPlugin(Flip);

interface Row {
  id: string;
  title: string;
  gloss: string;
  language: string;
  caseNo: string | null;
  accused: string;
  evaluation: Evaluation;
  uploaded: boolean;
  expected?: string;
}

function build(id: string, text: string, ex: Extraction, today: string) {
  return decide(text, ex, today, edits.get(id));
}

export function SweepBoard() {
  const { t } = useLang();
  const realToday = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);
  const [offset, setOffset] = useState(0);
  const today = useMemo(() => format(addDays(parseISO(realToday), offset), "yyyy-MM-dd"), [realToday, offset]);
  const [swept, setSwept] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("");
  const [uploaded, setUploaded] = useState<UploadedCase[]>([]);
  const board = useRef<HTMLDivElement>(null);
  const flipState = useRef<Flip.FlipState | null>(null);

  useEffect(() => {
    setUploaded(uploads.all());
    try {
      if (sessionStorage.getItem("ht-swept") === "1") setSwept(SAMPLES.map((s) => s.id));
    } catch {}
  }, []);

  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];
    for (const s of SAMPLES) {
      const run = RUNS[s.id];
      if (!run || !swept.includes(s.id)) continue;
      const r = build(s.id, s.text, run.extraction, today);
      out.push({
        id: s.id,
        title: s.title,
        gloss: s.gloss,
        language: s.language,
        caseNo: run.extraction.case_no,
        accused: run.extraction.accused_name_masked,
        evaluation: r.evaluation,
        uploaded: false,
        expected: evaluate(s.gold, today).verdict
      });
    }
    for (const u of uploaded) {
      const r = build(u.id, u.text, u.extraction, today);
      out.push({ id: u.id, title: u.name, gloss: u.extraction.english_gloss, language: u.extraction.language, caseNo: u.extraction.case_no, accused: u.extraction.accused_name_masked, evaluation: r.evaluation, uploaded: true });
    }
    return out;
  }, [swept, uploaded, today]);

  // Animate cards between lanes when the date moves (Flip), only after the first render.
  const captureFlip = () => {
    if (board.current && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      flipState.current = Flip.getState(board.current.querySelectorAll("[data-card]"));
    }
  };
  useLayoutEffect(() => {
    if (!flipState.current) return;
    Flip.from(flipState.current, { duration: 0.6, ease: "power3.inOut", absolute: true, stagger: 0.015 });
    flipState.current = null;
  }, [today]);

  async function runSweep() {
    if (running) return;
    setRunning(true);
    setSwept([]);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ids = SAMPLES.filter((s) => RUNS[s.id]).map((s) => s.id);
    for (const [i, id] of ids.entries()) {
      const s = SAMPLES.find((x) => x.id === id)!;
      setStatus(`Reading ${i + 1} of ${ids.length} · ${s.language === "hi" ? "Hindi" : "English"} · ${s.title}`);
      if (!reduce) await new Promise((r) => setTimeout(r, 260));
      setSwept((prev) => [...prev, id]);
    }
    setStatus(`${ids.length} papers read from cache. Code applied the law to each. Open any card to see why.`);
    try {
      sessionStorage.setItem("ht-swept", "1");
    } catch {}
    setRunning(false);
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = { past: 0, notyet: 0, cant: 0, excluded: 0 };
    for (const r of rows) c[VERDICT_STYLE[r.evaluation.verdict].lane]!++;
    return c;
  }, [rows]);

  return (
    <div className="mx-auto max-w-[var(--max)] px-[var(--gutter)]">
      <div className="grid gap-6 border-b border-ink pb-6 md:grid-cols-12 md:items-end">
        <div className="md:col-span-7">
          <p className="caps text-ink-3">Sample jail · {SAMPLES.length} constructed orders · Hindi and English</p>
          <h1 className="mt-3 font-sans text-[length:var(--step-4)] leading-[0.95] font-[750] tracking-[-0.02em] [font-stretch:88%]">
            Sweep the papers.
            <br />
            <span className="text-carbon">Sort every person by the law.</span>
          </h1>
        </div>
        <div className="flex flex-wrap gap-3 md:col-span-5 md:justify-end">
          <button
            type="button"
            onClick={runSweep}
            disabled={running}
            className="h-12 border border-ink bg-ink px-5 text-paper transition-colors duration-[var(--ui)] hover:bg-stamp disabled:opacity-60"
          >
            <span className="caps">{swept.length ? t("sweep.rerun") : t("sweep.run")}</span>
          </button>
          <button
            type="button"
            disabled={rows.length === 0}
            onClick={() => download(`halftime-sweep-${today}.csv`, new Blob([toCsv(rows, today)], { type: "text/csv" }))}
            className="h-12 border border-ink px-5 transition-colors duration-[var(--ui)] hover:bg-mark disabled:opacity-40"
          >
            <span className="caps">{t("sweep.csv")}</span>
          </button>
        </div>
      </div>

      <p className="mt-3 min-h-[1.5em] font-mono text-[0.8rem] text-ink-2" role="status" aria-live="polite">
        {status}
      </p>

      <div className="mt-4 flex flex-col gap-3 border border-ink bg-paper-2 p-4 md:flex-row md:items-center md:gap-6">
        <label htmlFor="today-slider" className="caps shrink-0">
          {t("sweep.today")}
        </label>
        <input
          id="today-slider"
          type="range"
          min={-540}
          max={900}
          step={1}
          value={offset}
          onChange={(e) => {
            captureFlip();
            setOffset(Number(e.target.value));
          }}
          className="w-full accent-[var(--stamp)]"
          aria-valuetext={humanDate(parseIsoDate(today)!)}
        />
        <div className="flex shrink-0 items-center gap-3">
          <output htmlFor="today-slider" className="font-mono text-[1.05rem] tabular">
            {humanDate(parseIsoDate(today)!)}
          </output>
          {offset !== 0 && (
            <button type="button" className="text-[0.85rem] underline" onClick={() => { captureFlip(); setOffset(0); }}>
              back to today
            </button>
          )}
        </div>
      </div>

      <div ref={board} className="mt-8 grid gap-4 lg:grid-cols-4">
        {LANES.map((lane) => (
          <section key={lane.id} aria-labelledby={`lane-${lane.id}`} className="flex min-h-[220px] flex-col border-t-[3px] border-ink">
            <header className="flex items-baseline justify-between gap-2 py-3">
              <h2 id={`lane-${lane.id}`} className="font-sans text-[1.25rem] font-[700] [font-stretch:92%]">
                {t(lane.key)}
              </h2>
              <span className="font-mono text-[1.4rem] tabular" aria-label={`${counts[lane.id]} people`}>
                {String(counts[lane.id]).padStart(2, "0")}
              </span>
            </header>
            <p className="-mt-2 mb-3 text-[0.8rem] text-ink-3">{lane.note}</p>
            <ul className="register flex flex-1 flex-col gap-3 p-2">
              {rows
                .filter((r) => VERDICT_STYLE[r.evaluation.verdict].lane === lane.id)
                .map((r) => (
                  <li key={r.id} data-card data-flip-id={r.id}>
                    <CaseCard row={r} today={today} />
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>

      <UploadPanel today={today} onAdded={() => setUploaded(uploads.all())} />
    </div>
  );
}

function CaseCard({ row, today }: { row: Row; today: string }) {
  const e = row.evaluation;
  const s = VERDICT_STYLE[e.verdict];
  return (
    <Link
      href={`/case/${row.id}?today=${today}`}
      className={`group block border bg-paper p-3 shadow-[3px_3px_0_var(--ink)] transition-transform duration-[var(--ui)] hover:-translate-y-0.5 hover:shadow-[5px_5px_0_var(--ink)] ${s.border}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-[0.72rem] text-ink-3">{row.caseNo ?? row.id}</span>
        <span className="font-mono text-[0.72rem] uppercase text-ink-3">{row.language}</span>
      </div>
      <p className="mt-1 font-serif text-[1.15rem] leading-snug">{row.accused}</p>
      <p className="mt-0.5 text-[0.85rem] leading-snug text-ink-2">{row.title}</p>
      <p className="mt-2 font-mono text-[0.72rem] leading-relaxed text-carbon">
        {e.sections.filter((x) => x.found).map(sectionLabel).join(" · ") || "sections not read"}
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <VerdictTag verdict={e.verdict} />
        <span className="font-mono text-[0.78rem] tabular">
          {e.daysPast !== null && `+${e.daysPast} days`}
          {e.daysToGo !== null && `${e.daysToGo} days to go`}
          {e.verdict === "CANT_TELL" && `${e.missing.length} missing`}
        </span>
      </div>
      {row.expected && row.expected !== e.verdict && (
        <p className="mt-2 border-t border-dashed border-ink-3 pt-2 text-[0.75rem] text-ink-3">Constructed answer key says {VERDICT_STYLE[row.expected as Evaluation["verdict"]].short}. Open to see why they differ.</p>
      )}
    </Link>
  );
}
