import facts from "@/data/facts.json";

export function GET() {
  return Response.json(facts, { headers: { "Cache-Control": "public, max-age=300" } });
}
