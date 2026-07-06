import { DocumentCard } from "@/components/document-card";
import { mockCategories, mockDocuments } from "@/lib/mock-data";

// Next.js 16: searchParams sekarang WAJIB async (bukan lagi object langsung) — harus di-await.
type SearchParams = Promise<{ q?: string; category?: string; sort?: string }>;

// Server Component — filter & sort dieksekusi di server sebelum HTML dikirim (SSR, sesuai
// alasan pemilihan Next.js untuk SEO halaman publik di ARCHITECTURE.md #2).
// Catatan: filter di sini masih terhadap array mock, nanti tinggal diganti query ke
// GET /documents (ARCHITECTURE.md #11) begitu apps/api sudah di-connect.
export default async function BrowsePage({ searchParams }: { searchParams: SearchParams }) {
  const { q, category, sort } = await searchParams;

  let documents = mockDocuments.filter((doc) => doc.status === "ready");
  if (q) {
    const needle = q.toLowerCase();
    documents = documents.filter((doc) => doc.title.toLowerCase().includes(needle));
  }
  if (category) {
    documents = documents.filter((doc) => doc.categoryId === category);
  }
  if (sort === "terpopuler") {
    documents = [...documents].sort((a, b) => b.downloadCount - a.downloadCount);
  } else {
    // default "terbaru" — mock sudah terurut kira-kira kronologis, cukup untuk demo.
    documents = [...documents].reverse();
  }

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
          {mockCategories.map((cat) => (
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
        {documents.map((doc) => (
          <DocumentCard key={doc.id} document={doc} />
        ))}
        {documents.length === 0 && (
          <p className="col-span-full text-sm" style={{ color: "var(--color-muted)" }}>
            Tidak ada dokumen yang cocok dengan pencarian.
          </p>
        )}
      </div>
    </div>
  );
}
