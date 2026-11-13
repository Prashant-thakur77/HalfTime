import { z } from "zod";

export const ACTS = ["IPC", "BNS", "NDPS", "ARMS", "POCSO", "SCST", "DOWRY", "GAMBLING", "IT", "EXCISE", "GANGSTERS", "OTHER"] as const;
const tri = z.enum(["true", "false", "unknown"]);

/** What the model returns. Every fact carries the verbatim text it came from. */
export const ExtractionSchema = z.object({
  sections: z
    .array(
      z.object({
        act: z.enum(ACTS),
        section: z.string().describe("Section number as written, e.g. 379, 304-B, 25(1-b)(a), 3/25"),
        quote: z.string().describe("Verbatim text from the document that names this section as charged"),
        ndps_quantity: z.enum(["small", "intermediate", "commercial", "unknown"]).describe("NDPS only; otherwise unknown")
      })
    )
    .describe("Every section the accused is charged under in this case. Not sections mentioned only as not applicable, or from other cases."),
  custody_start: z.object({
    date: z.string().nullable().describe("YYYY-MM-DD, only if written in the document"),
    kind: z.enum(["arrest", "remand", "surrender", "unknown"]),
    quote: z.string().nullable()
  }),
  first_time_offender: z.object({ value: tri, quote: z.string().nullable() }),
  other_pending_cases: z.object({ value: tri, quote: z.string().nullable() }),
  registered_on: z.object({ date: z.string().nullable().describe("FIR / crime registration date, YYYY-MM-DD"), quote: z.string().nullable() }),
  accused_name_masked: z.string().describe("Initials only, e.g. R— K—"),
  case_no: z.string().nullable(),
  court: z.string().nullable(),
  order_date: z.string().nullable(),
  language: z.enum(["hi", "en", "mixed"]),
  english_gloss: z.string().describe("One plain-English sentence on what the order is about, without names")
});

export type Extraction = z.infer<typeof ExtractionSchema>;

/** The plain chatbot's answer, parsed loosely from its one paragraph. */
export interface BaselineAnswer {
  text: string;
  saysEligible: boolean | null;
  date: string | null;
}
