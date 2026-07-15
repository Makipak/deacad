"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

// Navigasi global — status login dari AuthProvider (JWT asli lewat apps/api, lihat
// lib/auth-context.tsx). Link "Admin" cuma tampil kalau role === "admin".
export function Navbar() {
  const { user, status, logout } = useAuth();
  const router = useRouter();
  const loggedIn = status === "authenticated" && user !== null;

  return (
    <header className="border-b" style={{ borderColor: "var(--color-border)" }}>
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-lg font-semibold">
          Deacad
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="hover:underline">
            Jelajah
          </Link>
          <Link href="/upload" className="hover:underline">
            Upload
          </Link>
          {loggedIn && user.role === "admin" && (
            <Link href="/admin" className="hover:underline">
              Admin
            </Link>
          )}
          {loggedIn ? (
            <button
              type="button"
              onClick={async () => {
                await logout();
                router.push("/");
              }}
              className="rounded-md px-3 py-1.5 text-white"
              style={{ background: "var(--color-primary)" }}
            >
              Keluar
            </button>
          ) : (
            <Link
              href="/login"
              className="rounded-md px-3 py-1.5 text-white"
              style={{ background: "var(--color-primary)" }}
            >
              Masuk
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
