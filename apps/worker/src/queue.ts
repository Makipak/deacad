import { prisma } from "@deacad/database";
import { config } from "./config.js";

// Antrean berbasis Postgres (tabel convert_jobs, lihat schema.prisma) — pengganti BullMQ/Redis.
// Producer-nya ada di apps/api/src/queue/convert-queue.service.ts; kolom-kolom di bawah harus sinkron.

export interface ClaimedJob {
  id: string;
  documentId: string;
  originalFileUrl: string;
  fileType: "pdf" | "pptx";
  attempts: number; // sudah termasuk percobaan yang sedang berjalan ini.
  maxAttempts: number;
}

const BACKOFF_BASE_SECONDS = 60;

// Ambil satu job siap-jalan secara atomik. SKIP LOCKED: dua worker yang berebut tidak saling blok dan tidak
// mengambil job yang sama. Dua jenis job yang diambil: pending yang jadwalnya sudah tiba, dan "active" yang
// sudah basi (worker-nya mati di tengah jalan). Klausa terakhir membatasi jumlah job aktif lintas proses
// (WORKER_MAX_CONCURRENCY) — cron yang overlap tidak akan menjalankan dua LibreOffice/render sekaligus.
// Semua waktu dibandingkan dalam UTC karena Prisma menyimpan DateTime ke kolom timestamp(3) sebagai UTC.
export async function claimNextJob(): Promise<ClaimedJob | null> {
  const stale = config.jobStaleSeconds;
  const maxConcurrency = config.maxConcurrency;
  const rows = await prisma.$queryRaw<ClaimedJob[]>`
    UPDATE convert_jobs
    SET status = 'active',
        locked_at = (NOW() AT TIME ZONE 'UTC'),
        attempts = attempts + 1,
        updated_at = (NOW() AT TIME ZONE 'UTC')
    WHERE id = (
      SELECT id FROM convert_jobs
      WHERE (status = 'pending' AND run_after <= (NOW() AT TIME ZONE 'UTC'))
         OR (status = 'active' AND locked_at < (NOW() AT TIME ZONE 'UTC') - make_interval(secs => ${stale}))
      ORDER BY created_at
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    AND (
      SELECT COUNT(*) FROM convert_jobs
      WHERE status = 'active' AND locked_at >= (NOW() AT TIME ZONE 'UTC') - make_interval(secs => ${stale})
    ) < ${maxConcurrency}
    RETURNING id,
              document_id AS "documentId",
              original_file_url AS "originalFileUrl",
              file_type::text AS "fileType",
              attempts,
              max_attempts AS "maxAttempts"
  `;
  const row = rows[0];
  // COUNT/INT dari driver bisa berupa bigint/number — attempts & maxAttempts dipaksa number supaya aman dibandingkan.
  return row ? { ...row, attempts: Number(row.attempts), maxAttempts: Number(row.maxAttempts) } : null;
}

// Detak: dipanggil berkala selama job panjang jalan supaya tidak dianggap basi oleh proses lain.
export async function heartbeat(jobId: string): Promise<void> {
  await prisma.convertJob.updateMany({ where: { id: jobId, status: "active" }, data: { lockedAt: new Date() } });
}

export async function completeJob(jobId: string): Promise<void> {
  // updateMany (bukan update): kalau dokumennya keburu dihapus admin, baris job ikut terhapus (cascade) — bukan error.
  await prisma.convertJob.updateMany({
    where: { id: jobId },
    data: { status: "done", lockedAt: null, lastError: null },
  });
}

// Gagal: retry dengan backoff eksponensial (1m, 2m, 4m, ...) selama percobaan masih ada — kecuali error-nya
// permanen. Setelah habis, job -> failed dan dokumen ditandai "failed" supaya admin bisa melihatnya di panel
// (bukan diam-diam macet di "processing"), sama seperti perilaku BullMQ sebelumnya.
export async function failJob(job: ClaimedJob, error: unknown, permanent: boolean): Promise<"retry" | "failed"> {
  const message = (error instanceof Error ? error.message : String(error)).slice(0, 500);
  const exhausted = permanent || job.attempts >= job.maxAttempts;

  if (!exhausted) {
    const delayMs = BACKOFF_BASE_SECONDS * 1000 * 2 ** Math.max(0, job.attempts - 1);
    await prisma.convertJob.updateMany({
      where: { id: job.id },
      data: { status: "pending", lockedAt: null, lastError: message, runAfter: new Date(Date.now() + delayMs) },
    });
    return "retry";
  }

  await prisma.convertJob.updateMany({
    where: { id: job.id },
    data: { status: "failed", lockedAt: null, lastError: message },
  });
  // Hanya dokumen yang masih "processing" yang diubah — jangan menimpa status rejected/ready dari admin.
  await prisma.document.updateMany({
    where: { id: job.documentId, status: "processing" },
    data: { status: "failed" },
  });
  return "failed";
}
