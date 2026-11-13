import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { ALL_ROWS, addFractionOfMonths, evaluate, parseIsoDate, toIso, type CaseInput, type Tri } from "../src/index.js";

const termRows = ALL_ROWS.filter((r) => r.punishment.kind === "term");
const graveRows = ALL_ROWS.filter((r) => r.punishment.kind === "life" || r.punishment.kind === "death");

const isoDate = fc
  .date({ min: new Date("2005-01-01T00:00:00Z"), max: new Date("2026-11-14T00:00:00Z"), noInvalidDate: true })
  .map((d) => d.toISOString().slice(0, 10));
const tri = fc.constantFrom<Tri>("true", "false", "unknown");
const termSection = fc.constantFrom(...termRows).map((r) => ({ act: r.act, section: r.section }));
const anySection = fc.constantFrom(...ALL_ROWS).map((r) => ({ act: r.act, section: r.section }));
const TODAY = "2026-11-15";

const caseArb = fc.record({
  sections: fc.array(anySection, { minLength: 1, maxLength: 5 }),
  custodyStart: fc.option(isoDate, { nil: null }),
  firstTimeOffender: tri,
  otherPendingCases: tri,
  accusedDelayDays: fc.integer({ min: 0, max: 400 })
}) as fc.Arbitrary<CaseInput>;

const RUNS = { numRuns: 400 };

