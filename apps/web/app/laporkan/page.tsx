import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage, InfoSection } from "@/components/info-page";

export const metadata: Metadata = { title: "Laporkan Penyalahgunaan — Deacad" };

export default function LaporkanPage() {
  return (
    <InfoPage
      title="Laporkan Penyalahgunaan"
      intro="Menemukan dokumen yang melanggar aturan atau hak cipta? Laporkan langsung dari halaman dokumennya. Admin akan meninjau setiap laporan."
    >
      <InfoSection heading="Cara melapor">
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            <Link href="/login" className="text-primary underline">
              Masuk
            </Link>{" "}
            ke akun Deacad kamu (laporan hanya bisa dikirim oleh pengguna yang login).
          </li>
          <li>Buka halaman dokumen yang bermasalah, lalu klik tautan &ldquo;Laporkan dokumen ini&rdquo; di bagian bawah.</li>
          <li>Tulis alasan laporan dengan jelas (minimal 10 karakter), lalu kirim.</li>
        </ol>
      </InfoSection>

      <InfoSection heading="Yang bisa dilaporkan">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Dokumen yang diunggah tanpa izin pemilik hak cipta atau menjiplak karya orang lain.</li>
          <li>Dokumen yang berisi data pribadi orang lain tanpa persetujuan.</li>
          <li>Konten yang menyesatkan, menyinggung, atau melanggar hukum.</li>
          <li>Dokumen yang tidak sesuai kategori atau isinya rusak.</li>
        </ul>
      </InfoSection>

      <InfoSection heading="Setelah laporan dikirim">
        <p>
          Laporan masuk ke antrian moderasi. Admin meninjau dokumen yang dilaporkan dan dapat menurunkannya
          (unpublish) jika terbukti melanggar, atau menolak laporan jika tidak ditemukan pelanggaran.
          Laporan yang tidak berdasar atau dikirim berulang untuk mengganggu dapat ditindak.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
