-- Thumbnail kartu dokumen (halaman 1 versi kecil, diisi apps/worker saat convert).
-- Ditulis manual (bukan hasil `prisma migrate dev` diff) untuk menghindari drift palsu
-- DROP DEFAULT pada kolom generated search_vector — lihat prisma/sql/search-vector.sql.
ALTER TABLE "documents" ADD COLUMN "thumbnail_url" TEXT;
