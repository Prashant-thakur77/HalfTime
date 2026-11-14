import { describe, expect, it } from "vitest";
import { applyReadWith, asciiDigits, canonicalSection, expandSections, resolveSection, sectionLabel } from "../src/index.js";

describe("canonicalSection", () => {
  const cases: [string, string][] = [
    ["379", "379"],
    [" 379 ", "379"],
    ["304A", "304A"],
    ["304-A", "304A"],
    ["304 a", "304A"],
    ["354-d", "354D"],
    ["३७९", "379"],
    ["४२०", "420"],
    ["304-ख", "304B"],
    ["304ख", "304B"],
    ["498ए", "498A"],
    ["498-ए", "498A"],
    ["120बी", "120B"],
    ["354घ", "354D"],
    ["354डी", "354D"],
    ["354सी", "354C"],
    ["376(2)(n)", "376(2)(n)"],
    ["376 (2) (N)", "376(2)(n)"],
    ["25(1-b)(a)", "25(1B)(a)"],
    ["25(1b)(A)", "25(1B)(a)"],
    ["25(1-aa)", "25(1AA)"],
    ["3(1)(r)", "3(1)(r)"],
    ["3(2)(va)", "3(2)(va)"],
    ["303(2)", "303(2)"],
    ["Sec. 379", "379"],
    ["section 420", "420"],
    ["s.411", "411"],
    ["u/s 302", "302"],
    ["Sections 452", "452"],
    ["sections 498A", "498A"],
    ["Secs. 147", "147"],
    ["ss. 323", "323"],
    ["धारा 379", "379"],
    ["धारा ३०७", "307"],
    ["326(f)", "326(f)"],
    ["125(A)", "125(a)"]
  ];
  for (const [raw, want] of cases) {
    it(`${JSON.stringify(raw)} -> ${want}`, () => expect(canonicalSection(raw)).toBe(want));
  }
});

describe("asciiDigits", () => {
  it("converts all Devanagari digits", () => expect(asciiDigits("०१२३४५६७८९")).toBe("0123456789"));
  it("leaves ASCII alone", () => expect(asciiDigits("12-03-2021")).toBe("12-03-2021"));
});

describe("expandSections", () => {
  const cases: [string, string[]][] = [
    ["379/411", ["379", "411"]],
    ["323, 504, 506", ["323", "504", "506"]],
    ["302 r/w 34", ["302", "34"]],
    ["302 R/W 34", ["302", "34"]],
    ["8/20", ["8", "20"]],
    ["147, 148 & 149", ["147", "148", "149"]],
    ["323 and 504", ["323", "504"]],
    ["३२३/५०४/५०६", ["323", "504", "506"]],
    ["379 सपठित 34", ["379", "34"]],
    ["323 व 504", ["323", "504"]],
    ["379", ["379"]],
    ["u/s 302", ["302"]],
    ["U/S. 302/34", ["302", "34"]],
    ["u/ss 147, 148", ["147", "148"]],
    ["307 read with 149", ["307", "149"]],
    ["302 read with Section 149", ["302", "Section 149"]],
    ["326 Read With 34", ["326", "34"]],
    ["302 or 304", ["302", "304"]],
    ["147 IPC", ["147"]],
    ["302 I.P.C. r/w 34 IPC", ["302", "34"]],
    ["25(1B)(a) of the Arms Act", ["25(1B)(a)"]],
    ["20 NDPS Act", ["20"]],
    ["3(1)(r) of the Scheduled Castes and Scheduled Tribes (Prevention of Atrocities) Act, 1989", ["3(1)(r)"]],
    ["379 of the Indian Penal Code", ["379"]],
    ["304 A", ["304 A"]],
    ["304ख", ["304ख"]]
  ];
  for (const [raw, want] of cases) {
    it(`${raw} -> ${want.join(" + ")}`, () => {
      const out = expandSections([{ act: "IPC", section: raw, spanId: 2 }]);
      expect(out.map((s) => s.section)).toEqual(want);
      expect(out.every((s) => s.act === "IPC" && s.spanId === 2)).toBe(true);
    });
  }
  it("keeps the main section and the modifier when read with 34 or 149", () => {
    const out = expandSections([{ act: "IPC", section: "302 read with Section 149" }]).map((x) => resolveSection(x).canonical);
    expect(out).toEqual(["302", "149"]);
  });
  it("keeps the Arms Act 3/25 reading", () => {
    const res = applyReadWith(expandSections([{ act: "ARMS", section: "3/25 Arms Act" }]).map(resolveSection));
    expect(res.map((r) => r.canonical)).toEqual(["3", "25(1B)(a)"]);
  });
  it("drops empty fragments", () => {
    expect(expandSections([{ act: "IPC", section: "379//411/" }]).map((s) => s.section)).toEqual(["379", "411"]);
  });
});

