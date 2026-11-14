# Security

## What the hosted site holds

- **No Anthropic key.** Reading new papers uses the visitor's own key. It stays in that browser tab (session storage,
  or local storage if the visitor ticks "remember") and is sent only to `api.anthropic.com`. A Playwright test
  (`apps/web/e2e/byok.spec.ts`) checks that during an upload the key reaches no other host and the page makes no
  calls to its own API.
- **No papers.** Text-layer PDFs are read in the browser. Scans go from the browser to Anthropic. Nothing is stored
  server side.
- **No analytics, no telemetry, no cookies.**

## Headers (every response)

`Content-Security-Policy` (`default-src 'self'`; `connect-src 'self' https://api.anthropic.com`;
`frame-src 'none'`; `frame-ancestors 'none'`; `object-src 'none'`), `Strict-Transport-Security`,
`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
`Permissions-Policy` (camera, microphone, geolocation off). Defined in `apps/web/next.config.ts`.

## Public endpoints and their limits

| Endpoint | Limits | Tested in |
|---|---|---|
| `POST /mcp` | 2 MB body (by header and by actual length), 120 requests per IP per minute (KV, with an in-memory fallback), every tool input bounded by zod (documents ≤ 120,000 characters, quotes ≤ 4,000, sweeps ≤ 50 orders). Local file tools are not exposed. | `apps/web/test/mcp.test.ts`, `packages/mcp/test` |
| `POST /api/rules` | zod-validated; dates must be `YYYY-MM-DD`; no model, no network | `apps/web/test/api.test.ts` |
| `POST /api/extract`, `/api/baseline`, `/api/ocr` | Only active on a self-hosted deployment with a server key. Text ≤ 60,000 characters, images ≤ 7 MB; per-IP limits per minute (extract 12, baseline 6, OCR pages 30); a daily spend cap (`DAILY_SPEND_CAP_USD`). Error logs never contain document text. | `apps/web/test/api.test.ts` |

## Build checks

CI greps the client bundle for key-shaped strings and fails the build if one appears
(`.github/workflows/ci.yml`, job "No secrets in the client bundle").

## Prompt injection

Documents are untrusted. The model only returns facts with quotes; code verifies the quotes and applies the law, so an
instruction inside a document cannot change a verdict. Tested in `packages/reader/test` (injected model output) and
`packages/mcp/test`, and shown in the recorded Claude Code session in `packages/mcp/DEMO.md`.

## Reporting

Please open a private security advisory on the GitHub repository rather than a public issue.
