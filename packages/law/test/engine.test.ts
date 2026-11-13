import { describe, expect, it } from "vitest";
import { evaluate, type CaseInput } from "../src/index.js";

const TODAY = "2026-11-15";
const theft = (over: Partial<CaseInput> = {}): CaseInput => ({
  sections: [{ act: "IPC", section: "379", spanId: 1 }],
  custodyStart: "2023-03-12",
  custodySpanId: 4,
  firstTimeOffender: "false",
  otherPendingCases: "false",
  ...over
});

describe("evaluate: inputs", () => {
  it("rejects an invalid today", () => {
    expect(() => evaluate(theft(), "15/11/2026")).toThrow(/Invalid today/);
  });
  it("treats negative delay as zero", () => {
    expect(evaluate(theft({ accusedDelayDays: -40 }), TODAY).lineDate).toBe("2024-09-12");
  });
  it("floors fractional delay", () => {
    expect(evaluate(theft({ accusedDelayDays: 1.9 }), TODAY).lineDate).toBe("2024-09-13");
  });
  it("ignores a zero or invalid override", () => {
    expect(evaluate(theft({ maxTermOverrideMonths: 0 }), TODAY).maxTermMonths).toBe(36);
    expect(evaluate(theft({ maxTermOverrideMonths: Number.NaN }), TODAY).maxTermMonths).toBe(36);
    expect(evaluate(theft({ maxTermOverrideMonths: null }), TODAY).maxTermMonths).toBe(36);
  });
  it("uses an override over the table", () => {
    const r = evaluate(theft({ maxTermOverrideMonths: 12 }), TODAY);
    expect(r.maxTermMonths).toBe(12);
    expect(r.trace.some((t) => /entered by the reviewing lawyer/.test(t.text))).toBe(true);
  });
  it("dedupes repeated sections", () => {
    const r = evaluate(theft({ sections: [{ act: "IPC", section: "379" }, { act: "IPC", section: "379" }, { act: "IPC", section: "३७९" }] }), TODAY);
    expect(r.sections).toHaveLength(1);
    expect(r.verdict).toBe("PAST_THE_LINE");
  });
  it("needs at least one section", () => {
    const r = evaluate(theft({ sections: [] }), TODAY);
    expect(r.verdict).toBe("CANT_TELL");
    expect(r.missing).toContain("A charged section with a known punishment");
  });
});

describe("evaluate: trace", () => {
  it("links spans for sections and custody", () => {
    const r = evaluate(theft(), TODAY);
    expect(r.trace.find((t) => t.step === "section")?.spanId).toBe(1);
    expect(r.trace.find((t) => t.step === "custody")?.spanId).toBe(4);
  });
  it("omits span ids when absent", () => {
    const r = evaluate(theft({ sections: [{ act: "IPC", section: "379" }], custodySpanId: undefined }), TODAY);
    expect(r.trace.find((t) => t.step === "section")).not.toHaveProperty("spanId");
    expect(r.trace.find((t) => t.step === "custody")).not.toHaveProperty("spanId");
  });
  it("cites the statute for sections", () => {
    expect(evaluate(theft(), TODAY).trace[0]).toMatchObject({ step: "section", source: "IPC 1860 s.379" });
  });
  it("describes every punishment kind", () => {
    const sections = [
      { act: "IPC" as const, section: "379" },
      { act: "IPC" as const, section: "34" },
      { act: "IPC" as const, section: "120B" },
      { act: "IPC" as const, section: "511" },
      { act: "IPC" as const, section: "497" },
      { act: "IPC" as const, section: "507" },
      { act: "NDPS" as const, section: "20" },
      { act: "IPC" as const, section: "999" }
    ];
    const text = evaluate(theft({ sections }), TODAY).trace.map((t) => t.text).join("\n");
    for (const s of ["max 3 years", "not a separate offence", "punished as the main offence", "adjusts the main offence", "struck down", "depends on details", "depends on the quantity class", "not in the tables"]) {
      expect(text).toContain(s);
    }
  });
  it("describes life and death", () => {
    const life = evaluate(theft({ sections: [{ act: "IPC", section: "307" }] }), TODAY);
    expect(life.trace.map((t) => t.text).join()).toMatch(/imprisonment for life/);
    const death = evaluate(theft({ sections: [{ act: "IPC", section: "302" }, { act: "IPC", section: "307" }] }), TODAY);
    expect(death.trace.find((t) => t.step === "excluded")?.text).toMatch(/allow death/);
  });
  it("uses singular wording for one excluded section", () => {
    expect(evaluate(theft({ sections: [{ act: "IPC", section: "302" }] }), TODAY).trace.find((t) => t.step === "excluded")?.text).toMatch(/allows death/);
  });
  it("mentions the longest maximum among several", () => {
    const r = evaluate(theft({ sections: [{ act: "IPC", section: "379" }, { act: "IPC", section: "420" }] }), TODAY);
    expect(r.trace.find((t) => t.step === "max_term")?.text).toMatch(/Longest maximum among the charges: 7 years/);
  });
  it("notes delay, singular and plural", () => {
    expect(evaluate(theft({ accusedDelayDays: 1 }), TODAY).trace.find((t) => t.step === "delay")?.text).toMatch(/^1 day of delay/);
    expect(evaluate(theft({ accusedDelayDays: 9 }), TODAY).trace.find((t) => t.step === "delay")?.text).toMatch(/^9 days of delay/);
  });
  it("words the first-time fraction three ways", () => {
    const f = (ft: CaseInput["firstTimeOffender"]) => evaluate(theft({ firstTimeOffender: ft }), TODAY).trace.find((t) => t.step === "fraction")!.text;
    expect(f("true")).toMatch(/one-third/);
    expect(f("false")).toMatch(/one-half/);
    expect(f("unknown")).toMatch(/safe line/);
  });
  it("says singular day counts", () => {
    const past1 = evaluate(theft({ custodyStart: "2025-05-14" }), TODAY);
    expect(past1.trace.at(-1)?.text).toMatch(/by 1 day:/);
    const flagged1 = evaluate(theft({ custodyStart: "2025-05-14", otherPendingCases: "true" }), TODAY);
    expect(flagged1.trace.at(-1)?.text).toMatch(/by 1 day,/);
    const togo1 = evaluate(theft({ custodyStart: "2025-05-16" }), TODAY);
    expect(togo1.trace.at(-1)?.text).toMatch(/1 day to the line/);
  });
});

