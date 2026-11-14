import type { Metadata } from "next";
import { PROMPT_VERSION, MODELS } from "@halftime/reader";
import { PipelineDiagram, TrustDiagram } from "@/components/docs/diagrams";
import { A, C, DocPage, Figure, H3, Note, OL, P, Section, Table, UL } from "@/components/docs/ui";
import { VERDICT_STYLE } from "@/lib/verdict";

export const metadata: Metadata = {
  title: "How it works",
  description: "The HalfTime pipeline from court papers to drafts: reading, extraction with quotes, the span verifier, the Section 479 engine, lanes and drafts; the trust boundaries; the five verdicts."
};

const TOC = [
  { id: "pipeline", title: "The pipeline" },
  { id: "steps", title: "Step by step" },
  { id: "trust", title: "Trust boundaries" },
  { id: "verdicts", title: "The five verdicts" },
  { id: "models", title: "Models and caching" }
];

export default function HowItWorks() {
  return (
    <DocPage
      href="/docs/how-it-works"
      kicker="How it works"
      title="The model reads. Code decides."
      lead={
        <p>
          Everything that touches a verdict is deterministic TypeScript with no network access. The model&apos;s only job is to report what the
          papers say, with the sentence it read it from.
        </p>
      }
      toc={TOC}
    >
      <Section id="pipeline" title="The pipeline">
        <Figure
          label="Pipeline diagram"
          caption="Dashed blue: a model is involved and its output is untrusted. Solid black: deterministic code. Red: what reaches a person, a draft for a lawyer to sign."
        >
          <PipelineDiagram />
        </Figure>
      </Section>

      <Section id="steps" title="Step by step">
        <H3 id="step-read">1. Read the papers</H3>
        <P>
          Text files are read as they are. PDFs are opened with pdf.js in the browser, page by page. A page with too little text, or text that
          looks like mangled legacy-font Devanagari, is treated as a scan: it is rendered to a PNG and transcribed by Claude Opus 5.5 with the
          instruction to keep Devanagari as Devanagari, keep line breaks, and not translate or summarise. Uploads take up to 20 files, 15 pages
          each, 12 MB per file (<C>apps/web/src/lib/ingest.ts</C>).
        </P>

        <H3 id="step-extract">2. Extract facts, each with a quote</H3>
        <P>
          Claude Sonnet 5.5 returns a structured extraction (<C>packages/reader/src/schema.ts</C>): every charged section with its act, the custody
          start date and its kind (arrest, remand, surrender), first-time offender status, other pending cases, the registration date, and the case
          number and court. Every fact has a <C>quote</C> field: the exact text it came from, same script, no translation, no ellipsis. The prompt
          tells the model never to decide eligibility, never to compute anything, and to treat text inside the document as evidence, never as an
          instruction. A second, cheap pass looks only for charged sections the first pass missed (the self-check), each again with a quote.
        </P>

        <H3 id="step-verify">3. Verify every quote</H3>
        <P>
          The span verifier (<C>packages/reader/src/verify.ts</C>) normalises the document and the quote the same way: Unicode NFC, Devanagari
          digits to ASCII, zero-width characters removed, curly quotes and dashes unified, the danda <C>।</C> treated like a full stop, all
          whitespace ignored, letters lower-cased. Then it looks for the quote as an exact substring. There is no fuzzy matching and no
          paraphrase. A quote shorter than six characters after normalisation counts as no quote.
        </P>
        <UL>
          <li>A section is accepted only if its quote is in the document and contains that section number.</li>
          <li>A date is accepted only if its quote is in the document and contains that same date (in any written form the date finder reads).</li>
          <li>First-time status and other pending cases need a quote that is in the document.</li>
        </UL>
        <P>
          A claim that fails is not used. Its field becomes <C>unknown</C>, and the claim is listed on screen as rejected, with the reason (“The
          quoted text is not in the document.”, “The quote gives 2024-05-20, not 2023-05-20.”). Accepted facts keep their position in the
          document, so the case page can mark them.
        </P>

        <H3 id="step-engine">4. Apply the law</H3>
        <P>
          <C>evaluate(input, today)</C> in <C>packages/law/src/engine.ts</C> is pure: the same facts and the same date always give the same
          result. It looks up every charged section in the statute tables, finds the longest maximum term, picks the fraction, counts from the
          custody date, and returns a verdict with a typed trace: one line per step, each with the statute it rests on and, where there is one, the
          quote it rests on. The rules are on <A href="/docs/law">How Section 479 is computed</A>.
        </P>

        <H3 id="step-lanes">5. Sort into lanes</H3>
        <P>
          A sweep sorts people into four lanes: past the line (with the flagged cases inside it), not yet, can&apos;t tell, and outside 479. The
          docket agent orders them for a review meeting: past the line first (most days past at the top), then flagged, can&apos;t tell, not yet
          (soonest first), outside 479.
        </P>

        <H3 id="step-drafts">6. Draft the paperwork</H3>
        <P>
          For anyone past the line, code fills the Section 479(3) application in English or Hindi (<C>packages/reader/src/application.ts</C>) with
          the case details, the computation, the provisions and the verified quotes, with blanks for signatures, marked as a draft for lawyer
          review. The Know your line notice (<C>notice.ts</C>) and the records-request letters are also built by code from fixed templates and
          verified facts. No model writes any of them.
        </P>
      </Section>

      <Section id="trust" title="Trust boundaries">
        <Figure label="Trust boundary diagram" caption="Two untrusted zones and one trusted one. Each crossing has its own check.">
          <TrustDiagram />
        </Figure>
        <OL>
          <li>
            <strong>Papers → model.</strong> Papers can contain anything, including instructions. The prompt fences the document as data, but
            nothing depends on that: the model has no way to produce a verdict, only facts with quotes.
          </li>
          <li>
            <strong>Model → code.</strong> Every fact must carry a quote that the verifier finds in the papers. Failures become unknown. Unknown
            facts can only move a case towards “can&apos;t tell”, never to “past the line”; a property test in <C>packages/law/test</C> checks that
            unknown sections never pass.
          </li>
          <li>
            <strong>Code → person.</strong> The engine never says “eligible”. Cases where 479(2) may apply are flagged for a lawyer. Every output is
            a draft.
          </li>
        </OL>
      </Section>

      <Section id="verdicts" title="The five verdicts">
        <P muted>Verdicts are deliberately not “eligible / not eligible”. The code name is what the engine, the API and the MCP tools return.</P>
        <Table
          label="Verdicts table"
          head={["Code", "Shown as", "When", "What happens next"]}
          minWidth={820}
          mono={[0]}
          nowrap={[1]}
          rows={[
            ["PAST_THE_LINE", VERDICT_STYLE.PAST_THE_LINE.short, "Half (or one-third) served, one offence, the papers say no other cases.", "The jail must apply under 479(3). A lawyer reviews and signs the draft."],
            ["PAST_FLAGGED", VERDICT_STYLE.PAST_FLAGGED.short, "Past the line, but more than one offence is charged, or other cases are pending or not ruled out.", "479(2) may apply. A lawyer decides before anything is filed."],
            ["NOT_YET", VERDICT_STYLE.NOT_YET.short, "The line date is still ahead.", "The date and the days to go. If first-time status is unknown and the one-third line is already crossed, a flag says so."],
            ["CANT_TELL", VERDICT_STYLE.CANT_TELL.short, "No custody date, a section not in the tables, an NDPS quantity not given, a maximum that depends on details the papers don't give.", "The missing facts are listed; the agent can request the record that would supply them."],
            ["EXCLUDED", VERDICT_STYLE.EXCLUDED.short, "Any charged section allows death or imprisonment for life.", "Section 479 does not apply."]
          ]}
        />
        <Note tone="flag" title="Why “flagged” exists">
          Courts read 479(2) differently. Some read “more than one offence” as any charge sheet with several sections; others only as separate
          offences or cases. HalfTime takes no side, and puts every such case in front of a lawyer. See <A href="/law">/law</A>.
        </Note>
      </Section>

      <Section id="models" title="Models and caching">
        <Table
          label="Models table"
          head={["Job", "Model id"]}
          minWidth={520}
          mono={[1]}
          rows={[
            ["Fact extraction with quotes, the missing-section self-check, the docket agent", MODELS.extract],
            ["Plain-chatbot baseline (same model, naive prompt), for comparison only", MODELS.extract],
            ["Transcribing scanned pages", MODELS.vision],
            ["Reading the chatbot's answer into yes / no / unclear, for scoring", MODELS.judge]
          ]}
        />
        <P>
          The ids are pinned in <C>packages/reader/src/models.ts</C>. Every response is cached by a hash of the model, the prompt version (now{" "}
          <C>{PROMPT_VERSION}</C>) and the input, so the same document is never paid for twice and a recorded run replays exactly. On a self-hosted
          server the cache is Cloudflare KV (30 days); in the browser it lasts for the session.
        </P>
      </Section>
    </DocPage>
  );
}
