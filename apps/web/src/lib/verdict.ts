import type { Verdict } from "@halftime/law";

export const VERDICT_STYLE: Record<Verdict, { lane: "past" | "notyet" | "cant" | "excluded"; text: string; bg: string; border: string; short: string; long: string }> = {
  PAST_THE_LINE: {
    lane: "past",
    text: "text-stamp-text",
    bg: "bg-[#f6ddd6]",
    border: "border-stamp",
    short: "Past the line",
    long: "Past the line: the jail must apply under Sec 479(3). A lawyer reviews and signs."
  },
  PAST_FLAGGED: {
    lane: "past",
    text: "text-flag",
    bg: "bg-flag-bg",
    border: "border-flag",
    short: "Past the line · flagged",
    long: "Past the line, but Sec 479(2) may apply (more than one offence, or other cases). A lawyer decides before applying."
  },
  NOT_YET: { lane: "notyet", text: "text-carbon", bg: "bg-[#dfe4f1]", border: "border-carbon", short: "Not yet", long: "Not yet past the line. The date it will be crossed is shown." },
  EXCLUDED: {
    lane: "excluded",
    text: "text-ink-2",
    bg: "bg-paper-3",
    border: "border-ink",
    short: "Outside 479",
    long: "Outside Sec 479: a charged offence allows life imprisonment or death."
  },
  CANT_TELL: {
    lane: "cant",
    text: "text-ink-2",
    bg: "bg-paper",
    border: "border-ink-3 border-dashed",
    short: "Can't tell",
    long: "Can't tell: the papers don't give enough. What is missing is listed."
  }
};

export const LANES = [
  { id: "past", key: "lane.past", note: "Jail must apply · lawyer signs" },
  { id: "notyet", key: "lane.notyet", note: "Line date and countdown" },
  { id: "cant", key: "lane.cant", note: "Papers incomplete · a person checks" },
  { id: "excluded", key: "lane.excluded", note: "Life or death offence" }
] as const;
