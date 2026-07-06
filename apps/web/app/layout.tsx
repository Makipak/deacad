import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/navbar";

export const metadata: Metadata = {
  title: "Deacad — Platform Sharing Dokumen Akademik",
  description: "Upload, cari, dan baca dokumen akademik (skripsi, tesis, makalah, presentasi).",
};

// Root layout — dipakai semua route termasuk /admin (admin punya layout tambahan di app/admin/layout.tsx).
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <Navbar />
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
