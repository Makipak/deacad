// Config CLI Prisma 7 — sejak v7 semua hal environment-related (DATABASE_URL, dst)
// pindah ke sini, schema.prisma sendiri sengaja dibiarkan bersih cuma berisi model.
import { config } from "dotenv"; // load .env manual — generator baru tidak lagi auto-load .env saat runtime.
import { fileURLToPath } from "node:url";
import path from "node:path";
import { defineConfig, env } from "prisma/config";

// Path absolut ke .env di root monorepo — bukan process.cwd(), karena CLI ini sering
// dipanggil lewat `pnpm --filter` dari root, yang membuat cwd bukan folder package ini.
config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../.env") });

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
