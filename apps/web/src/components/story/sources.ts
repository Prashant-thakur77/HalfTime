import { facts } from "@/lib/facts";

/**
 * Sources for the law text on /story (all numbers come from facts.json).
 * Each was read before being cited; the label says what it supports.
 */
const LAW = {
  ipc: {
    label: "Indian Penal Code, 1860, Chapter XVII: Sections 379 and 411 (bare act text)",
    url: "https://devgan.in/ipc/chapter_17.php"
  },
  crpc436a: {
    label: "Code of Criminal Procedure, 1973, Section 436A, inserted by Act 25 of 2005, s. 36, w.e.f. 23 Jun 2006 (Indian Kanoon)",
    url: "https://indiankanoon.org/doc/1823154/"
  },
  bnssCommencement: {
    label: "LiveLaw, 24 Feb 2024: new criminal laws, including the BNSS, to come into force from 1 July 2024",
    url: "https://www.livelaw.in/amp/top-stories/new-criminal-laws-replacing-ipc-crpc-evidence-act-to-come-into-force-from-july-1-2024-250395"
  }
} as const;

export const SOURCES = { ...facts.sources, ...LAW } as Record<string, { label: string; url: string }>;

/** Order in which sources are numbered on the page. */
export const SOURCE_ORDER = ["nluDelhi", "ipc", "crpc436a", "ncrb", "table74", "bnssCommencement", "bnss479", "scOrder"] as const;
export type SourceKey = (typeof SOURCE_ORDER)[number];

export const sourceNo = (k: SourceKey) => SOURCE_ORDER.indexOf(k) + 1;
