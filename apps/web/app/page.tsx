import { Hero } from "@/components/hero";
import { BrowseView } from "@/components/browse-view";

// Next.js 16: searchParams sekarang WAJIB async (bukan lagi object langsung) — harus di-await.
type SearchParams = Promise<{ q?: string; category?: string; sort?: string; page?: string }>;

// Beranda: hero + daftar dokumen untuk visitor; user login melihat tampilan jelajah tanpa hero.
export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const { q, category, sort, page } = await searchParams;
  return (
    <div>
      <Hero q={q} category={category} sort={sort} />
      <BrowseView q={q} category={category} sort={sort} page={page} basePath="/" />
    </div>
  );
}
