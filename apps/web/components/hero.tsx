"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { SearchBar } from "@/components/search-bar";

interface HeroProps {
  q?: string;
  category?: string;
  sort?: string;
}

// Bagian atas beranda. Visitor belum login: hero search-first (desain Landing Browse, PRD §7.1).
// User yang sudah login: tanpa hero — judul "Jelajah Dokumen" + kolom cari ringkas, lalu daftar
// dokumen di bawahnya. Tidak ada menu Jelajah terpisah; user masuk lewat logo "Deacad".
export function Hero({ q: query, category, sort }: HeroProps) {
  const { status } = useAuth();
  const router = useRouter();

  if (status === "authenticated") {
    return (
      <div className="mx-auto max-w-7xl px-4 pb-6 pt-8 sm:px-6 lg:px-8">
        <h1 className="mb-4 font-serif text-3xl font-bold">Jelajah Dokumen</h1>
        <SearchBar basePath="/" defaultValue={query} category={category} sort={sort} />
      </div>
    );
  }

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
