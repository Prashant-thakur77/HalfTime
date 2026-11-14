import type { Metadata } from "next";
import { ACTS } from "@halftime/reader";
import { A, C, Code, DocPage, H3, Note, P, Section, Table, UL } from "@/components/docs/ui";
import factsRaw from "@/data/facts.json";
import { SITE } from "@/lib/docs/nav";
import { EXAMPLE_TODAY, healthExchange, mcpExchange, pretty, rulesExchange } from "@/lib/docs/live";
import { MAX_BODY_BYTES, PER_MINUTE } from "@/lib/server/mcp";
import { MAX_TEXT } from "@/lib/server/validate";

export const metadata: Metadata = {
  title: "HTTP API",
  description: "HalfTime's HTTP routes: /api/rules, /api/extract, /api/baseline, /api/ocr, /api/facts, /api/health and the /mcp JSON-RPC endpoint, with schemas, limits, status codes and curl examples."
};

const TOC = [
  { id: "overview", title: "Routes at a glance" },
  { id: "errors", title: "Errors and status codes" },
  { id: "rules", title: "POST /api/rules" },
  { id: "health", title: "GET /api/health" },
  { id: "facts", title: "GET /api/facts" },
  { id: "extract", title: "POST /api/extract" },
  { id: "baseline", title: "POST /api/baseline" },
  { id: "ocr", title: "POST /api/ocr" },
  { id: "mcp", title: "POST /mcp (JSON-RPC)" }
];

const n = (x: number) => x.toLocaleString("en-IN");

