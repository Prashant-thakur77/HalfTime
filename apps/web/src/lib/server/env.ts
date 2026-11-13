import { getCloudflareContext } from "@opennextjs/cloudflare";

export interface KV {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
}

export interface AppEnv {
  CACHE?: KV;
  ANTHROPIC_API_KEY?: string;
  DAILY_SPEND_CAP_USD?: string;
}

export async function appEnv(): Promise<AppEnv> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const e = env as unknown as AppEnv;
    return { ...e, ANTHROPIC_API_KEY: e.ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY };
  } catch {
    return { ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY, DAILY_SPEND_CAP_USD: process.env.DAILY_SPEND_CAP_USD };
  }
}
