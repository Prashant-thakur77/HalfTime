"use client";

/**
 * Reads an uploaded file into text in the browser. PDFs with a text layer are
 * read with pdf.js; pages without enough text are rendered to PNG and sent to
 * the server for transcription. Nothing is stored.
 */
export const MAX_FILES = 20;
export const MAX_PAGES = 15;
export const MAX_BYTES = 12 * 1024 * 1024;

export type Progress = (msg: string) => void;
/** Transcribes one page image (base64) to text. */
export type Transcribe = (base64: string, mediaType: "image/png" | "image/jpeg") => Promise<string>;

function blobToBase64(b: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result).split(",")[1] ?? "");
    fr.onerror = () => rej(fr.error);
    fr.readAsDataURL(b);
  });
}

/** Text that is mostly mangled Devanagari (common in legacy-font PDFs) can't be trusted. */
export function looksGarbled(text: string): boolean {
  const letters = text.replace(/\s/g, "");
  if (letters.length < 200) return true;
  const odd = (letters.match(/[À-ɏ�]/g) ?? []).length;
  return odd / letters.length > 0.08;
}

export async function fileToText(file: File, progress: Progress, ocrImage: Transcribe): Promise<string> {
  if (file.size > MAX_BYTES) throw new Error(`${file.name} is larger than 12 MB.`);
  if (file.type === "text/plain" || file.name.endsWith(".txt")) return file.text();
  if (file.type === "image/png" || file.type === "image/jpeg") {
    progress(`Transcribing ${file.name}`);
    return ocrImage(await blobToBase64(file), file.type);
  }
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    throw new Error(`${file.name}: only PDF, PNG, JPEG or TXT.`);
  }
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  if (pdf.numPages > MAX_PAGES) throw new Error(`${file.name} has ${pdf.numPages} pages; the limit is ${MAX_PAGES}.`);
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    let text = content.items.map((it) => ("str" in it ? it.str + (it.hasEOL ? "\n" : " ") : "")).join("");
    if (looksGarbled(text)) {
      progress(`${file.name}: page ${i} is a scan, transcribing`);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvas, canvasContext: canvas.getContext("2d")!, viewport }).promise;
      const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), "image/png"));
      text = await ocrImage(await blobToBase64(blob), "image/png");
    }
    pages.push(text);
  }
  return pages.join("\n\n");
}
