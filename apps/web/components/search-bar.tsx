"use client";

import { useRouter } from "next/navigation";

interface SearchBarProps {
  basePath: string;
  defaultValue?: string;
  category?: string;
  sort?: string;
}

// Kolom cari untuk halaman Jelajah — kategori & urutan yang sedang aktif tetap dibawa.
export function SearchBar({ basePath, defaultValue, category, sort }: SearchBarProps) {
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    if (sort) params.set("sort", sort);
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-xl gap-2" role="search">
      <input
        key={defaultValue ?? ""}
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder="Cari judul, topik, atau kata kunci..."
        aria-label="Cari dokumen"
        className="input h-11 flex-1"
      />
      <button type="submit" className="btn-primary shrink-0">
        Cari
      </button>
    </form>
  );
}
