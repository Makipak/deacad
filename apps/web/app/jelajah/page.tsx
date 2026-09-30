import { redirect } from "next/navigation";

// Halaman Jelajah dihapus — beranda ("/") sudah memuat pencarian, filter, dan daftar dokumen.
// Redirect ini menjaga link/bookmark lama tetap jalan.
export default function JelajahPage() {
  redirect("/");
}
