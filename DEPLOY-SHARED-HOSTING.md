# Deploy Deacad ke Shared Hosting (cPanel / IDCloudHost)

Target: `deacad.ufcloud.id` (web) + `api-deacad.ufcloud.id` (API) di cPanel dengan Node.js App (Passenger),
PostgreSQL bawaan hosting, cron untuk worker, dan storage S3-compatible gratis (Backblaze B2 / Cloudflare R2).

## Arsitektur singkat

| Komponen | Di mana | Catatan |
|---|---|---|
| Web (Next.js) | Node.js App #1 (atau Vercel gratis) | build `standalone` |
| API (NestJS) | Node.js App #2 | startup file `apps/api/passenger.cjs` |
| Database | PostgreSQL cPanel | `DATABASE_URL` pakai `localhost` |
| Antrian convert | Tabel `convert_jobs` di Postgres | tanpa Redis |
| Worker | **Cron tiap menit** | `node apps/worker/dist/index.js` (mode `once`) |
| Reconcile Midtrans | Cron tiap 5 menit | `curl` ke `/api/v1/internal/cron/reconcile` |
| File asli + gambar slide | B2 / R2 | publik-baca |

Upload **PDF saja** (user ekspor PPT → PDF). Render halaman pakai `mupdf` (WASM), jadi tidak butuh
LibreOffice/poppler yang tidak ada di shared hosting.

> Trade-off: worker via cron = latensi convert 0–60 detik setelah upload, dan I/O hosting (±2 MB/s) membatasi
> dokumen besar. `WORKER_RUN_BUDGET_SECONDS` (default 600) mencegah run menumpuk; `WORKER_MAX_CONCURRENCY=1`
> menjaga RAM.

## 1. Storage (Backblaze B2)

1. Buat bucket **Public**, mis. `deacad-files`.
2. Buat Application Key (read/write bucket itu) → `STORAGE_ACCESS_KEY` = keyID, `STORAGE_SECRET_KEY` = applicationKey.
3. Lihat endpoint S3 bucket, mis. `https://s3.us-west-004.backblazeb2.com` → `STORAGE_REGION=us-west-004`.
4. CORS bucket (agar browser boleh load/unduh): izinkan origin `https://deacad.ufcloud.id`, method GET/HEAD.
5. Base URL publik: `https://f004.backblazeb2.com/file/deacad-files` → `STORAGE_PUBLIC_BASE_URL`.

(Cloudflare R2: region `auto`, endpoint `https://<account>.r2.cloudflarestorage.com`, base URL `https://pub-xxxx.r2.dev`.)

## 2. Database

1. cPanel → **PostgreSQL Databases**: buat DB + user + beri semua privilege. Nama biasanya berprefix akun
   (`scplzoyz_deacad`).
2. `DATABASE_URL="postgresql://scplzoyz_user:PASSWORD@localhost:5432/scplzoyz_deacad?schema=public"`
   (URL-encode karakter spesial di password).
3. Ekstensi/konfigurasi `indonesian` text search: migrasi memakai `to_tsvector('indonesian', …)`. Cek di
   phpPgAdmin: `SELECT to_tsvector('indonesian','uji dokumen');` — kalau error, hubungi support atau ubah
   konfigurasi ke `simple` di migrasi `search_vector`.

## 3. Build (di mesin lokal / CI Linux — jangan di hosting)

`bcrypt` dan `mupdf` punya artefak native/WASM; build di Linux x64 supaya cocok dengan server.

```bash
pnpm install --frozen-lockfile
pnpm db:generate
pnpm exec turbo run build
# Web standalone:
NEXT_OUTPUT=standalone NEXT_PUBLIC_API_URL=https://api-deacad.ufcloud.id pnpm --filter @deacad/web build
```

Migrasi database (dari lokal ke DB hosting, atau lewat Terminal cPanel):

```bash
DATABASE_URL="postgresql://…@host:5432/db" pnpm --filter @deacad/database db:deploy
```

(Remote access PostgreSQL biasanya ditutup; paling mudah jalankan `db:deploy` di Terminal cPanel setelah repo
ter-upload.)

## 4. Upload kode

Opsi paling simpel: `git clone` di Terminal cPanel ke `~/deacad`, lalu `pnpm install --frozen-lockfile --prod=false`
dan `pnpm exec turbo run build` **jika** RAM/proses cukup; kalau terkena limit (70 proses / 2 GB), build di lokal
lalu upload `dist/`, `.next/standalone`, dan `node_modules` (atau rsync/zip).

Aktifkan Node 22 lewat **Setup Node.js App**. pnpm: `corepack enable && corepack prepare pnpm@11.9.0 --activate`
(atau `npm i -g pnpm`).

## 5. Node.js App — API

- Node 22, Application mode `Production`
- Application root: `deacad/apps/api`
- Application URL: `api-deacad.ufcloud.id`
- Startup file: `passenger.cjs`
- Environment variables (via UI):

