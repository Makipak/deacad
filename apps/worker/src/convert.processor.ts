import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prisma } from "@deacad/database";
import { config } from "./config.js";
import { PermanentJobError } from "./errors.js";
import { convertPptxToPdf } from "./lib/libreoffice.js";
import { PdfRenderer } from "./lib/pdf-render.js";
import { downloadOriginal, uploadConvertedPdf, uploadPageImage, uploadThumbnail } from "./lib/storage.js";
import { heartbeat, type ClaimedJob } from "./queue.js";

// Satu job = satu dokumen: download original -> (convert ke PDF kalau pptx) -> render tiap halaman jadi PNG
// -> upload -> update DocumentPage + status "ready". Retry/backoff dikelola queue.ts: di sini CUKUP
// throw error apa adanya kalau ada langkah yang gagal (ARCHITECTURE.md #9); lempar PermanentJobError
// untuk kegagalan yang pasti tidak sembuh dengan retry.
export async function processConvertJob(job: ClaimedJob): Promise<void> {
  const { documentId, originalFileUrl, fileType } = job;

  // Direktori temp terisolasi per job — dihapus di finally supaya tidak menumpuk file di disk worker.
  const workDir = await mkdtemp(join(tmpdir(), `deacad-${documentId}-`));
  let renderer: PdfRenderer | null = null;

  try {
    const originalPath = join(workDir, `original.${fileType}`);
    await downloadOriginal(originalFileUrl, originalPath);

    // PPTX wajib di-convert ke PDF dulu (LibreOffice, hanya ada di VPS/Docker); PDF asli langsung dirender.
    // Untuk PDF, "converted" cukup menunjuk ke file aslinya — tidak perlu menyalin objek yang sama ke storage
    // (hemat kuota storage gratis; deleteByUrls() sudah men-dedup key yang kembar).
    let pdfPath = originalPath;
    let convertedPdfUrl = originalFileUrl;
    if (fileType === "pptx") {
      pdfPath = await convertPptxToPdf(originalPath, workDir);
      convertedPdfUrl = await uploadConvertedPdf(pdfPath, documentId);
    }

    renderer = await PdfRenderer.open(pdfPath);
    const pageCount = renderer.pageCount;
    if (pageCount < 1) {
      throw new PermanentJobError("Hasil convert tidak menghasilkan halaman sama sekali");
    }
    if (pageCount > config.maxPages) {
      throw new PermanentJobError(`Dokumen ${pageCount} halaman, melebihi batas ${config.maxPages} halaman per dokumen`);
    }

    // Render berurutan (satu halaman di memori pada satu waktu), upload paralel terbatas di belakangnya.
    const pageUrls: string[] = new Array<string>(pageCount);
    const inflight = new Set<Promise<void>>();
    let uploadError: unknown;

    for (let index = 0; index < pageCount; index++) {
      if (uploadError) throw uploadError;

      const imagePath = join(workDir, `page-${index + 1}.png`);
      await renderer.renderPageToFile(index, imagePath);

      // Tidak boleh ada promise yang reject tanpa handler (Node 22 menjatuhkan proses) — error disimpan
      // dan dilempar di iterasi berikutnya / setelah loop.
      const task: Promise<void> = uploadPageImage(imagePath, documentId)
        .then((url) => {
          pageUrls[index] = url;
        })
        .catch((error: unknown) => {
          uploadError ??= error;
        })
        .finally(() => {
          inflight.delete(task);
        });
      inflight.add(task);
      if (inflight.size >= config.uploadConcurrency) await Promise.race(inflight);

      await heartbeat(job.id); // beri tahu proses lain: job ini masih hidup (jangan di-claim ulang).
    }
    await Promise.all(inflight);
    if (uploadError) throw uploadError;

    // Thumbnail kartu dokumen: halaman 1 versi kecil (sampul di halaman browse/profil).
    const thumbnailPath = join(workDir, "thumb.png");
    await renderer.renderPageToFile(0, thumbnailPath, config.thumbnailSide);
    const thumbnailUrl = await uploadThumbnail(thumbnailPath, documentId);

    // Transaction: hapus page lama (kalau ini re-convert) lalu insert page baru + update status —
    // biar tidak ada state "setengah jadi" kalau proses ini sendiri gagal di tengah jalan.
    await prisma.$transaction([
      prisma.documentPage.deleteMany({ where: { documentId } }),
      prisma.documentPage.createMany({
        data: pageUrls.map((imageUrl, index) => ({
          documentId,
          pageNumber: index + 1,
          imageUrl,
          isWatermarked: false, // watermark preview dinamis bisa ditambah di tahap lanjut, ARCHITECTURE.md #13.
        })),
      }),
      // Hanya dokumen yang masih processing/failed yang jadi "ready" — jangan menghidupkan lagi dokumen
      // yang admin sudah tolak (rejected) saat convert berjalan. updateMany: tidak error kalau dokumen sudah dihapus.
      prisma.document.updateMany({
        where: { id: documentId, status: { in: ["processing", "failed"] } },
        data: { status: "ready", convertedPdfUrl, thumbnailUrl },
      }),
    ]);
  } finally {
    renderer?.close();
    await rm(workDir, { recursive: true, force: true });
  }
}
