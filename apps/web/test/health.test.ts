import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/health/route";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";
import manifest from "@/app/manifest";

describe("shipping endpoints", () => {
  it("/api/health self-tests the law engine and the verifier", async () => {
    const r = await GET();
    expect(r.status).toBe(200);
    const j = await r.json();
    expect(j).toMatchObject({ status: "ok", engine: "PAST_THE_LINE", verifier: true });
    expect(r.headers.get("cache-control")).toBe("no-store");
  });
  it("sitemap lists every page and every sample case", () => {
    const urls = sitemap().map((u) => u.url);
    for (const p of ["/sweep", "/playground", "/results", "/story", "/connect", "/case/S01", "/case/S12"]) expect(urls.some((u) => u.endsWith(p))).toBe(true);
  });
  it("robots keeps crawlers off the API and points at the sitemap", () => {
    const r = robots();
    expect(JSON.stringify(r.rules)).toContain("/api/");
    expect(r.sitemap).toMatch(/sitemap\.xml$/);
  });
  it("the web manifest makes the site installable", () => {
    const m = manifest();
    expect(m.display).toBe("standalone");
    expect(m.icons?.map((i) => i.sizes)).toEqual(["192x192", "512x512"]);
  });
});
