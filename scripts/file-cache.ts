import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ResponseCache } from "../packages/reader/src/cache.js";

/** Model responses on disk under .cache/ (git-ignored), keyed by content hash. */
export class FileCache implements ResponseCache {
  constructor(private dir = join(process.cwd(), ".cache", "claude")) {
    mkdirSync(this.dir, { recursive: true });
  }
  async get(key: string) {
    const p = join(this.dir, `${key}.json`);
    return existsSync(p) ? readFileSync(p, "utf8") : null;
  }
  async set(key: string, value: string) {
    writeFileSync(join(this.dir, `${key}.json`), value);
  }
}

/** Run async jobs with a fixed concurrency. */
export async function pool<T, R>(items: T[], n: number, fn: (t: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]!, i);
      }
    })
  );
  return out;
}
