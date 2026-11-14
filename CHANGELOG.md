# Changelog

## 1.0.0 · 2026-11-15

First public release, live at https://halftime.prashantthakur.dev.

### Reading and checking
- Claude Sonnet 5.5 extracts charged sections, custody start, first-time status and other cases from Hindi or English bail orders, each with the exact sentence it came from; Claude Opus 5.5 transcribes scanned pages.
- The span verifier finds every quote in the papers (whitespace- and digit-script-tolerant, nothing fuzzy); a section's quote must contain the section and a date's quote the date. Unbacked claims become "unknown" and are shown as rejected.
- A deterministic Section 479 engine with IPC, BNS and special-act tables (each row sourced), an IPC→BNS map, five verdicts and a typed rule trace. 479(2) cases are flagged for a lawyer, never decided.

### For the people who use it
- Sweep a jail into lanes; "what if today is…" slider; CSV.
- The docket agent: a tool-using, self-correcting sweep with code-enforced guard rails and a priority docket.
- The 479(3) application in English and Hindi (DOCX, print/PDF).
- Know your line: a plain-language notice for the undertrial, in Hindi or English.
- The jail pack: one ZIP with the docket, every draft, every notice and every records request.
- Bring your own key: new papers are read with the visitor's key, straight from the browser to Anthropic.
- An MCP server, local (stdio) and remote (`/mcp`), so Claude in claude.ai, Claude Desktop or Claude Code can use HalfTime's tools.

### Evidence
- 160 constructed orders, three readers, three runs; every miss published. The recorded responses replay offline in CI.
- The deterministic parts benchmarked on 4,501 rows of real judgments (InLegalNER).
- 1,301 unit tests (law engine at 100% coverage), end-to-end and accessibility tests in four browsers, a production check every 30 minutes.
