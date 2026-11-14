import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("story page", () => {
  test("loads with its opening, timeline and sources", async ({ page }) => {
    await page.goto("/story");
    await expect(page).toHaveTitle(/Why HalfTime exists/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Rs 1,000");
    await expect(page.getByRole("heading", { name: "The line has been law since 2006." })).toBeVisible();
    const sources = page.getByTestId("story-sources").getByRole("link");
    await expect(sources).toHaveCount(8);
    for (const host of ["legallyindia.com", "indiankanoon.org", "dailyexcelsior.com", "researchsquare.com", "livelaw.in", "advocatekhoj.com"]) {
      await expect(page.locator(`[data-testid="story-sources"] a[href*="${host}"]`).first()).toBeVisible();
    }
    await expect(page.getByText(/eligible|will be released/i)).toHaveCount(0);
  });

  test("content is visible without animation", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/story");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: "Built for the people who already have the duty." })).toBeVisible();
    await expect(page.getByText("Undertrial Review Committees")).toBeVisible();
  });

  test("no serious or critical axe issues on /story", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/story");
    await page.waitForLoadState("networkidle");
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    const bad = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(bad.map((v) => `${v.id}: ${v.nodes.length} × ${v.help}`)).toEqual([]);
  });

  test("no horizontal scroll at 360px", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 780 } });
    const page = await ctx.newPage();
    for (const path of ["/story", "/results"]) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
    await ctx.close();
  });
});

test.describe("results page, real judgments", () => {
  test("shows the InLegalNER section", async ({ page }) => {
    await page.goto("/results");
    const section = page.locator("section", { has: page.getByRole("heading", { name: "On real judgments (no model)" }) });
    await expect(section).toBeVisible();
    await expect(section).toContainText("InLegalNER");
    await expect(section).toContainText("MIT licence");
    await expect(section.getByRole("region", { name: "Section parsing table" })).toBeVisible();
    await expect(section).toContainText("What it does not show");
  });

  test("no serious or critical axe issues on /results", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/results");
    await page.waitForLoadState("networkidle");
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    const bad = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(bad.map((v) => `${v.id}: ${v.nodes.length} × ${v.help}`)).toEqual([]);
  });
});
