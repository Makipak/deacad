# Deacad — Dokumen Arsitektur Project

Platform sharing dokumen akademik (mirip Academia.edu/Scribd) dengan dukungan upload PPT/PPTX selain PDF, disertai model monetisasi per-upload dan per-download. Dua aktor: `user` dan `admin`.

---

## 1. Konsep Produk

- Upload dokumen: PDF dan PPT/PPTX.
- Preview dokumen: seperti SlideShare — file di-convert jadi gambar per-halaman/slide, ditampilkan sebagai slideshow, bukan render native file asli di browser.
- Monetisasi: admin bisa toggle independen antara pembayaran upload (on/off) dan pembayaran download (on/off) — mendukung 4 kombinasi state sekaligus (gratis semua, bayar semua, atau campuran).
- Harga default: Rp 15.000 per transaksi (bisa diubah admin).

---

## 2. Stack Teknis

| Layer | Pilihan | Alasan |
|---|---|---|
| Frontend | Next.js | SSR untuk SEO halaman publik dokumen |
| Backend | NestJS | Arsitektur modular, DI, cocok dengan BullMQ untuk queue |
| Database | PostgreSQL | Full-text search bawaan (`tsvector`), JSONB untuk settings fleksibel |
| ORM | Prisma | Migration reliable, dokumentasi luas, Prisma Studio untuk debugging |
| Queue | BullMQ + Redis | Job convert file berjalan async, gak blocking API |
| Payment | Midtrans (Snap) | Payment gateway lokal, mendukung QRIS/VA/e-wallet |
| Konversi file | LibreOffice (headless) + Poppler (`pdftoppm`) | Open-source, gratis, akurat render dokumen office |
| Monorepo | Turborepo + pnpm workspace | Share types antara FE-BE, satu bahasa TypeScript |
| Deployment | VPS (Docker Compose) + Nginx + Certbot | Kontrol penuh, biaya predictable |

---

## 3. Struktur Monorepo

```
deacad/
├── apps/
│   ├── web/              # Next.js — frontend publik, upload UI, admin panel UI
│   ├── api/              # NestJS — REST API, auth, business logic, webhook handler
│   └── worker/            # Node + LibreOffice + Poppler — proses convert file (queue consumer)
├── packages/
│   ├── database/          # Prisma schema + client, migrations, seed data
│   ├── shared-types/       # Zod schema + TS types (Document, Transaction, Settings, dll)
│   └── config/             # eslint, tsconfig base yang di-share semua app
├── docker-compose.yml       # orchestration: web, api, worker, postgres, redis, nginx
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

Container `worker` sengaja dipisah dari `api` karena LibreOffice berat (image besar, proses convert bisa lama) dan rawan hang untuk file corrupt — kalau digabung dengan API utama, satu file bermasalah bisa bikin seluruh API ikut lemot/down.

---

## 4. Skema Database (inti)

- **users**: id, name, email, password_hash, role (`user`/`admin`), email_verified.
- **documents**: id, user_id, title, description, file_type (`pdf`/`pptx`), original_file_url, converted_pdf_url, status (`processing`/`ready`/`failed`/`rejected`), category_id.
- **document_pages**: id, document_id, page_number, image_url, is_watermarked.
- **transactions**: id, user_id, document_id, type (`upload`/`download`), amount (snapshot harga saat dibuat, bukan referensi live), midtrans_order_id, idempotency_key (unique), status (`pending`/`paid`/`failed`/`expired`/`refunded`).
- **document_access**: user_id, document_id, granted_at — bukti user sudah berhak download.
- **settings**: key (unique), value (jsonb) — toggle admin (`upload_payment_enabled`, `download_payment_enabled`, `upload_price`, `download_price`).
- **reports**: document_id, reporter_id, reason, status — untuk moderasi reaktif.
- **audit_logs**: admin_id, action, target_id, old_value, new_value, timestamp — jejak forensik aksi admin.
- **categories**: id, name.
- **email_verification_tokens**: user_id, token_hash (SHA-256), expires_at.

Catatan penting: `amount` di tabel `transactions` adalah **snapshot** harga saat transaksi dibuat, bukan dihitung ulang dari `settings` — supaya perubahan harga oleh admin di tengah transaksi berjalan gak menimbulkan state ambigu.

---

## 5. Flow Toggle Admin

`SettingsService` di backend meng-cache settings in-memory (refresh saat startup dan saat admin update — untuk multi-instance production, ini perlu dipindah ke Redis pub/sub).

**Upload:**
```
Cek settings.uploadPaymentEnabled
  → false: langsung enqueue job convert
  → true: buat transaksi + Snap token, TUNGGU webhook sukses baru enqueue convert
