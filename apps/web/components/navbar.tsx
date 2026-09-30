"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { ThemeToggle } from "@/components/theme-toggle";

// Inisial nama untuk avatar (desain: lingkaran primarySubtle berisi 2 huruf, mis. "RA").
function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join("");
}

// Navigasi global — sticky, wordmark serif, toggle dark mode, avatar+dropdown
// (Profil/Admin/Keluar) atau tombol Masuk+Daftar kalau belum login. Sesuai desain "Landing Browse".
export function Navbar() {
  const { user, status, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const loggedIn = status === "authenticated" && user !== null;

  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Tutup dropdown saat klik di luar — pola dropdown standar tanpa library.
  useEffect(() => {
    if (!menuOpen) return;
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  // Area /admin punya app shell sendiri (sidebar + header, lihat app/admin/layout.tsx) —
  // navbar publik tidak ditampilkan di sana, sesuai desain "Admin Dashboard".
  if (pathname.startsWith("/admin")) return null;

  async function handleLogout() {
    setMenuOpen(false);
    setMobileOpen(false);
    await logout();
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-elevated">
      <div className="mx-auto flex h-18 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:gap-6 lg:px-8">
        <Link
          href="/"
          className="shrink-0 font-serif text-2xl font-bold text-primary"
          aria-label="Deacad — beranda"
        >
          Deacad
        </Link>


        <div className="flex-1" />

        <nav className="hidden items-center gap-1 md:flex" aria-label="Navigasi utama">
          <Link
            href="/upload"
            aria-current={pathname === "/upload" ? "page" : undefined}
            className={`px-3 py-2 text-[15px] font-medium transition-colors hover:text-primary ${
              pathname === "/upload" ? "text-primary" : "text-fg"
            }`}
          >
            Upload
          </Link>
        </nav>

        <ThemeToggle />

        {loggedIn ? (
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label={`Menu akun ${user.name}`}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-primary-subtle text-[14px] font-semibold text-primary"
            >
              {initials(user.name)}
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="animate-slide-up absolute right-0 top-12 w-56 rounded-md border border-line bg-elevated py-1.5 shadow-(--shadow-hover)"
              >
                <div className="border-b border-line px-4 py-2.5">
                  <p className="truncate text-[14px] font-semibold">{user.name}</p>
                  <p className="truncate text-[13px] text-muted">{user.email}</p>
                </div>
                {/* Admin tidak punya dokumen/transaksi pribadi — Profil & Riwayat hanya untuk user biasa. */}
                {user.role !== "admin" && (
                  <Link
                    role="menuitem"
                    href="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2 text-[14px] transition-colors hover:bg-surface"
                  >
                    Profil &amp; Riwayat
                  </Link>
                )}
                <button
                  role="menuitem"
                  type="button"
                  onClick={handleLogout}
                  className="block w-full cursor-pointer px-4 py-2 text-left text-[14px] text-danger transition-colors hover:bg-surface"
                >
                  Keluar
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="hidden items-center gap-2 md:flex">
            <Link href="/login" className="btn-secondary">
              Masuk
            </Link>
            <Link href="/register" className="btn-primary">
              Daftar
            </Link>
          </div>
        )}

        {/* Hamburger mobile — link utama dikumpulkan di panel bawah navbar. */}
        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          aria-label={mobileOpen ? "Tutup menu" : "Buka menu"}
          aria-expanded={mobileOpen}
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-sm border border-line text-fg md:hidden"
        >
          <span aria-hidden>{mobileOpen ? "✕" : "☰"}</span>
        </button>
      </div>

      {mobileOpen && (
        <div className="animate-fade-in border-t border-line bg-elevated px-4 py-3 md:hidden">
          <nav className="flex flex-col" aria-label="Navigasi mobile">
            <Link href="/upload" onClick={() => setMobileOpen(false)} className="py-2.5 text-[15px] font-medium">
              Upload
            </Link>
            {!loggedIn && (
              <div className="mt-2 flex gap-2">
                <Link href="/login" onClick={() => setMobileOpen(false)} className="btn-secondary flex-1">
                  Masuk
                </Link>
                <Link href="/register" onClick={() => setMobileOpen(false)} className="btn-primary flex-1">
                  Daftar
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
