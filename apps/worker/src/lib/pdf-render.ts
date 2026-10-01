import { readFile, writeFile } from "node:fs/promises";
import * as mupdf from "mupdf";
import { config } from "../config.js";
import { PermanentJobError } from "../errors.js";

// Render halaman PDF jadi PNG pakai MuPDF (WebAssembly, dipasang lewat npm) — pengganti Poppler `pdftoppm`.
// Alasan: shared hosting tidak punya binary poppler dan tidak bisa meng-install-nya; MuPDF jalan murni di Node.
// Dipakai untuk render slideshow (bukan native render file asli di browser, ARCHITECTURE.md #1).
export class PdfRenderer {
  private constructor(private readonly doc: mupdf.Document) {}

  static async open(pdfPath: string): Promise<PdfRenderer> {
    const data = await readFile(pdfPath);
    let doc: mupdf.Document;
    try {
      doc = mupdf.Document.openDocument(data, "application/pdf");
    } catch (error) {
      throw new PermanentJobError(`File PDF tidak bisa dibuka (kemungkinan rusak): ${errorMessage(error)}`);
    }
    if (doc.needsPassword()) {
      doc.destroy();
      throw new PermanentJobError("PDF terkunci dengan password sehingga tidak bisa dibuat pratinjau");
    }
    return new PdfRenderer(doc);
  }

  get pageCount(): number {
    return this.doc.countPages();
  }

  // Render satu halaman (index mulai 0) ke file PNG.
  //  - tanpa `longSide`: resolusi config.renderDpi (150 DPI seperti Poppler dulu), tapi sisi terpanjang
  //    dibatasi config.renderMaxSide supaya slide 16:9 besar tidak membengkak jadi puluhan MB di RAM.
  //  - dengan `longSide`: skala persis agar sisi terpanjang = nilai itu (dipakai thumbnail).
  async renderPageToFile(index: number, outputPath: string, longSide?: number): Promise<void> {
    const page = this.doc.loadPage(index);
    try {
      const [x0, y0, x1, y1] = page.getBounds();
      const width = x1 - x0;
      const height = y1 - y0;
      if (!(width > 0 && height > 0)) {
        throw new PermanentJobError(`Halaman ${index + 1} punya ukuran tidak valid`);
      }
      const longest = Math.max(width, height);
      const scale = longSide ? longSide / longest : Math.min(config.renderDpi / 72, config.renderMaxSide / longest);

      const pixmap = page.toPixmap(mupdf.Matrix.scale(scale, scale), mupdf.ColorSpace.DeviceRGB, false, true);
      try {
        await writeFile(outputPath, pixmap.asPNG());
      } finally {
        pixmap.destroy(); // memori WASM tidak di-GC otomatis — wajib dibebaskan per halaman.
      }
    } finally {
      page.destroy();
    }
  }

  close(): void {
    this.doc.destroy();
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
