"use client";
import { useEffect, useState } from "react";
import type { ResponseCache } from "@halftime/reader";

/**
 * Bring your own key. The visitor's Anthropic key is kept in this browser only
 * (sessionStorage, or localStorage if they ask to remember it) and is sent
 * straight from the browser to api.anthropic.com. It never reaches our server.
 */
const KEY = "ht-anthropic-key";
const EVENT = "ht-key-change";

export function getKey(): string | null {
  try {
    return sessionStorage.getItem(KEY) ?? localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setKey(key: string, remember: boolean) {
  try {
    sessionStorage.setItem(KEY, key);
    if (remember) localStorage.setItem(KEY, key);
    else localStorage.removeItem(KEY);
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

export function clearKey() {
  try {
    sessionStorage.removeItem(KEY);
    localStorage.removeItem(KEY);
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

export function looksLikeKey(k: string): boolean {
  return /^sk-ant-[A-Za-z0-9_-]{20,}$/.test(k.trim());
}

/** "sk-ant-api03-…AbCd": enough to recognise, never the whole thing. */
export function maskKey(k: string): string {
  return `${k.slice(0, 13)}…${k.slice(-4)}`;
}

export function useApiKey(): string | null {
  const [key, setK] = useState<string | null>(null);
  useEffect(() => {
    const read = () => setK(getKey());
    read();
    window.addEventListener(EVENT, read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener(EVENT, read);
      window.removeEventListener("storage", read);
    };
  }, []);
  return key;
}

/** Model responses cached in this tab, so re-running a document costs nothing. */
class SessionCache implements ResponseCache {
  async get(k: string) {
    try {
      return sessionStorage.getItem(`ht-r:${k}`);
    } catch {
      return null;
    }
  }
  async set(k: string, v: string) {
    try {
      sessionStorage.setItem(`ht-r:${k}`, v);
    } catch {}
  }
}

/** The Claude client, loaded on demand so the SDK isn't in the first page load. */
export async function browserReader(key: string) {
  const { ClaudeReader } = await import("@halftime/reader/claude");
  return new ClaudeReader({ apiKey: key.trim(), browser: true, cache: new SessionCache() });
}

/** Turn an SDK error into a sentence a person can act on. */
export function keyErrorMessage(e: unknown): string {
  const status = (e as { status?: number }).status;
  if (status === 401) return "Anthropic rejected that key. Check it and try again.";
  if (status === 403) return "That key isn't allowed to use this model.";
  if (status === 429) return "Your key hit Anthropic's rate limit. Wait a minute and try again.";
  if (status === 529 || status === 503) return "Anthropic is overloaded right now. Try again shortly.";
  if (e instanceof TypeError) return "Couldn't reach Anthropic from this browser (network or a blocker extension).";
  return e instanceof Error ? e.message : "Something went wrong talking to Anthropic.";
}
