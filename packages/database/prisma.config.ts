// Config CLI Prisma 7 — sejak v7 semua hal environment-related (DATABASE_URL, dst)
// pindah ke sini, schema.prisma sendiri sengaja dibiarkan bersih cuma berisi model.
import "dotenv/config"; // load .env manual — generator baru tidak lagi auto-load .env saat runtime.
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // dipakai CLI (migrate/studio) — koneksi runtime aplikasi tetap lewat driver adapter di src/index.ts.
    url: env("DATABASE_URL"),
  },
});