describe("resolveSection", () => {
  it("finds a plain section", () => {
    const r = resolveSection({ act: "IPC", section: "379" });
    expect(r).toMatchObject({ found: true, canonical: "379", punishment: { kind: "term", months: 36 } });
    expect(r.note).toBeUndefined();
  });
  it("reads a sub-clause under its parent and says so", () => {
    const r = resolveSection({ act: "IPC", section: "376(2)(n)" });
    expect(r).toMatchObject({ found: true, canonical: "376" });
    expect(r.note).toMatch(/read under its parent/);
  });
  it("uses a BNS alias and says so", () => {
    const r = resolveSection({ act: "BNS", section: "303" });
    expect(r.canonical).toBe("303(2)");
    expect(r.note).toMatch(/Bare "303" read as 303\(2\)/);
  });
  it("keeps row notes", () => {
    expect(resolveSection({ act: "IPC", section: "392" }).note).toMatch(/highway/);
  });
  it("resolves NDPS by quantity", () => {
    expect(resolveSection({ act: "NDPS", section: "20", quantity: "intermediate" }).punishment).toEqual({ kind: "term", months: 120 });
    expect(resolveSection({ act: "NDPS", section: "22", quantity: "small" }).punishment).toEqual({ kind: "term", months: 12 });
  });
  it("leaves NDPS unknown quantity unresolved", () => {
    const r = resolveSection({ act: "NDPS", section: "20", quantity: "unknown" });
    expect(r.punishment).toEqual({ kind: "quantity" });
    expect(r.quantity).toBe("unknown");
    expect(r.note).toMatch(/quantity class/);
  });
  it("defaults NDPS quantity to unknown", () => {
    expect(resolveSection({ act: "NDPS", section: "21" }).quantity).toBe("unknown");
  });
  it("reports unknown sections", () => {
    const r = resolveSection({ act: "IPC", section: "999" });
    expect(r.found).toBe(false);
    expect(r.note).toMatch(/not in the tables/);
  });
  it("carries the span id", () => {
    expect(resolveSection({ act: "IPC", section: "379", spanId: 4 }).spanId).toBe(4);
  });
});

describe("applyReadWith (Arms Act)", () => {
  const arms = (...s: string[]) => applyReadWith(s.map((x) => resolveSection({ act: "ARMS", section: x })));
  it("3 + 25 -> 25(1B)(a)", () => expect(arms("3", "25").map((r) => r.canonical)).toEqual(["3", "25(1B)(a)"]));
  it("4 + 25 -> 25(1B)(b)", () => expect(arms("4", "25")[1]!.canonical).toBe("25(1B)(b)"));
  it("5 + 25 -> 25(1)(a)", () => expect(arms("5", "25")[1]!.canonical).toBe("25(1)(a)"));
  it("7 + 25 stays undecided", () => expect(arms("7", "25")[1]!.punishment!.kind).toBe("detail"));
  it("explains the reading", () => expect(arms("3", "25")[1]!.note).toMatch(/read with s\.3/));
  it("no bare 25: unchanged", () => {
    const input = arms("3", "25(1B)");
    expect(input.map((r) => r.canonical)).toEqual(["3", "25(1B)"]);
  });
  it("ignores other acts", () => {
    const r = applyReadWith([resolveSection({ act: "IPC", section: "25" })]);
    expect(r[0]!.found).toBe(false);
  });
});

describe("sectionLabel", () => {
  it("formats", () => expect(sectionLabel({ act: "BNS", canonical: "303(2)" })).toBe("BNS 2023 s.303(2)"));
});
