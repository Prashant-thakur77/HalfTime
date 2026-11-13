/** Pinned model ids. Change them here and nowhere else. */
export const MODELS = {
  /** Extraction, self-check and the plain-chatbot baseline (same model, so the comparison is fair). */
  extract: "claude-sonnet-5-5",
  /** Scanned-page transcription and hard cases. */
  vision: "claude-opus-5-5",
  /** Reads the chatbot baseline's paragraph into a yes/no/unclear claim for scoring. */
  judge: "claude-haiku-5-5"
} as const;

/** USD per million tokens, for cost reporting. */
export const PRICES: Record<string, { input: number; output: number }> = {
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-opus-5-5": { input: 4, output: 20 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5 }
};