```
NODE_ENV=production
DATABASE_URL=postgresql://…@localhost:5432/…?schema=public
JWT_ACCESS_SECRET=<random panjang>
JWT_REFRESH_SECRET=<random panjang berbeda>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGIN=https://deacad.ufcloud.id
TRUST_PROXY=1
CRON_SECRET=<random panjang>
MIDTRANS_SERVER_KEY=…
MIDTRANS_CLIENT_KEY=…
MIDTRANS_IS_PRODUCTION=false
STORAGE_ENDPOINT=https://s3.us-west-004.backblazeb2.com
STORAGE_REGION=us-west-004
STORAGE_ACCESS_KEY=…
STORAGE_SECRET_KEY=…
STORAGE_BUCKET=deacad-files
STORAGE_PUBLIC_BASE_URL=https://f004.backblazeb2.com/file/deacad-files
EMAIL_PROVIDER_API_KEY=
EMAIL_FROM=noreply@ufcloud.id
ALLOW_PPTX_UPLOAD=false
```

Generate secret: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.
Jangan commit `.env`; di hosting simpan env lewat UI cPanel (atau file `.env` yang tidak bisa diakses web).

Midtrans: set Payment Notification URL ke `https://api-deacad.ufcloud.id/api/v1/webhooks/midtrans`
.

## 6. Node.js App — Web

- Application root: folder hasil build standalone (mis. `deacad/apps/web/.next/standalone/apps/web`), startup file
  `server.js`. Salin juga `.next/static` ke `.next/static` dan `public/` di samping `server.js`.
- Env: `NODE_ENV=production`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`,
  `NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION`, `STORAGE_PUBLIC_BASE_URL` (untuk `next/image`), `NEXT_PUBLIC_ALLOW_PPTX=false`.
- Catatan: `NEXT_PUBLIC_*` ditanam saat **build**, jadi set saat build di lokal, bukan hanya di cPanel.

Alternatif yang meringankan hosting: deploy web ke Vercel (gratis), hosting hanya untuk API+DB+cron.

## 7. Cron Jobs (cPanel → Cron Jobs)

Worker (tiap menit, pakai `flock` supaya run tidak menumpuk). Buat `~/deacad/run-worker.sh`:

```bash
#!/bin/bash
cd "$HOME/deacad"
set -a; source .env.worker; set +a   # DATABASE_URL + STORAGE_* + WORKER_*
exec node apps/worker/dist/index.js
```

lalu cron: `* * * * * /usr/bin/flock -n /tmp/deacad-worker.lock bash $HOME/deacad/run-worker.sh >> $HOME/deacad-worker.log 2>&1`

Path `node` di cPanel biasanya `~/nodevenv/<app>/22/bin/node` — cek dengan `which node` setelah
`source ~/nodevenv/.../bin/activate` di Terminal.

Reconcile Midtrans (tiap 5 menit):

```
*/5 * * * * curl -fsS -X POST -H "x-cron-secret: ISI_CRON_SECRET" https://api-deacad.ufcloud.id/api/v1/internal/cron/reconcile >/dev/null
```

## 8. Verifikasi

1. `https://api-deacad.ufcloud.id/api/v1/…` (endpoint health/categories) merespons.
2. Daftar, login, upload PDF kecil → dokumen `processing`.
3. Dalam ≤ 1–2 menit status jadi `ready`: `tail -f ~/deacad-worker.log`.
4. Cek `SELECT status, attempts, last_error FROM convert_jobs;` — job gagal permanen menampilkan `last_error`
   dan dokumennya `failed`.

## Troubleshooting

- **`Cannot find module`/WASM error saat worker**: pastikan `node_modules` hasil install Linux; jalankan worker dari root repo.
- **Permission/ENOMEM**: turunkan `RENDER_DPI` (mis. 110), `RENDER_MAX_SIDE` (1600), `CONVERT_MAX_PAGES`.
- **Gambar tidak tampil**: cek CORS bucket & `STORAGE_PUBLIC_BASE_URL`; host harus cocok dengan `next.config.ts`.
- **403 dari B2 saat upload**: `STORAGE_REGION` salah atau key tidak punya akses ke bucket.
- **Rate limit semua user sama**: `TRUST_PROXY=1` belum di-set (IP semua user = IP proxy).
- **Job macet `active`**: otomatis di-reclaim setelah `WORKER_JOB_STALE_SECONDS` (600 detik).
- **bcrypt native gagal load**: build ulang di Linux x64 atau ganti ke `bcryptjs` (lebih lambat, pure JS).
- **PPTX**: hanya aktif bila worker punya `soffice` dan `ALLOW_PPTX_UPLOAD=true` + `NEXT_PUBLIC_ALLOW_PPTX=true`;
  di shared hosting biarkan nonaktif.
- **Email verifikasi**: belum ditegakkan; kalau diaktifkan nanti, pakai Resend dan verifikasi domain `ufcloud.id`
  (SPF/DKIM lewat Zone Editor).
