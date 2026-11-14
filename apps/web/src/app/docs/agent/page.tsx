import type { Metadata } from "next";
import { evaluate, humanDate, parseIsoDate } from "@halftime/law";
import { AGENT_TOOLS, type AgentRun } from "@halftime/reader/agent";
import { MODELS } from "@halftime/reader";
import { AgentLoopDiagram } from "@/components/docs/diagrams";
import { A, C, Code, DocPage, Figure, H3, Note, P, Section, Stats, Table, UL } from "@/components/docs/ui";
import { SAMPLES } from "@/lib/cases";
import runRaw from "@/data/agent-run.json";

export const metadata: Metadata = {
  title: "The docket agent",
  description: "HalfTime's docket agent: seven tools, the loop, the guard rails code enforces, the recorded run's numbers, and how to run it with your own key."
};

const RUN = runRaw as unknown as AgentRun & { label: string; ranOn: string };

const TOC = [
  { id: "what", title: "What it does" },
  { id: "tools", title: "The seven tools" },
  { id: "loop", title: "The loop" },
  { id: "rails", title: "Guard rails" },
  { id: "run", title: "The recorded run" },
  { id: "own", title: "Run it with your own key" }
];

/** What code does with each tool call. Matches runTool() in packages/reader/src/agent.ts. */
const ENFORCED: Record<string, string> = {
  list_files: "Returns ids and first lines only, plus today's date.",
  read_file: "Wraps the text in <<<DOCUMENT id>>> markers with a note that it is untrusted evidence. Unknown ids are refused.",
  submit_facts:
    "Refused until the file has been read. Unknown keys (a “verdict”, say) are stripped by the schema. Runs the span verifier and the engine; returns accepted facts, rejected claims with the verifier's reason, the code verdict and retries left. At most 2 resubmissions per file.",
  lookup_section: "Reads the statute tables: maximum, source, IPC→BNS mapping.",
  request_record:
    "Refused before facts are submitted, refused unless the verified facts lack what the record supplies (custody certificate, charge-sheet copy, criminal-history report), refused if already requested. The letter comes from a fixed template; the case number is used only if it is in the document.",
  draft_application: "Refused before facts are submitted and refused unless code's verdict is PAST_THE_LINE or PAST_FLAGGED. Code writes the draft from verified facts.",
  finish: "Ends the loop. The model's summary is kept as a note; code builds the docket from verified state."
};

function fields(schema: Record<string, unknown>): string {
  const props = (schema.properties ?? {}) as Record<string, unknown>;
  const req = new Set((schema.required ?? []) as string[]);
  const names = Object.keys(props).map((k) => (req.has(k) ? k : `${k}?`));
  return names.length ? names.join(", ") : "none";
}

