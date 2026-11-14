"use client";
import { useRef, useState } from "react";
import type { AgentEvent, AgentRun } from "@halftime/reader/agent";
import { KeyPanel } from "@/components/KeyPanel";
import { browserReader, keyErrorMessage, sessionCache, useApiKey } from "@/lib/byok";
import { MAX_PAGES, fileToText } from "@/lib/ingest";
import { useToday } from "@/lib/today";
import { DocketTable, StatTiles } from "./DocketTable";
import { EventRow } from "./EventLog";

const MAX_AGENT_FILES = 10;
const BUDGET_USD = 1;

/** Run the docket agent in this browser on the visitor's own papers, with their own key. */
export function RunYourOwn() {
  const key = useApiKey();
  const today = useToday();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState<string[]>([]);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [run, setRun] = useState<AgentRun | null>(null);

  async function handle(list: FileList) {
    const chosen = [...list].slice(0, MAX_AGENT_FILES);
    if (!chosen.length || !key || busy) return;
    setBusy(true);
    setRun(null);
    setEvents([]);
    setNotes([]);
    const say = (m: string) => setNotes((n) => [...n.slice(-12), m]);
    try {
      const reader = await browserReader(key);
      const files: { id: string; text: string }[] = [];
      for (const [i, f] of chosen.entries()) {
        say(`Reading ${f.name}`);
        try {
          const text = await fileToText(f, say, async (img, type) => (await reader.transcribe(img, type)).value);
          if (text.trim().length < 40) throw new Error("no readable text");
          files.push({ id: `F${String(i + 1).padStart(2, "0")}`, text });
          say(`${f.name} → F${String(i + 1).padStart(2, "0")}`);
        } catch (e) {
          say(`${f.name}: ${keyErrorMessage(e)}`);
        }
      }
      if (!files.length) return;
      say(`Starting the agent on ${files.length} file(s). Spend is capped at $${BUDGET_USD.toFixed(2)} on your key.`);
      const { anthropicModelClient, runDocketAgent } = await import("@halftime/reader/agent");
      const client = anthropicModelClient({ apiKey: key.trim(), browser: true, cache: sessionCache(), budgetUsd: BUDGET_USD });
      const result = await runDocketAgent({ files, today, client, onEvent: (e) => setEvents((prev) => [...prev, e]) });
      setRun(result);
    } catch (e) {
      say(keyErrorMessage(e));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="space-y-4">
      <KeyPanel />
      <div className="flex flex-col gap-3 border-2 border-dashed border-ink-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[0.92rem] text-ink-2">
          Up to {MAX_AGENT_FILES} files (PDF, scan or text, {MAX_PAGES} pages each). Files are named F01, F02… in the log; nothing leaves this browser except
          the calls to Anthropic on your key.
        </p>
        <button
          type="button"
          disabled={busy || !key}
          onClick={() => input.current?.click()}
          className="h-11 shrink-0 border border-ink bg-ink px-5 text-paper transition-colors duration-[var(--ui)] enabled:hover:bg-stamp disabled:cursor-not-allowed disabled:bg-ink-2"
        >
          <span className="caps">{busy ? "Agent running…" : "Choose papers and run"}</span>
        </button>
        <input
          ref={input}
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg,.txt,application/pdf,image/png,image/jpeg,text/plain"
          className="sr-only"
          aria-label="Choose court papers for the docket agent"
          onChange={(e) => e.target.files && void handle(e.target.files)}
        />
      </div>
      {!key && <p className="text-[0.85rem] text-ink-3">Add your key above to enable this. The recorded run above needs no key.</p>}
      {notes.length > 0 && (
        <ol className="border border-ink bg-paper-2 p-3 font-mono text-[0.75rem] text-ink-2" aria-live="polite">
          {notes.map((n, i) => (
            <li key={i}>› {n}</li>
          ))}
        </ol>
      )}
      {events.length > 0 && (
        <ol tabIndex={0} aria-label="Agent log, your run" className="register max-h-[28rem] overflow-y-auto border border-ink bg-paper">
          {events.map((e) => (
            <EventRow key={e.seq} e={e} linkFiles={false} />
          ))}
        </ol>
      )}
      {run && (
        <div className="space-y-4">
          <DocketTable docket={run.docket} linkCases={false} caption="Docket for your papers, in priority order" />
          <StatTiles stats={run.stats} />
        </div>
      )}
    </div>
  );
}
