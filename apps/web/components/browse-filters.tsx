"use client";

import { useRouter } from "next/navigation";
import type { Category } from "@deacad/shared-types";

interface BrowseFiltersProps {
  categories: Category[];
  q?: string;
  activeCategoryId: string;
  sort: string;
  resultCount: number;
}

// Bar filter sticky di bawah navbar + chip kategori satu-klik (desain Landing Browse).
// Semua filter dipetakan ke URL search params supaya halaman tetap Server Component + shareable.
export function BrowseFilters({ categories, q, activeCategoryId, sort, resultCount }: BrowseFiltersProps) {
  const router = useRouter();

  function navigate(next: { category?: string; sort?: string }) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    const category = next.category ?? activeCategoryId;
    if (category) params.set("category", category);
    params.set("sort", next.sort ?? sort);
    router.push(`/?${params.toString()}`);
  }

  const chips = [{ id: "", name: "Semua" }, ...categories];

  return (
    <>
      <div className="sticky top-18 z-10 border-b border-line bg-surface">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3.5 sm:px-6 lg:px-8">
          <label className="sr-only" htmlFor="filter-category">
            Kategori
          </label>
          <select
            id="filter-category"
            value={activeCategoryId}
            onChange={(e) => navigate({ category: e.target.value })}
            className="input w-auto text-[14px]"
          >
            <option value="">Semua kategori</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          <label className="sr-only" htmlFor="filter-sort">
            Urutkan
          </label>
          <select
            id="filter-sort"
            value={sort}
            onChange={(e) => navigate({ sort: e.target.value })}
            className="input w-auto text-[14px]"
          >
            <option value="terbaru">Terbaru</option>
            <option value="terpopuler">Terpopuler</option>
          </select>

          <div className="flex-1" />
          <span className="text-[13px] text-muted">{resultCount} dokumen ditemukan</span>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl flex-wrap gap-2 px-4 pt-4 sm:px-6 lg:px-8">
        {chips.map((chip) => {
          const active = chip.id === activeCategoryId;
          return (
            <button
              key={chip.id || "all"}
              type="button"
              onClick={() => navigate({ category: chip.id })}
              aria-pressed={active}
              className={`h-9 cursor-pointer rounded-full border px-4 text-[14px] font-medium transition-colors ${
                active
                  ? "border-primary bg-primary text-primary-fg"
                  : "border-line bg-elevated text-fg hover:border-line-strong"
              }`}
            >
              {chip.name}
            </button>
          );
        })}
      </div>
    </>
  );
}