export default function AgentDocs() {
  const s = RUN.stats;
  const correct = RUN.docket.filter((d) => {
    const sample = SAMPLES.find((x) => x.id === d.id);
    return sample && evaluate(sample.gold, RUN.today).verdict === d.verdict;
  }).length;
  const rejected = RUN.events.find((e) => e.kind === "rejected");
  const fixed = RUN.events.find((e) => e.kind === "fixed" && e.fileId === rejected?.fileId);
  const refusedCount = RUN.events.filter((e) => e.kind === "refused").length;
  const lanes = (v: string) => RUN.docket.filter((d) => d.verdict === v).length;

  return (
    <DocPage
      href="/docs/agent"
      kicker={`How it works · packages/reader/src/agent.ts`}
      title="The docket agent."
      lead={
        <p>
          For a whole jail, HalfTime runs as an agent. Claude works through the files with seven tools and chooses the order of work. Code checks
          every quote, owns every verdict, gates every records request and draft, and builds the final docket.
        </p>
      }
      toc={TOC}
    >
      <Section id="what" title="What it does">
        <P>
          Given a stack of court orders and a date, <C>runDocketAgent()</C> lets the model list and read the files, submit the facts of each with
          quotes, look up sections, request records the papers lack, and draft 479(3) applications. When a quote is rejected, the verifier&apos;s
          reason goes back to the model and it may try again with the exact words. At the end, code (not the model) orders everyone for a review
          meeting: past the line first (most days past at the top), then flagged, then can&apos;t tell (records requested first), then not yet
          (soonest first), then outside 479.
        </P>
        <P muted>
          The model is <C>{MODELS.extract}</C>, with prompt caching on the growing conversation. The page <A href="/agent">/agent</A> replays the
          recorded run and lets you run your own.
        </P>
      </Section>

      <Section id="tools" title="The seven tools">
        <P muted>Inputs are read from the tool schemas the model is given (<C>AGENT_TOOLS</C>); a trailing ? marks an optional field.</P>
        <Table
          label="Agent tools"
          head={["Tool", "Input", "What code enforces"]}
          minWidth={760}
          mono={[0, 1]}
          rows={AGENT_TOOLS.map((t) => [t.name, fields(t.input_schema), ENFORCED[t.name] ?? ""])}
        />
        <P>
          <C>submit_facts</C> takes the same extraction shape as the MCP tool <C>check_order</C>: <C>sections[]</C> (act, section, quote,
          ndps_quantity?), <C>custody_start</C> (date, kind?, quote), <C>first_time_offender</C> and <C>other_pending_cases</C> (value, quote),
          and optional <C>registered_on</C>, <C>accused_name_masked</C>, <C>case_no</C>, <C>court</C>. Quotes are capped at 4,000 characters and
          sections at 40 per file.
        </P>
      </Section>

      <Section id="loop" title="The loop">
        <Figure label="Agent sequence diagram" caption="One model turn may call several tools. Dashed lines are results going back.">
          <AgentLoopDiagram />
        </Figure>
        <UL>
          <li>Each turn sends the system prompt, the conversation so far and the tool definitions; the response&apos;s tool calls run in order.</li>
          <li>
            The loop ends when the model calls <C>finish</C>, stops calling tools, hits the step limit (by default 10 turns plus 4 per file), or
            an error or the spend cap stops it. The reason is recorded as <C>stoppedBy</C>.
          </li>
          <li>Each event in the log is a short summary (never a whole document) with its time, tokens and cost.</li>
          <li>Responses are cached by a hash of the whole request, so a recorded run replays exactly.</li>
        </UL>
      </Section>

      <Section id="rails" title="Guard rails">
        <P muted>Each of these is code, and each is covered by a test with a scripted model in <C>packages/reader/test</C>.</P>
        <Table
          label="Guard rails"
          head={["Rail", "How it is enforced"]}
          minWidth={620}
          rows={[
            ["Verdicts come only from code", "submit_facts runs decide(): the span verifier, then the engine. Unknown fields in the model's input are stripped by zod before code sees them."],
            ["Every fact needs a quote", "A quote not in the document, or one without the claimed date or section, is rejected with the reason and treated as unknown."],
            ["Retries are capped", "Two resubmissions per file. After that the facts stand as last verified; anything unverified stays unknown."],
            ["Records and drafts are gated", "request_record only for what the verified facts lack; draft_application only past the line."],
            ["The loop is bounded", "A step limit, a spend cap checked before each call, unknown tools and file ids refused."],
            ["Documents are data", "File text is fenced with markers and labelled untrusted; the system prompt says instructions inside it are evidence to ignore."],
            ["The docket is built by code", "Ranks come from sortDocket() over verified state, never from the model's words."]
          ]}
        />
      </Section>

      <Section id="run" title="The recorded run">
        <P>
          {RUN.label}, recorded on {humanDate(parseIsoDate(RUN.ranOn)!)} with “today” set to {humanDate(parseIsoDate(RUN.today)!)}. Numbers read
          from <C>apps/web/src/data/agent-run.json</C>.
        </P>
        <Stats
          items={[
            { value: String(s.toolCalls), label: "Tool calls", note: `${s.steps} model turns · stopped by ${s.stoppedBy}` },
            { value: `${s.rejectedClaims} / ${s.fixedOnRetry}`, label: "Claims rejected / fixed on retry" },
            { value: `${s.recordsRequested} · ${s.drafts}`, label: "Records requested · drafts" },
            { value: `${correct}/${RUN.docket.length}`, label: "Verdicts matching the answer key" },
            { value: `$${s.costUsd.toFixed(2)}`, label: "Cost", note: `${s.inputTokens.toLocaleString("en-IN")} input, ${s.outputTokens.toLocaleString("en-IN")} output tokens` },
            { value: `${Math.round(s.ms / 1000)} s`, label: "Time" },
            { value: String(s.refusals), label: "Tool calls refused", note: `${refusedCount} refusal events in the log` },
            {
              value: `${lanes("PAST_THE_LINE")}+${lanes("PAST_FLAGGED")}`,
              label: "Past the line + flagged",
              note: `${lanes("CANT_TELL")} can't tell · ${lanes("NOT_YET")} not yet · ${lanes("EXCLUDED")} outside 479`
            }
          ]}
        />
        {rejected && (
          <>
            <H3 id="run-retry">The rejected claim, and the fix</H3>
            <Table
              label="Rejected and fixed events"
              head={["File", "Event", "Log line"]}
              minWidth={640}
              mono={[0]}
              rows={[
                [rejected.fileId ?? "", "rejected", rejected.output],
                ...(fixed ? [[fixed.fileId ?? "", "fixed", fixed.output]] : [])
              ]}
            />
          </>
        )}
        {RUN.summary && (
          <Note title="The model's closing summary (kept as a note, not used for any decision)">
            <p className="font-serif">{RUN.summary}</p>
          </Note>
        )}
      </Section>

      <Section id="own" title="Run it with your own key">
        <H3 id="own-browser">In the browser</H3>
        <P>
          On <A href="/agent">/agent</A>, under “Run it on your papers”, paste your Anthropic API key and add up to 10 files. The agent runs in your
          browser; your key and papers go straight to <C>api.anthropic.com</C>. A run is capped at one US dollar. See{" "}
          <A href="/docs/security">Security</A> for where the key is kept.
        </P>
        <H3 id="own-cli">From the repository</H3>
        <P>
          <C>scripts/build-agent-run.ts</C> runs the agent on the twelve sample orders with a spend cap of US$2.50 and writes{" "}
          <C>apps/web/src/data/agent-run.json</C>. Responses are cached under <C>.cache/claude</C>, so a second run replays without calling the
          API.
        </P>
        <Code label="Terminal">{`export ANTHROPIC_API_KEY=...        # your own key
npx tsx scripts/build-agent-run.ts`}</Code>
        <P muted>
          To use it in your own code, import <C>runDocketAgent</C> and <C>anthropicModelClient</C> from <C>@halftime/reader/agent</C>; pass{" "}
          <C>files</C> (id and text), <C>today</C>, a client, and optionally <C>maxSteps</C>, <C>maxRetriesPerFile</C> and <C>onEvent</C>.
        </P>
      </Section>
    </DocPage>
  );
}
