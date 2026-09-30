"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Footer minimal sesuai PRD §5 — tautan ke halaman informasi, konsisten di semua halaman publik.
// Disembunyikan di /admin (app shell admin punya layout sendiri, desain "Admin Dashboard").
export function Footer() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;

  return (
    <footer className="mt-16 border-t border-line px-6 py-7 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 text-[13px] text-muted">
        <span>© 2026 Deacad</span>
        <div className="flex gap-5">
          <Link href="/tentang" className="text-muted transition-colors hover:text-fg">
            Tentang
          </Link>
          <Link href="/laporkan" className="text-muted transition-colors hover:text-fg">
            Laporkan Penyalahgunaan
          </Link>
          <Link href="/ketentuan" className="text-muted transition-colors hover:text-fg">
            Ketentuan &amp; Privasi
          </Link>
        </div>
      </div>
    </footer>
  );
}
