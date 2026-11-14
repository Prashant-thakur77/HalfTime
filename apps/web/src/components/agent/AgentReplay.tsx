"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentEvent } from "@halftime/reader/agent";
import { EventRow } from "./EventLog";

const SPEEDS = [1, 2, 4] as const;
/** Base pause before each step at 1x, in ms. Agent turns linger a little longer than tool results. */
const pause = (e: AgentEvent) => (e.kind === "model" ? 900 : e.kind === "rejected" || e.kind === "fixed" ? 1100 : 420);

/** Replays the recorded run as a live log: play, pause, speed, skip. Reduced motion shows the whole log at once. */
export function AgentReplay({ events, resultId }: { events: AgentEvent[]; resultId: string }) {
  const [shown, setShown] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const box = useRef<HTMLOListElement>(null);
  const started = useRef(false);
  const done = shown >= events.length;

  // Start once the log scrolls into view; with reduced motion, show everything immediately.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(events.length);
      return;
    }
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !started.current) {
          started.current = true;
          setPlaying(true);
        }
      },
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [events.length]);

  useEffect(() => {
    if (!playing || done) {
      if (done) setPlaying(false);
      return;
    }
    const t = setTimeout(() => setShown((n) => n + 1), pause(events[shown]!) / speed);
    return () => clearTimeout(t);
  }, [playing, shown, speed, done, events]);

  // Keep the newest step in view inside the log box only (never scroll the page).
  useEffect(() => {
    const el = box.current;
    if (el && shown < events.length) el.scrollTop = el.scrollHeight;
  }, [shown, events.length]);

  const skip = useCallback(() => {
    started.current = true;
    setPlaying(false);
    setShown(events.length);
    const target = document.getElementById(resultId);
    if (target) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      target.focus({ preventScroll: true });
    }
  }, [events.length, resultId]);

  const visible = events.slice(0, shown);
  const cost = visible.reduce((n, e) => n + (e.costUsd ?? 0), 0);
  const tools = visible.filter((e) => e.kind !== "model" && e.kind !== "stopped" && e.kind !== "error").length;
  const turn = visible.at(-1)?.step ?? 0;

  return (
    <div>
      <div className="flex flex-col gap-3 border border-ink bg-paper-2 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              started.current = true;
              if (done) setShown(0);
              setPlaying((p) => (done ? true : !p));
            }}
            className="h-10 min-w-[7.5rem] border border-ink bg-ink px-4 text-paper transition-colors duration-[var(--ui)] hover:bg-stamp"
          >
            <span className="caps">{playing ? "Pause" : done ? "Replay" : shown ? "Resume" : "Play"}</span>
          </button>
          <div role="group" aria-label="Replay speed" className="flex">
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={speed === s}
                onClick={() => setSpeed(s)}
                className={`h-10 w-11 border border-ink font-mono text-[0.85rem] transition-colors duration-[var(--ui)] [&+&]:-ml-px ${speed === s ? "bg-carbon text-paper" : "bg-paper hover:bg-mark"}`}
              >
                {s}×
              </button>
            ))}
          </div>
          <button type="button" onClick={skip} className="h-10 border border-ink bg-paper px-4 transition-colors duration-[var(--ui)] hover:bg-mark">
            <span className="caps">Skip to result</span>
          </button>
        </div>
        <p className="font-mono text-[0.78rem] text-ink-2 tabular" role="status" aria-live="polite" aria-atomic="true">
          {done ? `All ${events.length} steps · ` : `Step ${shown} of ${events.length} · `}turn {turn} · {tools} tool results · ${cost.toFixed(3)}
        </p>
      </div>
      <ol
        ref={box}
        tabIndex={0}
        aria-label="Agent log, recorded run"
        className="register mt-0 h-[28rem] overflow-y-auto overscroll-contain border border-t-0 border-ink bg-paper sm:h-[32rem]"
      >
        {visible.map((e) => (
          <EventRow key={e.seq} e={e} linkFiles />
        ))}
        {!done && (
          <li className="px-3 py-3 font-mono text-[0.75rem] text-ink-3" aria-hidden>
            {shown === 0 ? "Press play, or scroll here to start the replay." : <span className="inline-block animate-pulse">▍</span>}
          </li>
        )}
      </ol>
    </div>
  );
}
