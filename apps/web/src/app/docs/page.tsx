import type { Metadata } from "next";
import Link from "next/link";
import { A, C, Code, DocPage, H3, Note, OL, P, Section, Table, UL } from "@/components/docs/ui";
import { DOCS, REPO, SITE, VIDEO } from "@/lib/docs/nav";

export const metadata: Metadata = {
  title: "Docs",
  description: "HalfTime documentation: what it does, quick starts for lawyers, jail staff, developers and Claude users, and a five-minute guide for reviewing the project."
};

const TOC = [
  { id: "what", title: "What HalfTime is" },
  { id: "roles", title: "Quick start by role" },
  { id: "review", title: "Five-minute review" },
  { id: "pages", title: "The site, page by page" },
  { id: "repo", title: "The repository" },
  { id: "index", title: "All docs pages" }
];

const PAGES: [string, string][] = [
  ["/", "The problem, the register of undertrials, the Ledger of Days, the twelve sample files and how it works."],
  ["/sweep", "Sweep the sample jail or your own papers into lanes; CSV, the jail pack (.zip) and a “what if today is…” slider."],
  ["/agent", "The docket agent: the recorded run replayed step by step, the priority docket, and a run on your own papers."],
  ["/case/S01", "One person: the order with every quote marked, editable facts, the rule trace, the 479(3) draft and the Know your line notice."],
  ["/playground", "Try the span verifier on any quote and the law engine on any facts, in the browser."],
  ["/vs-chatbot", "The same model asked plainly, beside HalfTime, on every sample."],
  ["/results", "The evaluation, every miss, and the real-judgment benchmark."],
  ["/law", "Section 479 in plain words, with the tables and their sources."],
  ["/story", "Why it exists: the numbers, the law over time, who it is for."],
  ["/connect", "Add HalfTime to claude.ai, Claude Desktop or Claude Code."],
  ["/status", "Live checks of the health self-test, the MCP endpoint and every main page."]
];