export default async function ApiDocs() {
  const today = EXAMPLE_TODAY;
  const rulesBody = {
    today,
    input: { sections: [{ act: "IPC", section: "379" }], custodyStart: "2024-05-20", firstTimeOffender: "true", otherPendingCases: "false", registeredOn: null }
  };
  const rules = await rulesExchange(rulesBody);
  const rulesBad = await rulesExchange({ ...rulesBody, input: { ...rulesBody.input, custodyStart: "20/05/2024" } });
  const health = await healthExchange();
  const init = await mcpExchange({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "curl", version: "0" } } });
  const list = await mcpExchange({ jsonrpc: "2.0", id: 2, method: "tools/list" });
  const call = await mcpExchange({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "lookup_section", arguments: { act: "IPC", section: "379" } } });
  const bad = await mcpExchange({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "lookup_section", arguments: { act: "XYZ", section: "1" } } });

  const initShort = (() => {
    const j = init.json as { result: { instructions?: string } };
    const ins = j.result.instructions ?? "";
    return { ...j, result: { ...j.result, instructions: `${ins.slice(0, 110)}… (${n(ins.length)} characters)` } };
  })();
  const toolNames = ((list.json as { result: { tools: { name: string; title?: string }[] } }).result.tools ?? []).map((t) => ({ name: t.name, title: t.title }));
  const factKeys = Object.keys(factsRaw).filter((k) => k !== "generatedBy");
  const healthJson = health.json as Record<string, unknown>;

  return (
    <DocPage
      href="/docs/api"
      kicker="Reference"
      title="HTTP API."
      lead={
        <p>
          Every route the server has. The law engine, the health self-test, the facts file and the MCP endpoint are public on the hosted site.
          The three model routes work only on a self-hosted deployment that sets a server key. Examples on this page were produced by the real
          handlers when the page was built.
        </p>
      }
      toc={TOC}
    >
      <Section id="overview" title="Routes at a glance">
        <Table
          label="Routes"
          head={["Route", "What it does", "Hosted site", "Limits"]}
          minWidth={780}
          mono={[0]}
          rows={[
            ["POST /api/rules", "The Section 479 engine on typed-in facts. No model, no network.", "Yes", "zod-validated input; up to 40 sections"],
            ["GET /api/health", "Liveness plus a self-test of the engine and the verifier.", "Yes", "never cached"],
            ["GET /api/facts", "The numbers the site shows, with sources, and the evaluation report.", "Yes", "cached 5 minutes"],
            ["POST /api/extract", "Reads one document with Claude, verifies the quotes, applies the law.", "Self-host only (503 without a key)", `text ≤ ${n(MAX_TEXT)} chars · 12/min per IP · daily spend cap`],
            ["POST /api/baseline", "The plain-chatbot answer, for comparison.", "Self-host only", `text ≤ ${n(MAX_TEXT)} chars · 6/min per IP · daily spend cap`],
            ["POST /api/ocr", "Transcribes one scanned page.", "Self-host only", "image ≤ 7,000,000 base64 chars · 30/min per IP · daily spend cap"],
            ["POST /mcp", "The MCP server over stateless Streamable HTTP (JSON-RPC 2.0).", "Yes", `body ≤ ${MAX_BODY_BYTES / 1_000_000} MB · ${PER_MINUTE}/min per IP`]
          ]}
        />
        <Note title="Hosted site and server keys">
          The hosted site holds no Anthropic key, so <C>/api/extract</C>, <C>/api/baseline</C> and <C>/api/ocr</C> answer <C>503</C> there. The
          site reads new papers in the visitor&apos;s browser with the visitor&apos;s own key instead (see <A href="/docs/security">Security</A>).
          To use these routes, deploy your own copy with <C>ANTHROPIC_API_KEY</C> set (see <A href="/docs/self-host">Self-hosting</A>).
        </Note>
      </Section>

      <Section id="errors" title="Errors and status codes">
        <P>
          The <C>/api</C> routes answer errors as JSON with one field, <C>{`{"error": "..."}`}</C>. The message is safe to show to a person;
          it never contains document text. <C>/mcp</C> answers JSON-RPC errors (<C>{`{"jsonrpc":"2.0","error":{"code":…,"message":…},"id":…}`}</C>).
        </P>
        <Table
          label="Status codes"
          head={["Status", "When"]}
          minWidth={560}
          mono={[0]}
          rows={[
            ["200", "Success. On /mcp also a tool call whose input failed validation: the result has isError: true and the reason as text."],
            ["400", "Body is not JSON, or fails the schema (the first validation message is returned). On /mcp: a JSON-RPC parse error."],
            ["406", "/mcp only: the Accept header must include both application/json and text/event-stream."],
            ["413", "/mcp only: body over 2 MB, by the Content-Length header or by actual length."],
            ["429", "Per-IP limit for this minute reached. Try again in a minute."],
            ["503", "Model routes: no server key is configured, or today's spend cap is used up. /api/health: the self-test failed."],
            ["500", "Anything else. The message is generic: “Something went wrong reading this document.”"]
          ]}
        />
        <P muted>
          Validation runs before the rate limit and before any model call, so a malformed request costs nothing. Rate limits and the spend cap are
          counted in Cloudflare KV; the model routes skip both when no KV namespace is bound (local runs), while <C>/mcp</C> falls back to an
          in-memory count per isolate.
        </P>
      </Section>

      <Section id="rules" title="POST /api/rules">
        <P>Applies Section 479 to facts you already know. Pure code: the same request always gives the same answer.</P>
        <Table
          label="Rules request fields"
          head={["Field", "Type", "Notes"]}
          minWidth={680}
          mono={[0, 1]}
          nowrap={[1]}
          rows={[
            ["today", "string", "YYYY-MM-DD. Required: the date to evaluate as of."],
            ["input.sections[]", "array, ≤ 40", "Each { act, section, quantity?, spanId? }."],
            ["input.sections[].act", "enum", ACTS.join(", ")],
            ["input.sections[].section", "string, ≤ 40", "As written: 379, 304-B, 25(1-b)(a), 3/25 (compound references are split)."],
            ["input.sections[].quantity", "enum?", "NDPS only: small, intermediate, commercial, unknown."],
            ["input.custodyStart", "string | null", "YYYY-MM-DD. null means the papers don't say."],
            ["input.firstTimeOffender", "enum", "true, false, unknown (strings)."],
            ["input.otherPendingCases", "enum", "true, false, unknown (strings)."],
            ["input.accusedDelayDays", "number?", "0–10,000. Days of delay caused by the accused."],
            ["input.registeredOn", "string | null?", "YYYY-MM-DD. Decides the pre-July-2024 note."],
            ["input.maxTermOverrideMonths", "number | null?", "1–1,200. A maximum a lawyer entered when the tables can't decide."]
          ]}
        />
        <Code label="curl">{`curl -s ${SITE}/api/rules \\
  -H 'content-type: application/json' \\
  -d '${JSON.stringify(rulesBody, null, 2).replace(/\n/g, "\n     ")}'`}</Code>
        <Code label={`Response · ${rules.status}`} tall>
          {pretty(rules.json)}
        </Code>
        <P muted>
          With <C>registeredOn</C> null and an IPC section charged, the engine treats the case as registered before July 2024, which is why{" "}
          <C>provision</C> is <C>BNSS_479_PRE_JULY_2024</C> and <C>oldLawLineDate</C> is filled.
        </P>
        <P>
          The response is the engine&apos;s <C>Evaluation</C>: <C>verdict</C>, <C>provision</C>, <C>maxTermMonths</C>, <C>fraction</C>,{" "}
          <C>lineDate</C>, <C>firstTimeLineDate</C>, <C>oldLawLineDate</C>, <C>daysDetained</C>, <C>daysPast</C>, <C>daysToGo</C>,{" "}
          <C>beyondMaximum</C>, <C>pastIfFirstTime</C>, <C>flags[]</C>, <C>missing[]</C>, <C>sections[]</C> (how each section was resolved) and{" "}
          <C>trace[]</C> (each step with its statute <C>source</C>). The rules are on <A href="/docs/law">How Section 479 is computed</A>.
        </P>
        <Code label={`Invalid date · ${rulesBad.status}`}>{pretty(rulesBad.json)}</Code>
      </Section>

      <Section id="health" title="GET /api/health">
        <P>
          Applies the engine to a known theft case and runs the verifier on a Hindi sentence (one real quote must pass, one with a changed year must
          fail). <C>status</C> is <C>ok</C> with HTTP 200, or <C>degraded</C> with 503. <C>build</C> is the build date; <C>ms</C> the time the
          self-test took. The scheduled production check and the <A href="/status">status page</A> call it.
        </P>
        <Code label="curl">{`curl -s ${SITE}/api/health`}</Code>
        <Code label={`Response · ${health.status} (build and ms vary)`}>{pretty({ ...healthJson, build: healthJson.build ?? "YYYY-MM-DD" })}</Code>
      </Section>

      <Section id="facts" title="GET /api/facts">
        <P>
          The file every number on the site comes from (<C>apps/web/src/data/facts.json</C>, built by <C>scripts/build-facts.ts</C>). Top-level
          keys: {factKeys.map((k, i) => (
            <span key={k}>
              {i > 0 ? ", " : ""}
              <C>{k}</C>
            </span>
          ))}
          . Each statistic is <C>{`{ value, source, unit? }`}</C>; <C>sources</C> maps a key to <C>{`{ label, url }`}</C>; <C>eval</C> is the
          evaluation report (<C>eval/report.json</C>).
        </P>
        <Code label="curl">{`curl -s ${SITE}/api/facts`}</Code>
      </Section>

      <Section id="extract" title="POST /api/extract">
        <P>
          Self-host only. Runs extraction and the missing-section self-check with Claude, merges any sections the self-check found, then verifies
          every quote and applies the law. <C>today</C> defaults to the server&apos;s date.
        </P>
        <Table
          label="Extract request fields"
          head={["Field", "Type", "Notes"]}
          minWidth={560}
          mono={[0, 1]}
          rows={[
            ["text", "string", `40–${n(MAX_TEXT)} characters: the order's text.`],
            ["today", "string?", "YYYY-MM-DD."]
          ]}
        />
        <Code label="curl">{`curl -s https://your-deployment.example/api/extract -H 'content-type: application/json' \\
  -d '{"text": "<the order text>", "today": "${today}"}'`}</Code>
        <P>The response has these fields:</P>
        <UL>
          <li>
            <C>extraction</C>: what the model returned, each fact with its quote.
          </li>
          <li>
            <C>facts</C>: <C>input</C> (the facts the engine used), <C>spans[]</C> (each accepted fact with its start and end offsets in{" "}
            <C>text</C>) and <C>rejected[]</C> (field, claim, quote, reason).
          </li>
          <li>
            <C>evaluation</C>: the same shape as <C>/api/rules</C>.
          </li>
          <li>
            <C>text</C>: the normalised document the offsets point into; <C>selfCheckAdded</C>: how many sections the self-check added; and{" "}
            <C>meta[]</C>: model, cached, ms, tokens and cost for each call.
          </li>
        </UL>
        <P muted>Errors: 400 for text that is too short or too long; 429 over 12 requests per minute per IP; 503 without a key or over the spend cap.</P>
      </Section>

      <Section id="baseline" title="POST /api/baseline">
        <P>
          Self-host only. Asks the same model the question a person would type (“Is the accused eligible for release under Section 479 of the
          BNSS? If yes, from what date?”), then a small model reads the answer into yes, no or unclear. Used for the comparison on{" "}
          <A href="/vs-chatbot">/vs-chatbot</A>; it is not part of HalfTime&apos;s decision.
        </P>
        <Code label="Request">{`{ "text": "<the order text, 40–${n(MAX_TEXT)} characters>" }`}</Code>
        <Code label="Response shape">{`{
  "answer": { "text": "<the chatbot's paragraph>", "saysEligible": true | false | null, "date": "YYYY-MM-DD" | null },
  "meta": [ { "model", "cached", "ms", "inputTokens", "outputTokens", "costUsd" }, ... ]
}`}</Code>
        <P muted>Errors: 400 “Send the document text.”; 429 over 6 per minute per IP; 503 without a key or over the spend cap.</P>
      </Section>

      <Section id="ocr" title="POST /api/ocr">
        <P>Self-host only. Transcribes one scanned page with Claude Opus 5.5, keeping Devanagari as Devanagari.</P>
        <Table
          label="OCR request fields"
          head={["Field", "Type", "Notes"]}
          minWidth={560}
          mono={[0, 1]}
          rows={[
            ["image", "string", "Base64 of one page, 100 to 7,000,000 characters."],
            ["mediaType", "enum", "image/png or image/jpeg."]
          ]}
        />
        <Code label="Response shape">{`{ "text": "<the transcription>", "meta": { "model", "cached", "ms", "inputTokens", "outputTokens", "costUsd" } }`}</Code>
        <P muted>Errors: 400 “Send one PNG or JPEG page as base64.”; 429 over 30 pages per minute per IP; 503 without a key or over the spend cap.</P>
      </Section>

      <Section id="mcp" title="POST /mcp (JSON-RPC)">
        <P>
          The remote MCP server: stateless Streamable HTTP, JSON responses, no session. Send <C>Content-Type: application/json</C> and{" "}
          <C>Accept: application/json, text/event-stream</C>. The connected client&apos;s model does the reading; these tools only verify quotes and
          apply the law, so no key is involved. Tools and their inputs are on <A href="/docs/mcp">MCP server</A>.
        </P>
        <H3 id="mcp-initialize">initialize</H3>
        <Code label="curl">{`curl -s ${SITE}/mcp -H 'content-type: application/json' -H 'accept: application/json, text/event-stream' \\
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"curl","version":"0"}}}'`}</Code>
        <Code label={`Response · ${init.status} (instructions shortened here)`} tall>
          {pretty(initShort)}
        </Code>
        <H3 id="mcp-list">tools/list</H3>
        <Code label="curl">{`curl -s ${SITE}/mcp -H 'content-type: application/json' -H 'accept: application/json, text/event-stream' \\
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'`}</Code>
        <P>
          Returns {toolNames.length} tools, each with its full JSON input schema and annotations (all read-only):{" "}
          {toolNames.map((t, i) => (
            <span key={t.name}>
              {i > 0 ? ", " : ""}
              <C>{t.name}</C>
            </span>
          ))}
          . The local file tools are never exposed here.
        </P>
        <H3 id="mcp-call">tools/call</H3>
        <Code label="curl">{`curl -s ${SITE}/mcp -H 'content-type: application/json' -H 'accept: application/json, text/event-stream' \\
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"lookup_section","arguments":{"act":"IPC","section":"379"}}}'`}</Code>
        <Code label={`Response · ${call.status}`}>{pretty(call.json)}</Code>
        <Code label={`Invalid arguments · ${bad.status}`}>{pretty(bad.json)}</Code>
        <P muted>
          Limits: {MAX_BODY_BYTES / 1_000_000} MB per request (413), {PER_MINUTE} requests per IP per minute (429), and bounded tool inputs:
          documents ≤ 120,000 characters, quotes ≤ 4,000, sweeps ≤ 50 orders.
        </P>
      </Section>
    </DocPage>
  );
}
