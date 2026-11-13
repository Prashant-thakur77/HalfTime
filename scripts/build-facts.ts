/**
 * Builds apps/web/src/data/facts.json: the single source for every number on
 * the site and in the README. Sourced constants below + eval/report.json.
 * Never edit facts.json by hand; run `pnpm facts`.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const SOURCES = {
  ncrb: {
    label: "NCRB, Prison Statistics India 2024 (as reported by Daily Excelsior)",
    url: "https://www.dailyexcelsior.com/indias-prisons-reach-112-7-pc-occupancy-in-2024-delhi-tops-at-194-6-pc-over-3-71-lakh-undertrials/"
  },
  table74: {
    label: "NCRB, Prison Statistics India 2024, Table 7.4 (as cited in a Research Square preprint)",
    url: "https://www.researchsquare.com/article/rs-10743922/v1"
  },
  scOrder: {
    label: "Supreme Court, In Re: Inhuman Conditions in 1382 Prisons, W.P.(C) 406/2013, order of 23 Aug 2024 (LiveLaw report)",
    url: "https://www.livelaw.in/amp/top-stories/supreme-court-allows-benefit-of-section-479-bnss-to-undertrials-in-cases-registered-before-july-1-2024-267487"
  },
  bnss479: { label: "Bharatiya Nagarik Suraksha Sanhita, 2023, Section 479 (bare act)", url: "https://www.advocatekhoj.com/library/bareacts/bharatiyanagarik2023/479.php" },
  conflict: { label: "Article on multiple proceedings under Section 479(2) BNSS (IJLMH)", url: "https://ijlmh.com/article/view/price-multiple-proceedings-section-479-2-bnss" },
  nluDelhi: {
    label: "Legally India, 9 Jun 2011: NLU Delhi legal aiders free Tihar undertrial accused of Rs 1,000 theft",
    url: "https://www.legallyindia.com/analysis/nlu-delhi-legal-aiders-free-tihar-undertrial-accused-of-rs-1000-theft-20110609-2152/amp"
  },
  browder: {
    label: "NPR, 8 Jun 2015: Kalief Browder, jailed for years at Rikers Island without trial",
    url: "https://www.npr.org/sections/thetwo-way/2015/06/08/412842780/kalief-browder-jailed-for-years-at-rikers-island-without-trial-commits-suicide"
  }
} as const;

const constants = {
  undertrials_2024: { value: 371440, source: "ncrb" },
  undertrial_share_2024: { value: 72.6, unit: "%", source: "ncrb" },
  prison_occupancy_2024: { value: 112.7, unit: "%", source: "ncrb" },
  identified_479_2024: { value: 968, source: "table74" },
  applications_479_2024: { value: 467, source: "table74" },
  released_479_2024: { value: 627, source: "table74" },
  held_over_2y_2024: { value: 60130, source: "table74" },
  held_over_5y_2024: { value: 9028, source: "table74" },
  sc_order_date: { value: "2024-08-23", source: "scOrder" }
};

const reportPath = join(root, "eval", "report.json");
const report = existsSync(reportPath) ? JSON.parse(readFileSync(reportPath, "utf8")) : null;

const facts = {
  generatedBy: "scripts/build-facts.ts",
  sources: SOURCES,
  ...constants,
  eval: report
};

writeFileSync(join(root, "apps", "web", "src", "data", "facts.json"), JSON.stringify(facts, null, 2) + "\n");
console.log(`facts.json written${report ? " with eval report" : " (no eval report yet)"}`);
