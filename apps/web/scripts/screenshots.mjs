// Local screenshots of every page for review. Usage: node scripts/screenshots.mjs [outdir] [reduce]
import { chromium } from "@playwright/test";
import fs from "node:fs/promises";

const out = process.argv[2] ?? "test-results/screens";
const reduce = process.argv[3] === "reduce";
const base = process.env.BASE ?? "http://localhost:3100";
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch();
const errors = [];
for (const [name, opts] of Object.entries({
  desktop: { viewport: { width: 1440, height: 900 } },
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
})) {
  const ctx = await browser.newContext({ ...opts, reducedMotion: reduce ? "reduce" : "no-preference" });
  const page = await ctx.newPage();
  page.on("console", (m) => m.type() === "error" && errors.push(`${name} ${page.url()}: ${m.text()}`));
  page.on("pageerror", (e) => errors.push(`${name} ${page.url()}: ${e.message}`));
  for (const path of ["/", "/sweep", "/case/S01", "/vs-chatbot", "/results", "/law"]) {
    await page.goto(base + path, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    const slug = path === "/" ? "home" : path.replace(/\//g, "_").slice(1);
    await page.screenshot({ path: `${out}/${name}-${slug}.png` });
    if (path === "/") {
      const h = await page.evaluate(() => document.body.scrollHeight);
      for (let i = 1; i <= 8; i++) {
        await page.evaluate((y) => window.scrollTo(0, y), (h * i) / 9);
        await page.waitForTimeout(700);
        await page.screenshot({ path: `${out}/${name}-home-${i}.png` });
      }
    }
    if (path === "/sweep") {
      await page.getByRole("button", { name: /Sweep the sample jail|Sweep again/ }).click();
      await page.waitForTimeout(reduce ? 500 : 4500);
      await page.screenshot({ path: `${out}/${name}-sweep-done.png`, fullPage: true });
    }
  }
  await ctx.close();
}
await browser.close();
await fs.writeFile(`${out}/errors.txt`, errors.join("\n"));
console.log(errors.length ? errors.join("\n") : "no console errors");
