# HalfTime

**Reads a jail's court papers, finds every undertrial who has already served the Section 479 share of their sentence, shows its working, and drafts the application a legal-aid lawyer signs.**

Live: **https://halftime.prashantthakur.dev**

---

## The problem

India held **3,71,440 undertrials in 2024, 72.6% of everyone in prison** (NCRB, Prison Statistics India 2024). Section 479 of the Bharatiya Nagarik Suraksha Sanhita says that once an undertrial has been in custody for **half the maximum sentence** for the offence (one-third for a first-time offender), they are to be released on bail, and **the jail superintendent must apply** to the court (479(3)). In all of 2024, only **968** people were identified under the section and **467** applications were filed (NCRB PSI 2024, Table 7.4).

The arithmetic is easy. The facts are not. Which sections are still charged, when custody actually began, whether the person has a record or other cases pending: that is written in the court papers, often in Hindi, often scanned, one file per person.

Tools that already exist for this take typed inputs. Reading the papers is the hard part, and HalfTime measures how well it does it.

## How it works

```mermaid
flowchart LR
  A[Court papers<br/>PDF · scan · text<br/>Hindi or English] --> B[Read<br/>pdf.js in the browser;<br/>scans transcribed by Claude]
  B --> C[Extract<br/>Claude returns facts,<br/>each with a verbatim quote]
  C --> D[Verify<br/>code finds every quote in the papers;<br/>unbacked claims dropped to unknown]
  D --> E[Apply the law<br/>tested rules engine, Section 479,<br/>full step-by-step trace]
  E --> F[Four lanes<br/>past the line · not yet<br/>can't tell · outside 479]
  F --> G[Draft 479(3) application<br/>DOCX / PDF, English and Hindi,<br/>for a lawyer to sign]
```

**The model proposes, code disposes.** Claude never decides who is eligible. It only reports what the papers say, and every claim must carry the exact sentence it came from. The span verifier checks each quote against the document (whitespace- and script-tolerant, no paraphrase). A section's quote must contain that section number, and a date's quote must contain that date. Anything that fails is set to "unknown" and shown on screen as a rejected claim. A deterministic engine then applies the law to the facts that survived.

Verdicts are deliberately not "eligible / not eligible":

| Verdict | Meaning |
|---|---|
| **Past the line** | Half (or one-third) served, one offence, no other cases: the jail must apply under 479(3). A lawyer reviews and signs. |
| **Past the line · flagged** | Past the line, but 479(2) may apply (more than one offence, or other cases pending or not ruled out). A lawyer decides. |
| **Not yet** | The date the line will be crossed, with a countdown. |
| **Can't tell** | The papers don't give enough (no custody date, no quantity for NDPS, a state excise maximum…). What is missing is listed. |
| **Outside 479** | A charged offence allows life imprisonment or death. |

When first-time status isn't stated, the engine uses the half line (the safe one) and shows the one-third date as "if first-time is confirmed". For cases registered before 1 July 2024 it applies Section 479, as the Supreme Court directed on 23 August 2024, and shows the old Section 436A CrPC date alongside.

## Results

From `eval/report.json` (`pnpm eval`), run on 160 **constructed** orders: 96 Hindi and 64 English, written in the style of Uttar Pradesh district-court bail orders, with the ground truth known by construction. They are not real cases. About a quarter contain a deliberate trap. "Today" is fixed at 2026-11-15.

| | HalfTime | Regex reader, same engine | Plain chatbot, same model |
|---|---|---|---|
| Says "past the line" when it isn't | **0%** (0/96) | 0% (0/96) | 6.3% (6/96) |
| Calls a 479(2) case simply eligible | **0%** | 0% | 73.5% |
| Verdict accuracy | **96.3%** (96.7% ± 0.3 over 3 runs) | 44.4% | yes/no right 80% |
| Charged sections, F1 | 99% | 51.1% | – |
| Custody date exact | 98.8% | 67.5% | – |
| Line date exact | 93.9% | 21.4% | within ±7 days on past cases: 37.5% |
| Says "can't tell" wrongly | 1.9% | 51.9% | – |
| Cost per order | $0.016 | $0 | $0.017 |

The regex reader is never unsafe only because it gives up on most orders (it says "can't tell" 71.9% of the time). The plain chatbot is the same model asked the question a person would type: "Read this court order. Is the accused eligible for release under Section 479 of the BNSS? If yes, from what date?" It reads the arithmetic correctly but almost always skips 479(2).

