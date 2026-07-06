import Link from "next/link";

const ADMIN_LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/reports", label: "Antrian Laporan" },
  { href: "/admin/documents", label: "Dokumen" },
  { href: "/admin/transactions", label: "Transaksi" },
  { href: "/admin/settings", label: "Settings" },
];

// Layout khusus /admin/* — sidebar navigasi. Di production, akses ke sini digerbangi
// RolesGuard('admin') di backend, BUKAN cuma disembunyikan di frontend (ARCHITECTURE.md #7).
export default function AdminLayout({ children }: { children: React.ReactNode }) {
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
