import type { MetadataRoute } from "next";
import { SAMPLES } from "@/lib/cases";

const BASE = "https://halftime.prashantthakur.dev";
const PAGES = ["/", "/sweep", "/agent", "/playground", "/vs-chatbot", "/results", "/law", "/story", "/connect"];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    ...PAGES.map((p) => ({ url: `${BASE}${p}`, lastModified: now, changeFrequency: "weekly" as const, priority: p === "/" ? 1 : 0.8 })),
    ...SAMPLES.map((s) => ({ url: `${BASE}/case/${s.id}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.5 }))
  ];
}
