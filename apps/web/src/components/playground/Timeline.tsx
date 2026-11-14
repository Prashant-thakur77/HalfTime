"use client";
import { addDays, addMonths, differenceInCalendarDays } from "date-fns";
import { addFractionOfMonths, humanDate, parseIsoDate, type Evaluation, type Tri } from "@halftime/law";

interface Marker {
  id: string;
  at: Date;
  glyph: string;
  name: string;
  line: boolean;
}

/**
 * Custody as a bar: time served in ink, the Section 479 line in stamp red,
 * the one-third line when it can apply, and a needle for "today".
 */
export function Timeline({ e, custodyStart, delayDays, firstTime, today }: { e: Evaluation; custodyStart: string; delayDays: number; firstTime: Tri; today: string }) {
  const start = parseIsoDate(custodyStart);
  const now = parseIsoDate(today)!;
  const max = e.maxTermMonths;

  if (!start || !max || e.verdict === "EXCLUDED" || e.verdict === "CANT_TELL") {
    return (
      <div className="register flex min-h-[7.5rem] items-center justify-center border border-dashed border-ink-3 bg-paper-2/60 px-4 text-center text-[0.92rem] text-ink-2">
        {e.verdict === "EXCLUDED"
          ? "No line to draw: Section 479 does not reach an offence punishable with life or death."
          : "No line to draw yet: the engine needs every maximum term and a custody date."}
      </div>
    );
  }

  const half = addDays(addFractionOfMonths(start, max, 1, 2), delayDays);
  const third = addDays(addFractionOfMonths(start, max, 1, 3), delayDays);
  const full = addDays(addMonths(start, max), delayDays);
  const end = now > full ? addDays(now, Math.ceil(differenceInCalendarDays(now, start) * 0.04)) : full;
  const total = Math.max(1, differenceInCalendarDays(end, start));
  const pct = (d: Date) => Math.min(100, Math.max(0, (differenceInCalendarDays(d, start) / total) * 100));

  const markers: Marker[] = [];
  if (firstTime !== "false") markers.push({ id: "third", at: third, glyph: "⅓", name: firstTime === "true" ? "The line (one-third, first-time)" : "If first-time is confirmed (one-third)", line: firstTime === "true" });
  markers.push({ id: "half", at: half, glyph: "½", name: firstTime === "true" ? "Half the maximum" : "The line (one-half)", line: firstTime !== "true" });
  const lineMarker = markers.find((m) => m.line)!;
  const linePct = pct(lineMarker.at);
  const nowPct = pct(now);
  const past = now >= lineMarker.at;

  return (
    <figure className="m-0">
      <figcaption className="sr-only">
        Timeline from custody on {humanDate(start)} to the full maximum on {humanDate(full)}. {lineMarker.name}: {humanDate(lineMarker.at)}. Today: {humanDate(now)}.
      </figcaption>
      <div aria-hidden className="relative pt-7 pb-8">
        {/* marker glyphs above the bar */}
        {markers.map((m) => {
          const p = pct(m.at);
          return (
            <span
              key={m.id}
              className={`absolute top-0 font-mono text-[0.82rem] leading-5 font-[600] whitespace-nowrap ${m.line ? "text-stamp-text" : "text-carbon"}`}
              style={{ left: `${p}%`, transform: `translateX(-${p}%)` }}
            >
              {m.line ? `${m.glyph} LINE` : m.glyph}
            </span>
          );
        })}

        <div className="relative h-8 border border-ink bg-paper-2">
          <div className="register absolute inset-0 opacity-70" />
          {/* served, before the line */}
          <div className="pg-fill absolute inset-y-0 left-0 bg-ink" style={{ width: `${Math.min(nowPct, linePct)}%` }} />
          {/* served, past the line */}
          {past && (
            <div
              className="pg-fill absolute inset-y-0 bg-stamp"
              style={{ left: `${linePct}%`, width: `${Math.max(0, nowPct - linePct)}%`, backgroundImage: "repeating-linear-gradient(-45deg, transparent 0 5px, rgba(0,0,0,.14) 5px 7px)" }}
            />
          )}
          {/* tick lines */}
          {markers.map((m) => (
            <span
              key={m.id}
              className={`absolute -top-2 -bottom-2 ${m.line ? "w-[3px] bg-stamp" : "w-0 border-l-2 border-dashed border-carbon"}`}
              style={{ left: `calc(${pct(m.at)}% - ${m.line ? 1.5 : 1}px)` }}
            />
          ))}
          {/* full maximum */}
          {full < end && <span className="absolute -top-2 -bottom-2 w-px bg-ink" style={{ left: `${pct(full)}%` }} />}
        </div>

        {/* today needle */}
        <span className="pg-needle absolute top-5 bottom-6 w-[2px] -translate-x-1/2 bg-carbon" style={{ left: `${nowPct}%` }}>
          <span className="absolute -top-1 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 bg-carbon" />
        </span>
        <span
          className="pg-needle absolute bottom-0 font-mono text-[0.78rem] font-[600] whitespace-nowrap text-carbon"
          style={{ left: `${nowPct}%`, transform: `translateX(-${nowPct}%)` }}
        >
          TODAY
        </span>
      </div>

      <dl className="mt-1 grid grid-cols-1 gap-x-6 gap-y-1.5 text-[0.85rem] sm:grid-cols-2">
        <Row k="Custody began" v={humanDate(start)} />
        {markers.map((m) => (
          <Row key={m.id} k={m.name} v={humanDate(m.at)} tone={m.line ? "line" : undefined} />
        ))}
        <Row k="Full maximum term" v={humanDate(full)} />
        <Row k="Today" v={humanDate(now)} tone="today" />
      </dl>
    </figure>
  );
}

function Row({ k, v, tone }: { k: string; v: string; tone?: "line" | "today" }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-[var(--rule)] py-1">
      <dt className={tone === "line" ? "font-[650] text-stamp-text" : tone === "today" ? "font-[650] text-carbon" : "text-ink-2"}>{k}</dt>
      <dd className="font-mono tabular">{v}</dd>
    </div>
  );
}
