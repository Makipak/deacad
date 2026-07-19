"use client"; // butuh state (halaman aktif) & event klik — tidak bisa jadi Server Component.

import { useRef, useState } from "react";
import Image from "next/image";
import type { DocumentPage } from "@deacad/shared-types";

const SWIPE_THRESHOLD_PX = 40;

// Render dokumen sebagai slideshow gambar per halaman — BUKAN embed PDF/PPTX native
// (keputusan produk ARCHITECTURE.md #1, mirip pola SlideShare). Desain "Detail Dokumen":
// frame elegan, watermark overlay, kontrol besar, fullscreen, panah keyboard + swipe mobile.
export function SlideshowViewer({ pages }: { pages: DocumentPage[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);

  if (pages.length === 0) {
    return (
      <div className="card flex aspect-4/3 items-center justify-center text-[14px] text-muted">
        Preview belum tersedia untuk dokumen ini.
      </div>
    );
  }

  const activePage = pages[activeIndex]!;
  const prev = () => setActiveIndex((i) => Math.max(0, i - 1));
  const next = () => setActiveIndex((i) => Math.min(pages.length - 1, i + 1));

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void containerRef.current?.requestFullscreen();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowLeft") prev();
    if (e.key === "ArrowRight") next();
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0]!.clientX - touchStartX.current;
    if (delta > SWIPE_THRESHOLD_PX) prev();
    if (delta < -SWIPE_THRESHOLD_PX) next();
    touchStartX.current = null;
  }

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      role="group"
      aria-label={`Preview dokumen, halaman ${activePage.pageNumber} dari ${pages.length}`}
      onKeyDown={handleKeyDown}
      className="overflow-hidden rounded-md border border-line-strong bg-elevated shadow-(--shadow-card)"
    >
      <div
        className="relative"
        onTouchStart={(e) => (touchStartX.current = e.touches[0]!.clientX)}
        onTouchEnd={handleTouchEnd}
      >
        <Image
          key={activePage.id}
          src={activePage.imageUrl}
          alt={`Halaman ${activePage.pageNumber}`}
          width={800}
          height={600}
          className="animate-fade-in h-auto w-full"
          unoptimized // sumber gambar dinamis dari storage, hindari optimasi Next Image di server.
        />
        {/* Watermark CSS hanya kalau gambar halaman belum di-watermark worker — hindari dobel. */}
        {!activePage.isWatermarked && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 flex rotate-[-24deg] items-center justify-center whitespace-nowrap text-[28px] font-bold tracking-widest opacity-10"
          >
            DEACAD PREVIEW
          </div>
        )}
        <button
          type="button"
          onClick={toggleFullscreen}
          className="absolute right-3 top-3 h-8.5 cursor-pointer rounded-sm border border-line bg-elevated px-3 text-[13px] text-fg"
        >
          ⛶ Layar Penuh
        </button>
      </div>

      <div className="flex items-center justify-center gap-5 border-t border-line bg-elevated p-3.5">
        <button
          type="button"
          onClick={prev}
          disabled={activeIndex === 0}
          aria-label="Halaman sebelumnya"
          className="h-10 w-10 cursor-pointer rounded-lg border border-line bg-elevated text-[16px] text-fg transition-colors hover:border-line-strong disabled:cursor-not-allowed disabled:opacity-40"
        >
          ←
        </button>
        <span className="min-w-28 text-center text-[14px] text-muted">
          Halaman {activePage.pageNumber} / {pages.length}
        </span>
        <button
          type="button"
          onClick={next}
          disabled={activeIndex === pages.length - 1}
          aria-label="Halaman berikutnya"
          className="h-10 w-10 cursor-pointer rounded-lg border border-line bg-elevated text-[16px] text-fg transition-colors hover:border-line-strong disabled:cursor-not-allowed disabled:opacity-40"
        >
          →
        </button>
      </div>
    </div>
  );
}
