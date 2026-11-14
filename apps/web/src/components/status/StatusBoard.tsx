"use client";
import { useCallback, useEffect, useState } from "react";

type State = "checking" | "ok" | "fail" | "unreachable";

interface Check {
  id: string;
  label: string;
  state: State;
  detail: string;
  ms: number | null;
}

interface Health {
  status?: string;
  engine?: string;
  verifier?: boolean;
  build?: string | null;
  ms?: number;
}

const STYLE: Record<State, { dot: string; text: string; word: string }> = {
  checking: { dot: "bg-ink-3 animate-pulse", text: "text-ink-3", word: "checking" },
  ok: { dot: "bg-ok", text: "text-ok", word: "ok" },
  fail: { dot: "bg-stamp", text: "text-stamp-text", word: "failing" },
  unreachable: { dot: "bg-flag", text: "text-flag", word: "unreachable" }
};

async function timed<T>(fn: () => Promise<T>): Promise<{ value: T; ms: number }> {
  const t0 = performance.now();
  const value = await fn();
  return { value, ms: Math.round(performance.now() - t0) };
}

/** Same-origin checks run from this browser: the health self-test, the MCP endpoint, and every main page. */
export function StatusBoard({ pages }: { pages: string[] }) {
  const [health, setHealth] = useState<Check>({ id: "health", label: "Health self-test", state: "checking", detail: "", ms: null });
  const [healthJson, setHealthJson] = useState<Health | null>(null);
  const [mcp, setMcp] = useState<Check>({ id: "mcp", label: "MCP endpoint", state: "checking", detail: "", ms: null });
  const [pageChecks, setPageChecks] = useState<Check[]>(pages.map((p) => ({ id: p, label: p, state: "checking", detail: "", ms: null })));
  const [offline, setOffline] = useState(false);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const run = useCallback(async () => {
    setRunning(true);
    setOffline(typeof navigator !== "undefined" && navigator.onLine === false);
    setHealth((c) => ({ ...c, state: "checking", detail: "" }));
    setMcp((c) => ({ ...c, state: "checking", detail: "" }));
    setPageChecks((cs) => cs.map((c) => ({ ...c, state: "checking", detail: "" })));

    const healthP = timed(() => fetch("/api/health", { cache: "no-store" }))
      .then(async ({ value: r, ms }) => {
        const j = (await r.json().catch(() => null)) as Health | null;
        setHealthJson(j);
        setHealth((c) => ({
          ...c,
          ms,
          state: r.ok && j?.status === "ok" ? "ok" : "fail",
          detail: j ? `status ${j.status} · engine ${j.engine ?? "?"} · verifier ${j.verifier ? "passes" : "fails"}` : `HTTP ${r.status}`
        }));
      })
      .catch(() => setHealth((c) => ({ ...c, state: "unreachable", detail: "No response", ms: null })));

    const mcpP = timed(() =>
      fetch("/mcp", {
        method: "POST",
        cache: "no-store",
        headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" })
      })
    )
      .then(async ({ value: r, ms }) => {
        const j = (await r.json().catch(() => null)) as { result?: { tools?: { name: string }[] } } | null;
        const tools = j?.result?.tools?.map((t) => t.name) ?? [];
        setMcp((c) => ({
          ...c,
          ms,
          state: r.ok && tools.includes("check_order") ? "ok" : "fail",
          detail: tools.length ? `tools/list: ${tools.length} tools` : `HTTP ${r.status}`
        }));
      })
      .catch(() => setMcp((c) => ({ ...c, state: "unreachable", detail: "No response", ms: null })));

    const pageP = pages.map((p, i) =>
      timed(async () => {
        const head = await fetch(p, { method: "HEAD", cache: "no-store" });
        return head.status === 405 ? fetch(p, { cache: "no-store" }) : head;
      })
        .then(({ value: r, ms }) =>
          setPageChecks((cs) => cs.map((c, k) => (k === i ? { ...c, ms, state: r.ok ? "ok" : "fail", detail: `HTTP ${r.status}` } : c)))
        )
        .catch(() => setPageChecks((cs) => cs.map((c, k) => (k === i ? { ...c, state: "unreachable", detail: "No response", ms: null } : c))))
    );

    await Promise.all([healthP, mcpP, ...pageP]);
    setCheckedAt(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    setRunning(false);
  }, [pages]);

  useEffect(() => {
    void run();
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, [run]);

  const all = [health, mcp, ...pageChecks];
  const done = all.every((c) => c.state !== "checking");
  const bad = all.filter((c) => c.state === "fail" || c.state === "unreachable").length;
  const overall: State = !done ? "checking" : bad === 0 ? "ok" : all.every((c) => c.state === "unreachable") ? "unreachable" : "fail";
  const headline =
    overall === "checking"
      ? "Checking…"
      : overall === "ok"
        ? "All checks pass"
        : overall === "unreachable"
          ? "The site could not be reached from this browser"
          : `${bad} check${bad === 1 ? "" : "s"} failing`;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 border border-ink bg-paper p-5">
        <div className="flex items-center gap-3">
          <span aria-hidden className={`inline-block h-3.5 w-3.5 rounded-full ${STYLE[overall].dot}`} />
          <p role="status" aria-live="polite" className="font-sans text-[length:var(--step-1)] font-[700]">
            {headline}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {checkedAt && <span className="font-mono text-[0.8rem] whitespace-nowrap text-ink-3">checked {checkedAt}</span>}
          <button
            type="button"
            onClick={() => void run()}
            disabled={running}
            className="caps h-11 border border-ink bg-ink px-4 text-paper transition-colors duration-[var(--ui)] enabled:hover:bg-stamp disabled:cursor-progress disabled:bg-ink-2"
          >
            {running ? "Checking…" : "Run checks again"}
          </button>
        </div>
      </div>
      {offline && (
        <p className="mt-3 border-l-4 border-flag bg-flag-bg p-3 text-[0.95rem]">
          This browser reports that it is offline. Checks will fail until the connection is back; this does not mean the site is down.
        </p>
      )}

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        {[health, mcp].map((c) => (
          <section key={c.id} aria-labelledby={`chk-${c.id}`} className="border border-ink bg-paper p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h3 id={`chk-${c.id}`} className="font-sans text-[1.15rem] font-[700]">
                {c.label}
              </h3>
              <span className={`flex items-center gap-2 font-mono text-[0.9rem] ${STYLE[c.state].text}`}>
                <span aria-hidden className={`inline-block h-2.5 w-2.5 rounded-full ${STYLE[c.state].dot}`} />
                {STYLE[c.state].word}
              </span>
            </div>
            <p className="mt-1 font-mono text-[0.8rem] text-ink-3">{c.id === "health" ? "GET /api/health" : "POST /mcp · tools/list"}</p>
            <p className="mt-3 text-[0.95rem] text-ink-2">{c.detail || " "}</p>
            {c.id === "health" && (
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[0.9rem]">
                <dt className="text-ink-3">Build date</dt>
                <dd className="font-mono">{healthJson?.build ?? "—"}</dd>
                <dt className="text-ink-3">Self-test time</dt>
                <dd className="font-mono">{healthJson?.ms !== undefined ? `${healthJson.ms} ms` : "—"}</dd>
                <dt className="text-ink-3">Round trip</dt>
                <dd className="font-mono">{c.ms !== null ? `${c.ms} ms` : "—"}</dd>
              </dl>
            )}
            {c.id === "mcp" && (
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[0.9rem]">
                <dt className="text-ink-3">Round trip</dt>
                <dd className="font-mono">{c.ms !== null ? `${c.ms} ms` : "—"}</dd>
              </dl>
            )}
          </section>
        ))}
      </div>

      <section aria-labelledby="pages-h" className="mt-10">
        <h3 id="pages-h" className="font-sans text-[1.15rem] font-[700]">
          Pages
        </h3>
        <div tabIndex={0} role="region" aria-label="Page checks" className="mt-3 overflow-x-auto border border-ink">
          <table className="w-full min-w-[420px] border-collapse text-[0.9rem]">
            <thead className="bg-ink text-left text-paper">
              <tr>
                <th scope="col" className="p-3 font-[600]">Page</th>
                <th scope="col" className="p-3 font-[600]">Status</th>
                <th scope="col" className="p-3 font-[600]">Response</th>
                <th scope="col" className="p-3 text-right font-[600]">Time</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {pageChecks.map((c) => (
                <tr key={c.id} className="border-t border-[var(--rule)] odd:bg-paper-2/60">
                  <th scope="row" className="p-3 text-left font-[500]">
                    <a className="text-carbon underline decoration-carbon-soft underline-offset-[3px] hover:bg-mark" href={c.id}>
                      {c.label}
                    </a>
                  </th>
                  <td className={`p-3 ${STYLE[c.state].text}`}>
                    <span className="flex items-center gap-2">
                      <span aria-hidden className={`inline-block h-2 w-2 rounded-full ${STYLE[c.state].dot}`} />
                      {STYLE[c.state].word}
                    </span>
                  </td>
                  <td className="p-3 whitespace-nowrap text-ink-2">{c.detail}</td>
                  <td className="p-3 text-right whitespace-nowrap tabular text-ink-2">{c.ms !== null ? `${c.ms} ms` : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