describe("evaluate: provision", () => {
  it("IPC sections without a registration date are treated as pre-July 2024", () => {
    const r = evaluate(theft(), TODAY);
    expect(r.provision).toBe("BNSS_479_PRE_JULY_2024");
    expect(r.oldLawLineDate).toBe("2024-09-12");
  });
  it("BNS sections without a date are post-July", () => {
    const r = evaluate(theft({ sections: [{ act: "BNS", section: "303(2)" }] }), TODAY);
    expect(r.provision).toBe("BNSS_479");
    expect(r.oldLawLineDate).toBeNull();
  });
  it("an invalid registration date falls back to the act", () => {
    expect(evaluate(theft({ registeredOn: "yesterday" }), TODAY).provision).toBe("BNSS_479_PRE_JULY_2024");
  });
});

describe("evaluate: missing facts", () => {
  it("names a bad custody string", () => {
    expect(evaluate(theft({ custodyStart: "12.03.2023" }), TODAY).missing).toContain('A valid custody start date (got "12.03.2023")');
  });
  it("lists both a missing term and a missing date", () => {
    const r = evaluate(theft({ sections: [{ act: "NDPS", section: "20" }], custodyStart: null }), TODAY);
    expect(r.missing).toHaveLength(2);
  });
  it("asks for the main offence of a derivative charge", () => {
    expect(evaluate(theft({ sections: [{ act: "IPC", section: "471" }] }), TODAY).missing[0]).toMatch(/main offence for IPC 1860 s.471/);
  });
  it("struck-down sections are flagged even when the case can't be decided", () => {
    const r = evaluate(theft({ sections: [{ act: "IT", section: "66A" }] }), TODAY);
    expect(r.flags[0]).toMatch(/struck down/);
  });
});

describe("evaluate: past and not yet", () => {
  it("reports the not-yet countdown", () => {
    const r = evaluate(theft({ custodyStart: "2026-01-01" }), TODAY);
    expect(r).toMatchObject({ verdict: "NOT_YET", lineDate: "2027-07-01", daysToGo: 228, pastIfFirstTime: false });
  });
  it("flags multiple offences with their names", () => {
    const r = evaluate(theft({ sections: [{ act: "IPC", section: "379" }, { act: "IPC", section: "411" }] }), TODAY);
    expect(r.flags.some((f) => /IPC 1860 s.379, IPC 1860 s.411/.test(f))).toBe(true);
  });
  it("does not count modifiers, companions or struck sections as offences", () => {
    const r = evaluate(theft({ sections: [{ act: "IPC", section: "379/511" }, { act: "IPC", section: "34" }, { act: "IPC", section: "497" }] }), TODAY);
    expect(r.verdict).toBe("PAST_THE_LINE");
  });
  it("reports days detained net of delay", () => {
    expect(evaluate(theft({ custodyStart: "2026-11-01", accusedDelayDays: 4 }), TODAY).daysDetained).toBe(10);
    expect(evaluate(theft({ custodyStart: "2026-11-14", accusedDelayDays: 40 }), TODAY).daysDetained).toBe(0);
  });
  it("marks detention beyond the full term", () => {
    const r = evaluate(theft({ custodyStart: "2020-01-01" }), TODAY);
    expect(r.beyondMaximum).toBe(true);
    expect(r.flags[0]).toMatch(/full maximum term/);
    expect(r.verdict).toBe("PAST_THE_LINE");
  });
});
