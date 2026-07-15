import { DocumentCard } from "@/components/document-card";
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

  const query = new URLSearchParams();
  if (q) query.set("q", q);
  if (category) query.set("categoryId", category);
  query.set("sort", sort === "terpopuler" ? "terpopuler" : "terbaru");

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
      <h1 className="text-2xl font-semibold">Jelajah Dokumen</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>
        Skripsi, tesis, makalah, laporan praktikum, presentasi, dan jurnal dari mahasiswa lain.
      </p>

      <form className="mt-6 flex flex-wrap gap-3" action="/">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Cari judul dokumen..."
          className="flex-1 rounded-md border px-3 py-2 text-sm"
          style={{ borderColor: "var(--color-border)", minWidth: "200px" }}
        />
        <select
          name="category"
          defaultValue={category ?? ""}
          className="rounded-md border px-3 py-2 text-sm"
          style={{ borderColor: "var(--color-border)" }}
        >
          <option value="">Semua kategori</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
        <select
          name="sort"
          defaultValue={sort ?? "terbaru"}
          className="rounded-md border px-3 py-2 text-sm"
          style={{ borderColor: "var(--color-border)" }}
        >
          <option value="terbaru">Terbaru</option>
          <option value="terpopuler">Terpopuler</option>
        </select>
        <button
          type="submit"
          className="rounded-md px-4 py-2 text-sm text-white"
          style={{ background: "var(--color-primary)" }}
        >
          Cari
        </button>
      </form>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {documentsRes.items.map((doc) => (
          <DocumentCard key={doc.id} document={doc} categoryName={categoryName(doc.categoryId)} />
        ))}
        {documentsRes.items.length === 0 && (
          <p className="col-span-full text-sm" style={{ color: "var(--color-muted)" }}>
            Tidak ada dokumen yang cocok dengan pencarian.
          </p>
        )}
      </div>
    </div>
  );
}
