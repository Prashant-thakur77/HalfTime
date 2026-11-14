import type { Metadata } from "next";
import { A, C, Code, DocPage, H3, Note, OL, P, Section, Table, UL } from "@/components/docs/ui";
import { appFile, ciJobs, cronWords, prodCheck } from "@/lib/docs/build-info";
import { REPO } from "@/lib/docs/nav";
import pkg from "../../../../package.json";

export const metadata: Metadata = {
  title: "Self-hosting",
  description: "Deploy your own HalfTime on Cloudflare Workers with OpenNext: the KV binding, the optional server key and spend cap, local development, tests and CI."
};

const TOC = [
  { id: "needs", title: "What you need" },
  { id: "deploy", title: "Deploy to Cloudflare Workers" },
  { id: "config", title: "wrangler.jsonc" },
  { id: "secrets", title: "Secrets and variables" },
  { id: "local", title: "Local development" },
  { id: "data", title: "Rebuilding the data" },
  { id: "tests", title: "Running the tests" },
  { id: "ci", title: "CI and the production check" }
];

export default function SelfHostDocs() {
  const wrangler = appFile("wrangler.jsonc");
  const jobs = ciJobs();
  const prod = prodCheck();
  const scripts = pkg.scripts as Record<string, string>;

  return (
    <DocPage
      href="/docs/self-host"
      kicker="Operate"
      title="Self-hosting."
      lead={
        <p>
          HalfTime is a Next.js 15 app deployed to Cloudflare Workers through OpenNext. Every page is prerendered at build time; the Worker serves
          them from static assets and runs the API routes and <C>/mcp</C>.
        </p>
      }
      toc={TOC}
    >
      <Section id="needs" title="What you need">
        <UL>
          <li>Node.js 20 or later and pnpm 10 (the repository pins <C>pnpm@10.14.0</C>).</li>
          <li>A Cloudflare account, and Wrangler logged in (<C>npx wrangler login</C>).</li>
          <li>
            Optional: an Anthropic API key, only if you want the server-side model routes (<C>/api/extract</C>, <C>/api/baseline</C>,{" "}
            <C>/api/ocr</C>). Without one, the site works exactly like the hosted one: visitors read new papers with their own key.
          </li>
        </UL>
      </Section>

      <Section id="deploy" title="Deploy to Cloudflare Workers">
        <OL>
          <li>Clone and install.</li>
        </OL>
        <Code label="Terminal">{`git clone ${REPO}
cd HalfTime
pnpm install`}</Code>
        <OL>
          <li value={2}>
            Create a KV namespace for the rate-limit counters, the spend total and the response cache, and put its id in{" "}
            <C>apps/web/wrangler.jsonc</C> under the binding <C>CACHE</C>.
          </li>
        </OL>
        <Code label="Terminal">{`cd apps/web
npx wrangler kv namespace create CACHE`}</Code>
        <OL>
          <li value={3}>
            In <C>wrangler.jsonc</C>, set your own Worker <C>name</C>, and change or remove <C>routes</C> (it points at the hosted custom domain).
          </li>
          <li value={4}>Build with OpenNext and deploy. These are the scripts in <C>apps/web/package.json</C>:</li>
        </OL>
        <Table
          label="Deploy scripts"
          head={["Script", "Runs"]}
          minWidth={560}
          mono={[0, 1]}
          rows={["cf:build", "cf:preview", "cf:deploy", "cf-typegen"].filter((k) => scripts[k]).map((k) => [`pnpm ${k}`, scripts[k]!])}
        />
        <Code label="Terminal (in apps/web)">{`pnpm cf:preview     # build and run the Worker locally
pnpm cf:deploy      # build and deploy`}</Code>
        <P muted>
          <C>open-next.config.ts</C> uses the static-assets incremental cache: prerendered HTML is served straight from Workers static assets and
          never revalidated.
        </P>
      </Section>

      <Section id="config" title="wrangler.jsonc">
        {wrangler && <Code label="apps/web/wrangler.jsonc">{wrangler.trim()}</Code>}
        <Table
          label="Wrangler settings"
          head={["Setting", "Why"]}
          minWidth={560}
          mono={[0]}
          rows={[
            ["main, assets", "The Worker and the static assets that OpenNext writes to .open-next/."],
            ["compatibility_flags", "nodejs_compat for the Node APIs the server code uses; global_fetch_strictly_public so fetch() always goes out over the public internet."],
            ["kv_namespaces: CACHE", "Rate-limit counters, the daily spend total and cached model responses. Without it, the model routes skip limits and /mcp counts in memory."],
            ["vars: DAILY_SPEND_CAP_USD", "The daily spend cap in US dollars for the model routes. The code defaults to 15 when it is unset."],
            ["observability", "Workers logs. Error logs record only the error kind and status, never document text."],
            ["routes", "The hosted custom domain. Change or remove it for your own deployment."]
          ]}
        />
      </Section>

      <Section id="secrets" title="Secrets and variables">
        <Table
          label="Environment"
          head={["Name", "Kind", "Effect"]}
          minWidth={600}
          mono={[0]}
          rows={[
            ["ANTHROPIC_API_KEY", "secret, optional", "Turns on /api/extract, /api/baseline and /api/ocr. Without it they answer 503 and the rest of the site is unaffected."],
            ["DAILY_SPEND_CAP_USD", "variable", "Stops the model routes for the rest of the day once the recorded spend reaches it (503)."],
            ["CACHE", "KV binding", "See above."]
          ]}
        />
        <Code label="Terminal (in apps/web)">{`npx wrangler secret put ANTHROPIC_API_KEY`}</Code>
        <Note tone="flag" title="Keep keys out of the repository">
          Never commit a key. <C>.env*</C> files and <C>.dev.vars</C> are ignored by git, and CI fails the build if a key-shaped string appears in
          the client bundle.
        </Note>
      </Section>

      <Section id="local" title="Local development">
        <Code label="Terminal (repository root)">{`pnpm --filter web dev            # http://localhost:3000`}</Code>
        <UL>
          <li>
            <C>next.config.ts</C> calls <C>initOpenNextCloudflareForDev()</C>, so <C>getCloudflareContext()</C> works under <C>next dev</C>. If no
            context is available, the server falls back to <C>process.env</C>.
          </li>
          <li>
            To try the server-side model routes locally, export <C>ANTHROPIC_API_KEY</C> in your shell before starting the dev server. Without KV,
            they run without rate limits or a spend cap.
          </li>
          <li>
            Builds can go to a separate folder with <C>NEXT_DIST_DIR</C>, for example <C>NEXT_DIST_DIR=.next-docs npx next build</C> and{" "}
            <C>NEXT_DIST_DIR=.next-docs npx next start -p 3199</C>.
          </li>
        </UL>
      </Section>

      <Section id="data" title="Rebuilding the data">
        <P>
          The site ships with pre-computed data in <C>apps/web/src/data/</C>. To rebuild it with your own key (responses are cached under{" "}
          <C>.cache/</C>, so reruns are free):
        </P>
        <Code label="Terminal (repository root)">{`export ANTHROPIC_API_KEY=...
pnpm samples:run                       # pre-run Claude on the twelve sample orders
npx tsx scripts/build-agent-run.ts     # the recorded docket-agent run
pnpm eval                              # the evaluation → eval/report.json and report.md
pnpm facts                             # every number on the site → facts.json`}</Code>
      </Section>

      <Section id="tests" title="Running the tests">
        <Code label="Terminal (repository root)">{`pnpm test                                      # every unit test: law, reader, agent, MCP, web
pnpm -r typecheck
pnpm --filter @halftime/law test:coverage      # fails under 100% coverage
pnpm eval:offline                              # the evaluation replayed from the recording
pnpm --filter web build && pnpm --filter web exec playwright test     # end-to-end and axe, four browsers
BASE_URL=https://your-deployment.example pnpm --filter web exec playwright test --project=chromium`}</Code>
        <P muted>
          The end-to-end suite starts <C>next start</C> on port 3100 unless <C>BASE_URL</C> is set. See <A href={`${REPO}/blob/main/TESTING.md`}>TESTING.md</A>{" "}
          for what each layer covers.
        </P>
      </Section>

      <Section id="ci" title="CI and the production check">
        <H3 id="ci-jobs">CI (on every push to main and every pull request)</H3>
        <Table
          label="CI jobs"
          head={["Job", "Steps"]}
          minWidth={620}
          rows={jobs.map((j) => [
            j.name,
            <ul key={j.name} className="list-disc space-y-0.5 pl-5">
              {j.steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          ])}
        />
        <H3 id="ci-prod">Production check ({cronWords(prod.cron)})</H3>
        <P>
          <C>.github/workflows/prod-check.yml</C> runs {cronWords(prod.cron)} (<C>{prod.cron ?? "schedule"}</C>) against the live site: every page
          must answer 200 ({prod.pages.map((p, i) => (
            <span key={p}>
              {i > 0 ? ", " : ""}
              <C>{p}</C>
            </span>
          ))}
          ), <C>/api/health</C> must report <C>&quot;status&quot;:&quot;ok&quot;</C>, <C>/mcp</C> must list <C>sweep_jail</C> and answer a{" "}
          <C>lookup_section</C> call, and the security headers must be present. Point <C>BASE</C> at your own domain to reuse it.
        </P>
      </Section>
    </DocPage>
  );
}
