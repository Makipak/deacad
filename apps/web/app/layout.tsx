import type { Metadata } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { AuthProvider } from "@/lib/auth-context";

// Kombinasi tipografi signature Deacad (PRD §4.3): serif untuk heading, sans untuk UI/body.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Deacad — Platform Sharing Dokumen Akademik",
  description: "Upload, cari, dan baca dokumen akademik (skripsi, tesis, makalah, presentasi).",
};

// Set class .dark sebelum paint supaya tidak flash tema salah (FOUC) — preferensi tersimpan di
// localStorage (PRD §4.2: preferensi user, bukan cuma ikut OS), fallback ke prefers-color-scheme.
const themeInitScript = `(function(){try{var t=localStorage.getItem("deacad-theme");if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}})();`;

// Root layout — dipakai semua route termasuk /admin (admin punya layout tambahan di app/admin/layout.tsx).
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning className={`${inter.variable} ${sourceSerif.variable}`}>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <AuthProvider>
          <Navbar />
          <main className="min-h-[70vh]">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
