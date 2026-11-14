import { evaluate } from "@halftime/law";
import { DocIndex, checkQuote } from "@halftime/reader";

export const dynamic = "force-dynamic";

/**
 * Liveness plus a real self-test: the law engine and the verifier answer a known case correctly.
 * Used by the scheduled production check in .github/workflows/prod-check.yml.
 */
export async function GET() {
  const t0 = Date.now();
  const e = evaluate({ sections: [{ act: "IPC", section: "379" }], custodyStart: "2024-05-20", firstTimeOffender: "true", otherPendingCases: "false" }, "2026-11-15");
  const doc = new DocIndex("प्रार्थी/अभियुक्त दिनांक 20.05.2024 से जिला कारागार में निरुद्ध है।");
  const ok = e.verdict === "PAST_THE_LINE" && e.lineDate === "2025-05-20" && checkQuote(doc, "दिनांक 20.05.2024 से").ok && !checkQuote(doc, "दिनांक 20.05.2023 से").ok;
  return Response.json(
    { status: ok ? "ok" : "degraded", engine: e.verdict, verifier: ok, build: process.env.BUILD_DATE ?? null, ms: Date.now() - t0 },
    { status: ok ? 200 : 503, headers: { "cache-control": "no-store" } }
  );
}
