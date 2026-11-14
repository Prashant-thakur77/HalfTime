import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, extname, isAbsolute, join, resolve } from "node:path";
import type { FileAccess } from "./tools.js";

const EXTS = new Set([".pdf", ".txt", ".png", ".jpg", ".jpeg"]);

/**
 * Disk access for the local server, limited to the folders the user allows
 * (HALFTIME_ROOTS, colon-separated; defaults to the current folder).
 */
export function nodeFiles(roots: string[] = (process.env.HALFTIME_ROOTS ?? process.cwd()).split(":").filter(Boolean)): FileAccess {
  const allowed = roots.map((r) => resolve(r));
  const guard = (p: string) => {
    const full = resolve(isAbsolute(p) ? p : join(allowed[0]!, p));
    if (!allowed.some((r) => full === r || full.startsWith(r + "/"))) {
      throw new Error(`${full} is outside the folders HalfTime may use (${allowed.join(", ")}). Set HALFTIME_ROOTS to allow it.`);
    }
    return full;
  };

  return {
    async list(folder) {
      const dir = guard(folder);
      const names = (await readdir(dir)).filter((n) => EXTS.has(extname(n).toLowerCase())).sort();
      return Promise.all(names.map(async (n) => ({ path: join(dir, n), bytes: (await stat(join(dir, n))).size })));
    },

    async read(path) {
      const full = guard(path);
      const ext = extname(full).toLowerCase();
      if (ext === ".txt") return readFile(full, "utf8");
      if (ext === ".png" || ext === ".jpg" || ext === ".jpeg") {
        return `${full} is an image. Read the page yourself, transcribe it exactly (keep Devanagari as Devanagari), then pass that text to check_order.`;
      }
      if (ext !== ".pdf") throw new Error("Only .pdf, .txt, .png and .jpg files.");
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const pdf = await pdfjs.getDocument({ data: new Uint8Array(await readFile(full)), useSystemFonts: true }).promise;
      const pages: string[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const content = await (await pdf.getPage(i)).getTextContent();
        pages.push(content.items.map((it) => ("str" in it ? it.str + (it.hasEOL ? "\n" : " ") : "")).join(""));
      }
      const text = pages.join("\n\n");
      if (text.replace(/\s/g, "").length < 200) {
        return `${full} has little or no text layer (${pdf.numPages} page(s)); it is probably a scan. Open the pages as images, transcribe them exactly, and pass the transcription to check_order.`;
      }
      return text;
    },

    async writeDocx(path, bytes) {
      if (!path.toLowerCase().endsWith(".docx")) throw new Error("save_to must end in .docx");
      const full = guard(path);
      await mkdir(dirname(full), { recursive: true });
      await writeFile(full, bytes);
      return full;
    }
  };
}
