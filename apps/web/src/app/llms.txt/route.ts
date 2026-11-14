import { llmsTxt } from "@/lib/docs/llms";

export const dynamic = "force-static";

export function GET() {
  return new Response(llmsTxt(), { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
