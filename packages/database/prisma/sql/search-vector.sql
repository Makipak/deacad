-- Prisma tidak bisa generate generated column + index GIN lewat schema.prisma biasa
-- (kolom searchVector di schema.prisma dipetakan "Unsupported" hanya supaya Prisma tahu kolomnya ada).
-- Jalankan SQL ini SEKALI lewat migration manual setelah migrasi awal Prisma selesai:
--   pnpm db:migrate --create-only --name add_search_vector
--   lalu tempel isi file ini ke file migration.sql yang dihasilkan, baru `pnpm db:migrate`.
-- Detail keputusan ada di ARCHITECTURE.md #11.

ALTER TABLE documents ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('indonesian', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('indonesian', coalesce(description, '')), 'B')
  ) STORED;

CREATE INDEX documents_search_idx ON documents USING GIN(search_vector);
