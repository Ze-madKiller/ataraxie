import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { countPages, extractPages, planChunks } from "./pdf";

async function makePdf(pages: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) doc.addPage([200 + i, 200]);
  return doc.save();
}

describe("planChunks", () => {
  it("splits pages and adds the previous page as context", () => {
    expect(planChunks(5, 2)).toEqual([
      { start: 1, end: 2, contextStart: 1 },
      { start: 3, end: 4, contextStart: 2 },
      { start: 5, end: 5, contextStart: 4 },
    ]);
  });

  it("returns no chunks for an empty document", () => {
    expect(planChunks(0)).toEqual([]);
  });
});

describe("extractPages", () => {
  it("copies the requested page range in order", async () => {
    const pdf = await makePdf(5);
    const part = await extractPages(pdf, 2, 4);
    expect(await countPages(part)).toBe(3);
    const doc = await PDFDocument.load(part);
    expect(doc.getPages().map((p) => p.getWidth())).toEqual([201, 202, 203]);
  });
});
