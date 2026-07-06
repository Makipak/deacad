// Satu-satunya tempat PrismaClient di-instantiate — semua app import prisma dari sini,
// supaya tidak ada koneksi pool ganda yang tidak terkontrol.
import { PrismaPg } from "@prisma/adapter-pg"; // driver adapter Postgres — wajib sejak Prisma 7 rust-free.
import { PrismaClient } from "./generated/prisma/client.js"; // hasil `prisma generate`, bukan dari @prisma/client.

// Adapter membungkus koneksi node-postgres, dipakai query engine TypeScript baru (bukan binary Rust lagi).
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

// Global cache instance saat dev (hot-reload NestJS bisa re-import module berkali-kali
// tanpa ini, tiap reload bikin koneksi pool baru dan cepat habis quota Postgres).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Re-export semua type generated Prisma (Document, User, dst) supaya app lain
// cukup import dari "@deacad/database", tidak perlu tahu path generated internal.
export * from "./generated/prisma/client.js";
