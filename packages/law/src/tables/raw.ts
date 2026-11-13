import type { Punishment } from "../types.js";

/** [section, title, max code, note?] */
export type RawRow = [string, string, string, string?];

/** Parse a max code such as "3y", "6m", "life" or "modifier" into a Punishment. */
export function parseMaxCode(code: string): Punishment {
  const term = /^(\d+)([ym])$/.exec(code);
  if (term) {
    const n = Number(term[1]);
    return { kind: "term", months: term[2] === "y" ? n * 12 : n };
  }
  switch (code) {
    case "life":
    case "death":
    case "modifier":
    case "derivative":
    case "companion":
    case "struck":
    case "detail":
    case "quantity":
      return { kind: code };
    default:
      throw new Error(`Unknown max code: ${code}`);
  }
}
