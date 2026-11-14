import { describe, expect, it } from "vitest";
import { findDates, normalizeText, parseDateLoose } from "../src/index.js";

describe("normalizeText", () => {
  it("converts Devanagari digits", () => expect(normalizeText("दिनांक १२.०३.२०२१")).toBe("दिनांक 12.03.2021"));
  it("removes zero-width characters", () => expect(normalizeText("धा‍रा​ 379")).toBe("धारा 379"));
  it("unifies quotes and dashes", () => expect(normalizeText("“a” ‘b’ c–d—e")).toBe(`"a" 'b' c-d-e`));
  it("maps the danda", () => expect(normalizeText("है।")).toBe("है|"));
  it("unifies line endings", () => expect(normalizeText("a\r\nb\rc")).toBe("a\nb\nc"));
  it("composes NFC", () => expect(normalizeText("e\u0301")).toBe("\u00E9"));
});

describe("parseDateLoose", () => {
  const cases: [string, string | null][] = [
    ["12.03.2021", "2021-03-12"],
    ["12/03/2021", "2021-03-12"],
    ["12-3-21", "2021-03-12"],
    ["1-1-99", "1999-01-01"],
    ["12 . 03 . 2021", "2021-03-12"],
    ["१२/०३/२०२१", "2021-03-12"],
    ["दिनांक 12-3-21 को", "2021-03-12"],
    ["12 March 2021", "2021-03-12"],
    ["12th March, 2021", "2021-03-12"],
    ["1st of June 2020", "2020-06-01"],
    ["March 12, 2021", "2021-03-12"],
    ["Sept. 3, 2024", "2024-09-03"],
    ["12 मार्च 2021", "2021-03-12"],
    ["३ सितम्बर २०२४", "2024-09-03"],
    ["5 फ़रवरी 2023", "2023-02-05"],
    ["2021-03-12", "2021-03-12"],
    ["29.02.2024", "2024-02-29"],
    ["29.02.2023", null],
    ["31.04.2023", null],
    ["12.13.2021", null],
    ["no date here", null],
    ["section 379/411", null],
    ["1123/2024", null]
  ];
  for (const [raw, want] of cases) it(`${JSON.stringify(raw)} -> ${want}`, () => expect(parseDateLoose(raw)).toBe(want));
});

describe("findDates", () => {
  it("finds every date in order", () => {
    const found = findDates("गिरफ्तार 12.03.2023 को, आरोप पत्र 20 जून 2023, आदेश १५.०९.२०२४");
    expect(found.map((d) => d.iso)).toEqual(["2023-03-12", "2023-06-20", "2024-09-15"]);
  });
  it("does not read case numbers as dates", () => {
    expect(findDates("मु.अ.सं. 214/2023 धारा 379/411")).toEqual([]);
  });
  it("records the matched text", () => {
    expect(findDates("arrested on 14th January, 2025")[0]!.text).toBe("14th January, 2025");
  });
  it("reads a date written straight after an abbreviation's dot", () => {
    expect(findDates("order dt.15.9.1989").map((d) => d.iso)).toEqual(["1989-09-15"]);
    expect(findDates("No.3 of 2016 dt.07-02-2020").map((d) => d.iso)).toEqual(["2020-02-07"]);
  });
  it("still skips a date glued to a longer number", () => {
    expect(findDates("ref 1.12.12.2020")).toEqual([]);
  });
  it("requires the same separator on both sides of the month", () => {
    expect(findDates("vide F.No. 13-1/2004")).toEqual([]);
    expect(findDates("on 13.1/2004")).toEqual([]);
    expect(findDates("on 13-1-2004").map((d) => d.iso)).toEqual(["2004-01-13"]);
  });
  it("reads an ordinal with a space before it", () => {
    expect(findDates("on 9 th of May, 1972").map((d) => d.iso)).toEqual(["1972-05-09"]);
    expect(findDates("on 2 nd December, 1996").map((d) => d.iso)).toEqual(["1996-12-02"]);
    expect(findDates("on May 3 rd, 2016").map((d) => d.iso)).toEqual(["2016-05-03"]);
  });
  it("reads \"the Nth day of Month, Year\"", () => {
    expect(findDates("on the 24th day of August, 2021").map((d) => d.iso)).toEqual(["2021-08-24"]);
    expect(findDates("on the 24th day of August, 2021")[0]!.text).toBe("24th day of August, 2021");
  });
});
