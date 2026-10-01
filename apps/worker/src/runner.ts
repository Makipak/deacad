import { processConvertJob } from "./convert.processor.js";
import { config } from "./config.js";
import { PermanentJobError } from "./errors.js";
import { claimNextJob, completeJob, failJob, type ClaimedJob } from "./queue.js";

let stopRequested = false;

// Graceful shutdown — job yang sedang berjalan diselesaikan dulu, baru proses exit.
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    log(`${signal} diterima, berhenti setelah job yang sedang berjalan selesai`);
    stopRequested = true;
  });
}

function log(message: string): void {
  // eslint-disable-next-line no-console
  console.log(`[${new Date().toISOString()}] ${message}`);
}

async function handleJob(job: ClaimedJob): Promise<void> {
  const label = `dokumen ${job.documentId} (percobaan ${job.attempts}/${job.maxAttempts})`;

  // Job "active" basi yang sudah melewati batas percobaan (worker mati berulang kali di dokumen yang sama,
  // mis. kehabisan memori) tidak dijalankan lagi — langsung ditandai gagal.
  if (job.attempts > job.maxAttempts) {
    await failJob(job, new Error("Worker berhenti di tengah proses berulang kali (kemungkinan kehabisan memori)"), true);
    console.error(`Convert dibatalkan: ${label} melewati batas percobaan`);
    return;
  }

  try {
    log(`Convert mulai: ${label}`);
    await processConvertJob(job);
    await completeJob(job.id);
    log(`Convert selesai: ${label}`);
  } catch (error) {
    const outcome = await failJob(job, error, error instanceof PermanentJobError);
    console.error(`Convert gagal (${outcome === "retry" ? "akan dicoba lagi" : "final"}): ${label}`, error);
  }
}

// Mode "once": kuras antrean lalu selesai — dipanggil Cron Jobs cPanel tiap menit.
export async function runOnce(): Promise<number> {
  const deadline = Date.now() + config.runBudgetSeconds * 1000;
  let processed = 0;
  while (!stopRequested && Date.now() < deadline) {
    const job = await claimNextJob();
    if (!job) break;
    await handleJob(job);
    processed++;
  }
  return processed;
}

// Mode "loop": tetap hidup dan polling — untuk VPS/Docker.
export async function runLoop(): Promise<void> {
  log(`Deacad worker jalan (loop, polling ${config.pollIntervalMs} ms)...`);
  while (!stopRequested) {
    const job = await claimNextJob();
    if (job) {
      await handleJob(job);
    } else {
      await new Promise((resolve) => setTimeout(resolve, config.pollIntervalMs));
    }
  }
}
