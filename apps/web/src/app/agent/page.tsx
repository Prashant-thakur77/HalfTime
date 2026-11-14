import type { Metadata } from "next";
import Link from "next/link";
import { humanDate, parseIsoDate } from "@halftime/law";
import type { AgentRun } from "@halftime/reader/agent";
import { AgentReplay } from "@/components/agent/AgentReplay";
import { DocketTable, StatTiles } from "@/components/agent/DocketTable";
import { RunYourOwn } from "@/components/agent/RunYourOwn";
import runRaw from "@/data/agent-run.json";

export const metadata: Metadata = {
  title: "The docket agent",
  description:
    "An agent reads every order in a jail's docket with seven tools. Code checks every quote, sends rejected quotes back with the reason, applies Section 479, and builds the priority docket."
};

const RUN = runRaw as unknown as AgentRun & { label: string; ranOn: string };

const RAILS = [
  ["Verdicts come only from code", "submit_facts runs the span verifier and the rules engine. Extra fields such as a “verdict” are stripped before code sees them."],
  ["Every fact needs a quote", "A quote that isn't in the document, or doesn't contain the date or section, is rejected with the reason and treated as unknown."],
  ["Retries are capped", "Two resubmissions per file. After that, an unverified fact stays unknown and the person lands in “can't tell”."],
  ["Records and drafts are gated", "A records request is refused unless the verified facts lack what it would supply; a 479(3) draft is refused unless code says past the line."],
  ["The loop is bounded", "A step limit, a spend cap, and unknown file ids or tools refused. Text inside a document is fenced as data."]
] as const;

export default function AgentPage() {
  const s = RUN.stats;
  return (
    <div className="mx-auto max-w-[var(--max)] px-[var(--gutter)] pt-10 pb-16">
      <header className="grid gap-6 border-b border-ink pb-8 md:grid-cols-12 md:items-end">
        <div className="md:col-span-7">
          <p className="caps text-ink-3">Agentic sweep · Claude Sonnet 5.5 · seven tools</p>
          <h1 className="mt-3 font-sans text-[length:var(--step-4)] leading-[0.95] font-[750] tracking-[-0.02em] [font-stretch:88%]">
            The docket agent.
            <br />
            <span className="text-carbon">It reads. Code checks and decides.</span>
          </h1>
        </div>
        <p className="max-w-[38rem] text-[1.02rem] leading-relaxed text-ink-2 md:col-span-5">
          Give it a jail&apos;s stack of court orders and the agent reads every file, then reports the facts with the words it read them from. Code
          checks every quote against the papers. A quote that isn&apos;t there goes back to the agent with the verifier&apos;s reason, and it can try
          again with the exact words. Where the papers fall short it asks for the missing record; where code finds a person past the line it drafts
          the 479(3) application. Then code, not the agent, builds the docket in order of who needs a lawyer first.
        </p>
      </header>

      <section aria-labelledby="rails-h" className="mt-8">
        <h2 id="rails-h" className="caps text-ink-3">
          Guard rails, enforced in code and tested
        </h2>
        <ol className="mt-3 grid gap-px border border-ink bg-ink sm:grid-cols-2 lg:grid-cols-5">
          {RAILS.map(([t, d], i) => (
            <li key={t} className="bg-paper p-4">
              <span className="font-mono text-[0.72rem] text-ink-3">{String(i + 1).padStart(2, "0")}</span>
              <p className="mt-1 font-sans text-[0.98rem] leading-snug font-[700]">{t}</p>
              <p className="mt-1 text-[0.84rem] leading-snug text-ink-2">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="replay-h" className="mt-14">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h2 id="replay-h" className="font-sans text-[length:var(--step-3)] font-[750] [font-stretch:88%]">
            The run, step by step
          </h2>
          <p className="font-mono text-[0.78rem] text-ink-2">
            {RUN.label.toLowerCase().replace(/^recorded/, "Recorded")} · as of {humanDate(parseIsoDate(RUN.today)!)}
          </p>
        </div>
        <p className="mt-2 mb-5 max-w-3xl text-[0.95rem] text-ink-2">
          This is a real run of the agent, recorded and replayed from its saved responses. Each line is one model turn or one tool call. Red lines are
          claims the verifier rejected; green lines are the same claims fixed with an exact quote.
        </p>
        <AgentReplay events={RUN.events} resultId="docket-h" />
      </section>

      <section aria-labelledby="docket-h" className="mt-14">
        <h2 id="docket-h" tabIndex={-1} className="scroll-mt-28 font-sans text-[length:var(--step-3)] font-[750] [font-stretch:88%] focus:outline-none focus-visible:outline">
          The docket, in priority order
        </h2>
        <p className="mt-2 mb-5 max-w-3xl text-[0.95rem] text-ink-2">
          Built by code from verified facts only: past the line first (most days past at the top), then past the line but flagged under 479(2), then
          can&apos;t tell (records requested first), then not yet (soonest first), then outside 479. Open a file to see the papers, the marked quotes
          and the rule trace.
        </p>
        <DocketTable docket={RUN.docket} linkCases caption={`Docket for the ${s.files} constructed sample orders, in priority order`} />
      </section>

      <section aria-labelledby="stats-h" className="mt-14">
        <h2 id="stats-h" className="font-sans text-[length:var(--step-3)] font-[750] [font-stretch:88%]">
          The run in numbers
        </h2>
        <p className="mt-2 mb-5 max-w-3xl text-[0.95rem] text-ink-2">
          {s.steps} model turns on {s.model === "claude-sonnet-5-5" ? "Claude Sonnet 5.5" : s.model}, with prompt caching on the growing conversation. Recorded on{" "}
          {humanDate(parseIsoDate(RUN.ranOn)!)}. The single-pass{" "}
          <Link href="/sweep" className="text-carbon underline underline-offset-2">
            sweep
          </Link>{" "}
          reads the same papers without an agent.
        </p>
        <StatTiles stats={s} />
      </section>

      <section aria-labelledby="own-h" className="mt-16 grid gap-6 border-t border-ink pt-8 md:grid-cols-12">
        <div className="md:col-span-4">
          <h2 id="own-h" className="font-sans text-[length:var(--step-2)] font-[700] [font-stretch:92%]">
            Run it on your papers
          </h2>
          <p className="mt-2 text-[0.92rem] text-ink-2">
            The same agent runs in this browser with your own Anthropic key. Your papers and your key go from this browser straight to Anthropic; our
            server never sees either. A run on ten orders costs roughly what the one above did, and is capped at one dollar.
          </p>
        </div>
        <div className="md:col-span-8">
          <RunYourOwn />
        </div>
      </section>
    </div>
  );
}
