"""Turn a `claude -p --output-format stream-json --verbose` log into a readable Markdown transcript.

    python3 scripts/transcript.py run.jsonl > transcript.md
"""
import json
import sys


def short(v, n=160):
    s = v if isinstance(v, str) else json.dumps(v, ensure_ascii=False)
    s = s.replace("\n", " ")
    return s if len(s) <= n else s[: n - 1] + "…"


def main(path):
    out = ["# HalfTime MCP: recorded Claude Code session", ""]
    final = None
    for line in open(path, encoding="utf-8"):
        try:
            ev = json.loads(line)
        except ValueError:
            continue
        t = ev.get("type")
        if t == "system" and ev.get("subtype") == "init":
            tools = [x for x in ev.get("tools", []) if x.startswith("mcp__halftime")]
            out += [f"Model: `{ev.get('model')}` · MCP servers: {', '.join(s['name'] + ' (' + s['status'] + ')' for s in ev.get('mcp_servers', []))}", "", "HalfTime tools available: " + ", ".join(f"`{x.split('__')[-1]}`" for x in tools), ""]
        elif t == "assistant":
            for block in ev["message"]["content"]:
                if block["type"] == "tool_use":
                    name = block["name"].split("__")[-1]
                    args = block["input"]
                    if name in ("check_order", "sweep_jail", "draft_application"):
                        if "orders" in args:
                            desc = f"{len(args['orders'])} orders: " + ", ".join(o["id"] for o in args["orders"])
                        else:
                            ex = args.get("extraction", {})
                            secs = ", ".join(f"{s['act']} {s['section']}" for s in ex.get("sections", []))
                            desc = f"sections [{secs}], custody {ex.get('custody_start', {}).get('date')}" + (f", save_to {args['save_to']}" if args.get("save_to") else "")
                    else:
                        desc = short(args)
                    out += [f"**→ {name}**  {desc}", ""]
                elif block["type"] == "text" and block["text"].strip():
                    out += [block["text"].strip(), ""]
        elif t == "user":
            for block in ev["message"]["content"]:
                if isinstance(block, dict) and block.get("type") == "tool_result":
                    content = block.get("content")
                    text = content if isinstance(content, str) else "\n".join(c.get("text", "") for c in content or [])
                    first = text.strip().split("\n")
                    keep = first[:3] if not text.startswith("Jail sweep") else first[:2]
                    out += ["> " + "\n> ".join(short(x, 200) for x in keep if x.strip()), ""]
        elif t == "result":
            final = ev
    if final:
        out += ["---", f"Turns: {final.get('num_turns')} · duration {round(final.get('duration_ms', 0) / 1000)} s · result: {final.get('subtype')}"]
    print("\n".join(out))


if __name__ == "__main__":
    main(sys.argv[1])
