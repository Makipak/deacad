import Link from "next/link";
import { notFound } from "next/navigation";
import { SlideshowViewer } from "@/components/slideshow-viewer";
import { DownloadButton } from "@/components/download-button";
import { ReportButton } from "@/components/report-button";
import { StatusBadge } from "@/components/status-badge";
import type { Category, Document, MonetizationSettings } from "@deacad/shared-types";

// Next.js 16: params juga wajib async, sama seperti searchParams.
type Params = Promise<{ id: string }>;

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL}/api/v1`;

export default async function DocumentDetailPage({ params }: { params: Params }) {
  const { id } = await params;

  const [documentRes, categories, settings] = await Promise.all([
    fetch(`${API_BASE}/documents/${id}`, { cache: "no-store" }),
    fetch(`${API_BASE}/categories`, { cache: "no-store" })
      .then((res) => res.json() as Promise<Category[]>)
      .catch(() => []),
    fetch(`${API_BASE}/settings`, { cache: "no-store" })
      .then((res) => res.json() as Promise<MonetizationSettings>)
      .catch(() => null),
  ]);

  // Resource tidak ada -> 404 (bukan redirect diam-diam) — konsisten dengan pola IDOR di backend (ARCHITECTURE.md #7).
  if (!documentRes.ok) notFound();
  const document = (await documentRes.json()) as Document;

  const categoryName = categories.find((cat) => cat.id === document.categoryId)?.name ?? "Tanpa kategori";

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <nav aria-label="Breadcrumb" className="pt-5 text-[13px] text-muted">
        <Link href="/" className="text-muted transition-colors hover:text-fg">
          Jelajah
        </Link>{" "}
        / <span className="text-accent">{categoryName}</span>
      </nav>

      <div className="flex flex-wrap items-start gap-8 pb-16 pt-5">
        <div className="min-w-0 flex-[1_1_620px]">
          {document.status === "ready" ? (
            <SlideshowViewer pages={document.pages ?? []} />
          ) : (
            <div className="flex aspect-4/3 flex-col items-center justify-center gap-3.5 rounded-md border border-line-strong bg-elevated p-8 text-center shadow-(--shadow-card)">
              <div
                aria-hidden
                className="h-14 w-14 animate-spin rounded-full border-3 border-line border-t-warning [animation-duration:1.6s]"
              />
              <p className="text-[16px] font-semibold">Dokumen sedang diproses</p>
              <p className="max-w-85 text-[14px] text-muted">
                Preview akan tersedia setelah proses konversi selesai. Silakan coba lagi beberapa saat
                lagi.
              </p>
            </div>
          )}
        </div>

        <aside className="w-full min-w-0 flex-[0_1_380px] lg:sticky lg:top-24">
          <div className="mb-3.5 flex flex-wrap gap-2">
            <span className="badge-primary">{categoryName}</span>
            <span className="rounded-sm border border-line bg-elevated px-2.5 py-0.5 text-[12px] font-bold uppercase text-muted">
              {document.fileType}
            </span>
            <StatusBadge status={document.status} />
          </div>

          <h1 className="mb-3 font-serif text-[28px] font-semibold leading-[1.3] text-balance">
            {document.title}
          </h1>
          {document.description && (
            <p className="mb-4 text-[15px] leading-relaxed text-muted">{document.description}</p>
          )}
          <div className="mb-4 flex gap-4 border-b border-line pb-4 text-[13px] text-muted">
            <span>{document.viewCount} dilihat</span>
            <span>{document.downloadCount} diunduh</span>
          </div>

          <DownloadButton documentId={document.id} documentTitle={document.title} settings={settings} />

          <div className="mt-6">
            <ReportButton documentId={document.id} />
          </div>
        </aside>
      </div>
    </div>
  );
}