export default function DocsHome() {
  return (
    <DocPage
      href="/docs"
      kicker="Documentation"
      title="HalfTime docs"
      lead={
        <p>
          HalfTime reads a jail&apos;s court papers, finds every undertrial who has already served the Section 479 share of their sentence, shows its
          working, and drafts the application a legal-aid lawyer signs. These pages explain how it does that, and how to check it.
        </p>
      }
      toc={TOC}
    >
      <Section id="what" title="What HalfTime is">
        <P>
          Section 479 of the Bharatiya Nagarik Suraksha Sanhita (BNSS) says that an undertrial who has been in custody for half the maximum sentence
          for the offence (one-third for a first-time offender) is to be released on bail, and that the jail superintendent must apply to the court
          (479(3)). The arithmetic is simple. The facts it needs are written in court papers, often in Hindi, often scanned, one file per person.
        </P>
        <P>
          HalfTime splits the job along one line: <strong>the model reads, code decides.</strong> Claude reports what the papers say, and every fact
          must carry the exact sentence it came from. Code checks each quote against the papers, drops anything it cannot find, and a tested rules
          engine applies the law to what is left. The output is a lane, a rule trace and a draft. It never says “eligible”, and a lawyer signs
          everything.
        </P>
        <UL>
          <li>
            Live site: <A href={SITE}>{SITE.replace("https://", "")}</A>
          </li>
          <li>
            MCP endpoint: <C>{`${SITE}/mcp`}</C>
          </li>
          <li>
            Source: <A href={REPO}>{REPO.replace("https://", "")}</A> (MIT licence)
          </li>
          <li>
            Demo video: <A href={VIDEO}>{VIDEO.replace("https://", "")}</A>
          </li>
        </UL>
      </Section>

      <Section id="roles" title="Quick start by role">
        <H3 id="role-lawyer">Legal-aid lawyer</H3>
        <OL>
          <li>
            Open <A href="/sweep">/sweep</A>. The twelve constructed sample orders are sorted into lanes; or add your own papers (text PDFs are read in
            your browser; reading needs your own Anthropic key, see <A href="/docs/security">Security</A>).
          </li>
          <li>
            Open a case, for example <A href="/case/S01">/case/S01</A>. Every fact is marked in the order. Facts the verifier rejected are listed
            separately. You can edit facts, such as days of delay caused by the accused, and the verdict is recomputed.
          </li>
          <li>
            For anyone past the line, download the 479(3) application in English or Hindi (DOCX, or print to PDF). It is marked as a draft for your
            review. Flagged cases need your judgement on 479(2) first.
          </li>
          <li>The Know your line notice on each case page is a one-page explanation for the undertrial or the family, in Hindi or English.</li>
        </OL>

        <H3 id="role-jail">Jail superintendent or DLSA secretary</H3>
        <OL>
          <li>
            On <A href="/sweep">/sweep</A>, sweep the papers and download the <strong>jail pack</strong>: one ZIP with the docket in priority order
            (CSV and a printable report), every 479(3) draft in English and Hindi, a records-request letter for every “can&apos;t tell” case, and a
            notice for every person.
          </li>
          <li>Use the “what if today is…” slider to see who crosses the line before the next review meeting.</li>
          <li>
            The <A href="/agent">docket agent</A> does the same sweep as a tool-using agent and asks for missing records itself. See{" "}
            <A href="/docs/agent">The docket agent</A>.
          </li>
        </OL>

        <H3 id="role-dev">Developer</H3>
        <Code label="Run it locally">{`git clone ${REPO}
cd HalfTime
pnpm install
pnpm test                      # law engine, reader, agent, MCP server, web routes
pnpm --filter web dev          # http://localhost:3000`}</Code>
        <P>
          Then read <A href="/docs/how-it-works">How it works</A>, the <A href="/docs/api">HTTP API</A> and{" "}
          <A href="/docs/self-host">Self-hosting</A>. The law engine (<C>packages/law</C>) is pure TypeScript with no I/O and can be used on its own.
        </P>

        <H3 id="role-claude">Claude user</H3>
        <P>
          Add a custom connector in claude.ai or Claude Desktop with the URL <C>{`${SITE}/mcp`}</C>, or in Claude Code:
        </P>
        <Code label="Claude Code">{`claude mcp add --transport http halftime ${SITE}/mcp`}</Code>
        <P>
          Then ask, for example, “Use halftime to sweep the 12 sample orders and show me the lanes.” No API key is involved: the Claude you are
          talking to reads the papers, and HalfTime&apos;s tools check the quotes and apply the law. Details in <A href="/docs/mcp">MCP server</A>.
        </P>
      </Section>

      <Section id="review" title="Five-minute review">
        <P muted>For anyone assessing the project. Each step names what to open and what to look for.</P>
        <Table
          label="Review steps"
          head={["Open", "Look for"]}
          minWidth={600}
          rows={[
            [<A key="1" href="/sweep">/sweep</A>, "Twelve orders in lanes. The flagged lane: past the line, but more than one offence or other cases, so a lawyer decides. Nothing says “eligible”."],
            [<A key="2" href="/case/S01">/case/S01</A>, "The Hindi order with each quote marked, the rule trace with statute sources, and the two flags. Change a fact and watch the verdict move."],
            [<A key="3" href="/playground">/playground</A>, "Paste a quote that is not in the order, or change one digit of a date: the verifier rejects it."],
            [<A key="4" href="/agent">/agent</A>, "The recorded agent run: a quote rejected with the verifier's reason, then fixed on retry; records requested; drafts only for past-the-line cases."],
            [<A key="5" href="/results">/results</A>, "The constructed-data notice, every number, and every miss listed in full."],
            [<A key="6" href="/status">/status</A>, "The health self-test, the MCP endpoint and every main page, checked from your browser."]
          ]}
        />
        <P>Then, from a clone of the repository (no key, no network for the second command):</P>
        <Code label="Terminal">{`pnpm install && pnpm test     # every unit test
pnpm eval:offline              # replays the recorded model responses; must equal eval/report.json`}</Code>
        <P>And against the live site:</P>
        <Code label="curl">{`curl -s ${SITE}/api/health
curl -s ${SITE}/mcp -H 'content-type: application/json' \\
  -H 'accept: application/json, text/event-stream' \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`}</Code>
        <Note title="What to check">
          <ul className="list-disc space-y-1 pl-5">
            <li>Every fact on a case page has a quote that can be found in the order.</li>
            <li>A missing or rejected fact leads to “can&apos;t tell”, never to “past the line”.</li>
            <li>Multi-offence cases are flagged, not decided.</li>
            <li>
              <C>pnpm eval:offline</C> exits cleanly, so the published numbers come from the committed code and recordings.
            </li>
          </ul>
        </Note>
      </Section>

      <Section id="pages" title="The site, page by page">
        <Table
          label="Site pages"
          head={["Page", "What it does"]}
          minWidth={560}
          mono={[0]}
          rows={PAGES.map(([p, d]) => [
            <Link key={p} href={p} className="text-carbon underline decoration-carbon-soft underline-offset-[3px] hover:bg-mark">
              {p}
            </Link>,
            d
          ])}
        />
      </Section>

      <Section id="repo" title="The repository">
        <Table
          label="Repository layout"
          head={["Path", "What it holds"]}
          minWidth={560}
          mono={[0]}
          rows={[
            ["packages/law", "The Section 479 engine, the IPC, BNS and special-act tables, and the IPC→BNS map. No I/O."],
            ["packages/reader", "Date normaliser (Hindi and English), span verifier, extraction schema and prompts, the Claude client, the regex baseline, 479(3) drafts, the Know your line notice, the docket agent."],
            ["packages/mcp", "The MCP server: stdio for Claude Desktop and Claude Code; the same tools over Streamable HTTP at /mcp."],
            ["apps/web", "The Next.js 15 site and API, deployed on Cloudflare Workers through OpenNext."],
            ["eval/", "The constructed test set and its generator, the evaluation runner, the report, recorded responses for offline replay, and the InLegalNER benchmark."],
            ["data/samples, data/demo-jail", "The twelve constructed sample orders; five of them as .txt files for the MCP folder sweep."],
            ["scripts/", "Builders for facts.json, the sample pre-runs and the agent run, and checks."]
          ]}
        />
      </Section>

      <Section id="index" title="All docs pages">
        <ul className="divide-y divide-[var(--rule)] border-y border-ink">
          {DOCS.filter((d) => d.href !== "/docs").map((d) => (
            <li key={d.href} className="grid gap-1 py-3 md:grid-cols-[15rem_1fr]">
              <Link href={d.href} className="font-sans font-[700] text-carbon underline decoration-carbon-soft underline-offset-[3px] hover:bg-mark">
                {d.title}
              </Link>
              <p className="text-[0.95rem] text-ink-2">{d.summary}</p>
            </li>
          ))}
        </ul>
      </Section>
    </DocPage>
  );
}
