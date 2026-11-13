import { decide } from "@halftime/reader";
import { ExtractRequest } from "@/lib/server/validate";
import { clientIp, errorResponse, getReader, guard, recordSpend } from "@/lib/server/reader";

export async function POST(req: Request) {
  try {
    const parsed = ExtractRequest.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Bad request" }, { status: 400 });
    const { text } = parsed.data;
    const today = parsed.data.today ?? new Date().toISOString().slice(0, 10);
    await guard(clientIp(req), "extract");
    const reader = await getReader();
    const ex = await reader.extract(text);
    await recordSpend(ex.meta);
    const check = await reader.selfCheck(text, ex.value.sections);
    await recordSpend(check.meta);
    const known = new Set(ex.value.sections.map((s) => `${s.act}:${s.section}`));
    const added = check.value.filter((s) => !known.has(`${s.act}:${s.section}`));
    const extraction = { ...ex.value, sections: [...ex.value.sections, ...added] };
    const result = decide(text, extraction, today);
    return Response.json({ ...result, selfCheckAdded: added.length, meta: [ex.meta, check.meta] });
  } catch (e) {
    return errorResponse(e);
  }
}
