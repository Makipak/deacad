// Dijalankan via `pnpm db:seed` (dipanggil prisma.config.ts -> migrations.seed).
// Isi data minimum supaya aplikasi bisa langsung didemokan setelah migrate.
import { hash } from "bcrypt";
import { prisma } from "../src/index.js";

async function main() {
  // Kategori flat sesuai keputusan taxonomy (ARCHITECTURE.md #11) — bukan nested.
  const categoryNames = [
    "Skripsi",
    "Tesis",
    "Makalah",
    "Laporan Praktikum",
    "Presentasi/PPT",
    "Jurnal",
  ];
  for (const name of categoryNames) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // Settings default — pembayaran off supaya gampang didemokan tanpa Midtrans dulu.
  await prisma.settings.upsert({
    where: { key: "monetization" },
    update: {},
    create: {
      key: "monetization",
      value: {
        uploadPaymentEnabled: false,
        downloadPaymentEnabled: false,
        uploadPrice: 15000,
        downloadPrice: 15000,
      },
    },
  });

  // Satu akun admin default untuk login pertama kali — GANTI PASSWORD setelah seed di lingkungan nyata.
  const adminPasswordHash = await hash("ChangeMe123!", 12);
  await prisma.user.upsert({
    where: { email: "admin@deacad.example" },
    update: {},
    create: {
      name: "Admin Deacad",
      email: "admin@deacad.example",
      passwordHash: adminPasswordHash,
      role: "admin",
      emailVerified: true,
    },
  });
}

main()
  .then(async () => {
    console.log("Seed selesai.");
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Seed gagal:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
