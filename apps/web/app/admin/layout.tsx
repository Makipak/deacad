"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";

const ADMIN_LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/reports", label: "Antrian Laporan" },
  { href: "/admin/documents", label: "Dokumen" },
  { href: "/admin/transactions", label: "Transaksi" },
  { href: "/admin/settings", label: "Settings" },
];

// Layout khusus /admin/* — sidebar navigasi. Redirect ke /login kalau belum login atau bukan
// admin, supaya akses langsung lewat URL juga ke-gate, bukan cuma link navbar. Ini gate FE demi
// UX saja — akses ke endpoint admin di backend tetap digerbangi RolesGuard('admin') sendiri
// (ARCHITECTURE.md #7), jadi tetap aman meski frontend ini dilewati.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, status } = useAuth();
  const router = useRouter();
  const isAdmin = status === "authenticated" && user?.role === "admin";

  useEffect(() => {
    if (status === "unauthenticated" || (status === "authenticated" && !isAdmin)) {
      router.replace("/login");
    }
  }, [status, isAdmin, router]);

  if (!isAdmin) return null;

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-[180px_1fr]">
      <aside>
        <nav className="flex flex-col gap-1 text-sm">
          {ADMIN_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="rounded-md px-3 py-2 hover:bg-gray-100">
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div>{children}</div>
    </div>
  );
}
