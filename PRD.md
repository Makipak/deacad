# PRD — Deacad Frontend Design

> **Scope:** Dokumen ini HANYA membahas desain UI/UX frontend `apps/web`. Tidak membahas
> arsitektur backend, skema database, atau logika bisnis — itu sudah ada di `ARCHITECTURE.md`.
> Tujuan dokumen ini adalah jadi acuan untuk mendesain ulang tampilan Deacad secara visual,
> untuk diserahkan ke Claude Design / desainer.

---

## 1. Ringkasan Produk

Deacad adalah platform berbagi dokumen akademik (skripsi, tesis, makalah, laporan praktikum,
presentasi/PPT, jurnal) — mirip Academia.edu/Scribd, dengan preview dokumen bergaya slideshow
(bukan render file asli) dan model monetisasi opsional per-upload/per-download yang diatur admin.

Kondisi saat ini: seluruh alur fungsional (auth, browse, upload, detail dokumen, admin panel)
sudah berjalan, tapi UI-nya masih sangat bare-bones — border tipis abu-abu, satu warna aksen biru
polos, tanpa hierarki visual, tanpa dark mode, tanpa micro-interaction. Dokumen ini mendefinisikan
redesign visual penuh di atas struktur fungsional yang sudah ada, **tanpa mengubah data yang
ditampilkan atau flow-nya**.

---

## 2. Target Pengguna & Prinsip UX

Deacad dipakai lintas kalangan dan lintas kemampuan digital:

- **Mahasiswa/pelajar (16–25 th)** — pengguna terbanyak, terbiasa dengan UI modern (Instagram,
  Notion, Canva), ekspektasi tinggi soal kecepatan dan estetika.
- **Dosen/peneliti (25–55 th)** — butuh kredibilitas visual (terasa "akademik", bukan
  sosial-media), toleransi lebih rendah terhadap UI yang berisik atau membingungkan.
- **Admin/moderator** — butuh panel yang padat informasi tapi tetap scannable, bukan yang paling
  "cantik" tapi paling *efisien*.

Karena rentang usia dan kalangan sangat lebar, prinsip UX yang wajib dipegang:

1. **Clarity over cleverness** — label eksplisit, tidak ada icon-only tanpa label pada aksi
   penting (upload, bayar, hapus). Ikon boleh dipakai tapi selalu didampingi teks pada aksi utama.
2. **Kontras & ukuran teks ramah segala usia** — body text minimum 15–16px, kontras warna
   memenuhi WCAG AA minimum (4.5:1 untuk teks normal), target tap/klik minimum 40×40px.
3. **Progressive disclosure** — halaman publik (browse, detail dokumen) sesederhana mungkin;
   kompleksitas (filter lanjutan, admin panel) disembunyikan di balik interaksi eksplisit, tidak
   membebani pengguna kasual.
4. **Predictable navigation** — struktur navigasi konsisten di semua halaman, tidak ada pola
   interaksi "tersembunyi" (swipe-only, hover-only tanpa alternatif klik) karena harus jalan baik
   di desktop maupun mobile/tablet.
5. **Kepercayaan visual (trust)** — karena ada transaksi uang (Midtrans) dan dokumen milik
   institusi/pribadi, tampilan harus terasa aman dan profesional, bukan seperti template gratisan.

---

## 3. Arah Visual: "Akademik Klasik-Modern"

Referensi mental model: perpustakaan digital generasi baru — nuansa jurnal ilmiah/Google
Scholar/ResearchGate, tapi di-polish dengan standar produk SaaS modern 2025+ (whitespace lega,
tipografi jelas, motion halus). **Bukan** gaya playful/ilustratif, **bukan** juga gaya
brutalist/dashboard generik.

Ciri visual yang dituju:

- **Tipografi sebagai elemen utama**: serif untuk judul/heading besar (kesan "akademik",
  seperti sampul jurnal/buku), sans-serif untuk UI dan body text (keterbacaan layar). Kombinasi
  ini adalah signature look Deacad — jangan pakai serif di semua tempat (berat dibaca) atau
  sans-serif di semua tempat (kehilangan karakter akademik).
- **Palet warna tenang dan bermartabat**: dasar netral hangat (bukan abu-abu dingin generik SaaS),
  satu warna aksen utama bernuansa "ink/maroon/navy klasik" (bukan biru startup generik),
  digunakan hemat — hanya untuk aksi utama dan elemen penting.
- **Kartu dokumen terasa seperti sampul buku/jurnal**: rasio, bayangan halus, sudut membulat
  kecil (bukan pill/rounded penuh) — meniru fisik dokumen cetak, bukan kartu app sosial media.
  Format PDF/PPTX ditandai dengan badge kecil yang jelas.