```

**Download:**
```
DownloadAccessGuard cek settings.downloadPaymentEnabled
  → false: lolos langsung
  → true: cek document_access (atau uploader = pemilik dokumen) → lolos
          belum ada akses → 403 PAYMENT_REQUIRED → frontend munculkan modal bayar
```

Webhook Midtrans adalah **satu-satunya pemicu resmi** status "paid" — bukan redirect frontend, karena redirect bisa di-skip/dimanipulasi user.

---

## 6. Moderasi Konten

Pendekatan **hybrid**: auto-publish begitu dokumen selesai convert (menjaga UX cepat untuk uploader), dengan tiga lapis pengaman:

1. Checkbox pernyataan kepemilikan/hak upload saat submit form.
2. Tombol "Laporkan" di tiap dokumen → masuk tabel `reports`, admin dapat notifikasi.
3. Admin bisa unpublish/soft-delete kapan saja dari admin panel, tercatat di `audit_logs`.

---

## 7. Keamanan

### IDOR
- ID resource pakai `cuid()`, bukan auto-increment integer.
- Setiap query resource oleh ID **wajib** di-scope oleh ownership (`where: { id, userId: req.user.id }`), bukan cari-by-id lalu cek belakangan.
- Resource yang bukan milik user return `404 NotFound`, bukan `403 Forbidden` (hindari information leakage soal keberadaan data).

### Broken Access Control
- Guard global (`APP_GUARD`) default *fail-secure* — endpoint baru otomatis ke-protect kecuali eksplisit ditandai `@Public()`.
- Role-based guard (`@Roles('admin')`) untuk semua endpoint admin, dicek di backend bukan cuma disembunyikan di UI.

### Mass Assignment
- DTO eksplisit (class-validator/Zod) dengan whitelist field ketat, `ValidationPipe` global `whitelist: true, forbidNonWhitelisted: true`.
- Field sensitif (`role`) tidak pernah ada di DTO update profile milik user.

### Payment Amount Tampering
- Harga transaksi dihitung dari `SettingsService` di backend, **tidak pernah** dari body request client.
- `gross_amount` webhook dicocokkan ke `amount` tersimpan di database sebelum diproses.

### CORS
- Origin di-whitelist eksplisit (bukan `*`), `credentials: true` karena pakai httpOnly cookie untuk refresh token.

### Security Headers
- `helmet()` di NestJS. CSP disesuaikan untuk mengizinkan domain storage gambar slide dan iframe Snap Midtrans; `frame-ancestors` ketat untuk cegah clickjacking.

### Rate Limiting
- Global default throttle, override lebih ketat untuk endpoint sensitif (login, register, resend-verification, webhook).

### File Upload
- Validasi MIME type dari magic bytes (`file-type` package), bukan cuma ekstensi.
- Batas ukuran file.
- Filename di server selalu di-generate ulang (UUID), tidak pernah pakai nama asli dari user (cegah path traversal).
- ClamAV scan ditunda untuk MVP, tapi validasi dipisah di service sendiri (`FileValidationService`) supaya gampang ditambah nanti.

### Audit Log
- Semua aksi admin (toggle settings, approve/reject dokumen, refund) tercatat di `audit_logs` untuk jejak forensik.

---

## 8. Auth Flow

**Access token**: JWT short-lived (~15 menit), stateless.

**Refresh token**: disimpan sebagai httpOnly + Secure + SameSite=Strict cookie (bukan localStorage, untuk mitigasi XSS). Rotasi setiap dipakai; kalau ada refresh token lama terpakai lagi setelah dirotasi (indikasi dicuri), semua sesi user itu langsung di-revoke (reuse detection).

**Email verifikasi**:
- Bukan pakai layanan bawaan VPS — VPS tidak punya built-in email service, dan kirim SMTP langsung dari VPS berisiko masuk folder spam (IP belum punya reputasi, SPF/DKIM/DMARC harus disetup manual).
- Pakai transactional email service (Resend/SendGrid/SES) yang sudah handle deliverability.
- Token verifikasi: random opaque token (bukan JWT, supaya bisa di-revoke), disimpan sebagai **hash SHA-256** di database (bukan plaintext), expiry pendek (30 menit), single-use (dihapus setelah dipakai).
- Response API tidak pernah membocorkan apakah email terdaftar atau tidak (cegah email enumeration).
- Rate limiting di endpoint resend-verification.

---

## 9. Payment Edge Cases

### Duplicate transaction (user spam tombol bayar)
- Idempotency key di-generate sekali oleh frontend saat klik pertama, dikirim ke backend.
- Kolom `idempotency_key` unique di database — proteksi di level constraint, bukan cuma cek manual (menghindari race condition TOCTOU).
- Cek transaksi `pending` yang sudah ada untuk kombinasi user+document+type sebelum membuat yang baru.

### Webhook idempotency
- Transaksi berstatus final (`paid`/`failed`) tidak diproses ulang meski webhook diterima berkali-kali (retry dari Midtrans).
- Selalu return HTTP 200 ke Midtrans meski request sudah diproses sebelumnya, supaya retry berhenti.

### Webhook tidak pernah sampai (silent failure)
- **Reconciliation job**: cron job berkala (misal tiap 5 menit) yang aktif query Midtrans Get Status API untuk semua transaksi `pending` lama, sync manual kalau status sudah berubah — jangan cuma pasif menunggu webhook.

### Race condition saat update konkuren
- `SELECT ... FOR UPDATE` (row-level lock) saat baca-ubah status transaksi, mencegah dua proses (webhook + reconciliation job, atau dua webhook retry) memproses transaksi yang sama bersamaan.

### Semua status Midtrans di-handle eksplisit
`settlement`/`capture` (paid), `pending` (tunggu), `deny`/`cancel` (failed), `expire` (expired + cleanup job untuk yang lolos dari webhook expire), `refund`/`partial_refund` (revoke akses).

### Payment sukses tapi proses selanjutnya gagal
- Convert file gagal (LibreOffice crash/corrupt) → retry otomatis dengan backoff → gagal terus → flag untuk refund/review admin, notify user.

### Harga berubah di tengah transaksi
- `amount` disnapshot di tabel transaksi saat dibuat, bukan dihitung ulang dari settings — perubahan harga oleh admin tidak mempengaruhi transaksi yang sedang berjalan.

### User menutup tab sebelum redirect
- Sistem tidak bergantung pada redirect frontend (webhook adalah source of truth) — tambahkan notifikasi email otomatis dan halaman riwayat transaksi yang independen dari flow redirect.

### Midtrans outage
- Tangkap error eksplisit saat gagal generate Snap token, tampilkan pesan jelas ke user, jangan infinite loading.

### Chargeback/fraud
- Revoke akses otomatis begitu ada notifikasi chargeback; user dengan chargeback berulang di-flag untuk review/ban. Pertimbangkan menunda metode kartu kredit di fase awal (QRIS/e-wallet lebih rendah risiko chargeback).

### Presisi angka
- Simpan `amount` sebagai integer (Rupiah penuh), bukan floating point — hindari rounding error.

### Webhook endpoint sebagai target spam
- Verifikasi signature dilakukan paling awal (sebelum query database), rate limiting tetap berlaku di endpoint ini.

---

## 10. Verifikasi Dana Masuk Rekening

Dua hal yang terpisah:

1. **Konfirmasi pembayaran customer** (untuk unlock fitur) — otomatis via webhook real-time, tidak perlu cek manual apapun.
2. **Pencairan dana ke rekening bank terdaftar** (settlement/payout) — proses batch terpisah oleh Midtrans (bukan real-time per transaksi), dicek lewat Midtrans Dashboard (MAP), bukan notifikasi manual/screenshot.

Sistem aplikasi **tidak boleh** menunggu konfirmasi dana masuk rekening bank untuk unlock fitur — cukup percaya webhook `settlement`/`capture` sebagai bukti sah.

---

## 11. Search & Discovery

**Full-text search**: pakai PostgreSQL native (`tsvector`/`tsquery`) dulu, bukan Elasticsearch/Meilisearch — cukup untuk MVP, migrasi ke search engine terpisah baru relevan kalau volume/kompleksitas pencarian sudah besar.

```sql
ALTER TABLE documents ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('indonesian', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('indonesian', coalesce(description, '')), 'B')
  ) STORED;

