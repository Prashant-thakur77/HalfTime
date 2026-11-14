import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

/**
 * Bring-your-own-key journey. Runs only when E2E_ANTHROPIC_KEY is set, because
 * it makes real (small) Anthropic calls on that key.
 */
const KEY = process.env.E2E_ANTHROPIC_KEY;

test.describe("bring your own key", () => {
  test.skip(!KEY, "set E2E_ANTHROPIC_KEY to run");

  test("upload is locked until a key is added", async ({ page }) => {
    await page.goto("/sweep");
    await expect(page.getByRole("button", { name: "Choose files" })).toBeDisabled();
  });

  test("a bad key is refused without being stored", async ({ page }) => {
    await page.goto("/sweep");
    await page.getByLabel("Your Anthropic API key").fill("sk-ant-api03-thisisnotarealkeyatallxxxxxxxx");
    await page.getByRole("button", { name: "Use this key" }).click();
    await expect(page.getByRole("alert").filter({ hasText: /rejected|isn't allowed/ })).toBeVisible();
    expect(await page.evaluate(() => sessionStorage.getItem("ht-anthropic-key"))).toBeNull();
  });

  test("key goes browser → Anthropic, never to our server; an upload is read and verified", async ({ page }) => {
    const ourApi: string[] = [];
    const anthropic: string[] = [];
    page.on("request", (r) => {
      if (r.url().includes("/api/")) ourApi.push(r.url());
      if (r.url().startsWith("https://api.anthropic.com/")) anthropic.push(r.url());
      const auth = r.headers()["x-api-key"];
      if (auth && !r.url().startsWith("https://api.anthropic.com/")) throw new Error(`key sent to ${r.url()}`);
    });

    await page.goto("/sweep");
    await page.getByLabel("Your Anthropic API key").fill(KEY!);
    await page.getByRole("button", { name: "Use this key" }).click();
    await expect(page.getByText(/Using your Anthropic key/)).toBeVisible({ timeout: 30_000 });

    const order = readFileSync("../../eval/constructed/orders.jsonl", "utf8").split("\n")[0]!;
    const text = JSON.parse(order).text as string;
    await page.locator('input[type="file"]').setInputFiles({ name: "order.txt", mimeType: "text/plain", buffer: Buffer.from(text) });
    await expect(page.getByText(/order\.txt: done/)).toBeVisible({ timeout: 90_000 });
    await expect(page.getByRole("link", { name: /order\.txt/ })).toBeVisible();

    expect(anthropic.length).toBeGreaterThan(0);
    expect(ourApi).toEqual([]);
  });
});
