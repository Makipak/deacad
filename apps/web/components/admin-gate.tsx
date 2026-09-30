"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";

// Gate global. (1) Admin hanya boleh memakai area /admin/*. (2) User biasa wajib melengkapi data diri.
// Soal admin: Kalau admin yang sedang login membuka halaman publik
// (landing, upload, login, dll.), langsung diarahkan ke /admin dan konten publik tidak
// dirender sama sekali. Setelah logout, user kembali "tamu" dan bebas melihat landing page.
// Gate FE demi UX — pembatasan sebenarnya tetap di backend (RolesGuard).
export function AdminGate({ children }: { children: React.ReactNode }) {
  const { user, status, profileComplete } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = status === "authenticated" && user?.role === "admin";
  const blocked = isAdmin && !pathname.startsWith("/admin");

  // User biasa yang belum melengkapi data diri (baru daftar, atau akun lama) tidak boleh ke halaman
  // lain — dipaksa ke /lengkapi-profil dulu. Sebaliknya, yang sudah lengkap tidak perlu ke sana.
  const needsProfile = status === "authenticated" && !isAdmin && !profileComplete;
  const onProfileSetup = pathname === "/lengkapi-profil";
  const toProfileSetup = needsProfile && !onProfileSetup;
  const leaveProfileSetup = status === "authenticated" && !needsProfile && !isAdmin && onProfileSetup;

  useEffect(() => {
    if (blocked) router.replace("/admin");
    else if (toProfileSetup) router.replace("/lengkapi-profil");
    else if (leaveProfileSetup) router.replace("/");
  }, [blocked, toProfileSetup, leaveProfileSetup, router]);

  if (blocked || toProfileSetup || leaveProfileSetup) return null;
  return <>{children}</>;
}
