// Semua pengaturan worker dibaca dari env, dengan default yang aman untuk shared hosting (RAM ~2 GB,
// I/O lambat, satu core). Di VPS/Docker bisa dinaikkan lewat env tanpa ubah kode.

function intEnv(name: string, fallback: number, min: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value >= min ? Math.floor(value) : fallback;
}

// Mode jalan:
//  - "once" (default): proses semua job yang siap lalu EXIT. Cocok untuk Cron Jobs cPanel (tiap menit) —
//    shared hosting mematikan proses yang hidup lama, jadi tidak ada worker permanen.
//  - "loop": tetap hidup, polling tiap WORKER_POLL_INTERVAL_MS. Cocok untuk VPS/Docker (restart: unless-stopped).
// Bisa dipilih lewat argumen CLI (--loop / --once) atau env WORKER_MODE; argumen CLI menang.
function resolveMode(): "once" | "loop" {
  if (process.argv.includes("--loop")) return "loop";
  if (process.argv.includes("--once")) return "once";
  return (process.env.WORKER_MODE ?? "once").trim().toLowerCase() === "loop" ? "loop" : "once";
}

export const config = {
  mode: resolveMode(),
  // Batas job yang boleh aktif bersamaan (lintas proses, dihitung di database). 1 = aman untuk 2 GB RAM.
  maxConcurrency: intEnv("WORKER_MAX_CONCURRENCY", 1, 1),
  // Mode "once": berhenti mengambil job baru setelah sekian detik (job yang sedang jalan tetap diselesaikan).
  runBudgetSeconds: intEnv("WORKER_RUN_BUDGET_SECONDS", 600, 10),
  // Mode "loop": jeda polling saat antrean kosong.
  pollIntervalMs: intEnv("WORKER_POLL_INTERVAL_MS", 5000, 500),
  // Job "active" yang tidak ada detak (locked_at) selama ini dianggap worker-nya mati -> boleh di-claim ulang.
  jobStaleSeconds: intEnv("WORKER_JOB_STALE_SECONDS", 600, 60),
  // Dokumen dengan halaman lebih dari ini ditolak (melindungi RAM/disk/I/O shared hosting).
  maxPages: intEnv("CONVERT_MAX_PAGES", 300, 1),
  // Render halaman: DPI (poppler dulu 150) dengan batas sisi terpanjang agar slide 16:9 besar tidak membengkak.
  renderDpi: intEnv("RENDER_DPI", 150, 36),
  renderMaxSide: intEnv("RENDER_MAX_SIDE", 2000, 400),
  thumbnailSide: intEnv("THUMBNAIL_SIDE", 320, 64),
  // Upload gambar halaman ke storage dilakukan paralel sebanyak ini (render tetap berurutan).
  uploadConcurrency: intEnv("WORKER_UPLOAD_CONCURRENCY", 3, 1),
} as const;
