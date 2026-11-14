/** The documentation index, in reading order. The sidebar, prev/next links, the sitemap and /llms.txt all read this list. */
export interface DocLink {
  href: string;
  title: string;
  /** One neutral line: what the page covers. */
  summary: string;
  group: "Start" | "How it works" | "Reference" | "Operate";
}

export const DOCS: DocLink[] = [
  { href: "/docs", title: "Overview", group: "Start", summary: "What HalfTime is, quick starts by role, and a five-minute guide for reviewing the project." },
  {
    href: "/docs/how-it-works",
    title: "How it works",
    group: "How it works",
    summary: "The pipeline from court papers to drafts, the trust boundaries, and the five verdicts."
  },
  {
    href: "/docs/law",
    title: "How Section 479 is computed",
    group: "How it works",
    summary: "Fractions, rounding, first-time status, accused delay, pre-July-2024 cases, the 479(2) flag, exclusions and the statute tables, with a worked example."
  },
  {
    href: "/docs/agent",
    title: "The docket agent",
    group: "How it works",
    summary: "The tool-using agent that sweeps a jail's files: its tools, its loop, the guard rails code enforces, and the recorded run."
  },
  { href: "/docs/api", title: "HTTP API", group: "Reference", summary: "Every route: request and response shapes, limits, status codes, errors and curl examples." },
  { href: "/docs/mcp", title: "MCP server", group: "Reference", summary: "Connecting from claude.ai, Claude Desktop and Claude Code, and every tool with its inputs and an example output." },
  { href: "/docs/evaluation", title: "Evaluation", group: "Reference", summary: "Datasets, metric definitions, results, misses, how to reproduce them, and their limits." },
  { href: "/docs/security", title: "Security and privacy", group: "Operate", summary: "Bring-your-own-key data flow, headers, limits, prompt-injection defence, what is stored, and reporting." },
  { href: "/docs/self-host", title: "Self-hosting", group: "Operate", summary: "Deploying on Cloudflare Workers, the KV binding, secrets, local development, tests and CI." },
  { href: "/docs/faq", title: "FAQ and glossary", group: "Operate", summary: "Common questions, the terms the site uses, and what HalfTime cannot do." }
];

export const DOC_GROUPS = ["Start", "How it works", "Reference", "Operate"] as const;

export const SITE = "https://halftime.prashantthakur.dev";
export const REPO = "https://github.com/Prashant-thakur77/HalfTime";
export const VIDEO = "https://youtu.be/d6cUSK23ZVQ";

export function neighbours(href: string): { prev: DocLink | null; next: DocLink | null } {
  const i = DOCS.findIndex((d) => d.href === href);
  return { prev: i > 0 ? DOCS[i - 1]! : null, next: i >= 0 && i < DOCS.length - 1 ? DOCS[i + 1]! : null };
}
