import { describe, expect, it } from "vitest";
import { ALL_ROWS, IPC_TO_BNS, lookupRow, parseMaxCode } from "../src/index.js";
import { BNS_ALIASES } from "../src/tables/bns.js";
import { NDPS_QUANTITY_MONTHS } from "../src/tables/special.js";

describe("table integrity", () => {
  it("has no duplicate act/section rows", () => {
    const keys = ALL_ROWS.map((r) => `${r.act}:${r.section}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("covers at least 135 IPC and 130 BNS sections", () => {
    expect(ALL_ROWS.filter((r) => r.act === "IPC").length).toBeGreaterThanOrEqual(135);
    expect(ALL_ROWS.filter((r) => r.act === "BNS").length).toBeGreaterThanOrEqual(130);
  });

  for (const r of ALL_ROWS) {
    it(`${r.act} s.${r.section} is well-formed`, () => {
      expect(r.title.length).toBeGreaterThan(3);
      expect(r.source).toBe(r.source.trim());
      expect(r.source).toContain(r.section);
      if (r.punishment.kind === "term") {
        expect(Number.isInteger(r.punishment.months)).toBe(true);
        expect(r.punishment.months).toBeGreaterThan(0);
        expect(r.punishment.months).toBeLessThanOrEqual(240);
      } else {
        expect(r.punishment.months).toBeUndefined();
      }
      if (["modifier", "derivative", "companion", "struck", "detail"].includes(r.punishment.kind) && r.act !== "IPC" && r.act !== "BNS") {
        // Special-act structural rows always explain themselves.
        expect(r.note ?? r.title).toBeTruthy();
      }
    });
  }

  for (const map of IPC_TO_BNS) {
    it(`IPC s.${map.ipc} maps to BNS ${map.bns.join(", ") || "(none)"}`, () => {
      expect(lookupRow("IPC", map.ipc)).toBeDefined();
      if (map.relation === "dropped") expect(map.bns).toEqual([]);
      else {
        expect(map.bns.length).toBeGreaterThan(0);
        for (const b of map.bns) expect(lookupRow("BNS", b), `BNS ${b}`).toBeDefined();
      }
      if (map.relation === "split") expect(map.bns.length).toBeGreaterThan(1);
    });
  }

  it("maps every IPC row to BNS", () => {
    const mapped = new Set(IPC_TO_BNS.map((m) => m.ipc));
    const missing = ALL_ROWS.filter((r) => r.act === "IPC" && !mapped.has(r.section)).map((r) => r.section);
    expect(missing).toEqual([]);
  });

  it("keeps the gravity class when IPC moves to BNS", () => {
    for (const m of IPC_TO_BNS.filter((x) => x.relation === "one-to-one")) {
      const ipc = lookupRow("IPC", m.ipc)!.punishment.kind;
      const bns = lookupRow("BNS", m.bns[0]!)!.punishment.kind;
      if (ipc === "death" || ipc === "life") expect([ipc, "death", "life"]).toContain(bns);
    }
  });

  for (const [bare, target] of Object.entries(BNS_ALIASES)) {
    it(`BNS alias ${bare} -> ${target} resolves`, () => {
      expect(lookupRow("BNS", target)).toBeDefined();
    });
  }

  it("orders NDPS quantity classes", () => {
    expect(NDPS_QUANTITY_MONTHS.small).toBeLessThan(NDPS_QUANTITY_MONTHS.intermediate);
    expect(NDPS_QUANTITY_MONTHS.intermediate).toBeLessThan(NDPS_QUANTITY_MONTHS.commercial);
  });

  it("parses max codes", () => {
    expect(parseMaxCode("3y")).toEqual({ kind: "term", months: 36 });
    expect(parseMaxCode("6m")).toEqual({ kind: "term", months: 6 });
    expect(parseMaxCode("life")).toEqual({ kind: "life" });
    expect(() => parseMaxCode("forever")).toThrow(/Unknown max code/);
  });
});
