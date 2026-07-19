"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { ThemeToggle } from "@/components/theme-toggle";

const ADMIN_LINKS = [
  { href: "/admin", label: "Dashboard", title: "Dashboard" },
  { href: "/admin/reports", label: "Laporan", title: "Antrian Moderasi Laporan" },
  { href: "/admin/documents", label: "Dokumen", title: "Manajemen Dokumen" },
  { href: "/admin/transactions", label: "Transaksi", title: "Manajemen Transaksi" },
  { href: "/admin/settings", label: "Pengaturan", title: "Pengaturan Monetisasi" },
];

// App shell khusus /admin/* (desain "Admin Dashboard"): sidebar 220px + header bar per halaman —
// terpisah dari navbar/footer publik. Redirect ke /login kalau belum login atau bukan admin,
// supaya akses langsung lewat URL juga ke-gate, bukan cuma link navbar. Ini gate FE demi UX saja —
// akses endpoint admin di backend tetap digerbangi RolesGuard('admin') sendiri (ARCHITECTURE.md #7).
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isAdmin = status === "authenticated" && user?.role === "admin";

  useEffect(() => {
    if (status === "unauthenticated" || (status === "authenticated" && !isAdmin)) {
      router.replace("/login");
    }
  }, [status, isAdmin, router]);

  if (!isAdmin) return null;

  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));
  const pageTitle = ADMIN_LINKS.find((link) => isActive(link.href))?.title ?? "Admin";

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-55 shrink-0 flex-col gap-1 border-r border-line bg-elevated px-4 py-6 md:flex">
        <div className="px-2 pb-5 font-serif text-xl font-bold text-primary">Deacad Admin</div>
        {ADMIN_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive(link.href) ? "page" : undefined}
            className={`block rounded-sm px-3 py-2.5 text-[14px] transition-colors ${
              isActive(link.href)
                ? "bg-primary-subtle font-semibold text-primary"
                : "font-medium text-fg hover:bg-surface"
            }`}
          >
            {link.label}
          </Link>
        ))}
        <div className="flex-1" />
        <Link href="/" className="px-3 py-2.5 text-[13px] text-muted transition-colors hover:text-fg">
          ← Kembali ke Situs
        </Link>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex h-16 items-center gap-3 border-b border-line bg-elevated px-5 lg:px-8">
          <h1 className="font-serif text-[19px] font-semibold">{pageTitle}</h1>
          <div className="flex-1" />
          <ThemeToggle />
        </header>

        {/* Navigasi fallback layar kecil — admin dirancang desktop-first (PRD §8) tapi tidak boleh rusak. */}
        <nav className="flex gap-1 overflow-x-auto border-b border-line bg-elevated px-3 py-2 md:hidden">
          {ADMIN_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`shrink-0 rounded-sm px-3 py-1.5 text-[13px] ${
                isActive(link.href) ? "bg-primary-subtle font-semibold text-primary" : "text-fg"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="p-5 lg:p-8">{children}</div>
      </div>
    </div>
  );
}
