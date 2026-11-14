"use client";
import { useState } from "react";
import { browserReader, clearKey, keyErrorMessage, looksLikeKey, maskKey, setKey, useApiKey } from "@/lib/byok";

/** Where a visitor adds their own Anthropic key. Compact once a key is set. */
export function KeyPanel({ compact = false }: { compact?: boolean }) {
  const key = useApiKey();
  const [value, setValue] = useState("");
  const [remember, setRemember] = useState(false);
  const [state, setState] = useState<{ kind: "idle" | "checking" | "error"; msg?: string }>({ kind: "idle" });

  async function save() {
    const k = value.trim();
    if (!looksLikeKey(k)) {
      setState({ kind: "error", msg: "That doesn't look like an Anthropic key (it starts with sk-ant-)." });
      return;
    }
    setState({ kind: "checking" });
    try {
      await (await browserReader(k)).ping();
      setKey(k, remember);
      setValue("");
      setState({ kind: "idle" });
    } catch (e) {
      setState({ kind: "error", msg: keyErrorMessage(e) });
    }
  }

  if (key) {
    return (
      <div className={`flex flex-wrap items-center gap-3 border border-ok bg-[#e3eee6] px-3 py-2 text-[0.88rem] ${compact ? "" : "mt-2"}`} role="status">
        <span aria-hidden className="inline-block h-2 w-2 bg-ok" />
        <span>
          Using your Anthropic key <span className="font-mono">{maskKey(key)}</span>, sent from this browser straight to Anthropic.
        </span>
        <button type="button" onClick={clearKey} className="underline">
          Remove key
        </button>
      </div>
    );
  }

  return (
    <form
      className="border border-ink bg-paper-2 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <label htmlFor="api-key" className="caps">
        Your Anthropic API key
      </label>
      <p className="mt-1 text-[0.85rem] text-ink-2">
        Reading new papers calls Claude, billed to your own key. The key stays in this browser and goes straight to Anthropic; it never touches
        our server. Get one at console.anthropic.com. The sample tray works without a key.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          id="api-key"
          type="password"
          autoComplete="off"
          spellCheck={false}
          placeholder="sk-ant-…"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-11 min-w-0 flex-1 border border-ink bg-paper px-3 font-mono text-[0.9rem]"
        />
        <button type="submit" disabled={state.kind === "checking" || !value} className="h-11 border border-ink bg-ink px-4 text-paper enabled:hover:bg-stamp disabled:bg-ink-2">
          <span className="caps">{state.kind === "checking" ? "Checking…" : "Use this key"}</span>
        </button>
      </div>
      <label className="mt-2 flex items-center gap-2 text-[0.85rem]">
        <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
        Remember on this device (otherwise it is forgotten when you close the tab)
      </label>
      {state.kind === "error" && (
        <p className="mt-2 text-[0.88rem] text-stamp-text" role="alert">
          {state.msg}
        </p>
      )}
    </form>
  );
}
