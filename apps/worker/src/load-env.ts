import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Side-effect import PALING PERTAMA di index.ts — import ESM dievaluasi sebelum kode lain
// di file yang sama, jadi .env harus sudah termuat sebelum modul lain (mis. @deacad/database,
// yang baca DATABASE_URL saat modul itu sendiri di-import) sempat jalan. Path dihitung dari
// lokasi file ini sendiri (bukan process.cwd()) karena worker bisa dijalankan dari direktori
// mana pun (mis. lewat `pnpm --filter`/turbo dari root repo).
config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../.env") });
