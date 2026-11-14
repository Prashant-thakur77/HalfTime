import type { ActCode, NdpsQuantity, Tri } from "@halftime/law";

export interface SectionDraft {
  key: number;
  act: ActCode;
  section: string;
  quantity?: NdpsQuantity;
}

export interface CalcState {
  sections: SectionDraft[];
  custodyStart: string;
  firstTime: Tri;
  otherCases: Tri;
  delayDays: number;
  /** A fixed "today" for the preset; null follows the real date. */
  today: string | null;
}

export interface CalcPreset {
  id: string;
  label: string;
  note: string;
  state: Omit<CalcState, "sections"> & { sections: Omit<SectionDraft, "key">[] };
}

export const CALC_PRESETS: CalcPreset[] = [
  {
    id: "g01",
    label: "NLU Delhi 2011 (theft, 2 years)",
    note: "Theft, held from 1 Jun 2009, counted on 9 Jun 2011.",
    state: {
      sections: [{ act: "IPC", section: "379" }],
      custodyStart: "2009-06-01",
      firstTime: "unknown",
      otherCases: "false",
      delayDays: 0,
      today: "2011-06-09"
    }
  },
  {
    id: "g07",
    label: "Theft + stolen property (flagged)",
    note: "Two offences charged, so Sec 479(2) is a question for a lawyer.",
    state: {
      sections: [
        { act: "IPC", section: "379" },
        { act: "IPC", section: "411" }
      ],
      custodyStart: "2023-01-10",
      firstTime: "false",
      otherCases: "false",
      delayDays: 0,
      today: null
    }
  },
  {
    id: "s04",
    label: "Attempt to murder (outside 479)",
    note: "Sec 307 IPC allows life imprisonment, so no line applies.",
    state: {
      sections: [
        { act: "IPC", section: "307" },
        { act: "IPC", section: "323" }
      ],
      custodyStart: "2024-04-25",
      firstTime: "unknown",
      otherCases: "unknown",
      delayDays: 0,
      today: null
    }
  }
];

let nextKey = 1;
export function newKey(): number {
  return nextKey++;
}

export function fromPreset(p: CalcPreset): CalcState {
  return { ...p.state, sections: p.state.sections.map((s) => ({ ...s, key: newKey() })) };
}
