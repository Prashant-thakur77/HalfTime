/** Tri-state fact: the papers say yes, say no, or don't say. */
export type Tri = "true" | "false" | "unknown";

export type ActCode =
  | "IPC"
  | "BNS"
  | "NDPS"
  | "ARMS"
  | "POCSO"
  | "SCST"
  | "DOWRY"
  | "GAMBLING"
  | "IT"
  | "EXCISE"
  | "GANGSTERS"
  | "OTHER";

/**
 * How a section's punishment is written in the statute.
 * - term: a fixed maximum term of imprisonment (in months)
 * - life / death: the gravest punishment it allows
 * - modifier: not an offence on its own (common intention, definitions, prohibitions read with a penal section)
 * - derivative: an offence whose punishment is borrowed from the main offence (conspiracy, abetment, using a forged document)
 * - companion: raises or halves the main offence's punishment (attempt, minimum-term aggravations)
 * - struck: struck down by a constitutional court, so no valid charge
 * - detail: the term depends on a subsection or fact the section number alone doesn't give
 * - quantity: NDPS offences where the term depends on the quantity class
 */
export type PunishmentKind =
  | "term"
  | "life"
  | "death"
  | "modifier"
  | "derivative"
  | "companion"
  | "struck"
  | "detail"
  | "quantity";

export interface Punishment {
  kind: PunishmentKind;
  /** Maximum term in months, only for kind = "term". */
  months?: number;
}

export interface SectionRow {
  act: ActCode;
  section: string;
  title: string;
  punishment: Punishment;
  /** Where the maximum comes from, e.g. "IPC 1860 s.379". */
  source: string;
  /** Short note shown in the trace when the row needs explaining. */
  note?: string;
}

export type NdpsQuantity = "small" | "intermediate" | "commercial" | "unknown";

export interface ChargedSection {
  act: ActCode;
  section: string;
  /** Only for NDPS: the quantity class written in the papers. */
  quantity?: NdpsQuantity;
  /** Index of the supporting quote in the extraction, for the trace. */
  spanId?: number;
}

export interface CaseInput {
  sections: ChargedSection[];
  /** ISO date (YYYY-MM-DD) the person was first taken into custody in this case, or null if the papers don't say. */
  custodyStart: string | null;
  custodySpanId?: number;
  firstTimeOffender: Tri;
  otherPendingCases: Tri;
  /** Days of delay caused by the accused, excluded from detention (Explanation to Sec 479). */
  accusedDelayDays?: number;
  /** Date the FIR/case was registered, if known. Decides whether the old-law note applies. */
  registeredOn?: string | null;
  /** A lawyer-entered maximum term in months, used when the tables can't decide. */
  maxTermOverrideMonths?: number | null;
}

export type Verdict = "PAST_THE_LINE" | "PAST_FLAGGED" | "NOT_YET" | "EXCLUDED" | "CANT_TELL";

export interface TraceStep {
  /** A short machine label for the step. */
  step:
    | "section"
    | "max_term"
    | "excluded"
    | "fraction"
    | "custody"
    | "delay"
    | "line"
    | "today"
    | "result"
    | "flag"
    | "provision"
    | "missing";
  text: string;
  /** Index of the supporting quote in the source papers, when the step rests on one. */
  spanId?: number;
  /** Statute citation the step rests on. */
  source?: string;
}

export interface SectionResolution {
  act: ActCode;
  section: string;
  canonical: string;
  found: boolean;
  title?: string;
  punishment?: Punishment;
  source?: string;
  note?: string;
  /** For NDPS rows resolved by quantity. */
  quantity?: NdpsQuantity;
  spanId?: number;
}

export interface Evaluation {
  verdict: Verdict;
  /** Which law the line comes from. */
  provision: "BNSS_479" | "BNSS_479_PRE_JULY_2024";
  /** Max term over the charged offences, in months, or null when it can't be known. */
  maxTermMonths: number | null;
  /** Fraction used for the safe line: 1/2 or 1/3. */
  fraction: "1/2" | "1/3" | null;
  /** The line the verdict uses (the later, safe one when first-time status is unknown). */
  lineDate: string | null;
  /** The earlier line that applies if the person turns out to be a first-time offender. */
  firstTimeLineDate: string | null;
  /** The half line under old Sec 436A CrPC, shown for cases from before 1 Jul 2024. */
  oldLawLineDate: string | null;
  /** Days of detention up to today (excludes accused delay). */
  daysDetained: number | null;
  /** Days since the line was crossed (>= 0) when past it. */
  daysPast: number | null;
  /** Days left until the line when not yet past it. */
  daysToGo: number | null;
  /** True when detention already equals or exceeds the full maximum term. */
  beyondMaximum: boolean;
  /** True when the earlier first-time line is crossed but first-time status is unknown. */
  pastIfFirstTime: boolean;
  /** Reasons the case is flagged for a lawyer under Sec 479(2). */
  flags: string[];
  /** What is missing when the verdict is CANT_TELL. */
  missing: string[];
  sections: SectionResolution[];
  trace: TraceStep[];
}
