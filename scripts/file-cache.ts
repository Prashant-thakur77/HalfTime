import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import type { ResponseCache } from "../packages/reader/src/cache.js";

/** The recorded model responses behind eval/report.json, committed so the evaluation replays offline. */
export const RECORDED = join(process.cwd(), "eval", "cache", "responses.jsonl.gz");

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

/**
 * Replays recorded responses only. A request that is not in the recording fails loudly instead of calling the
 * API, so an offline run can never spend money or silently mix live and recorded answers.
 */
export class ReplayCache implements ResponseCache {
  private map = new Map<string, string>();
  constructor(file = RECORDED) {
    for (const line of gunzipSync(readFileSync(file)).toString("utf8").split("\n")) {
      if (!line) continue;
      const { k, v } = JSON.parse(line) as { k: string; v: string };
      this.map.set(k, v);
    }
  }
  get size() {
    return this.map.size;
  }
  async get(key: string) {
    const v = this.map.get(key);
    if (v === undefined) throw new Error(`Offline replay: response ${key.slice(0, 12)}… is not in ${RECORDED}`);
    return v;
  }
  async set() {
    throw new Error("Offline replay is read-only");
  }
}

/** Packs the on-disk cache into one gzipped JSONL file (sorted, so the file is stable). */
export function packCache(dir = join(process.cwd(), ".cache", "claude"), out = RECORDED) {
  const keys = readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5)).sort();
  const body = keys.map((k) => JSON.stringify({ k, v: readFileSync(join(dir, `${k}.json`), "utf8") })).join("\n") + "\n";
  mkdirSync(join(out, ".."), { recursive: true });
  writeFileSync(out, gzipSync(body, { level: 9 }));
  return keys.length;
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
