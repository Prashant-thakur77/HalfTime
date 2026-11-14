import { DOCS, REPO, SITE, VIDEO } from "./nav";

/**
 * /llms.txt, following the llms.txt convention: a title, a one-line summary, a few plain paragraphs,
 * then sections of links. A neutral description of the project; no instructions to models and no claims.
 */
export function llmsTxt(): string {
  const docs = DOCS.map((d) => `- [${d.title}](${SITE}${d.href}): ${d.summary}`);
  return [
    "# HalfTime",
    "",
    "> HalfTime reads Indian court papers (bail orders, remand orders, charge sheets, in Hindi or English), applies Section 479 of the Bharatiya Nagarik Suraksha Sanhita (BNSS) to the facts it can verify, and drafts the Section 479(3) application for a legal-aid lawyer to review and sign.",
    "",
    "Section 479 BNSS provides for the release on bail of an undertrial who has been detained for half the maximum term for the offence, or one-third for a first-time offender, and requires the jail superintendent to apply to the court (479(3)).",
    "",
    "In HalfTime a language model (Claude) extracts facts from the papers, each with a verbatim quote. Deterministic code checks every quote against the document, treats unverified facts as unknown, and applies the law with a rules engine that produces one of five results: past the line, past the line but flagged under 479(2), not yet, can't tell, or outside Section 479. It is a screening aid, not legal advice. The sample orders on the site are constructed for demonstration and their names are masked.",
    "",
    "The code is MIT-licensed. The site runs on Cloudflare Workers. An MCP server is available at the /mcp path of the site.",
    "",
    "## Docs",
    "",
    ...docs,
    "",
    "## Source",
    "",
    `- [Repository](${REPO}): source code, tests and evaluation`,
    `- [README](${REPO}/blob/main/README.md): overview and setup`,
    `- [ARCHITECTURE.md](${REPO}/blob/main/ARCHITECTURE.md): packages and trust boundaries`,
    `- [SECURITY.md](${REPO}/blob/main/SECURITY.md): data handling and limits`,
    `- [TESTING.md](${REPO}/blob/main/TESTING.md): test layers and commands`,
    `- [CHANGELOG.md](${REPO}/blob/main/CHANGELOG.md): releases`,
    "",
    "## Site",
    "",
    `- [Home](${SITE}/): the problem and the sample orders`,
    `- [Section 479, plainly](${SITE}/law): the law in plain words`,
    `- [Results](${SITE}/results): the evaluation and its misses`,
    `- [Use it from Claude](${SITE}/connect): connecting the MCP server`,
    `- [Status](${SITE}/status): live checks`,
    "",
    "## Optional",
    "",
    `- [Demo video](${VIDEO}): a walkthrough of the site`,
    ""
  ].join("\n");
}
