# Deacad

Platform sharing dokumen akademik. Detail keputusan arsitektur ada di [ARCHITECTURE.md](./ARCHITECTURE.md).

## Stack

Next.js 16 · NestJS 11 · PostgreSQL 17 · Prisma ORM 7 · BullMQ 5 · Redis 8 · Zod 4 · Tailwind CSS 4 · Turborepo 2 · pnpm 11.

## Struktur

```
apps/web/       Next.js — frontend publik + admin panel
apps/api/       NestJS — REST API, auth, business logic, webhook
apps/worker/    Consumer BullMQ — convert PDF/PPTX ke gambar (LibreOffice + Poppler)
packages/database/    Prisma schema, client, seed
packages/shared-types/  Zod schema + TS types dipakai lintas app
packages/config/       eslint & tsconfig base
docker/                Dockerfile tiap app + config nginx
scripts/               Script setup development (mis. scripts/setup-linux.sh)
```

## Setup di Pop!_OS / Ubuntu

Kalau laptop dev-mu Pop!_OS (atau Ubuntu/Debian-based lain), jalankan sekali:

```bash
chmod +x scripts/setup-linux.sh
./scripts/setup-linux.sh
```

Script ini install: nvm + Node.js 22, pnpm (lewat corepack, versi dikunci ke `packageManager` di
`package.json`), Docker Engine + Compose plugin (repo resmi Docker, bukan paket `docker.io` Ubuntu
yang lebih lama), LibreOffice + `poppler-utils` (buat jalanin `apps/worker` langsung di host tanpa
Docker kalau mau), serta `postgresql-client`/`redis-tools` buat debug cepat (`psql`, `redis-cli`) ke
container `docker-compose`. Idempotent — aman dijalankan ulang.

Setelah itu **buka terminal baru** (supaya `nvm` dan grup `docker` aktif), baru lanjut ke bagian
"Menjalankan (development)" di bawah.

Catatan Pop!_OS spesifik:
- Pop!_OS pakai kernel/COSMIC sendiri tapi userland-nya Ubuntu — repo apt Docker `ubuntu` tetap cocok.
- Kalau pakai Pop!_OS versi lama (22.04-based) dan `docker compose` (tanpa v2 plugin) belum kebaca,
  cek `docker compose version` — kalau error, jalankan ulang bagian Docker di script atau
  `sudo apt-get install -y docker-compose-plugin`.
- Firewall UFW default Pop!_OS tidak block port lokal (3000/4000/5434/6379), jadi biasanya tidak perlu
  konfigurasi tambahan untuk development.
- `docker-compose.yml` sengaja map container `postgres` ke **port host 5434**, bukan 5432 —
  supaya tidak gampang bentrok dengan Postgres lain yang sudah jalan di mesin dev (native
  `postgresql.service`, ATAU container Docker milik project lain yang kebetulan juga pakai 5432/5433).
  Konflik seperti ini gagalnya bisa dua macam: Docker langsung menolak start (`port is already
  allocated`, gampang ketahuan), ATAU — yang lebih berbahaya — `psql`/Prisma tetap berhasil connect
  tapi ke database/container **yang salah** tanpa error apapun, karena mereka cuma tahu "port 5434
  merespons", bukan siapa pemiliknya. Kalau masih curiga ada bentrok: `docker ps -a` (cek container
  dari project LAIN juga, bukan cuma `docker compose ps` project ini) dan `ss -tlnp | grep -E
  '543[0-9]'` sebelum asumsi sebuah port itu punya project ini.

## Menjalankan (development)

Status saat ini: **demo frontend jalan mandiri dengan mock data** (`apps/web`), backend (`apps/api`, `apps/worker`, `packages/database`) sudah diimplementasikan penuh tapi butuh Postgres+Redis nyala untuk dites end-to-end.

### 1. Demo web app saja (paling cepat, tanpa Docker)

```bash
pnpm install
pnpm dev:web
```

Buka `http://localhost:3000`. Semua data (dokumen, transaksi, settings) masih mock di `apps/web/lib/mock-data.ts` — belum connect ke API asli.

### 2. Full stack (web + api + worker + db + redis)

```bash
cp .env.example .env
# isi DATABASE_URL, JWT secret, dll di .env

docker compose up -d postgres redis storage
pnpm install
pnpm db:migrate
pnpm db:seed

pnpm dev
```

> **Peringatan**: kolom `search_vector` (full-text search, lihat
> [prisma/sql/search-vector.sql](./packages/database/prisma/sql/search-vector.sql)) dibuat lewat SQL
> manual, bukan `schema.prisma` biasa. Prisma selalu salah mendeteksinya sebagai drift di migrasi
> BARU manapun setelah ini (ingin men-drop index/generated column-nya). `pnpm db:migrate` di atas aman
> dipakai untuk clone pertama kali (cuma apply migrasi yang sudah ada), tapi untuk menambah migrasi
> baru ke depannya, jangan jalankan `pnpm db:migrate` langsung — pakai
> `pnpm --filter @deacad/database exec prisma migrate dev --create-only --name <nama>`, hapus baris
> palsu `ALTER TABLE "documents" ALTER COLUMN "search_vector" DROP DEFAULT;` dari migration.sql yang
> dihasilkan, baru jalankan `pnpm db:migrate` untuk apply.

### 3. Full stack via Docker Compose

```bash
cp .env.example .env
docker compose up -d --build
```

## Catatan penting

- Prisma 7 generate client ke `packages/database/src/generated/` (bukan `node_modules`) — jalankan `pnpm db:generate` setiap habis ubah `schema.prisma`.
- `docker-compose.yml` belum pernah dijalankan/dites di lingkungan ini — cek ulang versi image & port sebelum deploy production.
- Kredensial Midtrans di `.env.example` masih placeholder — daftar akun sandbox di dashboard Midtrans untuk testing pembayaran.
