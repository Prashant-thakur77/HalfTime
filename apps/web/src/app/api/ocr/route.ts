import { OcrRequest } from "@/lib/server/validate";
import { clientIp, errorResponse, getReader, guard, recordSpend } from "@/lib/server/reader";

export async function POST(req: Request) {
  try {
    const parsed = OcrRequest.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: "Send one PNG or JPEG page as base64." }, { status: 400 });
    await guard(clientIp(req), "ocr", 30);
    const reader = await getReader();
    const r = await reader.transcribe(parsed.data.image, parsed.data.mediaType);
    await recordSpend(r.meta);
    return Response.json({ text: r.value, meta: r.meta });
  } catch (e) {
    return errorResponse(e);
  }
}
