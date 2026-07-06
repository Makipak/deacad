"use client"; // butuh state (halaman aktif) & event klik — tidak bisa jadi Server Component.

import { useState } from "react";
import Image from "next/image";
import type { DocumentPage } from "@deacad/shared-types";

// Render dokumen sebagai slideshow gambar per halaman — BUKAN embed PDF/PPTX native
// (keputusan produk ARCHITECTURE.md #1, mirip pola SlideShare).
export function SlideshowViewer({ pages }: { pages: DocumentPage[] }) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (pages.length === 0) {
    return (
      <div
        className="flex h-80 items-center justify-center rounded-lg border text-sm"
        style={{ borderColor: "var(--color-border)", color: "var(--color-muted)" }}
      >
        Dokumen masih diproses, preview belum tersedia.
      </div>
    );
  }

  const activePage = pages[activeIndex]!;

  return (
    <div>
      <div className="relative overflow-hidden rounded-lg border" style={{ borderColor: "var(--color-border)" }}>
        <Image
          src={activePage.imageUrl}
          alt={`Halaman ${activePage.pageNumber}`}
          width={600}
          height={800}
          className="h-auto w-full"
          unoptimized // sumber gambar dinamis dari storage, hindari optimasi Next Image di server.
        />
      </div>

      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
          disabled={activeIndex === 0}
          className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-40"
          style={{ borderColor: "var(--color-border)" }}
        >
          Sebelumnya
        </button>
        <span className="text-sm" style={{ color: "var(--color-muted)" }}>
          Halaman {activePage.pageNumber} dari {pages.length}
        </span>
        <button
          type="button"
          onClick={() => setActiveIndex((i) => Math.min(pages.length - 1, i + 1))}
          disabled={activeIndex === pages.length - 1}
          className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-40"
          style={{ borderColor: "var(--color-border)" }}
        >
          Berikutnya
        </button>
      </div>
    </div>
  );
}
