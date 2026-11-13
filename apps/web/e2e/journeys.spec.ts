import { expect, test } from "@playwright/test";

test.describe("landing", () => {
  test("shows the pitch, the national numbers and the way in", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/HalfTime/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Served half.");
    await expect(page.getByText("3,71,440").first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Run a jail sweep/i }).first()).toBeVisible();
    // Never a flat "ELIGIBLE".
    await expect(page.locator("body")).not.toContainText(/\bELIGIBLE\b/);
  });

  test("the ledger reaches the stamp", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.getByRole("heading", { name: /Every day inside/ }).scrollIntoViewIfNeeded();
    await expect(page.getByText("PAST THE LINE").first()).toBeVisible();
  });
});

test.describe("sweep", () => {
  test("sorts the sample jail into lanes and exports CSV", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/sweep");
    await page.getByRole("button", { name: /Sweep the sample jail/i }).click();
    await expect(page.getByRole("status").filter({ hasText: "papers read" })).toContainText("12 papers read");
    const past = page.getByRole("region", { name: "Past the line" });
    await expect(past.getByRole("link")).toHaveCount(6);
    await expect(page.getByRole("region", { name: "Outside 479" }).getByRole("link")).toHaveCount(1);
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: /Download CSV/i }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^halftime-sweep-\d{4}-\d{2}-\d{2}\.csv$/);
  });

  test("the date slider moves cards between lanes", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/sweep");
    await page.getByRole("button", { name: /Sweep the sample jail/i }).click();
    const notYet = page.getByRole("region", { name: "Not yet" }).getByRole("link");
    await expect(notYet).toHaveCount(3);
    const slider = page.getByLabel(/What if today is/i);
    await slider.fill("900");
    await expect(notYet).toHaveCount(1);
    await slider.fill("-540");
    await expect(page.getByRole("region", { name: "Past the line" }).getByRole("link")).not.toHaveCount(6);
  });
});

test.describe("case", () => {
  test("shows quotes, the trace and recomputes on edit", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/case/S02");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("mark").first()).toBeVisible();
    await expect(page.getByRole("list", { name: "Rule trace" })).toContainText("PAST THE LINE");
    await page.getByLabel("Custody began").fill("2026-11-01");
    await expect(page.getByRole("list", { name: "Rule trace" })).toContainText("NOT YET");
    await page.getByRole("button", { name: "Undo my edits" }).click();
    await expect(page.getByRole("list", { name: "Rule trace" })).toContainText("PAST THE LINE");
  });

  test("flagged case points the lawyer to 479(2)", async ({ page }) => {
    await page.goto("/case/S01");
    await expect(page.getByText(/Sec 479\(2\)/).first()).toBeVisible();
    await expect(page.getByText("LAWYER DECIDES 479(2)")).toBeVisible();
  });

  test("downloads the DOCX application in English and Hindi", async ({ page }) => {
    await page.goto("/case/S02");
    for (const name of [/DOCX · English/, /DOCX · हिन्दी/]) {
      const d = page.waitForEvent("download");
      await page.getByRole("button", { name }).click();
      const f = await d;
      expect(f.suggestedFilename()).toMatch(/^479-3-application-S02-(en|hi)\.docx$/);
    }
  });

  test("print view carries the draft watermark and the SC order for old cases", async ({ page }) => {
    await page.goto("/case/S02/application");
    await expect(page.getByText("DRAFT FOR LAWYER REVIEW · NOT FILED").first()).toBeVisible();
    await expect(page.getByText(/W\.P\.\(C\) No\. 406 of 2013/)).toBeVisible();
    await page.getByRole("button", { name: "हिन्दी में" }).click();
    await expect(page.getByText(/धारा 479\(3\)/).first()).toBeVisible();
  });

  test("an unknown case says so", async ({ page }) => {
    await page.goto("/case/u-doesnotexist");
    await expect(page.getByRole("heading", { name: /isn't here/ })).toBeVisible();
  });
});

test.describe("other pages", () => {
  test("chatbot vs HalfTime shows both sides and the answer key", async ({ page }) => {
    await page.goto("/vs-chatbot");
    await expect(page.getByText("Chatbot says")).toBeVisible();
    await expect(page.getByText("Answer key (constructed)")).toBeVisible();
    await page.getByRole("tab", { name: /S04/ }).click();
    await expect(page.getByRole("tab", { name: /S04/ })).toHaveAttribute("aria-selected", "true");
  });

  test("results shows the report and the misses", async ({ page }) => {
    await page.goto("/results");
    await expect(page.getByText(/Read this first/)).toBeVisible();
    await expect(page.getByRole("heading", { name: /Every HalfTime miss/ })).toBeVisible();
  });

  test("law explains 479 and the 479(2) question", async ({ page }) => {
    await page.goto("/law");
    await expect(page.getByRole("heading", { name: /The 479\(2\) question/ })).toBeVisible();
    await expect(page.getByText("Wide reading")).toBeVisible();
  });

  test("index menu opens, closes with Escape, and the language toggle switches", async ({ page, isMobile }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Index" }).click();
    await expect(page.locator("#index-panel")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator("#index-panel")).toBeHidden();
    if (!isMobile) {
      await page.getByRole("button", { name: "Switch to Hindi" }).click();
      await expect(page.locator("html")).toHaveAttribute("lang", "hi");
    }
  });
});

test.describe("api", () => {
  test("rules engine is pure and validated", async ({ request }) => {
    const ok = await request.post("/api/rules", {
      data: { today: "2026-11-15", input: { sections: [{ act: "IPC", section: "379" }], custodyStart: "2023-03-12", firstTimeOffender: "false", otherPendingCases: "false" } }
    });
    expect(ok.status()).toBe(200);
    expect((await ok.json()).verdict).toBe("PAST_THE_LINE");
    const bad = await request.post("/api/rules", { data: { today: "x" } });
    expect(bad.status()).toBe(400);
  });

  test("extract rejects bad input before calling any model", async ({ request }) => {
    expect((await request.post("/api/extract", { data: { text: "short" } })).status()).toBe(400);
    expect((await request.post("/api/extract", { data: "not json" })).status()).toBe(400);
    expect((await request.post("/api/ocr", { data: { image: "x", mediaType: "image/gif" } })).status()).toBe(400);
  });

  test("facts carry their sources", async ({ request }) => {
    const f = await (await request.get("/api/facts")).json();
    expect(f.undertrials_2024.value).toBe(371440);
    expect(f.sources.ncrb.url).toMatch(/^https:/);
  });
});
