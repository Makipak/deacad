import "./load-env.js"; // wajib paling awal — muat .env sebelum modul lain baca process.env saat di-import.
import { prisma } from "@deacad/database";
import { config } from "./config.js";
import { runLoop, runOnce } from "./runner.js";

// Entry point worker. Dua mode (lihat config.ts):
//   node dist/index.js          -> "once": kuras antrean lalu exit (Cron Jobs cPanel, tiap menit)
//   node dist/index.js --loop   -> "loop": hidup terus (VPS/Docker)
async function main(): Promise<number> {
  try {
    if (config.mode === "loop") {
      await runLoop();
    } else {
      const processed = await runOnce();
      if (processed > 0) {
        // eslint-disable-next-line no-console
        console.log(`[${new Date().toISOString()}] Worker selesai, ${processed} job diproses`);
      }
    }
    return 0;
  } catch (error) {
    console.error("Worker berhenti karena error tak terduga:", error);
    return 1;
  } finally {
    // Pool koneksi Postgres harus ditutup, kalau tidak proses tidak akan exit (penting untuk mode "once").
    await prisma.$disconnect().catch(() => undefined);
  }
}

process.exit(await main());
