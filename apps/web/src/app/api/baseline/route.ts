import { BaselineRequest } from "@/lib/server/validate";
import { clientIp, errorResponse, getReader, guard, recordSpend } from "@/lib/server/reader";

/** Baseline B: the plain chatbot answer, for the split screen. */
export async function POST(req: Request) {
  try {
    const parsed = BaselineRequest.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: "Send the document text." }, { status: 400 });
    await guard(clientIp(req), "baseline", 6);
    const reader = await getReader();
    const b = await reader.baseline(parsed.data.text);
    await recordSpend(b.meta);
    const j = await reader.judgeBaseline(b.value.text);
    await recordSpend(j.meta);
    return Response.json({ answer: j.value, meta: [b.meta, j.meta] });
  } catch (e) {
    return errorResponse(e);
  }
}
