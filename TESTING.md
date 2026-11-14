# Testing

Results recorded on 2026-11-14. Every command below is run from the repo root unless noted.

| Layer | Tool | What it covers | Result |
|---|---|---|---|
| Law engine: unit, golden, property | Vitest + fast-check | 66 hand-worked golden cases (every verdict, leap days, month ends, accused delay, special acts, first-time unknown, 479(2), pre-July-2024 cases, the NLU Delhi 2011 theft case); integrity of every table row and IPC→BNS mapping; each of the 347 table rows driven through the engine; 14 properties (determinism, excluded beats everything, missing custody date means can't tell, one-third ≤ half, line monotonic in term and in custody start, delay only pushes later, section order irrelevant, unknown sections never pass) | **1,080 passed, 100% statements / branches / functions / lines** (enforced in CI) |
| Reader | Vitest + fast-check | Date normaliser (Hindi and English formats, Devanagari digits, invalid dates); span verifier (whitespace and script tolerance, paraphrase rejected, section and date must appear in the quote); **50+ planted fake quotes, all rejected**; random substrings always found and mapped back; pipeline (invented sections and dates rejected, unsupported claims dropped to unknown, prompt-injected model output can't change the verdict); regex baseline | **126 passed** (incl. Hindi/English application drafts) |
| MCP server | Vitest + MCP SDK client (in-memory) + stdio and HTTP smoke scripts + a recorded Claude Code session | Every tool through a real MCP client; invented quotes and wrong dates rejected; injected instructions can't change a verdict; sweep of the 12 samples matches the website; .docx written inside allowed folders, paths outside refused | **17 passed**; Claude Code session: 5/5 orders in the expected lanes (`packages/mcp/DEMO.md`) |
| End-to-end | Playwright | Landing, the ledger stamp, sample sweep into lanes, CSV export, date slider moving cards, case page quotes and trace, editing facts recomputes the verdict, flagged case, DOCX downloads (English and Hindi), print view watermark and SC order citation, unknown case, chatbot comparison, results, law page, index menu and Escape, language toggle, API validation | **Chromium, mobile (Pixel 7) and Firefox: 83 passed** (incl. remote MCP JSON-RPC and the /connect page); bring-your-own-key journey passed against production with a real key |
| Accessibility | axe-core (WCAG 2.1 AA) + keyboard | All 7 page types: zero serious or critical issues; skip link and tab path to the main action with a visible focus ring; no horizontal scroll at 360 px | passing |
| Performance | Lighthouse 12, mobile | Landing 90–92, sweep 92, case 89, results 97; accessibility 100 on every page; CLS 0 | see below |
| Security | build grep + headers | No key-like string in the client bundle or the Worker bundle; CSP, HSTS, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy on every response; request size and type validated with zod before any model call; per-IP rate limit and daily spend cap in KV | passing |
| Load | autocannon, 50 concurrent connections × 20 s per page, against production | `/`: 4,049 requests, `/sweep`: 5,079, `/case/S01`: 4,983; **0 errors**, p97.5 438–504 ms. (An earlier run found 500s under concurrency from the default OpenNext cache; prerendered pages are now served from static assets.) | passing |
| Evaluation | `pnpm eval` | 160 constructed orders, 3 HalfTime runs, regex and chatbot baselines, 7 trap types | see `eval/report.md` |

## Commands

```bash
pnpm --filter @halftime/law test:coverage      # law engine, fails under 100% coverage
pnpm --filter @halftime/reader test            # reader
pnpm --filter web build && pnpm --filter web exec playwright test     # e2e + axe, all browsers
BASE_URL=https://halftime.prashantthakur.dev pnpm --filter web exec playwright test --project=chromium   # against prod
pnpm eval -- --check                           # fails if unsafe-PAST rises or field accuracy drops > 1 point
npx tsx scripts/check-samples.ts               # sample tray vs its answer key (12/12)
```

## Lighthouse (mobile, simulated throttling)

| Page | Performance | Accessibility | Best practices | SEO | LCP | CLS |
|---|---|---|---|---|---|---|
| `/` | 90–92 | 100 | 96 | 100 | 3.2–3.5 s | 0 |
| `/sweep` | 92 | 100 | 96 | 100 | 3.3 s | 0 |
| `/case/S01` | 89 | 100 | 96 | 100 | 3.7 s | 0 |
| `/results` | 97 | 100 | 96 | 100 | 2.6 s | 0 |

## Known gaps

- WebKit runs in CI (`playwright install --with-deps`); this laptop is missing WebKit's system libraries.
- The eval regression check calls the model, so it runs locally rather than on every push.
- A 12-hour soak against production has not been run yet.
