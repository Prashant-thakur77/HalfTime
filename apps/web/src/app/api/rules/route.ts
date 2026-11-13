import { evaluate } from "@halftime/law";
import { RulesRequest } from "@/lib/server/validate";

/** The law engine over HTTP: pure code, no model, no network. */
export async function POST(req: Request) {
  const parsed = RulesRequest.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Bad request" }, { status: 400 });
  return Response.json(evaluate(parsed.data.input, parsed.data.today));
}
