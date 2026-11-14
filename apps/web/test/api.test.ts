import { beforeEach, describe, expect, it } from "vitest";
import { env, MemoryKV } from "./fake-env";
import { POST as rules } from "@/app/api/rules/route";
import { POST as extract } from "@/app/api/extract/route";
import { POST as baseline } from "@/app/api/baseline/route";

const post = (body: unknown, headers: Record<string, string> = {}) =>
  new Request("http://test/api", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) });

const theft = { sections: [{ act: "IPC", section: "379" }], custodyStart: "2024-05-20", firstTimeOffender: "true", otherPendingCases: "false" };

beforeEach(() => {
  for (const k of Object.keys(env)) delete (env as Record<string, unknown>)[k];
  delete process.env.ANTHROPIC_API_KEY;
});

describe("POST /api/rules (the law engine over HTTP)", () => {
  it("applies Section 479 to valid facts", async () => {
    const r = await rules(post({ input: theft, today: "2026-11-15" }));
    expect(r.status).toBe(200);
    const e = await r.json();
    expect(e.verdict).toBe("PAST_THE_LINE");
    expect(e.lineDate).toBe("2025-05-20");
  });
  it("rejects a body that is not JSON", async () => {
    expect((await rules(post("{not json"))).status).toBe(400);
  });
  it("rejects a custody date that is not YYYY-MM-DD", async () => {
    const r = await rules(post({ input: { ...theft, custodyStart: "20/05/2024" }, today: "2026-11-15" }));
    expect(r.status).toBe(400);
    expect((await r.json()).error).toMatch(/YYYY-MM-DD/);
  });
  it("rejects an unknown act and an over-long section", async () => {
    expect((await rules(post({ input: { ...theft, sections: [{ act: "XYZ", section: "1" }] }, today: "2026-11-15" }))).status).toBe(400);
    expect((await rules(post({ input: { ...theft, sections: [{ act: "IPC", section: "9".repeat(41) }] }, today: "2026-11-15" }))).status).toBe(400);
  });
});

describe("POST /api/extract and /api/baseline (model routes)", () => {
  const order = "न्यायालय अपर सत्र न्यायाधीश, आगरा। प्रार्थी/अभियुक्त दिनांक 14.03.2023 से जिला कारागार आगरा में निरुद्ध है।";
  it("refuses text that is too short or too long before touching the model", async () => {
    expect((await extract(post({ text: "short" }))).status).toBe(400);
    expect((await extract(post({ text: "x".repeat(60_001) }))).status).toBe(400);
    expect((await baseline(post({ text: "short" }))).status).toBe(400);
  });
  it("answers 503, not a crash, when the server has no key (the site reads with the visitor's own key)", async () => {
    const r = await extract(post({ text: order }));
    expect(r.status).toBe(503);
  });
  it("rate-limits each IP per minute", async () => {
    env.ANTHROPIC_API_KEY = "test-key-not-used";
    env.CACHE = new MemoryKV();
    const kv = env.CACHE as MemoryKV;
    const minute = Math.floor(Date.now() / 60000);
    kv.store.set(`rl:extract:203.0.113.9:${minute}`, "12");
    const r = await extract(post({ text: order }, { "cf-connecting-ip": "203.0.113.9" }));
    expect(r.status).toBe(429);
  });
  it("stops at the daily spend cap", async () => {
    env.ANTHROPIC_API_KEY = "test-key-not-used";
    env.DAILY_SPEND_CAP_USD = "1";
    env.CACHE = new MemoryKV();
    (env.CACHE as MemoryKV).store.set(`spend:${new Date().toISOString().slice(0, 10)}`, "1.5");
    const r = await extract(post({ text: order }));
    expect(r.status).toBe(503);
    expect((await r.json()).error).toMatch(/budget/i);
  });
});
