import { beforeEach, describe, expect, it } from "vitest";
import { env, MemoryKV } from "./fake-env";
import { handleMcp, MAX_BODY_BYTES, PER_MINUTE } from "@/lib/server/mcp";

const rpc = (body: unknown, headers: Record<string, string> = {}) =>
  new Request("http://test/mcp", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream", ...headers },
    body: JSON.stringify(body)
  });

beforeEach(() => {
  for (const k of Object.keys(env)) delete (env as Record<string, unknown>)[k];
});

describe("/mcp (remote MCP endpoint)", () => {
  it("lists the HalfTime tools over stateless Streamable HTTP", async () => {
    const r = await handleMcp(rpc({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }));
    expect(r.status).toBe(200);
    const j = await r.json();
    const names = j.result.tools.map((t: { name: string }) => t.name);
    for (const n of ["check_order", "sweep_jail", "apply_section_479", "lookup_section", "draft_application", "get_sample_order"]) expect(names).toContain(n);
    // local-only file tools are never exposed on the public endpoint
    expect(names).not.toContain("read_order_file");
  });

  it("applies the law through a tool call", async () => {
    const r = await handleMcp(
      rpc({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "lookup_section", arguments: { act: "IPC", section: "379" } } })
    );
    const j = await r.json();
    expect(JSON.stringify(j.result)).toMatch(/up to 3 years/);
    expect(JSON.stringify(j.result)).toMatch(/BNS equivalent: 303\(2\)/);
  });

  it("refuses bodies over the size limit, by header and by actual length", async () => {
    const big = rpc({ jsonrpc: "2.0", id: 3, method: "tools/list" }, { "content-length": String(MAX_BODY_BYTES + 1) });
    expect((await handleMcp(big)).status).toBe(413);
    const padded = rpc({ jsonrpc: "2.0", id: 4, method: "tools/list", params: { pad: "x".repeat(MAX_BODY_BYTES) } });
    expect((await handleMcp(padded)).status).toBe(413);
  });

  it("rate-limits each IP per minute with KV", async () => {
    env.CACHE = new MemoryKV();
    const minute = Math.floor(Date.now() / 60000);
    (env.CACHE as MemoryKV).store.set(`rl:mcp:198.51.100.7:${minute}`, String(PER_MINUTE));
    const r = await handleMcp(rpc({ jsonrpc: "2.0", id: 5, method: "tools/list" }, { "cf-connecting-ip": "198.51.100.7" }));
    expect(r.status).toBe(429);
  });

  it("still rate-limits when KV is not bound", async () => {
    let last = 200;
    for (let i = 0; i <= PER_MINUTE; i++) {
      last = (await handleMcp(rpc({ jsonrpc: "2.0", id: 6 + i, method: "tools/list" }, { "cf-connecting-ip": "192.0.2.44" }))).status;
    }
    expect(last).toBe(429);
  });

  it("rejects an over-long document in a tool call", async () => {
    const r = await handleMcp(
      rpc({ jsonrpc: "2.0", id: 9, method: "tools/call", params: { name: "check_order", arguments: { document_text: "क".repeat(120_001), extraction: {} } } })
    );
    const j = await r.json();
    expect(JSON.stringify(j)).toMatch(/isError|too_big|120000|error/i);
  });
});
