"use client";

import { useRouter } from "next/navigation";
import type { Category } from "@deacad/shared-types";

interface BrowseFiltersProps {
  basePath: string;
  categories: Category[];
  q?: string;
  activeCategoryId: string;
  sort: string;
}

// Satu bar filter sticky di bawah navbar: chip kategori di kiri, urutan di kanan.
// Semua filter dipetakan ke URL search params supaya halaman tetap Server Component + shareable.
export function BrowseFilters({ basePath, categories, q, activeCategoryId, sort }: BrowseFiltersProps) {
  const router = useRouter();

  function navigate(next: { category?: string; sort?: string }) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    const category = next.category ?? activeCategoryId;
    if (category) params.set("category", category);
    params.set("sort", next.sort ?? sort);
    router.push(`${basePath}?${params.toString()}`);
  }

  const chips = [{ id: "", name: "Semua" }, ...categories];

  return (
    <div className="sticky top-18 z-10 border-b border-line bg-surface">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-6 lg:px-8">
        {/* Chip kategori — satu-satunya kontrol kategori (dropdown dobel dihapus). Di layar sempit
            scroll horizontal supaya tidak numpuk ke baris-baris baru. */}
        <div
          role="group"
          aria-label="Kategori"
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0 lg:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {chips.map((chip) => {
            const active = chip.id === activeCategoryId;
            return (
              <button
                key={chip.id || "all"}
                type="button"
                onClick={() => navigate({ category: chip.id })}
                aria-pressed={active}
                className={`h-9 shrink-0 cursor-pointer rounded-full border px-4 text-[14px] font-medium transition-colors ${
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

        <div className="flex shrink-0 items-center justify-between gap-3 lg:justify-end">
          <label className="sr-only" htmlFor="filter-sort">
            Urutkan
          </label>
          <select
            id="filter-sort"
            value={sort}
            onChange={(e) => navigate({ sort: e.target.value })}
            className="input h-9 w-auto text-[14px]"
          >
            <option value="terbaru">Terbaru</option>
            <option value="terpopuler">Terpopuler</option>
          </select>
        </div>
      </div>
    </div>
  );
}
