import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Job } from "bullmq";
import { prisma } from "@deacad/database";
import { convertPptxToPdf } from "./lib/libreoffice.js";
import { convertPdfToImages } from "./lib/poppler.js";
import { downloadOriginal, uploadConvertedPdf, uploadPageImage } from "./lib/storage.js";

// Harus sinkron dengan ConvertJobData di apps/api/src/queue/convert-queue.service.ts.
export interface ConvertJobData {
  documentId: string;
  originalFileUrl: string;
  fileType: "pdf" | "pptx";
}

// Satu job = satu dokumen: download original -> (convert ke PDF kalau pptx) -> convert ke gambar
// per halaman -> upload semua gambar -> update DocumentPage + status "ready".
// BullMQ otomatis retry job yang throw error (attempts+backoff diatur di sisi producer),
// jadi di sini CUKUP throw error apa adanya kalau ada langkah yang gagal (ARCHITECTURE.md #9).
export async function processConvertJob(job: Job<ConvertJobData>): Promise<void> {
  const { documentId, originalFileUrl, fileType } = job.data;

  // Direktori temp terisolasi per job — dihapus di finally supaya tidak menumpuk file di disk worker.
  const workDir = await mkdtemp(join(tmpdir(), `deacad-${documentId}-`));

  try {
    const originalPath = join(workDir, `original.${fileType}`);
    await downloadOriginal(originalFileUrl, originalPath);

    // PPTX wajib di-convert ke PDF dulu (LibreOffice), PDF asli langsung lanjut ke tahap gambar.
    const pdfPath =
      fileType === "pptx" ? await convertPptxToPdf(originalPath, workDir) : originalPath;

    const convertedPdfUrl = await uploadConvertedPdf(pdfPath, documentId);
    const imagePaths = await convertPdfToImages(pdfPath, workDir);

    if (imagePaths.length === 0) {
      throw new Error("Hasil convert tidak menghasilkan halaman sama sekali");
    }

    const pageUrls = await Promise.all(
      imagePaths.map((imagePath) => uploadPageImage(imagePath, documentId)),
    );

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
      prisma.document.update({
        where: { id: documentId },
        data: { status: "ready", convertedPdfUrl },
      }),
    ]);
  } catch (error) {
    // Kalau ini adalah attempt terakhir (bukan mau di-retry lagi), flag dokumen "failed"
    // supaya admin bisa lihat di panel & user dapat notifikasi — bukan diam-diam macet di "processing".
    const isLastAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
    if (isLastAttempt) {
      await prisma.document.update({ where: { id: documentId }, data: { status: "failed" } });
    }
    throw error; // tetap dilempar supaya BullMQ mencatat job sebagai failed & retry logic tetap jalan.
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
