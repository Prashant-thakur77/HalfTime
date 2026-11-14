import { describe, expect, it } from "vitest";
import { BaselineRequest, ExtractRequest, RulesRequest } from "@/lib/server/validate";

describe("request validation", () => {
  it("bounds document text", () => {
    expect(ExtractRequest.safeParse({ text: "a".repeat(39) }).success).toBe(false);
    expect(ExtractRequest.safeParse({ text: "a".repeat(40) }).success).toBe(true);
    expect(BaselineRequest.safeParse({ text: "a".repeat(60_001) }).success).toBe(false);
  });
  it("accepts only ISO dates for today, custody and registration", () => {
    const base = { sections: [{ act: "IPC", section: "379" }], custodyStart: "2024-05-20", firstTimeOffender: "unknown", otherPendingCases: "unknown" };
    expect(RulesRequest.safeParse({ input: base, today: "2026-11-15" }).success).toBe(true);
    expect(RulesRequest.safeParse({ input: base, today: "15.11.2026" }).success).toBe(false);
    expect(RulesRequest.safeParse({ input: { ...base, custodyStart: "May 2024" }, today: "2026-11-15" }).success).toBe(false);
    expect(RulesRequest.safeParse({ input: { ...base, custodyStart: null }, today: "2026-11-15" }).success).toBe(true);
    expect(RulesRequest.safeParse({ input: { ...base, registeredOn: "yesterday" }, today: "2026-11-15" }).success).toBe(false);
  });
});
