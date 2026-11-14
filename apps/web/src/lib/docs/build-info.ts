import { readFileSync } from "node:fs";
import { join } from "node:path";
import pkg from "../../../package.json";

/**
 * Facts about the build, read from the repository when the page is prerendered:
 * the release in CHANGELOG.md and the schedule and pages of the production check.
 * Every reader falls back to null, so a page never breaks on a missing file.
 */
function repoFile(rel: string): string | null {
  for (const root of [join(process.cwd(), "..", ".."), process.cwd()]) {
    try {
      return readFileSync(join(root, rel), "utf8");
    } catch {}
  }
  return null;
}

export const APP_VERSION: string = pkg.version;

/** The newest release heading in CHANGELOG.md, e.g. { version: "1.0.0", date: "2026-11-15" }. */
export function latestRelease(): { version: string; date: string | null } | null {
  const md = repoFile("CHANGELOG.md");
  const m = md ? /^##\s+([\d.]+)\s*(?:·\s*(\d{4}-\d{2}-\d{2}))?/m.exec(md) : null;
  return m ? { version: m[1]!, date: m[2] ?? null } : null;
}

/** The production check's cron line and the pages it requests, from .github/workflows/prod-check.yml. */
export function prodCheck(): { cron: string | null; pages: string[] } {
  const yml = repoFile(".github/workflows/prod-check.yml");
  if (!yml) return { cron: null, pages: [] };
  const cron = /cron:\s*"([^"]+)"/.exec(yml)?.[1] ?? null;
  const list = /for p in ([^;]+); do/.exec(yml)?.[1] ?? "";
  return { cron, pages: list.trim().split(/\s+/).filter((p) => p.startsWith("/")) };
}

/** "*\/30 * * * *" in words, for the cron shapes this repo uses. */
export function cronWords(cron: string | null): string {
  if (!cron) return "on a schedule";
  const m = /^\*\/(\d+) \* \* \* \*$/.exec(cron.trim());
  return m ? `every ${m[1]} minutes` : `on the schedule ${cron}`;
}

/** The recorded MCP sessions in packages/mcp/DEMO.md: each one's heading, turns and duration. */
export function demoSessions(): { turns: number; seconds: number }[] {
  const md = repoFile("packages/mcp/DEMO.md");
  if (!md) return [];
  return [...md.matchAll(/Turns:\s*(\d+)\s*·\s*duration\s*(\d+)\s*s/g)].map((m) => ({ turns: Number(m[1]), seconds: Number(m[2]) }));
}

/** A file from apps/web, as committed (for showing config such as wrangler.jsonc). */
export function appFile(rel: string): string | null {
  for (const root of [process.cwd(), join(process.cwd(), "apps", "web")]) {
    try {
      return readFileSync(join(root, rel), "utf8");
    } catch {}
  }
  return null;
}

/** The CI jobs and the names of their steps, from .github/workflows/ci.yml. */
export function ciJobs(): { name: string; steps: string[] }[] {
  const yml = repoFile(".github/workflows/ci.yml");
  if (!yml) return [];
  const jobs: { name: string; steps: string[] }[] = [];
  for (const block of yml.split(/\n  [a-z0-9_-]+:\n/).slice(1)) {
    const name = /^\s{4}name:\s*(.+)$/m.exec(block)?.[1]?.trim();
    if (!name) continue;
    const steps = [...block.matchAll(/^\s{6}- (?:name:\s*(.+)|run:\s*(.+))$/gm)]
      .map((m) => (m[1] ?? m[2] ?? "").trim())
      .filter((s) => !/^pnpm install|playwright install/.test(s));
    jobs.push({ name, steps });
  }
  return jobs;
}
