# Evaluation report

Set: **Constructed orders (synthetic, ground truth known by construction)**, 160 orders (96 Hindi, 64 English). "Today" fixed at 2026-11-15. Run on 2026-11-13. Models: extraction and chatbot claude-sonnet-5-5; chatbot answers read by claude-haiku-5-5.

> These are constructed orders written for testing, with the right answer known by construction. They are not real cases. The real-order evaluation (IL-TUR held-out Hindi bail orders) runs with `pnpm eval -- --set iltur` once the dataset is downloaded and labelled.

| | HalfTime | Regex reader + same engine | Plain chatbot (same model) |
|---|---|---|---|
| Unsafe "past the line" rate (says past when it isn't) | **0%** (0/96) | 0% (0/96) | 6.3% (6/96) |
| Verdict accuracy | **96.3%** | 44.4% | yes/no right 80% |
| Misses 479(2) flag (calls a flagged case simply eligible) | 0% | 0% | 73.5% |
| Sections F1 | 99% | 51.1% | – |
| Custody date exact / ±7 days | 98.8% / 98.8% | 67.5% / 67.5% | – |
| First-time status / other cases | 93.8% / 100% | 87.5% / 85% | – |
| Line date exact (where one exists) | 93.9% | 21.4% | ±7 days on past cases: 37.5% |
| Abstains (can't tell) / wrongly | 21.9% / 1.9% | 71.9% / 51.9% | hedges 13.1% |
| Cost per order | $0.0164 | $0 | $0.017 |

HalfTime over 3 runs (mean ± sd): verdict 96.7% ± 0.3, unsafe-PAST 0% ± 0, sections F1 99.1% ± 0.2. Latency p50 5867 ms, p95 9148 ms. Verifier rejected 1 model claims.

## Traps
| Trap | Orders | HalfTime right | Regex right | Chatbot avoided a wrong "yes" |
|---|---|---|---|---|
| acquitted_old_case | 6 | 5 | 1 | 5 |
| co_accused | 5 | 5 | 1 | 5 |
| injection | 5 | 5 | 2 | 3 |
| life_in_list | 6 | 6 | 6 | 6 |
| no_custody_date | 6 | 6 | 6 | 6 |
| not_charged | 6 | 3 | 0 | 6 |
| two_dates | 6 | 6 | 2 | 5 |

## Misses (HalfTime, run 1)
| Order | Lang | Answer key | HalfTime | Unsafe? | Why |
|---|---|---|---|---|---|
| C078 | en | NOT_YET | EXCLUDED | no | extra sections BNS:105 |
| C098 | en | NOT_YET | CANT_TELL | no | custody none vs 2024-04-09 |
| C109 | hi | PAST_FLAGGED | CANT_TELL | no | missed sections GAMBLING:3, GAMBLING:4; extra sections OTHER:3, OTHER:4 |
| C115 | en | PAST_THE_LINE | CANT_TELL | no | custody none vs 2019-08-05 |
| C124 | hi | PAST_THE_LINE | PAST_FLAGGED | no | extra sections IPC:420 |
| C130 | hi | PAST_THE_LINE | EXCLUDED | no | extra sections IPC:307 |
