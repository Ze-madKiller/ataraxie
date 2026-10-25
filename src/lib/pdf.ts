import { PDFDocument } from "pdf-lib";

// Small chunks keep each Claude call well under the serverless time limit.
export const PAGES_PER_CHUNK = 2;

/** 1-indexed, inclusive page ranges. `contextStart` adds the previous page so questions split across a boundary stay readable. */
export interface PageChunk {
  start: number;
  end: number;
  contextStart: number;
}

export async function countPages(bytes: Uint8Array): Promise<number> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  return doc.getPageCount();
}

export function planChunks(pageCount: number, pagesPerChunk = PAGES_PER_CHUNK): PageChunk[] {
  const chunks: PageChunk[] = [];
  for (let start = 1; start <= pageCount; start += pagesPerChunk) {
    const end = Math.min(start + pagesPerChunk - 1, pageCount);
    chunks.push({ start, end, contextStart: start > 1 ? start - 1 : start });
  }
  return chunks;
}

/** Copies pages [from, to] (1-indexed, inclusive) into a new PDF. */
export async function extractPages(bytes: Uint8Array, from: number, to: number): Promise<Uint8Array> {
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const out = await PDFDocument.create();
  const indices = Array.from({ length: to - from + 1 }, (_, i) => from - 1 + i);
  const pages = await out.copyPages(src, indices);
  pages.forEach((p) => out.addPage(p));
  return out.save();
}
