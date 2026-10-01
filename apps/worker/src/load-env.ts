import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Side-effect import PALING PERTAMA di index.ts — import ESM dievaluasi sebelum kode lain
// di file yang sama, jadi .env harus sudah termuat sebelum modul lain (mis. @deacad/database,
// yang baca DATABASE_URL saat modul itu sendiri di-import) sempat jalan. Path dihitung dari
// lokasi file ini sendiri (bukan process.cwd()) karena worker bisa dijalankan dari direktori
// mana pun (mis. lewat `pnpm --filter`/turbo dari root repo, atau dari Cron Jobs cPanel).
const here = path.dirname(fileURLToPath(import.meta.url));

// 1) .env di root monorepo (dev & Docker). 2) .env di folder apps/worker (layout deploy shared hosting).
// dotenv tidak menimpa variabel yang sudah ada; file yang tidak ada diabaikan tanpa error.
config({ path: path.resolve(here, "../../../.env") });
config({ path: path.resolve(here, "../.env") });
