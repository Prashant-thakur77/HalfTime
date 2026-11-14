import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  ACT_NAMES,
  IPC_TO_BNS,
  describeMonths,
  evaluate,
  humanDate,
  parseIsoDate,
  resolveSection,
  sectionLabel,
  type ActCode,
  type CaseInput,
  type Evaluation
} from "@halftime/law";
import { ACTS, EXTRACTION_SYSTEM, decide, type Extraction } from "@halftime/reader";
import { applicationText, type ApplicationData } from "@halftime/reader/application";
import samplesRaw from "../../../data/samples/samples.json" with { type: "json" };

export const SERVER_INFO = { name: "halftime", version: "1.0.0" };

export const INSTRUCTIONS = `HalfTime applies Section 479 of the Bharatiya Nagarik Suraksha Sanhita (BNSS) to Indian court papers: an undertrial who has served half the maximum sentence for the offence (one-third for a first-time offender) is to be released on bail, and the jail superintendent must apply (479(3)).

Division of labour: YOU read the papers and report facts, each with a verbatim quote. HALFTIME's code checks every quote against the document and applies the law. Never decide eligibility yourself; call check_order and report its verdict and trace.

Workflow for one order: get the text (read_order_file, get_sample_order, or the user's paste) → extract facts following the rules in check_order's description → call check_order → show the verdict, the rule trace and any rejected claims → offer draft_application when the verdict is PAST_THE_LINE or PAST_FLAGGED.
For many orders (a "jail sweep"), extract each and call sweep_jail once with all of them.

Verdicts: PAST_THE_LINE (jail must apply; a lawyer reviews and signs), PAST_FLAGGED (past the line but 479(2) may apply: more than one offence or other cases; a lawyer decides), NOT_YET (line date given), CANT_TELL (papers incomplete; missing facts listed), EXCLUDED (a charged offence allows life or death). Never describe a result as simply "eligible", and never promise release.`;

const tri = z.enum(["true", "false", "unknown"]);

/** A forgiving version of the extraction schema: only the facts the law needs are required. */
const ExtractionInput = z.object({
  sections: z
    .array(
      z.object({
        act: z.enum(ACTS).describe("IPC, BNS, NDPS, ARMS, POCSO, SCST, DOWRY, GAMBLING, IT, EXCISE, GANGSTERS or OTHER"),
        section: z.string().describe("Section as written, e.g. 379, 304-B, 25(1-b)(a), 3/25"),
        quote: z.string().describe("Verbatim text from the document naming this section as charged"),
        ndps_quantity: z.enum(["small", "intermediate", "commercial", "unknown"]).optional().describe("NDPS only")
      })
    )
    .describe("Every section the accused is charged under in THIS case"),
  custody_start: z.object({
    date: z.string().nullable().describe("YYYY-MM-DD, only if written"),
    kind: z.enum(["arrest", "remand", "surrender", "unknown"]).optional(),
    quote: z.string().nullable().describe("Verbatim sentence containing the date")
  }),
  first_time_offender: z.object({ value: tri, quote: z.string().nullable() }),
  other_pending_cases: z.object({ value: tri, quote: z.string().nullable() }),
  registered_on: z.object({ date: z.string().nullable(), quote: z.string().nullable() }).optional(),
  accused_name_masked: z.string().optional().describe("Initials only, e.g. R— K—"),
  case_no: z.string().nullable().optional(),
  court: z.string().nullable().optional()
});
type ExtractionInputT = z.infer<typeof ExtractionInput>;

function fullExtraction(e: ExtractionInputT): Extraction {
  return {
    sections: e.sections.map((s) => ({ ...s, ndps_quantity: s.ndps_quantity ?? "unknown" })),
    custody_start: { date: e.custody_start.date, kind: e.custody_start.kind ?? "unknown", quote: e.custody_start.quote },
    first_time_offender: e.first_time_offender,
    other_pending_cases: e.other_pending_cases,
    registered_on: e.registered_on ?? { date: null, quote: null },
    accused_name_masked: e.accused_name_masked ?? "the accused",
    case_no: e.case_no ?? null,
    court: e.court ?? null,
    order_date: null,
    language: "mixed",
    english_gloss: ""
  };
}

