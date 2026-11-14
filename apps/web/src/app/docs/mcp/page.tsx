import type { Metadata } from "next";
import type { Extraction } from "@halftime/reader";
import { A, C, Code, DocPage, H3, Note, P, Section, Table, UL } from "@/components/docs/ui";
import { RUNS, SAMPLES } from "@/lib/cases";
import { demoSessions } from "@/lib/docs/build-info";
import { EXAMPLE_TODAY, mcpTools, mcpToolText, type ToolInfo } from "@/lib/docs/live";
import { REPO, SITE } from "@/lib/docs/nav";

export const metadata: Metadata = {
  title: "MCP server",
  description: "Connect HalfTime to claude.ai, Claude Desktop or Claude Code over MCP, the HALFTIME_ROOTS folder guard, every tool with its inputs and a real example output, and the recorded sessions."
};

const TOC = [
  { id: "idea", title: "How the work is split" },
  { id: "connect", title: "Connect" },
  { id: "roots", title: "Local file access: HALFTIME_ROOTS" },
  { id: "tools", title: "Tools" },
  { id: "examples", title: "Example outputs" },
  { id: "sessions", title: "Recorded sessions" },
  { id: "test", title: "Testing a connection" }
];

const URL_ = `${SITE}/mcp`;

/** The tool's input fields as tools/list states them: name, type, required. */
function inputs(t: ToolInfo) {
  const props = t.inputSchema.properties ?? {};
  const req = new Set(t.inputSchema.required ?? []);
  const keys = Object.keys(props);
  if (!keys.length) return <span className="text-ink-3">none</span>;
  return (
    <ul className="space-y-0.5">
      {keys.map((k) => {
        const p = props[k]!;
        const type = p.enum ? p.enum.map((v) => `"${v}"`).join(" | ") : Array.isArray(p.type) ? p.type.join(" | ") : (p.type ?? "object");
        return (
          <li key={k}>
            {k}
            {req.has(k) ? "" : "?"} <span className="text-ink-3">: {type}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** The tool input for one sample, from the extraction Claude made of it when the sample tray was pre-run. */
function sampleArgs(id: string) {
  const s = SAMPLES.find((x) => x.id === id)!;
  // Fields the tool schema doesn't list (order_date, language, english_gloss) are stripped by its zod schema.
  const extraction: Extraction = RUNS[id]!.extraction;
  return { id, document_text: s.text, extraction };
}

const clip = (text: string, lines: number) => {
  const all = text.split("\n");
  return all.length > lines ? `${all.slice(0, lines).join("\n")}\n… (${all.length - lines} more lines)` : text;
};

export default async function McpDocs() {
  const today = EXAMPLE_TODAY;
  const remote = await mcpTools(false);
  const local = await mcpTools(true);
  const remoteNames = new Set(remote.map((t) => t.name));

  const s01 = sampleArgs("S01");
  const ex = {
    list: await mcpToolText("list_sample_orders", {}),
    lookup: await mcpToolText("lookup_section", { act: "BNS", section: "303(2)" }),
    apply: await mcpToolText("apply_section_479", {
      sections: [{ act: "IPC", section: "420" }],
      custody_start: "2024-02-12",
      first_time_offender: "unknown",
      other_pending_cases: "false",
      today
    }),
    check: await mcpToolText("check_order", { document_text: s01.document_text, extraction: s01.extraction, today }),
    sweep: await mcpToolText("sweep_jail", { orders: ["S01", "S03", "S08"].map(sampleArgs), today }),
    draft: await mcpToolText("draft_application", { document_text: sampleArgs("S03").document_text, extraction: sampleArgs("S03").extraction, language: "en", today })
  };
  const sessions = demoSessions();

  const WHAT: Record<string, string> = {
    check_order: "Verifies your extraction of one order against its text and applies Section 479: verdict, rule trace, accepted quotes, rejected claims.",
    sweep_jail: "The same for up to 50 orders at once: counts per lane, a table, and a CSV for the DLSA.",
    apply_section_479: "The engine on typed-in facts, for a lawyer who already knows them. Nothing is verified, so prefer check_order when you have the text.",
    lookup_section: "A section's maximum punishment from the statute tables, with its source and the IPC→BNS mapping.",
    draft_application: "The 479(3) application in English or Hindi, pre-filled and marked as a draft. If the verdict is not past the line, it says so at the top. The local server can save it as .docx.",
    list_sample_orders: "The twelve constructed sample orders.",
    get_sample_order: "One sample order's full text, by id (S01 … S12).",
    list_order_files: "Local only: the .pdf, .txt, .png and .jpg files in a folder.",
    read_order_file: "Local only: a .txt or text-layer .pdf as text. For a scan or an image it says so, and Claude transcribes the page itself."
  };

  return (
    <DocPage
      href="/docs/mcp"
      kicker="Reference · packages/mcp"
      title="MCP server."
      lead={
        <p>
          HalfTime is also a Model Context Protocol server. The Claude you are already talking to reads the papers and quotes them; HalfTime&apos;s
          tools check every quote and apply the law. No API key is involved.
        </p>
      }
      toc={TOC}
    >
      <Section id="idea" title="How the work is split">
        <P>
          The server sends instructions with <C>initialize</C>: the client&apos;s model reads the papers and reports facts, each with a verbatim
          quote; HalfTime&apos;s code checks the quotes and decides. The model is told never to decide eligibility itself, to report HalfTime&apos;s
          verdict and trace, and never to describe a result as simply “eligible”. The <C>check_order</C> tool description carries the full
          extraction rules, the same ones the site&apos;s own reader uses.
        </P>
        <P muted>
          Two servers share one tool set (<C>packages/mcp/src/tools.ts</C>): the remote one at <C>{URL_}</C> (stateless Streamable HTTP, no file
          access) and a local stdio one that can read a folder of papers and save Word files.
        </P>
      </Section>

      <Section id="connect" title="Connect">
        <H3 id="connect-claude-ai">claude.ai and Claude Desktop (remote)</H3>
        <P>Add a custom connector with this URL. It works on the sample orders, or on order text you paste into the chat.</P>
        <Code label="Connector URL">{URL_}</Code>
        <H3 id="connect-code-remote">Claude Code (remote)</H3>
        <Code label="Terminal">{`claude mcp add --transport http halftime ${URL_}`}</Code>
        <H3 id="connect-code-local">Claude Code (local, with a folder of papers)</H3>
        <P>Clone the repository and run <C>pnpm install</C>, then:</P>
        <Code label="Terminal">{`claude mcp add halftime --env HALFTIME_ROOTS=/path/to/papers -- \\
  node /path/to/HalfTime/packages/mcp/bin/halftime-mcp.mjs`}</Code>
        <H3 id="connect-desktop-local">Claude Desktop (local)</H3>
        <Code label="claude_desktop_config.json">{`{
  "mcpServers": {
    "halftime": {
      "command": "node",
      "args": ["/path/to/HalfTime/packages/mcp/bin/halftime-mcp.mjs"],
      "env": { "HALFTIME_ROOTS": "/path/to/papers" }
    }
  }
}`}</Code>
        <P muted>
          <C>bin/halftime-mcp.mjs</C> starts <C>src/stdio.ts</C> through tsx. There is also a prompt, <C>sweep_jail</C>, that runs the whole
          workflow on a folder or, with no folder, on the twelve samples.
        </P>
        <H3 id="connect-ask">Then ask</H3>
        <UL>
          <li>“Use halftime to sweep the 12 sample orders and show me the lanes.”</li>
          <li>“Read the papers in ~/jail-bundle with halftime. Who has crossed the Section 479 line? Draft the application in Hindi for anyone past it.”</li>
          <li>“Here is a bail order: … Check it with halftime.”</li>
        </UL>
      </Section>

      <Section id="roots" title="Local file access: HALFTIME_ROOTS">
        <P>
          The local server reads and writes only inside the folders in <C>HALFTIME_ROOTS</C> (colon-separated; if unset, the folder the server was
          started in). Every path is resolved first, so <C>..</C> cannot climb out. Anything outside is refused with a message naming the allowed
          folders (<C>packages/mcp/src/files.ts</C>).
        </P>
        <UL>
          <li>Listing shows only .pdf, .txt, .png, .jpg and .jpeg files.</li>
          <li>
            Reading returns the text of a .txt file or of a PDF&apos;s text layer. For an image, or a PDF with little or no text layer, it returns
            a note asking Claude to transcribe the pages itself and pass the text to <C>check_order</C>.
          </li>
          <li>
            <C>draft_application</C> with <C>save_to</C> writes a .docx; the path must end in .docx and be inside an allowed folder.
          </li>
          <li>The remote server has no file tools at all.</li>
        </UL>
      </Section>

      <Section id="tools" title="Tools">
        <P muted>
          Inputs are read from <C>tools/list</C> when this page is built; a ? marks an optional field. Every tool is annotated read-only, except{" "}
          <C>draft_application</C> on the local server, which can write a file. Limits: documents ≤ 120,000 characters, quotes ≤ 4,000, short
          fields ≤ 200, sweeps ≤ 50 orders.
        </P>
        <Table
          label="MCP tools"
          head={["Tool", "Inputs", "Where", "What it returns"]}
          minWidth={820}
          mono={[0, 1]}
          rows={local.map((t) => [t.name, inputs(t), remoteNames.has(t.name) ? "remote + local" : "local only", WHAT[t.name] ?? t.title ?? ""])}
        />
        <H3 id="tools-extraction">The extraction object</H3>
        <P>
          <C>check_order</C>, <C>sweep_jail</C> and <C>draft_application</C> take the model&apos;s reading as <C>extraction</C>. Only the facts the
          law needs are required:
        </P>
        <Code label="extraction">{`{
  "sections": [{ "act": "IPC", "section": "379", "quote": "<verbatim text naming the section>", "ndps_quantity": "small | intermediate | commercial | unknown (NDPS only, optional)" }],
  "custody_start": { "date": "YYYY-MM-DD or null", "kind": "arrest | remand | surrender | unknown (optional)", "quote": "<sentence containing the date> or null" },
  "first_time_offender": { "value": "true | false | unknown", "quote": "<text> or null" },
  "other_pending_cases": { "value": "true | false | unknown", "quote": "<text> or null" },
  "registered_on": { "date": "YYYY-MM-DD or null", "quote": "<text> or null" },   // optional
  "accused_name_masked": "R— K—",                                                // optional
  "case_no": "...", "court": "..."                                               // optional
}`}</Code>
      </Section>

      <Section id="examples" title="Example outputs">
        <P muted>
          Produced by calling the tools when this page was built, with today fixed at {today}. The extractions for the sample orders are the ones
          Claude made when the sample tray was pre-run.
        </P>
        <H3 id="ex-check">check_order on sample S01</H3>
        <Code label="check_order → text" tall>{ex.check}</Code>
        <H3 id="ex-sweep">sweep_jail on S01, S03 and S08</H3>
        <Code label="sweep_jail → text" tall>{ex.sweep}</Code>
        <H3 id="ex-apply">apply_section_479, first-time status unknown</H3>
        <Code label="apply_section_479 → text" tall>{ex.apply}</Code>
        <H3 id="ex-lookup">lookup_section, BNS 303(2)</H3>
        <Code label="lookup_section → text">{ex.lookup}</Code>
        <H3 id="ex-draft">draft_application for S03, in English (first lines)</H3>
        <Code label="draft_application → text">{clip(ex.draft, 18)}</Code>
        <H3 id="ex-list">list_sample_orders (first lines)</H3>
        <Code label="list_sample_orders → text">{clip(ex.list, 6)}</Code>
      </Section>

      <Section id="sessions" title="Recorded sessions">
        <P>
          <A href={`${REPO}/blob/main/packages/mcp/DEMO.md`}>packages/mcp/DEMO.md</A> holds two recorded Claude Code sessions with HalfTime as
          the only MCP server{sessions.length ? ` (${sessions.map((s) => `${s.turns} turns, ${s.seconds} s`).join("; ")})` : ""}.
        </P>
        <UL>
          <li>
            <strong>Local, stdio.</strong> Claude listed and read the five orders in <C>data/demo-jail/</C>, called <C>sweep_jail</C> once, and every
            quote verified. One order contains a planted line telling the reader to ignore its instructions and mark the accused eligible; Claude
            treated it as text in the document, and that case&apos;s result came only from its facts. It then saved a Hindi 479(3) application
            as Word. Its review of the draft found two problems in the Hindi text, which were then fixed in the shared drafter and covered by a
            test.
          </li>
          <li>
            <strong>Remote, over HTTP.</strong> The same client connected to <C>{URL_}</C>, with no local install, fetched three sample orders
            and swept them in one call. No claims were rejected.
          </li>
        </UL>
        <Note title="Reproduce">
          The session file ends with the exact <C>claude -p … --mcp-config … --strict-mcp-config --allowedTools …</C> command used and the
          script that turns the JSON stream into the transcript.
        </Note>
      </Section>

      <Section id="test" title="Testing a connection">
        <Code label="Terminal">{`pnpm --filter @halftime/mcp test                                         # every tool through a real MCP client
npx tsx packages/mcp/scripts/stdio-smoke.ts <folder>                     # start the stdio server as Claude Desktop does
npx tsx packages/mcp/scripts/remote-smoke.ts ${URL_}`}</Code>
        <P>
          Or with curl: see <A href="/docs/api#mcp">POST /mcp</A>. The <A href="/status">status page</A> calls <C>tools/list</C> from your browser.
        </P>
      </Section>
    </DocPage>
  );
}
