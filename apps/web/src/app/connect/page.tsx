import type { Metadata } from "next";
import Link from "next/link";
import { CopyBlock } from "@/components/connect/CopyBlock";

export const metadata: Metadata = {
  title: "Use it from Claude",
  description: "Connect HalfTime to Claude over MCP: Claude reads the papers and quotes them; HalfTime's code verifies every quote and applies Section 479. No API key needed."
};

const URL_ = "https://halftime.prashantthakur.dev/mcp";

const TOOLS: [string, string][] = [
  ["check_order", "Checks Claude's quotes against the order and applies Section 479: verdict, rule trace, rejected claims."],
  ["sweep_jail", "Up to 50 orders at once, sorted into lanes, with a CSV for the DLSA."],
  ["draft_application", "The Section 479(3) application in English or Hindi; the local server saves a .docx."],
  ["apply_section_479", "The engine on typed-in facts, for a lawyer who already knows them."],
  ["lookup_section", "Maximum term for an IPC, BNS or special-act section, with its source."],
  ["list_sample_orders · get_sample_order", "Twelve constructed orders to try it on."],
  ["list_order_files · read_order_file", "Local server only: a folder of court papers on your machine."]
];

export default function ConnectPage() {
  return (
    <div className="mx-auto max-w-[var(--max)] px-[var(--gutter)] pt-10 pb-16">
      <p className="caps text-ink-3">Model Context Protocol</p>
      <h1 className="mt-3 max-w-4xl font-sans text-[length:var(--step-5)] leading-[0.88] font-[800] tracking-[-0.03em] [font-stretch:78%]">Use it from Claude.</h1>
      <p className="mt-6 max-w-2xl font-serif text-[length:var(--step-1)] leading-snug text-ink-2">
        The Claude you already talk to reads the papers and quotes them. HalfTime&apos;s code checks every quote and applies the law. No API key, no
        upload to us: the model is the one in your chat.
      </p>

      <div className="mt-12 grid gap-10 lg:grid-cols-2">
        <section aria-labelledby="remote-h" className="min-w-0 space-y-4">
          <h2 id="remote-h" className="font-sans text-[length:var(--step-2)] font-[750] [font-stretch:88%]">claude.ai, Claude Desktop, any client</h2>
          <p className="text-ink-2">Add a custom connector with this URL. It works on the sample orders, or on any order text you paste into the chat.</p>
          <CopyBlock label="Connector URL" value={URL_} />
          <CopyBlock label="Claude Code" value={`claude mcp add --transport http halftime ${URL_}`} />
        </section>

        <section aria-labelledby="local-h" className="min-w-0 space-y-4">
          <h2 id="local-h" className="font-sans text-[length:var(--step-2)] font-[750] [font-stretch:88%]">On your machine, with a folder of papers</h2>
          <p className="text-ink-2">
            The local server can also read PDFs and text files from folders you allow, and save the application as a Word file. Clone the repo and run{" "}
            <code className="font-mono text-[0.9rem]">pnpm install</code>, then:
          </p>
          <CopyBlock
            label="Claude Code"
            value={`claude mcp add halftime --env HALFTIME_ROOTS=/path/to/papers -- \\\n  node /path/to/HalfTime/packages/mcp/bin/halftime-mcp.mjs`}
          />
          <CopyBlock
            label="claude_desktop_config.json"
            value={`{
  "mcpServers": {
    "halftime": {
      "command": "node",
      "args": ["/path/to/HalfTime/packages/mcp/bin/halftime-mcp.mjs"],
      "env": { "HALFTIME_ROOTS": "/path/to/papers" }
    }
  }
}`}
          />
        </section>
      </div>

      <section aria-labelledby="ask-h" className="mt-16 grid gap-8 md:grid-cols-12">
        <h2 id="ask-h" className="font-sans text-[length:var(--step-3)] font-[750] [font-stretch:88%] md:col-span-4">Then ask</h2>
        <div className="space-y-3 font-serif text-[1.15rem] md:col-span-8">
          <p className="border-l-4 border-carbon pl-4">“Use halftime to sweep the 12 sample orders and show me the lanes.”</p>
          <p className="border-l-4 border-carbon pl-4">“Read the papers in ~/jail-bundle with halftime. Who has crossed the Section 479 line? Draft the application in Hindi for anyone past it.”</p>
          <p className="border-l-4 border-carbon pl-4">“Here is a bail order: … Check it with halftime.”</p>
        </div>
      </section>

      <section aria-labelledby="tools-h" className="mt-16">
        <h2 id="tools-h" className="font-sans text-[length:var(--step-3)] font-[750] [font-stretch:88%]">Tools</h2>
        <dl className="mt-4 divide-y divide-[var(--rule)] border-y border-ink">
          {TOOLS.map(([n, d]) => (
            <div key={n} className="grid gap-1 py-3 md:grid-cols-[18rem_1fr]">
              <dt className="font-mono text-[0.9rem] text-carbon">{n}</dt>
              <dd className="text-ink-2">{d}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 max-w-3xl text-[0.95rem] text-ink-2">
          Claude never decides eligibility through these tools. If it quotes something that isn&apos;t in the order, or a date the quote doesn&apos;t
          contain, the claim is rejected and the case falls back to “can&apos;t tell”. <Link className="underline" href="/law">How the law is applied</Link>.
        </p>
      </section>
    </div>
  );
}
