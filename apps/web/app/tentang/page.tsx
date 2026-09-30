import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage, InfoSection } from "@/components/info-page";

export const metadata: Metadata = { title: "Tentang — Deacad" };

export default function TentangPage() {
  return (
    <InfoPage
      title="Tentang Deacad"
      intro="Deacad adalah platform berbagi dokumen akademik — tempat mahasiswa, dosen, dan peneliti menemukan serta membagikan karya tulis dengan mudah."
    >
      <InfoSection heading="Apa yang ada di Deacad">
        <p>
          Skripsi, tesis, makalah, jurnal, laporan praktikum, dan presentasi dari berbagai kampus dikumpulkan di
          satu tempat. Setiap dokumen bisa dicari berdasarkan judul, difilter per kategori, dan dipratinjau
          seperti slideshow langsung di browser tanpa perlu mengunduh file aslinya terlebih dulu.
        </p>
      </InfoSection>

      <InfoSection heading="Cara kerjanya">
        <p>
          Kamu bisa mengunggah dokumen berformat PDF atau PPTX. Setelah diunggah, dokumen diproses otomatis
          menjadi halaman-halaman pratinjau, lalu tampil di beranda begitu siap. Pengunjung bisa membaca
          pratinjau dan, tergantung pengaturan platform, mengunduh dokumen aslinya.
        </p>
        <p>
          Pengelola dapat menyalakan biaya opsional untuk mengunggah atau mengunduh dokumen. Kalau fitur ini
          aktif, pembayaran diproses lewat Midtrans dan riwayatnya bisa kamu lihat di halaman profil.
        </p>
      </InfoSection>

      <InfoSection heading="Dokumen yang sehat">
        <p>
          Deacad hanya untuk karya yang kamu berhak membagikannya. Setiap pengunggah diminta menyatakan
          kepemilikan hak atas dokumennya, dan siapa pun bisa melaporkan dokumen yang bermasalah. Laporan
          ditinjau oleh admin. Baca{" "}
          <Link href="/ketentuan" className="text-primary underline">
            Ketentuan &amp; Privasi
          </Link>{" "}
          atau{" "}
          <Link href="/laporkan" className="text-primary underline">
            cara melaporkan penyalahgunaan
          </Link>
          .
        </p>
      </InfoSection>
    </InfoPage>
  );
}
