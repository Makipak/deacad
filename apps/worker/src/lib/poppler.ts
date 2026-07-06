import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

const execFileAsync = promisify(execFile);

// Convert tiap halaman PDF jadi PNG pakai Poppler `pdftoppm` — dipakai untuk render slideshow
// (bukan native render file asli di browser, ARCHITECTURE.md #1).
export async function convertPdfToImages(pdfPath: string, outputDir: string): Promise<string[]> {
  const outputPrefix = join(outputDir, "page");
  await execFileAsync(
    "pdftoppm",
    [
      "-png",
      "-r",
      "150", // 150 DPI — cukup tajam untuk dibaca di layar, tanpa file jadi terlalu besar.
      pdfPath,
      outputPrefix,
    ],
    { timeout: 120_000 },
  );

  const files = await readdir(outputDir);
  return files
    .filter((f) => f.startsWith("page") && f.endsWith(".png"))
    // Sort numerik berdasar nomor halaman (bukan sort string) — string sort salah urutan
    // begitu dokumen lebih dari 9 halaman (page-10.png < page-2.png secara alfabet).
    .sort((a, b) => extractPageNumber(a) - extractPageNumber(b))
    .map((f) => join(outputDir, f));
}

function extractPageNumber(filename: string): number {
  const match = filename.match(/-(\d+)\.png$/);
  return match ? Number(match[1]) : 0;
}
