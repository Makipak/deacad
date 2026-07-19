"use client";

import { usePathname } from "next/navigation";

// Footer minimal sesuai PRD §5 — tautan placeholder, konsisten di semua halaman publik.
// Disembunyikan di /admin (app shell admin punya layout sendiri, desain "Admin Dashboard").
export function Footer() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;

  return (
    <footer className="mt-16 border-t border-line px-6 py-7 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 text-[13px] text-muted">
        <span>© 2026 Deacad</span>
        <div className="flex gap-5">
          <a href="#" className="text-muted transition-colors hover:text-fg">
            Tentang
          </a>
          <a href="#" className="text-muted transition-colors hover:text-fg">
            Laporkan Penyalahgunaan
          </a>
          <a href="#" className="text-muted transition-colors hover:text-fg">
            Ketentuan &amp; Privasi
          </a>
        </div>
      </div>
    </footer>
  );
}
