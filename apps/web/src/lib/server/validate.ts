import { z } from "zod";

export const MAX_TEXT = 60_000;

export const ExtractRequest = z.object({
  text: z.string().min(40, "The document has too little text to read.").max(MAX_TEXT, "The document is too long (max 60,000 characters)."),
  today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});

export const OcrRequest = z.object({
  image: z.string().min(100).max(7_000_000),
  mediaType: z.enum(["image/png", "image/jpeg"])
});

export const BaselineRequest = z.object({ text: z.string().min(40).max(MAX_TEXT) });

const tri = z.enum(["true", "false", "unknown"]);
export const RulesRequest = z.object({
  today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  input: z.object({
    sections: z
      .array(
        z.object({
          act: z.enum(["IPC", "BNS", "NDPS", "ARMS", "POCSO", "SCST", "DOWRY", "GAMBLING", "IT", "EXCISE", "GANGSTERS", "OTHER"]),
          section: z.string().max(40),
          quantity: z.enum(["small", "intermediate", "commercial", "unknown"]).optional(),
          spanId: z.number().int().optional()
        })
      )
      .max(40),
    custodyStart: z.string().nullable(),
    custodySpanId: z.number().int().optional(),
    firstTimeOffender: tri,
    otherPendingCases: tri,
    accusedDelayDays: z.number().min(0).max(10000).optional(),
    registeredOn: z.string().nullable().optional(),
    maxTermOverrideMonths: z.number().positive().max(1200).nullable().optional()
  })
});