- **Whitespace lega**, grid yang tenang, hierarki tipografi yang jelas (bukan padat penuh
  informasi seperti dashboard admin generik) — kecuali di area admin panel yang boleh lebih padat
  karena penggunanya power-user.
- **Motion minimal dan bermakna**: fade/slide halus pada transisi state (loading → ready,
  hover kartu, buka modal), tidak ada animasi dekoratif berlebihan yang mengganggu fokus baca.

---

## 4. Design Tokens

### 4.1 Warna — Light Mode

| Token | Nilai (contoh) | Kegunaan |
|---|---|---|
| `--color-bg` | `#FAF8F5` (ivory hangat, bukan putih murni) | Background utama |
| `--color-bg-elevated` | `#FFFFFF` | Kartu, modal, dropdown |
| `--color-fg` | `#1C1917` (near-black hangat) | Teks utama |
| `--color-fg-muted` | `#6B6259` | Teks sekunder, caption, metadata |
| `--color-border` | `#E7E1D9` | Border kartu, input, divider |
| `--color-border-strong` | `#D4CBBE` | Border pada elemen fokus/hover |
| `--color-primary` | `#7A1F2B` (maroon akademik / "ink red") | Aksi utama, link aktif, badge penting |
| `--color-primary-hover` | `#611723` | Hover state tombol primary |
| `--color-primary-subtle` | `#F5E6E4` | Background badge/chip terkait primary |
| `--color-accent` | `#1E3A5F` (navy) | Aksen sekunder (kategori, info) |
| `--color-success` | `#2F6B3A` | Status "ready", pembayaran sukses |
| `--color-warning` | `#9A6A16` | Status "processing", pending |
| `--color-danger` | `#B23A3A` | Status "failed/rejected", error, hapus |
| `--color-focus-ring` | `#7A1F2B` @ 40% opacity | Outline focus keyboard |

### 4.2 Warna — Dark Mode

| Token | Nilai (contoh) | Kegunaan |
|---|---|---|
| `--color-bg` | `#161311` | Background utama |
| `--color-bg-elevated` | `#1F1B18` | Kartu, modal |
| `--color-fg` | `#F2EEE8` | Teks utama |
| `--color-fg-muted` | `#A79E92` | Teks sekunder |
| `--color-border` | `#332C26` | Border |
| `--color-border-strong` | `#4A4038` | Border fokus/hover |
| `--color-primary` | `#E0838F` (maroon di-lighten untuk kontras gelap) | Aksi utama |
| `--color-primary-hover` | `#EC9CA6` | Hover |
| `--color-primary-subtle` | `#3A1E22` | Background badge |
| `--color-accent` | `#7FA3C9` | Aksen sekunder |
| `--color-success` / `--color-warning` / `--color-danger` | versi di-lighten proporsional | Status, tetap AA-compliant di atas `--color-bg-elevated` |

Toggle dark mode: ikon matahari/bulan di navbar, tersimpan di preference user (bukan hanya
mengikuti OS), transisi warna halus (150–200ms) saat toggle, tidak mengubah bentuk/layout.

### 4.3 Tipografi

- **Heading font** (serif): mis. *Source Serif 4*, *Fraunces*, atau *Lora* — dipakai untuk `h1`
  landing/hero, judul dokumen di halaman detail, dan judul section besar. **Tidak** dipakai untuk
  label form, tombol, atau tabel.
- **UI/body font** (sans-serif): mis. *Inter* atau *Public Sans* — dipakai untuk semua body text,
  form, navigasi, tabel admin, tombol.
- Skala tipografi (contoh, boleh disesuaikan proporsional):
  - Display (hero landing): 40–56px / bold / serif
  - H1 (judul halaman): 28–32px / semibold / serif
  - H2 (section): 20–24px / semibold / sans
  - H3 (card title): 16–18px / medium / sans
  - Body: 15–16px / regular / sans
  - Caption/metadata: 13px / regular / sans, warna `--color-fg-muted`
- Line-height body minimum 1.5 untuk keterbacaan lintas usia.

### 4.4 Spacing, Radius, Shadow

- Spacing scale 4px-based: 4, 8, 12, 16, 24, 32, 48, 64.
- Radius: `--radius-sm: 6px` (input, badge), `--radius-md: 10px` (kartu, tombol),
  `--radius-lg: 16px` (modal, panel besar) — sudut membulat kecil, bukan pill penuh (kesan
  akademik/serius, bukan playful).
