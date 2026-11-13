/** Writes the statute tables as JSON (tables/*.json) for review outside the code. */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ALL_ROWS, IPC_TO_BNS } from "../src/index.js";

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "tables");
mkdirSync(out, { recursive: true });

const shape = (act: string) =>
  ALL_ROWS.filter((r) => r.act === act).map((r) => ({
    section: r.section,
    title: r.title,
    max: r.punishment.kind === "term" ? { months: r.punishment.months } : r.punishment.kind,
    source: r.source,
    ...(r.note ? { note: r.note } : {})
  }));

const write = (name: string, data: unknown) => writeFileSync(join(out, name), JSON.stringify(data, null, 2) + "\n");
write("ipc_sections.json", shape("IPC"));
write("bns_sections.json", shape("BNS"));
write("ipc_to_bns.json", IPC_TO_BNS);
write(
  "special_acts.json",
  Object.fromEntries(["NDPS", "ARMS", "POCSO", "SCST", "DOWRY", "GAMBLING", "IT", "EXCISE", "GANGSTERS"].map((a) => [a, shape(a)]))
);
console.log(`Wrote ${ALL_ROWS.length} rows to ${out}`);
