"use client";
import type { CaseInput } from "@halftime/law";
import type { Extraction } from "@halftime/reader";

/** Uploaded cases live only in this browser tab (sessionStorage), never on a server. */
export interface UploadedCase {
  id: string;
  name: string;
  text: string;
  extraction: Extraction;
  addedAt: string;
}

const KEY = "ht-uploads";
const EDITS = "ht-edits";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export const uploads = {
  all: () => read<UploadedCase[]>(KEY, []),
  get: (id: string) => read<UploadedCase[]>(KEY, []).find((u) => u.id === id),
  add: (u: UploadedCase) => write(KEY, [...read<UploadedCase[]>(KEY, []).filter((x) => x.id !== u.id), u]),
  clear: () => write(KEY, [])
};

/** A lawyer's edits to a case's facts (custody date, first-time, delay), per case id. */
export const edits = {
  get: (id: string) => read<Record<string, Partial<CaseInput>>>(EDITS, {})[id] ?? {},
  set: (id: string, e: Partial<CaseInput>) => write(EDITS, { ...read<Record<string, Partial<CaseInput>>>(EDITS, {}), [id]: e })
};