const Today = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional()
  .describe("Evaluate as of this date (YYYY-MM-DD). Defaults to today.");

const todayOr = (t?: string) => (t && parseIsoDate(t) ? t : new Date().toISOString().slice(0, 10));

const VERDICT_TEXT: Record<Evaluation["verdict"], string> = {
  PAST_THE_LINE: "PAST THE LINE: the jail superintendent must apply under Sec 479(3). A lawyer reviews and signs.",
  PAST_FLAGGED: "PAST THE LINE · FLAGGED: Sec 479(2) may apply (more than one offence, or other cases). A lawyer decides before applying.",
  NOT_YET: "NOT YET past the line.",
  CANT_TELL: "CAN'T TELL: the papers don't give enough to apply the law.",
  EXCLUDED: "OUTSIDE 479: a charged offence allows life imprisonment or death."
};

function fmt(iso: string | null) {
  return iso ? humanDate(parseIsoDate(iso)!) : "—";
}

function summarise(e: Evaluation): string {
  const lines = [VERDICT_TEXT[e.verdict]];
  if (e.maxTermMonths) lines.push(`Maximum term: ${describeMonths(e.maxTermMonths)} · fraction ${e.fraction} · line ${fmt(e.lineDate)}`);
  if (e.daysPast !== null) lines.push(`Past the line by ${e.daysPast} days (${e.daysDetained} days detained).`);
  if (e.daysToGo !== null) lines.push(`${e.daysToGo} days to the line.`);
  if (e.firstTimeLineDate && e.fraction === "1/2") lines.push(`If first-time status is confirmed, the line is ${fmt(e.firstTimeLineDate)}.`);
  if (e.missing.length) lines.push(`Missing: ${e.missing.join("; ")}.`);
  if (e.flags.length) lines.push(`For the lawyer: ${e.flags.join(" ")}`);
  lines.push("", "Rule trace (code, not the model):", ...e.trace.map((t, i) => `${String(i + 1).padStart(2, "0")}. ${t.text}${t.source ? `  [${t.source}]` : ""}`));
  return lines.join("\n");
}

const json = (v: unknown) => JSON.stringify(v, null, 2);
const text = (t: string) => ({ content: [{ type: "text" as const, text: t }] });

interface Sample {
  id: string;
  title: string;
  gloss: string;
  language: string;
  district?: string;
  text: string;
}
const SAMPLES = samplesRaw as unknown as Sample[];

export interface FileAccess {
  list(folder: string): Promise<{ path: string; bytes: number }[]>;
  read(path: string): Promise<string>;
  writeDocx(path: string, bytes: Uint8Array): Promise<string>;
}

