import { ClaudeReader, type CallMeta } from "@halftime/reader/claude";
import { MemoryCache, type ResponseCache } from "@halftime/reader";
import { appEnv, type KV } from "./env";

const memory = new MemoryCache();

/** Model responses keyed by content hash. KV in production, memory in dev. */
class KvCache implements ResponseCache {
  constructor(private kv: KV) {}
  get(key: string) {
    return this.kv.get(`r:${key}`);
  }
  set(key: string, value: string) {
    return this.kv.put(`r:${key}`, value, { expirationTtl: 60 * 60 * 24 * 30 });
  }
}

export class BudgetError extends Error {}
export class RateLimitError extends Error {}
export class ConfigError extends Error {}

const today = () => new Date().toISOString().slice(0, 10);

/** Per-IP request limit (per minute) and a daily spend cap, both counted in KV. */
export async function guard(ip: string, kind: string, perMinute = 12) {
  const env = await appEnv();
  if (!env.ANTHROPIC_API_KEY) throw new ConfigError("The reading service is not configured.");
  const kv = env.CACHE;
  if (!kv) return;
  const minute = Math.floor(Date.now() / 60000);
  const rk = `rl:${kind}:${ip}:${minute}`;
  const count = Number((await kv.get(rk)) ?? 0);
  if (count >= perMinute) throw new RateLimitError("Too many requests. Try again in a minute.");
  await kv.put(rk, String(count + 1), { expirationTtl: 120 });
  const cap = Number(env.DAILY_SPEND_CAP_USD ?? 15);
  const spent = Number((await kv.get(`spend:${today()}`)) ?? 0);
  if (spent >= cap) throw new BudgetError("Today's reading budget is used up. Sample cases still run from cache.");
}

export async function recordSpend(meta: CallMeta) {
  if (meta.cached) return;
  const kv = (await appEnv()).CACHE;
  if (!kv) return;
  const k = `spend:${today()}`;
  const spent = Number((await kv.get(k)) ?? 0);
  await kv.put(k, String(spent + meta.costUsd), { expirationTtl: 60 * 60 * 48 });
}

export async function getReader(): Promise<ClaudeReader> {
  const env = await appEnv();
  return new ClaudeReader({ apiKey: env.ANTHROPIC_API_KEY, cache: env.CACHE ? new KvCache(env.CACHE) : memory });
}

export function clientIp(req: Request): string {
  return req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}

export function errorResponse(e: unknown): Response {
  const msg = e instanceof Error ? e.message : "Unexpected error";
  const status = e instanceof RateLimitError ? 429 : e instanceof BudgetError ? 503 : e instanceof ConfigError ? 503 : 500;
  // Error logging only: never the document text.
  console.error(JSON.stringify({ at: "api", kind: e instanceof Error ? e.name : "unknown", status }));
  return Response.json({ error: status === 500 ? "Something went wrong reading this document." : msg }, { status });
}
