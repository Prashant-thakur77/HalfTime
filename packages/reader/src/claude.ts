import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { MemoryCache, hashKey, type ResponseCache } from "./cache.js";
import { MODELS, PRICES } from "./models.js";
import { BASELINE_PROMPT, EXTRACTION_SYSTEM, OCR_PROMPT, PROMPT_VERSION, SELF_CHECK_SYSTEM } from "./prompts.js";
import { ACTS, ExtractionSchema, type BaselineAnswer, type Extraction } from "./schema.js";
import { findDates } from "./normalize.js";

const BETAS = ["server-side-fallback-2026-07-01"];

export interface CallMeta {
  model: string;
  cached: boolean;
  ms: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export interface ClaudeReaderOptions {
  apiKey?: string;
  cache?: ResponseCache;
  /** Effort for extraction calls. */
  effort?: "low" | "medium" | "high";
  /** Added to cache keys so repeat eval runs call the model again instead of reading the cache. */
  cacheSalt?: string;
}

function cost(model: string, inTok: number, outTok: number): number {
  const p = PRICES[model] ?? { input: 0, output: 0 };
  return (inTok * p.input + outTok * p.output) / 1e6;
}

const JudgeSchema = z.object({
  verdict: z.enum(["eligible_now", "not_eligible", "unclear"]),
  date: z.string().nullable().describe("The date the answer says eligibility starts or started, YYYY-MM-DD, or null")
});

const SelfCheckSchema = z.object({
  missing: z.array(z.object({ act: z.enum(ACTS), section: z.string(), quote: z.string() }))
});

export class ModelRefusalError extends Error {}

/**
 * The only place the app talks to Claude. Every response is cached by a hash of
 * (model, prompt version, input), so a document is never paid for twice.
 */
export class ClaudeReader {
  private client: Anthropic;
  private cache: ResponseCache;
  private effort: "low" | "medium" | "high";
  private salt: string;

  constructor(opts: ClaudeReaderOptions = {}) {
    this.salt = opts.cacheSalt ?? "";
    this.client = new Anthropic(opts.apiKey ? { apiKey: opts.apiKey } : {});
    this.cache = opts.cache ?? new MemoryCache();
    this.effort = opts.effort ?? "medium";
  }

  private async cached<T>(key: string, run: () => Promise<{ value: T; meta: Omit<CallMeta, "cached"> }>): Promise<{ value: T; meta: CallMeta }> {
    const hit = await this.cache.get(key);
    if (hit) {
      const parsed = JSON.parse(hit) as { value: T; meta: Omit<CallMeta, "cached"> };
      return { value: parsed.value, meta: { ...parsed.meta, cached: true, ms: 0 } };
    }
    const fresh = await run();
    await this.cache.set(key, JSON.stringify(fresh));
    return { value: fresh.value, meta: { ...fresh.meta, cached: false } };
  }

  /** Read one document into facts with verbatim quotes. */
  async extract(text: string): Promise<{ value: Extraction; meta: CallMeta }> {
    const model = MODELS.extract;
    const key = await hashKey("extract", model, PROMPT_VERSION, this.effort, this.salt, text);
    return this.cached(key, async () => {
      const t0 = Date.now();
      const msg = await this.client.beta.messages.parse({
        model,
        max_tokens: 16000,
        betas: BETAS,
        fallbacks: "default",
        system: EXTRACTION_SYSTEM,
        output_config: { effort: this.effort, format: betaZodOutputFormat(ExtractionSchema) },
        messages: [{ role: "user", content: `<document>\n${text}\n</document>\n\nExtract the facts from this document.` }]
      });
      if (msg.stop_reason === "refusal" || !msg.parsed_output) throw new ModelRefusalError(`Extraction failed: ${msg.stop_reason}`);
      const u = msg.usage;
      return {
        value: msg.parsed_output,
        meta: { model: msg.model, ms: Date.now() - t0, inputTokens: u.input_tokens, outputTokens: u.output_tokens, costUsd: cost(model, u.input_tokens, u.output_tokens) }
      };
    });
  }

  /** A second, cheap pass that only looks for charged sections the first pass missed. */
  async selfCheck(text: string, found: Extraction["sections"]): Promise<{ value: Extraction["sections"]; meta: CallMeta }> {
    const model = MODELS.extract;
    const list = found.map((s) => `${s.act} ${s.section}`).join(", ") || "(none)";
    const key = await hashKey("selfcheck", model, PROMPT_VERSION, this.salt, text, list);
    return this.cached(key, async () => {
      const t0 = Date.now();
      const msg = await this.client.beta.messages.parse({
        model,
        max_tokens: 4000,
        betas: BETAS,
        fallbacks: "default",
        system: SELF_CHECK_SYSTEM,
        output_config: { effort: "low", format: betaZodOutputFormat(SelfCheckSchema) },
        messages: [{ role: "user", content: `<document>\n${text}\n</document>\n\nSections already found: ${list}\n\nIs any charged section missing?` }]
      });
      const missing = (msg.parsed_output?.missing ?? []).map((m) => ({ ...m, ndps_quantity: "unknown" as const }));
      const u = msg.usage;
      return {
        value: missing,
        meta: { model: msg.model, ms: Date.now() - t0, inputTokens: u.input_tokens, outputTokens: u.output_tokens, costUsd: cost(model, u.input_tokens, u.output_tokens) }
      };
    });
  }

