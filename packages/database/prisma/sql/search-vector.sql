-- Prisma tidak bisa generate generated column + index GIN lewat schema.prisma biasa
-- (kolom searchVector di schema.prisma dipetakan "Unsupported" hanya supaya Prisma tahu kolomnya ada).
-- Jalankan SQL ini SEKALI lewat migration manual setelah migrasi awal Prisma selesai:
--   pnpm db:migrate --create-only --name add_search_vector
--   lalu tempel isi file ini ke file migration.sql yang dihasilkan, baru `pnpm db:migrate`.
-- Detail keputusan ada di ARCHITECTURE.md #11.
--
-- PENTING — drift palsu di migrasi SELANJUTNYA: Postgres menyimpan generated STORED
-- column lewat pg_attrdef, dan Prisma's schema diff engine selalu membacanya sebagai
-- "default" yang tidak dikenal schema.prisma. Akibatnya SETIAP kali membuat migrasi baru
-- (`prisma migrate dev`), Prisma akan menyisipkan baris palsu:
--   ALTER TABLE "documents" ALTER COLUMN "search_vector" DROP DEFAULT;
-- Baris ini SALAH (Postgres menolak DROP DEFAULT untuk generated column, harus DROP
-- EXPRESSION) dan tidak boleh diterapkan. SELALU pakai `prisma migrate dev --create-only`
-- dulu, hapus baris itu dari migration.sql yang dihasilkan, baru jalankan `prisma migrate dev`
-- untuk apply. Jangan pernah jalankan `prisma migrate dev` langsung (tanpa --create-only)
-- di package ini selama kolom searchVector masih ada.

ALTER TABLE documents ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('indonesian', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('indonesian', coalesce(description, '')), 'B')
  ) STORED;

CREATE INDEX documents_search_idx ON documents USING GIN(search_vector);
