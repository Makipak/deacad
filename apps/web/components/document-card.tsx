import Link from "next/link";
import type { Document } from "@deacad/shared-types";
import { findCategoryName } from "@/lib/mock-data";

const STATUS_LABEL: Record<Document["status"], string> = {
  processing: "Sedang diproses",
  ready: "Siap dibaca",
  failed: "Gagal diproses",
  rejected: "Ditolak",
};

// Satu kartu ringkas dokumen di halaman browse — link ke halaman detail (app/documents/[id]).
export function DocumentCard({ document }: { document: Document }) {
  return (
    <Link
      href={`/documents/${document.id}`}
      className="block rounded-lg border p-4 transition hover:shadow-sm"
      style={{ borderColor: "var(--color-border)" }}
    >
      <div className="flex items-center justify-between text-xs" style={{ color: "var(--color-muted)" }}>
        <span>{findCategoryName(document.categoryId)}</span>
        <span className="uppercase">{document.fileType}</span>
      </div>
      <h3 className="mt-2 line-clamp-2 font-medium">{document.title}</h3>
      <p className="mt-1 line-clamp-2 text-sm" style={{ color: "var(--color-muted)" }}>
        {document.description}
      </p>
      <div className="mt-3 flex items-center justify-between text-xs" style={{ color: "var(--color-muted)" }}>
        <span>{document.viewCount} dilihat · {document.downloadCount} diunduh</span>
        <span>{STATUS_LABEL[document.status]}</span>
      </div>
    </Link>
  );
}