- Shadow: halus dan hangat (bukan abu-abu netral), mis. `0 2px 8px rgba(28,25,23,0.06)` untuk
  kartu default, `0 8px 24px rgba(28,25,23,0.12)` untuk hover/elevated, `0 16px 48px
  rgba(28,25,23,0.18)` untuk modal.

### 4.5 Breakpoints

`sm: 640px`, `md: 768px`, `lg: 1024px`, `xl: 1280px` — konsisten dengan Tailwind default
(stack sudah pakai Tailwind v4).

---

## 5. Komponen Global

- **Navbar**: logo (wordmark serif "Deacad"), search bar ringkas (khusus halaman browse bisa
  full-width), link Browse/Upload, avatar+dropdown user (Profil, Riwayat Transaksi, Logout) atau
  tombol Login/Daftar jika belum login, toggle dark mode. Sticky di scroll, tidak menutupi konten.
- **Footer**: minimal — tautan Tentang, Kontak/Laporan Penyalahgunaan, ToS/Privacy (placeholder),
  copyright.
- **Document Card**: thumbnail/cover placeholder bergaya "sampul dokumen" (bukan cuma warna
  polos), badge tipe file (PDF/PPTX) di pojok, badge status berwarna semantik, judul (serif,
  2 baris max, ellipsis), deskripsi (1–2 baris), metadata (views/downloads, kategori) di footer
  kartu. Hover: elevasi bayangan + sedikit scale (1.01–1.02), bukan transformasi drastis.
- **Button**: varian `primary` (solid maroon), `secondary` (outline), `ghost` (teks saja),
  `danger` (untuk aksi admin merusak). Semua state (default/hover/active/disabled/loading)
  didefinisikan, loading state pakai spinner inline + label tetap terlihat (bukan icon-only).
- **Input/Select/Textarea**: label selalu di atas field (bukan placeholder-as-label), border
  jelas, focus ring terlihat jelas (aksesibilitas keyboard), pesan error di bawah field dengan
  warna `--color-danger` + ikon.
- **Badge/Status chip**: `processing` (warning/amber), `ready` (success/hijau), `failed`/`rejected`
  (danger/merah) — bentuk pill kecil, dipakai konsisten di document card, halaman detail, dan
  tabel admin.
- **Modal**: dipakai untuk konfirmasi aksi admin (unpublish, ubah harga) dan modal pembayaran
  Midtrans Snap — overlay gelap semi-transparan, modal center, fokus trap.
- **Toast/Notification**: untuk feedback aksi (upload sukses, pembayaran diproses, error jaringan)
  — muncul di pojok, auto-dismiss dengan opsi tutup manual.
- **Empty/Loading/Error states**: setiap list (browse, riwayat transaksi, admin tables) wajib
  punya 3 state ini didesain eksplisit — empty state pakai ilustrasi garis sederhana + copy yang
  membantu (bukan cuma "Tidak ada data"), loading pakai skeleton (bukan spinner polos) yang
  meniru bentuk konten asli, error state punya tombol "Coba lagi".
- **Slideshow Viewer** (preview dokumen): kontrol navigasi (prev/next, nomor halaman/slide, jump
  ke halaman), watermark overlay yang tetap terbaca jelas tanpa mengganggu, mode fullscreen,
  loading state per-halaman gambar (blur-up atau skeleton), swipe di mobile + tombol panah di
  desktop.

---

## 6. Sitemap / Halaman yang Perlu Didesain

Struktur halaman ini sudah ada secara fungsional di `apps/web/app` — desain ulang mengikuti
struktur route yang sudah ada, tidak menambah/mengubah route:

**Publik**
1. `/` — Landing + Browse (search, filter kategori, sort, grid dokumen)
2. `/documents/[id]` — Detail Dokumen (slideshow preview, info, download/bayar, lapor)
3. `/login`
4. `/register`

**Butuh login**
5. `/upload` — Form upload + flow pembayaran upload (kondisional)
6. `/profile` — Profil user + riwayat upload + riwayat transaksi

**Admin**
7. `/admin` — Dashboard ringkasan
8. `/admin/reports` — Antrian moderasi laporan
9. `/admin/documents` — Manajemen dokumen
10. `/admin/transactions` — Manajemen transaksi
11. `/admin/settings` — Panel pengaturan monetisasi

---

## 7. Spesifikasi Per Halaman

### 7.1 `/` — Landing + Browse

**Tujuan**: kesan pertama yang meyakinkan ("ini platform akademik serius") + discovery cepat.

- **Hero section** (hanya tampil untuk visitor belum login, atau versi ringkas untuk yang sudah
  login): headline serif besar, subheadline singkat, search bar besar jadi CTA utama —
  terinspirasi search-first landing (Google Scholar), bukan hero image besar generik.
