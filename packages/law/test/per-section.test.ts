import { describe, expect, it } from "vitest";
import { ALL_ROWS, addFractionOfMonths, evaluate, parseIsoDate, toIso } from "../src/index.js";

/** Every section in the tables, evaluated alone, behaves as its row says. */
const TODAY = "2026-11-15";
const CUSTODY = "2020-03-10";

describe("each table row drives the engine", () => {
  for (const row of ALL_ROWS) {
    it(`${row.act} s.${row.section} (${row.punishment.kind})`, () => {
      const r = evaluate(
        {
          sections: [{ act: row.act, section: row.section }],
          custodyStart: CUSTODY,
          firstTimeOffender: "false",
          otherPendingCases: "false"
        },
        TODAY
      );
      switch (row.punishment.kind) {
        case "death":
        case "life":
          expect(r.verdict).toBe("EXCLUDED");
          break;
        case "term": {
          const line = toIso(addFractionOfMonths(parseIsoDate(CUSTODY)!, row.punishment.months!, 1, 2));
          expect(r.maxTermMonths).toBe(row.punishment.months);
          expect(r.lineDate).toBe(line);
          expect(r.verdict).toBe(line <= TODAY ? "PAST_THE_LINE" : "NOT_YET");
          break;
        }
        default:
          expect(r.verdict).toBe("CANT_TELL");
      }
    });
  }
});
