import type { CaseInput, Verdict } from "@halftime/law";
import type { BaselineAnswer, Extraction } from "@halftime/reader";
import samplesRaw from "@/data/samples.json";
import runsRaw from "@/data/sample-runs.json";

export interface Sample {
  id: string;
  title: string;
  gloss: string;
  language: "hi" | "en";
  district?: string;
  text: string;
  gold: CaseInput;
  goldVerdict: Verdict;
  goldLineDate: string | null;
  constructed: true;
}

export interface SampleRun {
  extraction: Extraction;
  baseline: BaselineAnswer | null;
  model: string;
  ranOn: string;
  costUsd: number;
  ms: number;
}

export const SAMPLES = samplesRaw as unknown as Sample[];
export const RUNS = runsRaw as unknown as Record<string, SampleRun>;

export function getSample(id: string): Sample | undefined {
  return SAMPLES.find((s) => s.id === id);
}

/** The fixed "today" for sample demos is the real today; the date slider can move it. */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
