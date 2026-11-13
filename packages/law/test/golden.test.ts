import { describe, expect, it } from "vitest";
import { evaluate } from "../src/index.js";
import { GOLDEN } from "./golden.cases.js";

describe("golden cases", () => {
  it("covers every verdict", () => {
    const verdicts = new Set(GOLDEN.map((c) => c.expect.verdict));
    expect([...verdicts].sort()).toEqual(["CANT_TELL", "EXCLUDED", "NOT_YET", "PAST_FLAGGED", "PAST_THE_LINE"]);
  });

  for (const c of GOLDEN) {
    it(`${c.id}: ${c.title}`, () => {
      const r = evaluate(c.input, c.today);
      expect(r).toMatchObject(c.expect);
      // Every result explains itself.
      expect(r.trace.at(-1)?.step).toBe("result");
      if (r.verdict === "CANT_TELL") expect(r.missing.length).toBeGreaterThan(0);
      if (r.verdict === "PAST_FLAGGED") expect(r.flags.length).toBeGreaterThan(0);
    });
  }
});
