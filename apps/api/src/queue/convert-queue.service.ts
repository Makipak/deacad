import { Injectable } from "@nestjs/common";
import { prisma } from "@deacad/database";

// Job payload disepakati bersama apps/worker (lihat apps/worker/src/queue.ts) — kolomnya sama dengan
// tabel convert_jobs, bukan lagi message di Redis.
export interface ConvertJobData {
  documentId: string;
  originalFileUrl: string;
  fileType: "pdf" | "pptx";
}

// Client yang boleh dipakai enqueue: prisma biasa ATAU `tx` dari prisma.$transaction — dengan `tx`,
// job ikut commit/rollback bersama transaksi pemanggil (mis. status pembayaran di syncStatus()).
type JobDb = Pick<typeof prisma, "convertJob">;

// Producer sisi API — cuma menulis baris ke tabel convert_jobs, TIDAK pernah memproses convert di
// process ini (proses berat dipisah ke apps/worker, ARCHITECTURE.md #3). Antrean berbasis Postgres
// menggantikan BullMQ/Redis supaya bisa jalan di shared hosting (worker dipanggil Cron Jobs cPanel).
@Injectable()
export class ConvertQueueService {
  async enqueue(data: ConvertJobData, db: JobDb = prisma): Promise<void> {
    // Satu job per dokumen (documentId unique). Sudah ada & belum gagal -> biarkan, jangan di-reset:
    // enqueue bisa terpanggil dua kali (mis. admin mematikan upload berbayar tepat saat webhook paid masuk).
    await db.convertJob.upsert({
      where: { documentId: data.documentId },
      create: {
        documentId: data.documentId,
        originalFileUrl: data.originalFileUrl,
        fileType: data.fileType,
        runAfter: new Date(),
      },
      update: {},
    });

    // Job yang sudah gagal permanen (melewati maxAttempts) dihidupkan lagi kalau di-enqueue ulang.
    await db.convertJob.updateMany({
      where: { documentId: data.documentId, status: "failed" },
      data: {
        status: "pending",
        attempts: 0,
        runAfter: new Date(),
        lockedAt: null,
        lastError: null,
        originalFileUrl: data.originalFileUrl,
        fileType: data.fileType,
      },
    });
  }
}