**Misses.** HalfTime got 6 of 160 wrong, and none was unsafe. The weakest trap is a section the order says is *not* charged (for example "Section 307 is not made out"). Here the model sometimes lists it anyway, which pushes the case to "flagged" or "outside 479" rather than to a wrong "past the line". Every miss is listed in `eval/report.md` and on [/results](https://halftime.prashantthakur.dev/results).

**Real orders.** `eval/download_iltur.py` draws a stratified sample of held-out Hindi bail orders from IL-TUR (BAIL task, UP district courts), `eval/label.py` is a terminal tool for labelling them (with a second-labeller mode for agreement), and `pnpm eval -- --set iltur` runs the identical comparison. Any count over those pre-BNSS orders means "would have qualified", not "eligible today". The dataset is gated (CC BY-NC-SA) and is never republished here.

## What's in the repo

```
packages/law      Section 479 engine, IPC/BNS/special-act tables, IPC→BNS map
packages/reader   date normaliser (Hindi + English), span verifier, extraction schema and prompts,
                  Claude client with content-hash cache, regex baseline
apps/web          Next.js 15 site and API (Cloudflare Workers via OpenNext)
eval/             constructed test set, generator, evaluation runner, report
data/samples      the 12-order sample tray shown on the site (constructed, names masked)
scripts/          facts.json builder, sample pre-runs, checks
```

Every number on the site comes from `apps/web/src/data/facts.json`, which `scripts/build-facts.ts` builds from sourced constants and `eval/report.json`.

## Run it

```bash
pnpm install
pnpm test                                   # law engine + reader unit tests
echo "ANTHROPIC_API_KEY=..." > .env.secrets
set -a; . ./.env.secrets; set +a
pnpm samples:run                            # pre-run Claude on the sample tray (cached in .cache/)
pnpm eval                                   # evaluation → eval/report.json + report.md
pnpm facts                                  # numbers for the site
pnpm --filter web dev                       # http://localhost:3000
```

Deploy (Cloudflare Workers):

```bash
cd apps/web
npx opennextjs-cloudflare build && npx opennextjs-cloudflare deploy
```

## Your key, your papers

The hosted site holds no Anthropic key. The sample tray, the sweep, every case page and the application drafts run from pre-computed results, with the law applied live in the browser. To read new papers, a visitor pastes their own Anthropic API key. It is kept in that browser tab (or in local storage if they tick "remember"), and the browser sends it, with the papers, straight to `api.anthropic.com`. Neither the key nor the papers pass through HalfTime's server. A Playwright test (`e2e/byok.spec.ts`) checks this: during an upload, the key is sent to no host except Anthropic, and the app makes no calls to its own API.

The server routes under `/api` still work for a self-hosted deployment that sets `ANTHROPIC_API_KEY` as a Worker secret. They enforce a per-IP rate limit and a daily spend cap (`DAILY_SPEND_CAP_USD`) in KV. There is no analytics or telemetry, and error logs never contain document text.

## Models

| Job | Model |
|---|---|
| Fact extraction with quotes, missing-section self-check | `claude-sonnet-5-5` |
| Plain-chatbot baseline (same model, naive prompt) | `claude-sonnet-5-5` |
| Transcribing scanned pages | `claude-opus-5-5` |
| Reading the chatbot's answer into yes / no / unclear for scoring | `claude-haiku-5-5` |

Responses are cached by a hash of model, prompt version and input, so no document is paid for twice.

## Testing

See [TESTING.md](TESTING.md). In short:
- 1,080 unit and property tests on the law engine, with 100% branch coverage enforced in CI;
- 122 reader tests, including 50+ planted fake quotes that the verifier must reject;
- 25 end-to-end journeys plus axe accessibility checks in Chromium, Firefox, WebKit and mobile;
- a recorded evaluation with three baselines.

## Limits

- It finds people and drafts paperwork. A court decides; a lawyer signs.
- It knows only what the papers say. Days of delay caused by the accused must be entered by a person.
- Section 479(2) is read differently by different courts, so multi-offence cases are flagged, never decided.
- State excise laws, the UP Gangsters Act and some special-act limbs need a lawyer to enter the maximum term.
- The published evaluation uses constructed orders; the real-order run is wired up and waiting on dataset access.

## Legal

HalfTime is a screening aid, not legal advice. Every output is a draft for a qualified lawyer to verify against the full court record before anything is filed. The statute tables cite their sources section by section and should be reviewed by counsel before use in a real jail. The sample orders on the site are constructed for demonstration, and their names are masked.

## Sources

- NCRB, Prison Statistics India 2024, as reported by Daily Excelsior: https://www.dailyexcelsior.com/indias-prisons-reach-112-7-pc-occupancy-in-2024-delhi-tops-at-194-6-pc-over-3-71-lakh-undertrials/
- NCRB PSI 2024 Table 7.4, as cited in a Research Square preprint: https://www.researchsquare.com/article/rs-10743922/v1
- Supreme Court order of 23 Aug 2024, W.P.(C) 406/2013 (LiveLaw report): https://www.livelaw.in/amp/top-stories/supreme-court-allows-benefit-of-section-479-bnss-to-undertrials-in-cases-registered-before-july-1-2024-267487
- BNSS 2023, Section 479 (bare act): https://www.advocatekhoj.com/library/bareacts/bharatiyanagarik2023/479.php
- Karnataka High Court on Section 479(2) (Verdictum report): https://www.verdictum.in/court-updates/high-courts/karnataka-mr-k-ramakrishna-vs-the-assistant-director-no-bail-under-section-479-bnss-in-multiple-cases-1559297