- **Search & filter bar**: input pencarian judul, dropdown kategori, dropdown sort
  (Terbaru/Terpopuler), sticky di bawah navbar saat scroll. Di mobile: filter dikumpulkan di
  belakang tombol "Filter" yang buka bottom-sheet.
- **Grid dokumen**: 1 kolom di mobile, 2 di tablet, 3–4 di desktop besar. Tiap kartu = Document
  Card (lihat §5). Skeleton loading saat fetch, empty state saat hasil pencarian kosong (dengan
  saran: "coba kata kunci lain" atau tombol reset filter).
- **Kategori sebagai chip cepat** di bawah search bar (Skripsi, Tesis, Makalah, dst.) untuk akses
  satu klik, sinkron dengan dropdown kategori.
- Layout data (title, description, viewCount, downloadCount, fileType, status, categoryId) sudah
  fix dari API — desain hanya menata presentasinya.

### 7.2 `/documents/[id]` — Detail Dokumen

**Tujuan**: preview meyakinkan + jelas kapan harus bayar untuk download.

- Layout 2 kolom di desktop (preview besar kiri ~65%, info+aksi kanan ~35%), stack vertikal di
  mobile (preview dulu, lalu info+aksi).
- **Slideshow Viewer** jadi elemen dominan halaman — border/frame elegan seperti membuka
  dokumen fisik, kontrol navigasi jelas dan besar (ramah semua usia, bukan ikon kecil tersembunyi).
- **Panel info**: kategori + tipe file (badge), judul (serif, besar), deskripsi, metadata
  views/downloads, badge status.
- **Download CTA**: tombol besar primary. Jika `downloadPaymentEnabled` true dan user belum
  punya akses → tombol berubah jadi "Bayar untuk Download (Rp xx.xxx)" yang membuka modal
  Midtrans Snap — desain transisi tombol→modal harus jelas ini bukan download langsung.
- **Tombol Laporkan**: sengaja dibuat lebih kecil/subtle (ghost button) di bawah, tidak
  bersaing visual dengan CTA download — tapi tetap mudah ditemukan (bukan disembunyikan).
- State dokumen `processing`/`failed` (bukan `ready`) harus punya tampilan preview alternatif
  yang jelas (mis. "Dokumen sedang diproses, coba lagi nanti" alih-alih slideshow kosong).

### 7.3 `/login` & `/register`

**Tujuan**: cepat, tidak intimidatif, terasa aman (ada aspek transaksi uang di platform ini).

- Layout terpusat, card tunggal max-width ~420px di tengah viewport, branding Deacad di atas
  form (bukan halaman auth generik tanpa identitas).
- Form minimal field, validasi inline realtime (bukan hanya saat submit), pesan error spesifik
  per field.
- Link silang jelas ("Belum punya akun? Daftar" / "Sudah punya akun? Masuk").
- Setelah register: state "cek email verifikasi" perlu didesain (bukan langsung dianggap selesai)
  meski secara fungsional user sudah auto-login — beri microcopy yang jelas soal status verifikasi.

### 7.4 `/upload`

**Tujuan**: proses upload terasa singkat dan tidak menakutkan, termasuk saat berbayar.

- Form vertikal single-column, max-width medium, field: Judul, Deskripsi, Kategori, File
  (drag-and-drop zone eksplisit + fallback klik-pilih-file, bukan cuma `<input type=file>`
  polos), checkbox pernyataan kepemilikan didesain lebih terlihat (bukan checkbox kecil di
  akhir form yang gampang di-skip — ini pernyataan legal penting).
- Drag-and-drop zone: state default/dragover/file-selected/error(format salah) didesain eksplisit,
  tampilkan nama file + ukuran + ikon tipe file setelah dipilih.
- **State setelah submit** (kondisional dari `settings.uploadPaymentEnabled`):
  - Gratis: konfirmasi sukses + status processing, dengan penjelasan ringan "akan tampil setelah
    diproses".
  - Berbayar: layar konfirmasi jelas menunjukkan harga, tombol "Bayar Sekarang" besar, dan opsi
    eksplisit "lanjutkan nanti dari halaman Profil" (sesuai ARCHITECTURE.md — user boleh menutup
    tab) — ini penting didesain baik supaya user tidak merasa transaksi hilang.
- Progress upload (saat file besar) perlu progress bar, bukan hanya spinner tanpa indikasi.

### 7.5 `/profile`

