import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("playground", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/playground");
    await page.waitForLoadState("networkidle");
  });

  test("a real quote is found and marked in the order", async ({ page }) => {
    await page.getByRole("button", { name: "A real quote" }).click();
    await expect(page.getByText("Found in the order")).toBeVisible();
    await expect(page.locator("mark")).toContainText("14.03.2023");
  });

  test("a planted quote is not in the order", async ({ page }) => {
    await page.getByRole("button", { name: "A planted quote" }).click();
    await expect(page.getByText("Not in the order")).toBeVisible();
    await expect(page.getByText("The quoted text is not in the document.")).toBeVisible();
    await expect(page.locator("mark")).toHaveCount(0);
  });

  test("a paraphrase is not in the order", async ({ page }) => {
    await page.getByRole("button", { name: "A paraphrase" }).click();
    await expect(page.getByText("Not in the order")).toBeVisible();
  });

  test("a wrong claimed date is caught", async ({ page }) => {
    await page.getByRole("button", { name: "A real quote" }).click();
    await page.getByLabel("Claimed date").fill("2023-03-15");
    await expect(page.getByText("The quote gives 2023-03-14, not 2023-03-15.")).toBeVisible();
  });

  test("NLU Delhi 2011 preset is past the line", async ({ page }) => {
    await page.getByRole("button", { name: "NLU Delhi 2011 (theft, 2 years)" }).click();
    const trace = page.getByRole("list", { name: "Rule trace" });
    await expect(trace).toContainText("PAST THE LINE by 190 days");
    await expect(trace).toContainText("Line: 1 Dec 2010.");
  });

  test("two offences are flagged under 479(2), never called eligible", async ({ page }) => {
    await page.getByRole("button", { name: "Theft + stolen property (flagged)" }).click();
    await expect(page.getByText("flagged · 479(2)", { exact: true })).toBeVisible();
    await expect(page.locator("main")).not.toContainText(/eligible/i);
  });

  test("attempt to murder is outside 479", async ({ page }) => {
    await page.getByRole("button", { name: "Attempt to murder (outside 479)" }).click();
    await expect(page.getByRole("list", { name: "Rule trace" })).toContainText("EXCLUDED");
  });

  test("no serious or critical axe issues", async ({ page }) => {
    await page.getByRole("button", { name: "A real quote" }).click();
    await expect(page.getByText("Found in the order")).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    const bad = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(bad.map((v) => `${v.id}: ${v.nodes.length} × ${v.help}`)).toEqual([]);
  });

  test("no horizontal scroll at 360px", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 780 } });
    const p = await ctx.newPage();
    await p.goto("/playground");
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await ctx.close();
  });
});