describe("engine properties", () => {
  it("is deterministic", () => {
    fc.assert(fc.property(caseArb, (c) => {
      expect(evaluate(c, TODAY)).toEqual(evaluate(c, TODAY));
    }), RUNS);
  });

  it("EXCLUDED beats everything when a life/death section is charged", () => {
    fc.assert(
      fc.property(caseArb, fc.constantFrom(...graveRows), (c, g) => {
        const r = evaluate({ ...c, sections: [...c.sections, { act: g.act, section: g.section }] }, TODAY);
        expect(r.verdict).toBe("EXCLUDED");
        expect(r.lineDate).toBeNull();
      }),
      RUNS
    );
  });

  it("CANT_TELL whenever the custody date is missing and nothing is excluded", () => {
    fc.assert(
      fc.property(caseArb, (c) => {
        const r = evaluate({ ...c, custodyStart: null }, TODAY);
        expect(["CANT_TELL", "EXCLUDED"]).toContain(r.verdict);
        if (r.verdict === "CANT_TELL") expect(r.missing.join(" ")).toMatch(/custody/);
      }),
      RUNS
    );
  });

  it("never says past when the line date is after today", () => {
    fc.assert(
      fc.property(caseArb, (c) => {
        const r = evaluate(c, TODAY);
        if (r.verdict === "PAST_THE_LINE" || r.verdict === "PAST_FLAGGED") {
          expect(r.lineDate! <= TODAY).toBe(true);
          expect(r.daysPast).toBeGreaterThanOrEqual(0);
        }
        if (r.verdict === "NOT_YET") {
          expect(r.lineDate! > TODAY).toBe(true);
          expect(r.daysToGo).toBeGreaterThan(0);
        }
      }),
      RUNS
    );
  });

  it("PAST_THE_LINE only with one offence and no pending cases", () => {
    fc.assert(
      fc.property(caseArb, (c) => {
        const r = evaluate(c, TODAY);
        if (r.verdict === "PAST_THE_LINE") expect(c.otherPendingCases).toBe("false");
        if (c.otherPendingCases !== "false") expect(r.verdict).not.toBe("PAST_THE_LINE");
      }),
      RUNS
    );
  });

  it("one-third line is never later than the half line", () => {
    fc.assert(
      fc.property(isoDate, fc.constantFrom(...termRows), (start, row) => {
        const s = parseIsoDate(start)!;
        const m = row.punishment.months!;
        expect(addFractionOfMonths(s, m, 1, 3) <= addFractionOfMonths(s, m, 1, 2)).toBe(true);
      }),
      RUNS
    );
  });

  it("the line is monotonic in the maximum term", () => {
    fc.assert(
      fc.property(isoDate, fc.integer({ min: 1, max: 240 }), fc.integer({ min: 1, max: 240 }), (start, a, b) => {
        const s = parseIsoDate(start)!;
        const [lo, hi] = a <= b ? [a, b] : [b, a];
        expect(addFractionOfMonths(s, lo, 1, 2) <= addFractionOfMonths(s, hi, 1, 2)).toBe(true);
        expect(addFractionOfMonths(s, lo, 1, 3) <= addFractionOfMonths(s, hi, 1, 3)).toBe(true);
      }),
      RUNS
    );
  });

  it("the line is monotonic in the custody start", () => {
    fc.assert(
      fc.property(isoDate, isoDate, fc.integer({ min: 1, max: 240 }), (a, b, m) => {
        const [lo, hi] = a <= b ? [a, b] : [b, a];
        expect(toIso(addFractionOfMonths(parseIsoDate(lo)!, m, 1, 2)) <= toIso(addFractionOfMonths(parseIsoDate(hi)!, m, 1, 2))).toBe(true);
      }),
      RUNS
    );
  });

  it("accused delay can only push the line later", () => {
    fc.assert(
      fc.property(isoDate, termSection, fc.integer({ min: 0, max: 500 }), tri, (start, sec, delay, ft) => {
        const base: CaseInput = { sections: [sec], custodyStart: start, firstTimeOffender: ft, otherPendingCases: "false" };
        const a = evaluate(base, TODAY);
        const b = evaluate({ ...base, accusedDelayDays: delay }, TODAY);
        expect(b.lineDate! >= a.lineDate!).toBe(true);
      }),
      RUNS
    );
  });

  it("confirming first-time status can only move the line earlier", () => {
    fc.assert(
      fc.property(isoDate, termSection, (start, sec) => {
        const mk = (ft: Tri) => evaluate({ sections: [sec], custodyStart: start, firstTimeOffender: ft, otherPendingCases: "false" }, TODAY).lineDate!;
        expect(mk("true") <= mk("unknown")).toBe(true);
        expect(mk("unknown")).toBe(mk("false"));
      }),
      RUNS
    );
  });

  it("unknown first-time status always uses the half line (the safe one)", () => {
    fc.assert(
      fc.property(isoDate, termSection, (start, sec) => {
        const r = evaluate({ sections: [sec], custodyStart: start, firstTimeOffender: "unknown", otherPendingCases: "false" }, TODAY);
        expect(r.fraction).toBe("1/2");
        expect(r.firstTimeLineDate! <= r.lineDate!).toBe(true);
      }),
      RUNS
    );
  });

  it("adding a charge never moves the line earlier", () => {
    fc.assert(
      fc.property(isoDate, termSection, termSection, (start, a, b) => {
        const one = evaluate({ sections: [a], custodyStart: start, firstTimeOffender: "false", otherPendingCases: "false" }, TODAY);
        const two = evaluate({ sections: [a, b], custodyStart: start, firstTimeOffender: "false", otherPendingCases: "false" }, TODAY);
        expect(two.lineDate! >= one.lineDate!).toBe(true);
      }),
      RUNS
    );
  });

  it("days detained plus days past add up", () => {
    fc.assert(
      fc.property(caseArb, (c) => {
        const r = evaluate(c, TODAY);
        if (r.daysDetained !== null && c.custodyStart) {
          expect(r.daysDetained).toBeGreaterThanOrEqual(0);
        }
      }),
      RUNS
    );
  });

  it("section order does not change the verdict", () => {
    fc.assert(
      fc.property(caseArb, (c) => {
        const rev = { ...c, sections: [...c.sections].reverse() };
        const a = evaluate(c, TODAY);
        const b = evaluate(rev, TODAY);
        expect(b.verdict).toBe(a.verdict);
        expect(b.lineDate).toBe(a.lineDate);
      }),
      RUNS
    );
  });

  it("text injected into section strings never yields a past verdict for an unknown section", () => {
    fc.assert(
      fc.property(fc.string(), isoDate, (junk, start) => {
        const r = evaluate({ sections: [{ act: "OTHER", section: junk }], custodyStart: start, firstTimeOffender: "true", otherPendingCases: "false" }, TODAY);
        expect(r.verdict).toBe("CANT_TELL");
      }),
      RUNS
    );
  });
});
