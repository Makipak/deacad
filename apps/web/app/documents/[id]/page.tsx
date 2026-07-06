import { notFound } from "next/navigation";
import { SlideshowViewer } from "@/components/slideshow-viewer";
import { DownloadButton } from "@/components/download-button";
import { ReportButton } from "@/components/report-button";
import { findCategoryName, findDocumentById } from "@/lib/mock-data";

// Next.js 16: params juga wajib async, sama seperti searchParams.
type Params = Promise<{ id: string }>;

export default async function DocumentDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const document = findDocumentById(id);

  // Resource tidak ada -> 404 (bukan redirect diam-diam) — konsisten dengan pola IDOR di backend (ARCHITECTURE.md #7).
  if (!document) notFound();

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-[2fr_1fr]">
      <div>
        <SlideshowViewer pages={document.pages ?? []} />
      </div>

      <div>
        <span className="text-xs uppercase" style={{ color: "var(--color-muted)" }}>
          {findCategoryName(document.categoryId)} · {document.fileType}
        </span>
        <h1 className="mt-1 text-xl font-semibold">{document.title}</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
          {document.description}
        </p>
        <p className="mt-3 text-xs" style={{ color: "var(--color-muted)" }}>
          {document.viewCount} dilihat · {document.downloadCount} diunduh
        </p>

        <div className="mt-5">
          <DownloadButton documentTitle={document.title} />
        </div>

        <div className="mt-6 border-t pt-4" style={{ borderColor: "var(--color-border)" }}>
          <ReportButton documentId={document.id} />
        </div>
      </div>
    </div>
  );
}
