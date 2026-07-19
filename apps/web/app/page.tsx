import Link from "next/link";
import { DocumentCard } from "@/components/document-card";
import { Hero } from "@/components/hero";
import { BrowseFilters } from "@/components/browse-filters";
import type { Category, Document } from "@deacad/shared-types";

// Next.js 16: searchParams sekarang WAJIB async (bukan lagi object langsung) — harus di-await.
type SearchParams = Promise<{ q?: string; category?: string; sort?: string }>;

interface DocumentListResponse {
  items: Document[];
  nextCursor: string | null;
}

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL}/api/v1`;

// Server Component — fetch langsung ke apps/api (endpoint publik, tidak butuh auth) saat SSR,
// sesuai alasan pemilihan Next.js untuk SEO halaman publik di ARCHITECTURE.md #2.
export default async function BrowsePage({ searchParams }: { searchParams: SearchParams }) {
  const { q, category, sort } = await searchParams;
  const activeSort = sort === "terpopuler" ? "terpopuler" : "terbaru";

  const query = new URLSearchParams();
  if (q) query.set("q", q);
  if (category) query.set("categoryId", category);
  query.set("sort", activeSort);

  const [documentsRes, categories] = await Promise.all([
    fetch(`${API_BASE}/documents?${query.toString()}`, { cache: "no-store" })
      .then((res) => res.json() as Promise<DocumentListResponse>)
      .catch(() => ({ items: [], nextCursor: null })),
    fetch(`${API_BASE}/categories`, { cache: "no-store" })
      .then((res) => res.json() as Promise<Category[]>)
      .catch(() => []),
  ]);

  const categoryName = (categoryId: string | null) =>
    categories.find((cat) => cat.id === categoryId)?.name ?? "Tanpa kategori";

  return (
    <div>
      <Hero />

      <BrowseFilters
        categories={categories}
        q={q}
        activeCategoryId={category ?? ""}
        sort={activeSort}
        resultCount={documentsRes.items.length}
      />

      <div className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        {documentsRes.items.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {documentsRes.items.map((doc) => (
              <DocumentCard key={doc.id} document={doc} categoryName={categoryName(doc.categoryId)} />
            ))}
          </div>
        ) : (
          <div className="px-5 py-16 text-center text-muted">
            <div aria-hidden className="mx-auto mb-4 h-16 w-16 rounded-full border-2 border-line" />
            <p className="mb-1.5 text-[16px] font-semibold text-fg">Tidak ada dokumen ditemukan</p>
            <p className="text-[14px]">
              Coba kata kunci lain, atau{" "}
              <Link href="/" className="text-primary underline">
                reset filter
              </Link>
              .
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
