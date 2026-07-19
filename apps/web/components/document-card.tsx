import Link from "next/link";
import Image from "next/image";
import type { Document } from "@deacad/shared-types";
import { StatusBadge } from "@/components/status-badge";

// Kartu dokumen bergaya "sampul buku/jurnal" (desain Landing Browse): area cover bergaris
// diagonal + monogram serif, badge tipe file & status, judul serif 2 baris, footer metadata.
export function DocumentCard({ document, categoryName }: { document: Document; categoryName: string }) {
  return (
    <Link
      href={`/documents/${document.id}`}
      className="card group flex flex-col overflow-hidden transition-[box-shadow,transform] duration-200 hover:scale-[1.015] hover:shadow-(--shadow-hover)"
    >
      <div className="doc-cover relative flex h-[150px] items-center justify-center border-b border-line">
        {document.thumbnailUrl ? (
          // Sampul asli: thumbnail halaman 1 dari worker (API fallback ke halaman full-res untuk
          // dokumen lama). object-top supaya bagian judul dokumen yang terlihat, seperti sampul.
          <Image
            src={document.thumbnailUrl}
            alt=""
            width={320}
            height={320}
            unoptimized // gambar dinamis dari storage, hindari optimasi Next Image di server.
            className="h-full w-full object-cover object-top"
          />
        ) : (
          // Fallback monogram untuk dokumen yang belum punya halaman (masih processing/gagal).
          <span
            aria-hidden
            className="flex h-16 w-12 items-center justify-center rounded-[3px] border border-line bg-elevated font-serif text-2xl font-semibold text-muted shadow-card"
          >
            {document.title[0]?.toUpperCase() ?? "D"}
          </span>
        )}
        <span className="absolute left-2.5 top-2.5 rounded-sm border border-line bg-elevated px-2 py-0.5 text-[11px] font-bold uppercase text-muted">
          {document.fileType}
        </span>
        <span className="absolute right-2.5 top-2.5">
          <StatusBadge status={document.status} />
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <span className="text-[12px] font-semibold text-accent">{categoryName}</span>
        <h3 className="line-clamp-2 font-serif text-[17px] font-semibold leading-[1.35] transition-colors group-hover:text-primary">
          {document.title}
        </h3>
        {document.description && (
          <p className="line-clamp-2 text-[14px] leading-normal text-muted">{document.description}</p>
        )}
        <div className="mt-auto flex gap-3.5 border-t border-line pt-2.5 text-[13px] text-muted">
          <span>{document.viewCount} dilihat</span>
          <span>{document.downloadCount} unduh</span>
        </div>
      </div>
    </Link>
  );
}
