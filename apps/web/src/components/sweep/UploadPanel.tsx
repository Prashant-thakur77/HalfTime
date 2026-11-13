"use client";
import { useRef, useState } from "react";
import type { Extraction } from "@halftime/reader";
import { useLang } from "@/lib/i18n";
import { MAX_FILES, MAX_PAGES, fileToText } from "@/lib/ingest";
import { uploads } from "@/lib/store";

async function sha(text: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(d)].slice(0, 6).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Upload your own papers: read in the browser, extracted on the server, kept only in this tab. */
export function UploadPanel({ today, onAdded }: { today: string; onAdded: () => void }) {
  const { t } = useLang();
  const input = useRef<HTMLInputElement>(null);
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);

  async function handle(files: FileList | File[]) {
    const list = [...files].slice(0, MAX_FILES);
    if (!list.length) return;
    setBusy(true);
    const say = (m: string) => setLog((l) => [...l.slice(-30), m]);
    for (const f of list) {
      try {
        say(`Reading ${f.name}`);
        const text = await fileToText(f, say);
        say(`${f.name}: asking the model for facts with quotes`);
        const r = await fetch("/api/extract", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text, today }) });
        const j = (await r.json()) as { extraction?: Extraction; error?: string; facts?: { rejected: unknown[] } };
        if (!r.ok || !j.extraction) throw new Error(j.error ?? "Extraction failed");
        const id = `u-${await sha(text)}`;
        uploads.add({ id, name: f.name, text, extraction: j.extraction, addedAt: new Date().toISOString() });
        say(`${f.name}: done${j.facts?.rejected.length ? `, ${j.facts.rejected.length} model claim(s) rejected by the verifier` : ""}`);
        onAdded();
      } catch (e) {
        say(`${f.name}: ${e instanceof Error ? e.message : "failed"}`);
      }
    }
    setBusy(false);
  }

  return (
    <section aria-labelledby="upload-h" className="mt-16 grid gap-6 border-t border-ink pt-8 md:grid-cols-12">
      <div className="md:col-span-4">
        <h2 id="upload-h" className="font-sans text-[length:var(--step-2)] font-[700] [font-stretch:92%]">
          {t("sweep.upload")}
        </h2>
        <p className="mt-2 text-[0.92rem] text-ink-2">
          PDF, scanned image or text. Up to {MAX_FILES} files, {MAX_PAGES} pages each. Text-layer PDFs are read in your browser; scanned pages are
          transcribed by the model. Nothing is stored on our side: results stay in this browser tab and are gone when you close it.
        </p>
      </div>
      <div className="md:col-span-8">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            void handle(e.dataTransfer.files);
          }}
          className={`ruled flex min-h-[180px] flex-col items-center justify-center gap-3 border-2 border-dashed p-6 text-center transition-colors duration-[var(--ui)] ${drag ? "border-stamp bg-mark/40" : "border-ink-3"}`}
        >
          <p className="font-serif text-[1.3rem]">Drop court papers here</p>
          <button
            type="button"
            disabled={busy}
            onClick={() => input.current?.click()}
            className="h-11 border border-ink bg-paper px-4 transition-colors duration-[var(--ui)] hover:bg-mark disabled:opacity-50"
          >
            <span className="caps">{busy ? "Reading…" : "Choose files"}</span>
          </button>
          <input
            ref={input}
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.txt,application/pdf,image/png,image/jpeg,text/plain"
            className="sr-only"
            onChange={(e) => e.target.files && void handle(e.target.files)}
            aria-label="Choose court papers to upload"
          />
        </div>
        {log.length > 0 && (
          <ol className="mt-3 max-h-48 overflow-auto border border-ink bg-ink p-3 font-mono text-[0.75rem] text-paper" aria-live="polite">
            {log.map((l, i) => (
              <li key={i}>› {l}</li>
            ))}
          </ol>
        )}
        <button type="button" onClick={() => { uploads.clear(); onAdded(); setLog([]); }} className="mt-2 text-[0.82rem] underline">
          Remove my uploads from this tab
        </button>
      </div>
    </section>
  );
}
