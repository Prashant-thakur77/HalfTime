import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

const run = JSON.parse(readFileSync(new URL("../src/data/agent-run.json", import.meta.url), "utf8")) as {
  events: { kind: string }[];
  stats: { rejectedClaims: number; fixedOnRetry: number };
};

const ORDER = ["PAST_THE_LINE", "PAST_FLAGGED", "CANT_TELL", "NOT_YET", "EXCLUDED"];

test.describe("docket agent page", () => {
  test("loads, skips the replay to the result, and shows the docket in priority order", async ({ page }) => {
    await page.goto("/agent");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("The docket agent");
    await expect(page.getByText(/recorded run on the 12 constructed sample orders/i)).toBeVisible();

    await page.getByRole("button", { name: "Skip to result" }).click();
    const log = page.getByRole("list", { name: "Agent log, recorded run" });
    await expect(log.locator("li[data-kind]")).toHaveCount(run.events.length);
    await expect(page.getByRole("status").filter({ hasText: `All ${run.events.length} steps` })).toBeVisible();
    await expect(page.locator("#docket-h")).toBeFocused();

    const rows = page.locator("[data-docket-row]");
    await expect(rows).toHaveCount(12);
    const verdicts = await rows.evaluateAll((els) => els.map((e) => e.getAttribute("data-verdict")!));
    const ranks = verdicts.map((v) => ORDER.indexOf(v));
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    await expect(rows.first().getByRole("link").first()).toHaveAttribute("href", /^\/case\/S\d\d$/);

    if (run.stats.rejectedClaims > 0) {
      await expect(log.locator('li[data-kind="rejected"]').first()).toBeVisible();
      await expect(log.locator('li[data-kind="rejected"]').first()).toContainText("Rejected");
    }
    if (run.stats.fixedOnRetry > 0) await expect(log.locator('li[data-kind="fixed"]')).toHaveCount(run.events.filter((e) => e.kind === "fixed").length);
  });

  test("plays and pauses", async ({ page }) => {
    await page.goto("/agent");
    const play = page.getByRole("button", { name: /^(Play|Pause|Resume)$/ });
    await play.scrollIntoViewIfNeeded();
    await expect(page.locator("li[data-kind]").first()).toBeVisible();
    await page.getByRole("button", { name: "Pause" }).click();
    await expect(page.getByRole("button", { name: "Resume" })).toBeVisible();
    const shown = await page.locator("li[data-kind]").count();
    await page.waitForTimeout(1200);
    await expect(page.locator("li[data-kind]")).toHaveCount(shown);
    await page.getByRole("button", { name: "4×" }).click();
    await expect(page.getByRole("button", { name: "4×" })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Resume" }).click();
    await expect.poll(() => page.locator("li[data-kind]").count()).toBeGreaterThan(shown);
  });

  test("reduced motion shows the whole log at once", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/agent");
    await expect(page.getByRole("list", { name: "Agent log, recorded run" }).locator("li[data-kind]")).toHaveCount(run.events.length);
  });

  test("no serious or critical axe issues", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/agent");
    await page.waitForLoadState("networkidle");
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    const bad = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(bad.map((v) => `${v.id}: ${v.nodes.length} × ${v.help}`)).toEqual([]);
  });

  test("no horizontal scroll at 360px", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 780 } });
    const page = await ctx.newPage();
    await page.goto("/agent");
    await page.getByRole("button", { name: "Skip to result" }).click();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await ctx.close();
  });
});
