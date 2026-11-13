import type { ActCode, SectionRow } from "../types.js";
import { BNS_ALIASES, BNS_ROWS } from "./bns.js";
import { IPC_ROWS } from "./ipc.js";
import { parseMaxCode, type RawRow } from "./raw.js";
import { NDPS_QUANTITY_MONTHS, SPECIAL_ROWS } from "./special.js";

export const ACT_NAMES: Record<ActCode, string> = {
  IPC: "Indian Penal Code, 1860",
  BNS: "Bharatiya Nyaya Sanhita, 2023",
  NDPS: SPECIAL_ROWS.NDPS!.name,
  ARMS: SPECIAL_ROWS.ARMS!.name,
  POCSO: SPECIAL_ROWS.POCSO!.name,
  SCST: SPECIAL_ROWS.SCST!.name,
  DOWRY: SPECIAL_ROWS.DOWRY!.name,
  GAMBLING: SPECIAL_ROWS.GAMBLING!.name,
  IT: SPECIAL_ROWS.IT!.name,
  EXCISE: SPECIAL_ROWS.EXCISE!.name,
  GANGSTERS: SPECIAL_ROWS.GANGSTERS!.name,
  OTHER: "Other law"
};

const SHORT: Record<ActCode, string> = {
  IPC: "IPC 1860",
  BNS: "BNS 2023",
  NDPS: "NDPS Act 1985",
  ARMS: "Arms Act 1959",
  POCSO: "POCSO Act 2012",
  SCST: "SC/ST (PoA) Act 1989",
  DOWRY: "Dowry Prohibition Act 1961",
  GAMBLING: "Public Gambling Act 1867",
  IT: "IT Act 2000",
  EXCISE: "State Excise Act",
  GANGSTERS: "UP Gangsters Act 1986",
  OTHER: "Other law"
};

export function actShortName(act: ActCode): string {
  return SHORT[act];
}

function build(act: ActCode, rows: RawRow[]): SectionRow[] {
  return rows.map(([section, title, code, note]) => ({
    act,
    section,
    title,
    punishment: parseMaxCode(code),
    source: `${SHORT[act]} s.${section}`,
    ...(note ? { note } : {})
  }));
}

export const ALL_ROWS: SectionRow[] = [
  ...build("IPC", IPC_ROWS),
  ...build("BNS", BNS_ROWS),
  ...Object.entries(SPECIAL_ROWS).flatMap(([act, t]) => build(act as ActCode, t!.rows))
];

const INDEX = new Map<string, SectionRow>(ALL_ROWS.map((r) => [`${r.act}:${r.section}`, r]));

export function lookupRow(act: ActCode, canonical: string): SectionRow | undefined {
  return INDEX.get(`${act}:${canonical}`);
}

export { BNS_ALIASES, NDPS_QUANTITY_MONTHS };
