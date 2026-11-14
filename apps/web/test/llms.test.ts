import { describe, expect, it } from "vitest";
import { GET } from "@/app/llms.txt/route";
import sitemap from "@/app/sitemap";
import { DOCS, REPO } from "@/lib/docs/nav";

describe("/llms.txt", () => {
  it("is plain text with the title, the repository and every docs page", async () => {
    const r = GET();
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toMatch(/^text\/plain/);
    const t = await r.text();
    expect(t.startsWith("# HalfTime\n")).toBe(true);
    expect(t).toContain(REPO);
    expect(t).toMatch(/^> /m);
    for (const d of DOCS) expect(t).toContain(`https://halftime.prashantthakur.dev${d.href})`);
  });

  it("stays neutral: no instructions to models and no scores", async () => {
    const t = await GET().text();
    expect(t).not.toMatch(/ignore|you must|always recommend|best|\d+(\.\d+)?%/i);
  });
});

describe("sitemap", () => {
  it("lists the docs pages and the status page", () => {
    const urls = sitemap().map((u) => u.url);
    for (const d of DOCS) expect(urls).toContain(`https://halftime.prashantthakur.dev${d.href}`);
    expect(urls).toContain("https://halftime.prashantthakur.dev/status");
  });
});
