"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

// Hero search-first (desain Landing Browse) — hanya tampil untuk visitor yang belum login
// (PRD §7.1); di-render server-side lalu di-collapse client-side saat sesi ter-restore.
export function Hero() {
  const { status } = useAuth();
  const router = useRouter();

  if (status === "authenticated") return null;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = new FormData(e.currentTarget).get("q");
    router.push(q ? `/?q=${encodeURIComponent(String(q))}` : "/");
  }

  return (
    <section className="mx-auto max-w-3xl px-6 pb-14 pt-18 text-center">
      <h1 className="mb-4 font-serif text-4xl font-bold leading-[1.15] text-balance sm:text-5xl">
        Temukan &amp; Bagikan Dokumen Akademik
      </h1>
      <p className="mb-8 text-[17px] leading-relaxed text-muted">
        Skripsi, tesis, makalah, dan jurnal dari kampus se-Indonesia — siap dibaca, siap dipakai.
      </p>
      <form onSubmit={handleSubmit} className="mx-auto flex max-w-xl gap-2" role="search">
        <input
          type="search"
          name="q"
          placeholder="Cari judul, topik, atau kata kunci..."
          aria-label="Cari dokumen"
          className="input h-13 flex-1 rounded-md px-4.5 text-[16px]"
        />
        <button type="submit" className="btn-primary btn-lg shrink-0">
          Cari
        </button>
      </form>
    </section>
  );
}
