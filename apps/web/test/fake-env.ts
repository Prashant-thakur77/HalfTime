import { vi } from "vitest";
import type { AppEnv, KV } from "@/lib/server/env";

/** In-memory KV with the same surface as the Workers binding. */
export class MemoryKV implements KV {
  store = new Map<string, string>();
  async get(k: string) {
    return this.store.get(k) ?? null;
  }
  async put(k: string, v: string) {
    this.store.set(k, v);
  }
}

export const env: AppEnv = {};

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: async () => ({ env })
}));
