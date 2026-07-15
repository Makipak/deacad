import "./load-env.js"; // wajib paling awal — muat .env sebelum modul lain baca process.env saat di-import.
import { Worker } from "bullmq";
import { processConvertJob } from "./convert.processor.js";

const CONVERT_QUEUE_NAME = "document-convert"; // harus sama persis dengan apps/api/src/queue/queue.module.ts.

const worker = new Worker(CONVERT_QUEUE_NAME, processConvertJob, {
  connection: {
    host: process.env.REDIS_HOST ?? "localhost",
    port: Number(process.env.REDIS_PORT ?? 6379),
  },
  // Batas job paralel — LibreOffice berat per instance, jangan sampai worker kehabisan memori
  // kalau banyak convert job masuk bersamaan.
  concurrency: 2,
});

worker.on("completed", (job) => {
  // eslint-disable-next-line no-console
  console.log(`Convert selesai: dokumen ${job.data.documentId}`);
});

worker.on("failed", (job, error) => {
  console.error(`Convert gagal: dokumen ${job?.data.documentId}`, error);
});

// eslint-disable-next-line no-console
console.log("Deacad worker jalan, menunggu job convert...");

// Graceful shutdown — biarkan job yang sedang berjalan selesai dulu sebelum proses exit.
process.on("SIGTERM", async () => {
  await worker.close();
  process.exit(0);
});
