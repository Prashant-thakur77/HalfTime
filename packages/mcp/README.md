# HalfTime MCP server

Use HalfTime from Claude. The Claude you are talking to reads the court papers and reports each fact with a verbatim quote. HalfTime's tools check every quote against the document and apply Section 479 BNSS with the same tested engine as the website. No API key is involved: the model is the one already in your chat.

## Tools

| Tool | What it does |
|---|---|
| `check_order` | Verifies an extraction against the order text, applies Section 479, returns the verdict, the rule trace, accepted quotes and rejected claims |
| `sweep_jail` | The same for up to 50 orders at once: lanes table and a CSV for the DLSA |
| `draft_application` | The Section 479(3) application in English or Hindi; the local server can also save it as .docx |
| `apply_section_479` | The engine on typed-in facts, for a lawyer who already knows them |
| `lookup_section` | Maximum term for an IPC, BNS or special-act section, with its source and the IPC→BNS mapping |
| `list_sample_orders`, `get_sample_order` | 12 constructed sample orders to try it on |
| `list_order_files`, `read_order_file` | Local server only: read a folder of court papers (.txt and text-layer .pdf) |

There is also a `sweep_jail` prompt that runs the whole workflow.

## Remote (claude.ai and any client with a connector URL)

Add a custom connector with the URL:

```
https://halftime.prashantthakur.dev/mcp
```

The remote server has no file access. It works on the sample orders, or on text you paste into the chat.

## Claude Code

```bash
# remote
claude mcp add --transport http halftime https://halftime.prashantthakur.dev/mcp

# local, with file access to a folder of papers
pnpm install
claude mcp add halftime --env HALFTIME_ROOTS=/path/to/papers -- node /path/to/HalfTime/packages/mcp/bin/halftime-mcp.mjs
```

Then ask: *"Use halftime to sweep the jail papers in /path/to/papers."*

## Claude Desktop

In `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "halftime": {
      "command": "node",
      "args": ["/path/to/HalfTime/packages/mcp/bin/halftime-mcp.mjs"],
      "env": { "HALFTIME_ROOTS": "/path/to/papers" }
    }
  }
}
```

`HALFTIME_ROOTS` lists the folders the server may read and write (colon-separated). Anything outside them is refused.

## Try it

`data/demo-jail/` has five constructed orders. With the local server pointed at that folder, ask Claude to sweep it. Expect two people past the line (one flagged under 479(2)), one not yet, one can't tell (no custody date in the papers) and one outside 479 (attempt to murder hidden in a list of sections).

## Tests

```bash
pnpm --filter @halftime/mcp test                 # every tool through a real MCP client (in memory)
npx tsx scripts/stdio-smoke.ts <folder>          # start the stdio server the way Claude Desktop does
npx tsx scripts/remote-smoke.ts https://halftime.prashantthakur.dev/mcp
```