/** Build the HalfTime MCP server. Pass `files` for a local server that can read and write on disk. */
export function createHalfTimeServer(opts: { files?: FileAccess } = {}): McpServer {
  const server = new McpServer(SERVER_INFO, { instructions: INSTRUCTIONS });

  server.registerTool(
    "check_order",
    {
      title: "Check one court order under Section 479",
      description: `Verify your extraction against the order's text and apply Section 479 BNSS with HalfTime's tested rules engine. Returns the verdict, the full rule trace, which of your claims were accepted (with where the quote sits) and which were REJECTED because the quote is not in the document or doesn't contain the claimed date or section.

How to extract (follow exactly):
${EXTRACTION_SYSTEM}`,
      inputSchema: { document_text: z.string().min(40).describe("The full text of the order, exactly as read"), extraction: ExtractionInput, today: Today },
      annotations: { readOnlyHint: true, openWorldHint: false }
    },
    async ({ document_text, extraction, today }) => {
      const t = todayOr(today);
      const r = decide(document_text, fullExtraction(extraction), t);
      const accepted = r.facts.spans.map((s) => `  ✓ ${s.label}: "${r.text.slice(s.start, s.end)}"`);
      const rejected = r.facts.rejected.map((x) => `  ✗ ${x.field} ${x.claim}: ${x.reason}${x.quote ? ` (quote given: "${x.quote}")` : ""}`);
      return text(
        [
          `As of ${fmt(t)}:`,
          summarise(r.evaluation),
          "",
          `Quotes verified in the document (${accepted.length}):`,
          ...accepted,
          ...(rejected.length ? ["", `Claims REJECTED by the verifier (${rejected.length}), treated as unknown:`, ...rejected] : []),
          "",
          "This is a screening result, not legal advice. A legal-aid lawyer must check it against the full court record."
        ].join("\n")
      );
    }
  );

  server.registerTool(
    "sweep_jail",
    {
      title: "Sweep many orders into lanes",
      description:
        "Run check_order on up to 50 orders at once and sort the people into lanes: past the line (jail must apply), past the line but flagged under 479(2), not yet, can't tell, outside 479. Returns a table and a CSV a District Legal Services Authority can act on. Extract each order exactly as described in check_order first.",
      inputSchema: {
        orders: z
          .array(z.object({ id: z.string().describe("File name or case number"), document_text: z.string().min(40), extraction: ExtractionInput }))
          .min(1)
          .max(50),
        today: Today
      },
      annotations: { readOnlyHint: true, openWorldHint: false }
    },
    async ({ orders, today }) => {
      const t = todayOr(today);
      const rows = orders.map((o) => {
        const r = decide(o.document_text, fullExtraction(o.extraction), t);
        return { id: o.id, name: o.extraction.accused_name_masked ?? "", e: r.evaluation, rejected: r.facts.rejected.length };
      });
      const lane = (v: Evaluation["verdict"]) => (v.startsWith("PAST") ? "Past the line" : v === "NOT_YET" ? "Not yet" : v === "CANT_TELL" ? "Can't tell" : "Outside 479");
      const order = ["PAST_THE_LINE", "PAST_FLAGGED", "NOT_YET", "CANT_TELL", "EXCLUDED"];
      rows.sort((a, b) => order.indexOf(a.e.verdict) - order.indexOf(b.e.verdict) || (b.e.daysPast ?? -1) - (a.e.daysPast ?? -1));
      const count = (v: string) => rows.filter((r) => r.e.verdict === v).length;
      const table = [
        "| Lane | Order | Accused | Sections | Line | Days past / to go | Notes |",
        "|---|---|---|---|---|---|---|",
        ...rows.map(
          (r) =>
            `| ${lane(r.e.verdict)}${r.e.verdict === "PAST_FLAGGED" ? " · flagged" : ""} | ${r.id} | ${r.name} | ${r.e.sections.filter((s) => s.found).map(sectionLabel).join(", ") || "—"} | ${fmt(r.e.lineDate)} | ${r.e.daysPast !== null ? `+${r.e.daysPast}` : r.e.daysToGo !== null ? `${r.e.daysToGo} to go` : "—"} | ${[...r.e.missing.map((m) => `missing: ${m}`), r.rejected ? `${r.rejected} claim(s) rejected` : ""].filter(Boolean).join("; ")} |`
        )
      ];
      const csv = [
        "id,accused,verdict,sections,max_term_months,fraction,line_date,days_past,days_to_go,flags,missing",
        ...rows.map((r) =>
          [r.id, r.name, r.e.verdict, r.e.sections.map(sectionLabel).join("; "), r.e.maxTermMonths, r.e.fraction, r.e.lineDate, r.e.daysPast, r.e.daysToGo, r.e.flags.join(" | "), r.e.missing.join(" | ")]
            .map((v) => {
              const s = v === null || v === undefined ? "" : String(v);
              return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
            })
            .join(",")
        )
      ].join("\n");
      return text(
        [
          `Jail sweep as of ${fmt(t)}: ${rows.length} people.`,
          `Past the line: ${count("PAST_THE_LINE")} (jail must apply) + ${count("PAST_FLAGGED")} flagged under 479(2) · Not yet: ${count("NOT_YET")} · Can't tell: ${count("CANT_TELL")} · Outside 479: ${count("EXCLUDED")}`,
          "",
          ...table,
          "",
          "CSV:",
          "```csv",
          csv,
          "```"
        ].join("\n")
      );
    }
  );

  server.registerTool(
    "apply_section_479",
    {
      title: "Apply Section 479 to typed-in facts",
      description:
        "For a lawyer who already knows the facts: apply Section 479 BNSS directly, without a document. Use check_order instead when you have the order's text, so every fact is verified.",
      inputSchema: {
        sections: z.array(z.object({ act: z.enum(ACTS), section: z.string(), ndps_quantity: z.enum(["small", "intermediate", "commercial", "unknown"]).optional() })).min(1),
        custody_start: z.string().nullable().describe("YYYY-MM-DD"),
        first_time_offender: tri,
        other_pending_cases: tri,
        accused_delay_days: z.number().int().min(0).optional().describe("Days of delay caused by the accused (excluded from detention)"),
        registered_on: z.string().nullable().optional(),
        max_term_override_months: z.number().int().positive().optional().describe("A maximum term entered by the lawyer when the tables can't decide"),
        today: Today
      },
      annotations: { readOnlyHint: true, openWorldHint: false }
    },
    async (a) => {
      const input: CaseInput = {
        sections: a.sections.map((s) => ({ act: s.act as ActCode, section: s.section, ...(s.ndps_quantity ? { quantity: s.ndps_quantity } : {}) })),
        custodyStart: a.custody_start,
        firstTimeOffender: a.first_time_offender,
        otherPendingCases: a.other_pending_cases,
        accusedDelayDays: a.accused_delay_days,
        registeredOn: a.registered_on ?? null,
        maxTermOverrideMonths: a.max_term_override_months ?? null
      };
      const t = todayOr(a.today);
      return text(`As of ${fmt(t)}:\n${summarise(evaluate(input, t))}`);
    }
  );

  server.registerTool(
    "lookup_section",
    {
      title: "Look up a section's maximum punishment",
      description: "Maximum punishment for a section of the IPC, BNS or a common special act, from HalfTime's statute tables (each row cites its source), plus the IPC→BNS mapping.",
      inputSchema: { act: z.enum(ACTS), section: z.string() },
      annotations: { readOnlyHint: true, openWorldHint: false }
    },
    async ({ act, section }) => {
      const r = resolveSection({ act: act as ActCode, section });
      const map = act === "IPC" ? IPC_TO_BNS.find((m) => m.ipc === r.canonical) : undefined;
      const p = r.punishment;
      const max = !r.found
        ? "not in HalfTime's tables"
        : p!.kind === "term"
          ? `up to ${describeMonths(p!.months!)}`
          : p!.kind === "life"
            ? "up to imprisonment for life (outside Sec 479)"
            : p!.kind === "death"
              ? "death is a possible punishment (outside Sec 479)"
              : p!.kind;
      return text(
        [
          `${sectionLabel(r)}${r.title ? ` · ${r.title}` : ""}`,
          `Act: ${ACT_NAMES[act as ActCode]}`,
          `Maximum: ${max}`,
          ...(r.note ? [`Note: ${r.note}`] : []),
          ...(r.source ? [`Source: ${r.source}`] : []),
          ...(map ? [`BNS equivalent: ${map.bns.join(", ") || "none"} (${map.relation})${map.note ? `. ${map.note}` : ""}`] : [])
        ].join("\n")
      );
    }
  );

  server.registerTool(
    "draft_application",
    {
      title: "Draft the Section 479(3) application",
      description: `Draft the jail superintendent's application under Section 479(3) BNSS for one order, in English or Hindi, pre-filled with the case details, the computation, the provisions and the verified quotes, with blanks for signatures and marked "Draft for lawyer review".${opts.files ? " Pass save_to (a .docx path) to also write a Word file." : ""} Extract exactly as described in check_order.`,
      inputSchema: {
        document_text: z.string().min(40),
        extraction: ExtractionInput,
        language: z.enum(["en", "hi"]).default("en"),
        today: Today,
        ...(opts.files ? { save_to: z.string().optional().describe("Absolute path ending in .docx") } : {})
      },
      annotations: { readOnlyHint: !opts.files, openWorldHint: false }
    },
    async (a) => {
      const t = todayOr(a.today);
      const ex = fullExtraction(a.extraction);
      const r = decide(a.document_text, ex, t);
      const data: ApplicationData = {
        lang: a.language,
        court: ex.court,
        caseNo: ex.case_no,
        accused: ex.accused_name_masked,
        today: t,
        evaluation: r.evaluation,
        quotes: r.facts.spans.map((s) => ({ label: s.label, text: r.text.slice(s.start, s.end) }))
      };
      const notPast = !r.evaluation.verdict.startsWith("PAST");
      const head = notPast ? `Note: the verdict is ${r.evaluation.verdict}, so no application is due yet. Draft shown for review only.\n\n` : "";
      let saved = "";
      const saveTo = (a as { save_to?: string }).save_to;
      if (opts.files && saveTo) {
        const { applicationDocxBytes } = await import("@halftime/reader/application");
        saved = `\n\nSaved Word file: ${await opts.files.writeDocx(saveTo, await applicationDocxBytes(data))}`;
      }
      return text(head + applicationText(data) + saved);
    }
  );

  server.registerTool(
    "list_sample_orders",
    {
      title: "List sample orders",
      description: "HalfTime's 12 constructed sample bail orders (Hindi and English, names masked, not real cases), for trying the tools without your own papers.",
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: false }
    },
    async () => text(SAMPLES.map((s) => `${s.id} · ${s.language === "hi" ? "Hindi" : "English"} · ${s.title}\n   ${s.gloss}`).join("\n"))
  );

  server.registerTool(
    "get_sample_order",
    {
      title: "Get a sample order's text",
      description: "The full text of one constructed sample order (see list_sample_orders). Constructed for testing; not a real case.",
      inputSchema: { id: z.string().describe("S01 … S12") },
      annotations: { readOnlyHint: true, openWorldHint: false }
    },
    async ({ id }) => {
      const s = SAMPLES.find((x) => x.id.toLowerCase() === id.trim().toLowerCase());
      if (!s) return { ...text(`No sample "${id}". Use list_sample_orders.`), isError: true };
      return text(`${s.id} · ${s.title} (constructed sample, not a real case)\n\n${s.text}`);
    }
  );

  if (opts.files) {
    const files = opts.files;
    server.registerTool(
      "list_order_files",
      {
        title: "List court papers in a folder",
        description: "List the .pdf, .txt, .png and .jpg files in a folder of court papers (a jail's bundle).",
        inputSchema: { folder: z.string().describe("Absolute path") },
        annotations: { readOnlyHint: true, openWorldHint: false }
      },
      async ({ folder }) => {
        const list = await files.list(folder);
        return text(list.length ? list.map((f) => `${f.path} (${Math.round(f.bytes / 1024)} KB)`).join("\n") : "No court papers found there.");
      }
    );
    server.registerTool(
      "read_order_file",
      {
        title: "Read a court order file",
        description: "Read a .txt or text-layer .pdf court order into text. For scanned PDFs or images, it says so; read the image yourself and pass the transcription to check_order.",
        inputSchema: { path: z.string().describe("Absolute path") },
        annotations: { readOnlyHint: true, openWorldHint: false }
      },
      async ({ path }) => text(await files.read(path))
    );
  }

  server.registerPrompt(
    "sweep_jail",
    {
      title: "Sweep a jail's court papers",
      description: "Read every order in a folder (or the sample tray), check each under Section 479 and report the lanes.",
      argsSchema: { folder: z.string().optional().describe("Folder of court papers; leave empty to use the 12 sample orders") }
    },
    ({ folder }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Run a HalfTime jail sweep${folder ? ` on the court papers in ${folder}` : " on the 12 sample orders"}.
1. ${folder ? "List the files with list_order_files and read each with read_order_file." : "List them with list_sample_orders and read each with get_sample_order."}
2. For each order, extract the facts exactly as check_order's description says: every charged section, the custody start date, first-time status and other pending cases, each with a verbatim quote.
3. Call sweep_jail once with all orders.
4. Show the lanes table. For anyone past the line, say the jail must apply under Sec 479(3) and a lawyer reviews and signs; for flagged cases, say why. Mention any claims the verifier rejected.
Do not decide eligibility yourself; report HalfTime's results.`
          }
        }
      ]
    })
  );

  return server;
}
