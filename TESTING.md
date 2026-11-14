# Testing

Results recorded on 2026-11-14. Every command below is run from the repo root unless noted.

| Layer | Tool | What it covers | Result |
|---|---|---|---|
| Law engine: unit, golden, property | Vitest + fast-check | 66 golden cases computed independently by a Python oracle (`scripts/golden_cases.py`) (every verdict, leap days, month ends, accused delay, special acts, first-time unknown, 479(2), pre-July-2024 cases, the NLU Delhi 2011 theft case); integrity of every table row and IPC→BNS mapping; each of the 347 table rows driven through the engine; 15 properties (determinism, excluded beats everything, missing custody date means can't tell, one-third ≤ half, line monotonic in term and in custody start, delay only pushes later, section order irrelevant, unknown sections never pass) | **1,101 passed, 100% statements / branches / functions / lines** (enforced in CI) |
| Reader | Vitest + fast-check | Date normaliser (Hindi and English formats, Devanagari digits, invalid dates); span verifier (whitespace and script tolerance, paraphrase rejected, section and date must appear in the quote); **50+ planted fake quotes, all rejected**; random substrings always found and mapped back; pipeline (invented sections and dates rejected, unsupported claims dropped to unknown, prompt-injected model output can't change the verdict); regex baseline | **131 passed** (incl. Hindi/English application drafts and the date/section gaps found on real judgments) |
| MCP server | Vitest + MCP SDK client (in-memory) + stdio and HTTP smoke scripts + a recorded Claude Code session | Every tool through a real MCP client; invented quotes and wrong dates rejected; injected instructions can't change a verdict; sweep of the 12 samples matches the website; .docx written inside allowed folders, paths outside refused | **17 passed**; Claude Code session: 5/5 orders in the expected lanes (`packages/mcp/DEMO.md`) |
| Web routes | Vitest (route handlers called directly, KV faked in memory) | `/api/rules` and `/api/extract` validation (bad JSON, bad dates, unknown acts, oversize text), 503 without a server key, per-IP rate limit, daily spend cap; `/mcp`: tool list, a tool call, 413 over 2 MB by header and by body, 429 with and without KV, over-long document rejected | **16 passed** |
| Real judgments | `pnpm eval:inlegalner` (no model) | InLegalNER test split, 4,501 rows: verifier accepts 4,632/4,632 real quotes and rejects 9,236/9,236 altered ones; date recall 98.0%, precision 99.2%; section references resolved 65.6% | see `eval/inlegalner/report.md` |
| End-to-end | Playwright | Landing, the ledger stamp, sample sweep into lanes, CSV export, date slider moving cards, case page quotes and trace, editing facts recomputes the verdict, flagged case, DOCX downloads (English and Hindi), print view watermark and SC order citation, unknown case, chatbot comparison, results, law page, index menu and Escape, language toggle, API validation | **49 tests × Chromium, mobile (Pixel 7), Firefox and WebKit: 140 passed, 13 skipped** (the bring-your-own-key journeys need a real key; they passed against production with one). Includes the landing sections, /playground, /story, remote MCP JSON-RPC and /connect |
| Accessibility | axe-core (WCAG 2.1 AA) + keyboard | All 10 page types: zero serious or critical issues; skip link and tab path to the main action with a visible focus ring; no horizontal scroll at 360 px | passing |
| Performance | Lighthouse 12, mobile | Landing 90–92, sweep 92, case 89, results 97; accessibility 100 on every page; CLS 0 | see below |
| Security | build grep + headers | No key-like string in the client bundle or the Worker bundle; CSP, HSTS, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy on every response; request size and type validated with zod before any model call; per-IP rate limit and daily spend cap in KV | passing |
| Load | autocannon, 50 concurrent connections × 20 s per page, against production | `/`: 4,049 requests, `/sweep`: 5,079, `/case/S01`: 4,983; **0 errors**, p97.5 438–504 ms. (An earlier run found 500s under concurrency from the default OpenNext cache; prerendered pages are now served from static assets.) | passing |
| Evaluation | `pnpm eval`, `pnpm eval:offline` | 160 constructed orders, 3 HalfTime runs, regex and chatbot baselines, 7 trap types. The offline replay reproduces `eval/report.json` exactly from the 1,400 recorded responses and runs in CI | see `eval/report.md` |

## Commands

```bash
pnpm --filter @halftime/law test:coverage      # law engine, fails under 100% coverage
pnpm test                                      # every unit test: law, reader, MCP, web routes (1,265)
pnpm --filter @halftime/reader test            # reader
pnpm --filter @halftime/mcp test               # MCP server through a real MCP client
pnpm --filter web test                         # web route handlers and /mcp limits
pnpm eval:offline                              # replay the evaluation from the recording; must equal eval/report.json
pnpm eval:inlegalner                           # real-judgment benchmark (dataset download required)
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

- A fresh evaluation run calls the model and costs about $0.016 per order, so CI replays the recording instead.
- A 12-hour soak against production has not been run yet.
