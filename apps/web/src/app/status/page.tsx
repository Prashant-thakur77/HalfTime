import type { Metadata } from "next";
import Link from "next/link";
import { SERVER_INFO } from "@halftime/mcp";
import { StatusBoard } from "@/components/status/StatusBoard";
import { APP_VERSION, cronWords, latestRelease, prodCheck } from "@/lib/docs/build-info";
import { REPO } from "@/lib/docs/nav";

export const metadata: Metadata = {
  title: "Status",
  description: "Live status of HalfTime: the health self-test, the MCP endpoint and every main page, checked from your browser, with the version and the scheduled production check."
};

export const dynamic = "force-static";

const ACTIONS = `${REPO}/actions`;

export default function StatusPage() {
  const release = latestRelease();
  const prod = prodCheck();
  const pages = [...new Set([...prod.pages, "/agent", "/docs", "/docs/api"])];
  const built = process.env.BUILD_DATE ?? null;

  return (
    <div className="mx-auto max-w-[var(--max)] px-[var(--gutter)] pt-10 pb-16">
      <header className="grid gap-6 border-b border-ink pb-8 md:grid-cols-12 md:items-end">
        <div className="md:col-span-7">
          <p className="caps text-ink-3">Live · checked from this browser</p>
          <h1 className="mt-3 font-sans text-[length:var(--step-4)] leading-[0.95] font-[750] tracking-[-0.02em] [font-stretch:88%]">Status.</h1>
        </div>
        <p className="max-w-[38rem] text-[1.02rem] leading-relaxed text-ink-2 md:col-span-5">
          This page calls the site&apos;s own health self-test and MCP endpoint and requests every main page, from your browser, when it loads.
          Nothing is stored. A scheduled check runs the same tests from GitHub Actions {cronWords(prod.cron)}.
        </p>
      </header>

      <section aria-labelledby="live-h" className="mt-10">
        <h2 id="live-h" className="sr-only">
          Live checks
        </h2>
        <StatusBoard pages={pages} />
      </section>

      <section aria-labelledby="build-h" className="mt-14 grid gap-10 lg:grid-cols-2">
        <div>
          <h2 id="build-h" className="font-sans text-[length:var(--step-2)] font-[750] [font-stretch:88%]">
            This build
          </h2>
          <dl className="mt-4 divide-y divide-[var(--rule)] border-y border-ink text-[0.95rem]">
            {[
              ["Version", release ? `${release.version}${release.date ? ` · released ${release.date}` : ""}` : APP_VERSION],
              ["Web app package", APP_VERSION],
              ["MCP server", `${SERVER_INFO.name} ${SERVER_INFO.version}`],
              ["Pages built on", built ?? "—"]
            ].map(([k, v]) => (
              <div key={k} className="grid grid-cols-[10rem_1fr] gap-3 py-2.5">
                <dt className="text-ink-2">{k}</dt>
                <dd className="font-mono">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-[0.85rem] text-ink-3">
            Version from <code className="font-mono">CHANGELOG.md</code> and <code className="font-mono">apps/web/package.json</code> at build time. The
            health check above reports the build date the server is running.
          </p>
        </div>

        <div>
          <h2 id="checks-h" className="font-sans text-[length:var(--step-2)] font-[750] [font-stretch:88%]">
            Scheduled checks
          </h2>
          <ul className="mt-4 space-y-3">
            <li>
              <a
                href={`${ACTIONS}/workflows/ci.yml`}
                className="group flex items-center justify-between gap-4 border border-ink bg-paper p-4 transition-colors duration-[var(--ui)] hover:bg-mark"
                rel="noopener noreferrer"
                target="_blank"
              >
                <span>
                  <span className="caps block text-ink-3">GitHub Actions</span>
                  <span className="block font-sans font-[700]">CI: typecheck, lint, unit tests, offline eval, end-to-end</span>
                </span>
                <span className="shrink-0 font-mono text-[0.85rem] text-carbon underline">runs ↗</span>
              </a>
            </li>
            <li>
              <a
                href={`${ACTIONS}/workflows/prod-check.yml`}
                className="group flex items-center justify-between gap-4 border border-ink bg-paper p-4 transition-colors duration-[var(--ui)] hover:bg-mark"
                rel="noopener noreferrer"
                target="_blank"
              >
                <span>
                  <span className="caps block text-ink-3">GitHub Actions · {cronWords(prod.cron)}</span>
                  <span className="block font-sans font-[700]">Production check against the live site</span>
                </span>
                <span className="shrink-0 font-mono text-[0.85rem] text-carbon underline">runs ↗</span>
              </a>
            </li>
          </ul>
          <p className="mt-4 text-[0.95rem] leading-relaxed text-ink-2">
            The production check (<code className="font-mono text-[0.85rem]">{prod.cron ?? "scheduled"}</code>) requests {prod.pages.length} pages and
            needs a 200 from each, a passing health self-test, an MCP <code className="font-mono text-[0.85rem]">tools/list</code> and{" "}
            <code className="font-mono text-[0.85rem]">lookup_section</code> call, and the security headers. GitHub may delay scheduled runs at busy
            times.
          </p>
          <p className="mt-3 text-[0.95rem]">
            <Link href="/docs/self-host#ci" className="text-carbon underline decoration-carbon-soft underline-offset-[3px] hover:bg-mark">
              How CI and the production check work
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
