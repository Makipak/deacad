import Link from "next/link";
import { redirect } from "next/navigation";
import { DocumentCard } from "@/components/document-card";
import { BrowseFilters } from "@/components/browse-filters";
import { Pagination } from "@/components/pagination";
import type { Category, Document } from "@deacad/shared-types";

interface DocumentListResponse {
  items: Document[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL}/api/v1`;

interface BrowseViewProps {
  q?: string;
  category?: string;
  sort?: string;
  page?: string;
  // Path halaman pemakai ("/" atau "/jelajah") — filter & "reset filter" tetap di halaman yang sama.
  basePath: string;
}

// Server Component — fetch langsung ke apps/api (endpoint publik, tidak butuh auth) saat SSR,
// sesuai alasan pemilihan Next.js untuk SEO halaman publik di ARCHITECTURE.md #2.
// Dipakai beranda ("/", di bawah hero).
export async function BrowseView({ q, category, sort, page, basePath }: BrowseViewProps) {
  const activeSort = sort === "terpopuler" ? "terpopuler" : "terbaru";

  const query = new URLSearchParams();
  if (q) query.set("q", q);
  if (category) query.set("categoryId", category);
  query.set("sort", activeSort);
  // page dari URL bisa ngawur ("abc", "-1", "0") — paksa jadi bilangan bulat >= 1.
  const requestedPage = Math.max(1, Math.floor(Number(page)) || 1);
  query.set("page", String(requestedPage));

  const [documentsRes, categories] = await Promise.all([
    fetch(`${API_BASE}/documents?${query.toString()}`, { cache: "no-store" })
      .then((res) => res.json() as Promise<DocumentListResponse>)
      .catch(() => ({ items: [], page: 1, limit: 12, total: 0, totalPages: 1 })),
    fetch(`${API_BASE}/categories`, { cache: "no-store" })
      .then((res) => res.json() as Promise<Category[]>)
      .catch(() => []),
  ]);

  // Link halaman tetap membawa filter/urutan aktif. Halaman 1 tidak perlu ?page= di URL.
  const hrefFor = (target: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    params.set("sort", activeSort);
    if (target > 1) params.set("page", String(target));
    return `${basePath}?${params.toString()}`;
  };

  // ?page=99 padahal cuma ada 3 halaman → lempar ke halaman terakhir, bukan daftar kosong.
  if (requestedPage > documentsRes.totalPages) redirect(hrefFor(documentsRes.totalPages));

  const categoryName = (categoryId: string | null) =>
    categories.find((cat) => cat.id === categoryId)?.name ?? "Tanpa kategori";

  return (
    <>
      <BrowseFilters
        basePath={basePath}
        categories={categories}
        q={q}
        activeCategoryId={category ?? ""}
        sort={activeSort}
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
              <Link href={basePath} className="text-primary underline">
                reset filter
              </Link>
              .
            </p>
          </div>
        )}

        <Pagination page={documentsRes.page} totalPages={documentsRes.totalPages} hrefFor={hrefFor} />
      </div>
    </>
  );
}
