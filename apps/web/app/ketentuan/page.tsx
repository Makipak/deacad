import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage, InfoSection } from "@/components/info-page";

export const metadata: Metadata = { title: "Ketentuan & Privasi — Deacad" };

export default function KetentuanPage() {
  return (
    <InfoPage
      title="Ketentuan & Privasi"
      intro="Dengan memakai Deacad, kamu setuju dengan ketentuan di bawah ini. Mohon dibaca sebelum mengunggah atau mengunduh dokumen."
    >
      <InfoSection heading="1. Akun">
        <p>
          Kamu bertanggung jawab atas kerahasiaan kata sandi dan seluruh aktivitas di akunmu. Data yang kamu
          isikan (nama, kampus, program studi, NIM/NIDN, nomor HP) harus benar dan milikmu sendiri.
        </p>
      </InfoSection>

      <InfoSection heading="2. Dokumen yang diunggah">
        <p>
          Kamu hanya boleh mengunggah dokumen yang kamu miliki atau yang kamu berhak membagikannya. Kamu tetap
          menjadi pemilik dokumenmu; dengan mengunggah, kamu memberi Deacad izin untuk menyimpan, memproses
          menjadi pratinjau, dan menampilkannya kepada pengguna lain di platform.
        </p>
        <p>
          Dilarang mengunggah karya yang melanggar hak cipta, menjiplak, berisi data pribadi orang lain, atau
          melanggar hukum. Admin dapat menurunkan dokumen yang melanggar, dan akun yang berulang kali melanggar
          dapat dibatasi. Lihat{" "}
          <Link href="/laporkan" className="text-primary underline">
            cara melaporkan penyalahgunaan
          </Link>
          .
        </p>
      </InfoSection>

      <InfoSection heading="3. Pembayaran">
        <p>
          Biaya unggah atau unduh bersifat opsional dan hanya berlaku ketika diaktifkan oleh pengelola.
          Pembayaran diproses oleh Midtrans; Deacad tidak menyimpan nomor kartu atau detail rekening kamu.
          Kebijakan pengembalian dana mengikuti keterangan yang tampil saat pembayaran.
        </p>
      </InfoSection>

      <InfoSection heading="4. Data yang kami simpan">
        <p>Untuk menjalankan layanan, Deacad menyimpan:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Data akun: nama, email, dan kata sandi (disimpan dalam bentuk hash, bukan teks asli).</li>
          <li>Data diri akademik: kampus, program studi, NIM/NIDN, dan nomor HP.</li>
          <li>Dokumen yang kamu unggah beserta riwayat transaksi dan laporan yang kamu kirim.</li>
          <li>Cookie sesi untuk menjaga kamu tetap login.</li>
        </ul>
        <p>
          Data ini dipakai untuk mengelola akun, memproses transaksi, dan moderasi. Kami tidak menjual data
          pribadimu. Kamu bisa memperbarui data dirimu kapan saja di halaman{" "}
          <Link href="/profile" className="text-primary underline">
            Profil
          </Link>
          .
        </p>
      </InfoSection>

      <InfoSection heading="5. Perubahan ketentuan">
        <p>
          Ketentuan ini dapat diperbarui sewaktu-waktu. Perubahan berlaku setelah dipublikasikan di halaman
          ini, dan melanjutkan pemakaian Deacad berarti kamu menyetujuinya.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