  /** Baseline B: the same model, asked the way a person would ask a chatbot. */
  async baseline(text: string): Promise<{ value: BaselineAnswer; meta: CallMeta }> {
    const model = MODELS.extract;
    const key = await hashKey("baseline", model, BASELINE_PROMPT, text);
    return this.cached(key, async () => {
      const t0 = Date.now();
      const msg = await this.client.beta.messages.create({
        model,
        max_tokens: 4000,
        betas: BETAS,
        fallbacks: "default",
        messages: [{ role: "user", content: `${BASELINE_PROMPT}\n\n${text}` }]
      });
      const answer = msg.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n").trim();
      const u = msg.usage;
      return {
        value: parseBaseline(answer),
        meta: { model: msg.model, ms: Date.now() - t0, inputTokens: u.input_tokens, outputTokens: u.output_tokens, costUsd: cost(model, u.input_tokens, u.output_tokens) }
      };
    });
  }

  /** Read the chatbot's paragraph with a small model, so its claim is scored the same way every time. */
  async judgeBaseline(answer: string): Promise<{ value: BaselineAnswer; meta: CallMeta }> {
    const model = MODELS.judge;
    const key = await hashKey("judge", model, answer);
    return this.cached(key, async () => {
      const t0 = Date.now();
      const msg = await this.client.beta.messages.parse({
        model,
        max_tokens: 1000,
        output_config: { effort: "low", format: betaZodOutputFormat(JudgeSchema) },
        messages: [
          {
            role: "user",
            content: `Below is an answer to "Is the accused eligible for release under Section 479 BNSS, and from what date?". Classify what the answer claims: eligible_now (it says the person is eligible now or already), not_eligible (it says not eligible or not yet), or unclear (it hedges without committing, or says it can't tell). Give the date it names, if any.\n\n<answer>\n${answer}\n</answer>`
          }
        ]
      });
      const out = msg.parsed_output;
      const u = msg.usage;
      return {
        value: {
          text: answer,
          saysEligible: out?.verdict === "eligible_now" ? true : out?.verdict === "not_eligible" ? false : null,
          date: out?.date ?? null
        },
        meta: { model: msg.model, ms: Date.now() - t0, inputTokens: u.input_tokens, outputTokens: u.output_tokens, costUsd: cost(model, u.input_tokens, u.output_tokens) }
      };
    });
  }

  /** Transcribe one scanned page image (base64 PNG/JPEG). */
  async transcribe(imageBase64: string, mediaType: "image/png" | "image/jpeg"): Promise<{ value: string; meta: CallMeta }> {
    const model = MODELS.vision;
    const key = await hashKey("ocr", model, OCR_PROMPT, imageBase64);
    return this.cached(key, async () => {
      const t0 = Date.now();
      const msg = await this.client.beta.messages.create({
        model,
        max_tokens: 8000,
        betas: BETAS,
        fallbacks: "default",
        output_config: { effort: "low" },
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
              { type: "text", text: OCR_PROMPT }
            ]
          }
        ]
      });
      const out = msg.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n");
      const u = msg.usage;
      return {
        value: out,
        meta: { model: msg.model, ms: Date.now() - t0, inputTokens: u.input_tokens, outputTokens: u.output_tokens, costUsd: cost(model, u.input_tokens, u.output_tokens) }
      };
    });
  }
}

/** Read the chatbot's paragraph: does it say eligible, and from which date? */
export function parseBaseline(text: string): BaselineAnswer {
  const lower = text.toLowerCase();
  const no = /\b(not|isn't|is not|cannot|can't|ineligible|not yet)\b[^.]{0,40}\beligible\b|\bineligible\b|\bnot eligible\b/.test(lower);
  const yes = /\b(is|are|would be|appears to be|likely|became|becomes|was)\b[^.]{0,30}\beligible\b|\byes\b/.test(lower);
  const saysEligible = no && !yes ? false : yes && !no ? true : yes && no ? null : null;
  const dates = findDates(text);
  return { text, saysEligible, date: dates.length ? dates[dates.length - 1]!.iso : null };
}