CREATE INDEX documents_search_idx ON documents USING GIN(search_vector);
```

Query pakai `websearch_to_tsquery` (lebih toleran ke input natural user) dan `ts_rank` untuk relevance. Judul dikasih bobot lebih tinggi ('A') dari deskripsi ('B').

Catatan: stemming dictionary `'indonesian'` di Postgres kurang akurat untuk morfologi bahasa Indonesia (imbuhan me-/di-/-kan) — kalau search jadi krusial di fase lanjut, pertimbangkan migrasi ke Meilisearch (typo-tolerance lebih baik).

**Kategori/taxonomy**: flat category dulu (Skripsi, Tesis, Makalah, Laporan Praktikum, Presentasi/PPT, Jurnal), bukan nested/hierarchical — hindari kompleksitas UI filter dan inkonsistensi kategorisasi manual. Granularitas tambahan (prodi/fakultas) sebaiknya jadi **tag** many-to-many terpisah, bukan mengubah struktur kategori.

**Ranking**: kombinasi relevance + sinyal popularitas (pakai `LOG()` supaya popularitas jadi tie-breaker, bukan dominan absolut):

```sql
ORDER BY (
  ts_rank(search_vector, query) * 0.5 +
  LOG(download_count + 1) * 0.3 +
  LOG(view_count + 1) * 0.2
) DESC
```

**Filter & sorting UI**: kategori, tipe file, rentang tanggal, plus sorting eksplisit (Terbaru/Terpopuler/Paling Relevan) yang user pilih manual.

**Bookmark/koleksi**: nice-to-have, ditunda kecuali diminta eksplisit — fokus effort ke search yang solid dulu.

**Pagination**: cursor-based (berdasarkan `id`/`created_at` terakhir), bukan offset-based — offset makin lambat di halaman jauh untuk tabel yang terus bertambah.

---

## 12. Detail Fitur Admin Panel

- **Dashboard ringkasan**: total pendapatan (harian/mingguan/bulanan) dari agregasi `transactions.status = paid`, jumlah dokumen baru, jumlah laporan pending, jumlah user. Cukup angka + tabel breakdown untuk MVP, chart visual bisa menyusul.
- **Antrian moderasi laporan**: list `reports` status pending, urut terlama dulu, tiap laporan tampilkan dokumen+alasan+pelapor dengan aksi cepat (unpublish/tolak laporan). Semua aksi wajib tercatat di `audit_logs`.
- **Manajemen dokumen**: browse semua dokumen dengan filter status, search cepat, force-unpublish kapan saja tanpa perlu ada laporan masuk dulu.
- **Manajemen kategori**: CRUD sederhana; hapus kategori yang masih dipakai dokumen sebaiknya soft-delete atau diblok, jangan hard-delete langsung.
- **Manajemen transaksi**: list dengan filter status, search by `midtrans_order_id`/nama user, tombol "cek ulang status" untuk trigger reconciliation manual on-demand — membantu troubleshooting cepat kasus payment nyangkut tanpa buka Midtrans Dashboard terpisah.
- **Panel settings**: toggle payment + harga (sudah dijelaskan di bagian 5), dengan konfirmasi dialog sebelum simpan dan histori perubahan (dari `audit_logs`) ditampilkan di halaman yang sama.
- **Role admin**: untuk MVP dengan admin terbatas, satu role generic cukup — tapi skema `role` sebaiknya didesain sebagai enum yang bisa diperluas (`super-admin` vs `moderator`) dari awal, mengantisipasi kalau nanti ada admin tambahan yang aksesnya perlu dibatasi (misal gak boleh ubah harga/toggle payment).

---

## 13. Topik yang Belum Dibahas Tuntas (next steps)

- Draft Terms of Service & kebijakan take-down hak cipta (perlu didiskusikan dengan dosen — non-teknis).
- Setup akun Midtrans production (verifikasi bisnis: KTP, rekening, kemungkinan NPWP).
- Strategi backup database & file storage, monitoring/error tracking (Sentry).
- Kepatuhan UU PDP terkait data pribadi user dan transaksi keuangan.
