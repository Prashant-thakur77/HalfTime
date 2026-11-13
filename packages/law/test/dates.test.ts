import { describe, expect, it } from "vitest";
import { addFractionOfMonths, daysBetween, describeMonths, humanDate, parseIsoDate, toIso } from "../src/index.js";

const add = (start: string, months: number, n: number, d: number) => toIso(addFractionOfMonths(parseIsoDate(start)!, months, n, d));

describe("parseIsoDate", () => {
  it("accepts valid dates", () => expect(toIso(parseIsoDate("2024-02-29")!)).toBe("2024-02-29"));
  for (const bad of ["2023-02-29", "2023-02-30", "2023-13-01", "2023-1-01", "12/03/2023", "", "2023-04-31"]) {
    it(`rejects ${JSON.stringify(bad)}`, () => expect(parseIsoDate(bad)).toBeNull());
  }
  it("rejects null and undefined", () => {
    expect(parseIsoDate(null)).toBeNull();
    expect(parseIsoDate(undefined)).toBeNull();
  });
});

describe("addFractionOfMonths", () => {
  const cases: [string, number, number, number, string][] = [
    ["2023-03-12", 36, 1, 2, "2024-09-12"],
    ["2023-03-12", 36, 1, 3, "2024-03-12"],
    ["2021-01-31", 36, 1, 2, "2022-07-31"],
    ["2021-08-31", 84, 1, 2, "2025-02-28"],
    ["2022-08-31", 36, 1, 2, "2024-02-29"],
    ["2024-02-29", 36, 1, 3, "2025-02-28"],
    ["2024-02-29", 24, 1, 2, "2025-02-28"],
    ["2024-02-29", 48, 1, 2, "2026-02-28"],
    ["2020-02-29", 96, 1, 2, "2024-02-29"],
    ["2023-01-31", 2, 1, 2, "2023-02-28"],
    ["2023-12-31", 12, 1, 3, "2024-04-30"],
    ["2026-01-10", 1, 1, 2, "2026-01-26"],
    ["2026-02-10", 1, 1, 2, "2026-02-24"],
    ["2026-04-10", 1, 1, 2, "2026-04-25"],
    ["2026-01-10", 1, 1, 3, "2026-01-21"],
    ["2026-01-10", 3, 1, 2, "2026-02-24"],
    ["2024-01-10", 3, 1, 2, "2024-02-25"],
    ["2026-05-31", 6, 1, 2, "2026-08-31"],
    ["2026-05-31", 6, 1, 3, "2026-07-31"],
    ["2019-11-15", 168, 1, 2, "2026-11-15"],
    ["2019-11-15", 168, 1, 3, "2024-07-15"],
    ["2020-01-01", 240, 1, 2, "2030-01-01"],
    ["2020-01-01", 240, 1, 3, "2026-09-01"],
    ["2020-01-01", 60, 1, 3, "2021-09-01"],
    ["2020-01-01", 120, 1, 3, "2023-05-01"],
    ["2020-01-01", 84, 1, 3, "2022-05-01"],
    ["2020-01-01", 36, 1, 1, "2023-01-01"]
  ];
  for (const [start, months, n, d, want] of cases) {
    it(`${start} + ${n}/${d} of ${months} months = ${want}`, () => expect(add(start, months, n, d)).toBe(want));
  }
});

describe("describeMonths", () => {
  const cases: [number, string][] = [
    [0, "0 months"],
    [1, "1 month"],
    [6, "6 months"],
    [12, "1 year"],
    [18, "1 year 6 months"],
    [36, "3 years"],
    [42, "3 years 6 months"],
    [13, "1 year 1 month"],
    [1.5, "1.5 months"],
    [0.333333, "0.33 months"]
  ];
  for (const [m, want] of cases) it(`${m} -> ${want}`, () => expect(describeMonths(m)).toBe(want));
});

describe("daysBetween and humanDate", () => {
  it("counts calendar days", () => expect(daysBetween(parseIsoDate("2024-02-28")!, parseIsoDate("2024-03-01")!)).toBe(2));
  it("is negative backwards", () => expect(daysBetween(parseIsoDate("2024-03-01")!, parseIsoDate("2024-02-28")!)).toBe(-2));
  it("formats for people", () => expect(humanDate(parseIsoDate("2024-09-12")!)).toBe("12 Sep 2024"));
});
