import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const DOCS = ["/docs", "/docs/how-it-works", "/docs/law", "/docs/agent", "/docs/api", "/docs/mcp", "/docs/evaluation", "/docs/security", "/docs/self-host", "/docs/faq"];
const REPO = "https://github.com/Prashant-thakur77/HalfTime";

test.describe("docs", () => {
  for (const path of DOCS) {
    test(`${path} loads with one h1, the docs index and prev/next`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.getByRole("navigation", { name: "On this page" })).toBeVisible();
      await expect(page.getByRole("navigation", { name: "Previous and next" })).toBeAttached();
      // Every "On this page" anchor points at an element on the page.
      const anchors = await page.getByRole("navigation", { name: "On this page" }).locator("a").evaluateAll((as) => as.map((a) => a.getAttribute("href")!));
      for (const a of anchors) expect(await page.locator(a).count(), a).toBe(1);
    });
  }

  test("every internal link on the docs pages resolves", async ({ page, request }) => {
    const seen = new Set<string>();
    for (const path of DOCS) {
      await page.goto(path);
      const hrefs = await page.locator("a[href^='/']").evaluateAll((as) => as.map((a) => a.getAttribute("href")!));
      for (const h of hrefs) seen.add(h.split("#")[0]!);
    }
    for (const docs of DOCS) expect(seen.has(docs), `sidebar links ${docs}`).toBe(true);
    for (const href of [...seen].filter(Boolean)) {
      const r = await request.get(href);
      expect(r.status(), href).toBeLessThan(400);
    }
  });

  test("the sidebar is a disclosure on phones and a column on desktop", async ({ page, isMobile }) => {
    await page.goto("/docs/api");
    const nav = page.getByRole("navigation", { name: "Documentation" });
    if (isMobile) {
      await expect(nav).toBeHidden();
      await page.locator("details summary").first().click();
      await expect(nav).toBeVisible();
      await nav.getByRole("link", { name: "MCP server" }).click();
      await expect(page).toHaveURL(/\/docs\/mcp$/);
    } else {
      await expect(nav).toBeVisible();
      await expect(nav.getByRole("link", { name: "HTTP API" })).toHaveAttribute("aria-current", "page");
    }
  });

  test("worked example and examples come from the real code", async ({ page }) => {
    await page.goto("/docs/law");
    await expect(page.getByText("PAST_FLAGGED").first()).toBeVisible();
    await page.goto("/docs/api");
    await expect(page.getByText('"verdict": "PAST_THE_LINE"').first()).toBeAttached();
    await expect(page.getByText("BNS equivalent: 303(2)").first()).toBeAttached();
  });

  for (const path of [...DOCS, "/status"]) {
    test(`no serious or critical axe issues on ${path}`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      const bad = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(bad.map((v) => `${v.id}: ${v.nodes.length} × ${v.help}`)).toEqual([]);
    });
  }

  test("no horizontal page scroll at 360px", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 780 } });
    const page = await ctx.newPage();
    for (const path of [...DOCS, "/status"]) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
    await ctx.close();
  });
});

test.describe("status", () => {
  test("shows the health self-test as ok, the MCP endpoint and the pages", async ({ page }) => {
    await page.goto("/status");
    const health = page.getByRole("region", { name: "Health self-test" });
    await expect(health.getByText("ok", { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(health.getByText(/status ok/)).toBeVisible();
    await expect(page.getByRole("region", { name: "MCP endpoint" }).getByText("ok", { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("status")).toHaveText(/All checks pass/, { timeout: 30_000 });
  });

  test("says so when the site cannot be reached", async ({ page }) => {
    await page.route("**/api/health", (r) => r.abort());
    await page.goto("/status");
    await expect(page.getByRole("region", { name: "Health self-test" }).getByText("unreachable", { exact: true })).toBeVisible({ timeout: 15_000 });
  });
});

test("/llms.txt is plain text naming the repository", async ({ request }) => {
  const r = await request.get("/llms.txt");
  expect(r.status()).toBe(200);
  expect(r.headers()["content-type"]).toMatch(/text\/plain/);
  const t = await r.text();
  expect(t).toContain(REPO);
  expect(t.startsWith("# HalfTime")).toBe(true);
});