**Tujuan**: satu tempat user cek status dokumen miliknya + riwayat transaksi (independen dari
redirect Midtrans, sesuai ARCHITECTURE.md §9).

- Header profil ringkas (nama, email, badge role jika admin).
- Tab atau section terpisah: **Dokumen Saya** (list dengan status masing-masing, termasuk yang
  masih `processing`/butuh bayar) dan **Riwayat Transaksi** (tabel/list: dokumen, tipe
  upload/download, jumlah, status, tanggal — dengan badge status yang konsisten dengan §5).
- Transaksi `pending` lama harus punya visual penekanan ringan (bukan alarm merah, tapi cukup
  menonjol) supaya user sadar ada yang belum selesai.

### 7.6 `/admin` — Dashboard

**Tujuan**: ringkasan cepat, scannable, bukan showcase visual.

- Grid kartu metrik atas (pendapatan harian/mingguan/bulanan, dokumen baru, laporan pending,
  jumlah user) — kartu angka besar + label + indikator tren sederhana jika relevan.
- Boleh lebih padat/dense dibanding halaman publik (power-user), tapi tetap pakai tipografi &
  warna token yang sama supaya terasa satu produk, bukan dashboard generik terpisah.
- Tabel breakdown di bawah kartu metrik, styling tabel konsisten dipakai di semua halaman admin
  lain (lihat §7.7–7.10).

### 7.7–7.10 `/admin/reports`, `/admin/documents`, `/admin/transactions`, `/admin/settings`

- **Tabel admin standar** (dipakai di reports/documents/transactions): header sticky, row hover,
  kolom status pakai badge (§5), aksi cepat sebagai tombol kecil di kolom terakhir (ikon+label
  saat hover atau selalu label untuk aksi destruktif), pagination/cursor loader di bawah.
- **Reports**: tiap row expandable atau link ke detail singkat (dokumen+alasan+pelapor) dengan
  dua aksi cepat jelas (Unpublish / Tolak Laporan) — beri konfirmasi modal untuk aksi ireversibel.
- **Documents**: filter status + search di atas tabel, tombol force-unpublish per row dengan
  modal konfirmasi (state dokumen yang sudah unpublished ditandai visual berbeda, mis. baris
  redup).
- **Transactions**: filter status + search by order id/nama user, tombol "Cek Ulang Status" per
  row dengan loading state inline saat trigger reconciliation.
- **Settings**: toggle switch besar dan jelas untuk `uploadPaymentEnabled`/
  `downloadPaymentEnabled` (bukan checkbox kecil — ini pengaturan berdampak besar), input harga
  dengan format Rupiah otomatis, tombol simpan memicu modal konfirmasi eksplisit sebelum apply,
  riwayat perubahan (dari audit log) ditampilkan sebagai timeline sederhana di bawah form.

---

## 8. Responsive & Accessibility

- Mobile-first: semua halaman didesain agar tetap nyaman pada layar 360px lebar sebelum
  di-scale ke desktop.
- Admin panel boleh mengasumsikan penggunaan desktop sebagai kondisi utama, tapi tetap harus
  tidak rusak di tablet (tidak wajib optimal penuh di mobile untuk admin).
- Semua interactive element bisa dioperasikan via keyboard (tab order logis, focus ring
  terlihat jelas menggunakan `--color-focus-ring`).
- Kontras warna teks-atas-background minimum WCAG AA di kedua mode (light & dark) — terutama
  badge status dan teks di atas warna aksen.
- Semua gambar/ikon fungsional punya alt text/aria-label yang jelas.

---

## 9. Motion Guidelines

- Durasi transisi standar: 150ms (hover kecil), 200–250ms (buka modal/dropdown), 300ms
  (transisi antar state besar seperti loading→ready). Easing halus (`ease-out` untuk masuk,
  `ease-in` untuk keluar).
- Tidak ada auto-playing animation yang mengalihkan perhatian dari konten (dokumen tetap fokus
  utama halaman).
- Skeleton loading harus terasa hidup (shimmer halus), bukan statis, tapi tidak mencolok.

---

## 10. Di Luar Cakupan Dokumen Ini

- Tidak membahas perubahan struktur data/API, endpoint baru, atau logika bisnis.
- Tidak membahas email template (verifikasi, notifikasi) — bisa jadi dokumen desain terpisah.
- Tidak membahas landing page marketing terpisah (mis. halaman "Tentang Deacad" khusus) — di
  luar 11 halaman pada §6 kecuali diminta lanjutan.
- Ilustrasi custom/branding asset (logo final, favicon) tidak dirancang detail di sini — cukup
  arahan gaya (wordmark serif) untuk sementara memakai teks.
