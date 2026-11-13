/** A content-addressed cache for model responses: in memory, on disk or in KV. */
export interface ResponseCache {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}

export class MemoryCache implements ResponseCache {
  private m = new Map<string, string>();
  async get(key: string) {
    return this.m.get(key) ?? null;
  }
  async set(key: string, value: string) {
    this.m.set(key, value);
  }
}

/** SHA-256 hex of the parts, using Web Crypto (works in Node 20+, browsers and Workers). */
export async function hashKey(...parts: string[]): Promise<string> {
  const data = new TextEncoder().encode(parts.join("␞"));
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
