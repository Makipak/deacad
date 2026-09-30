import type { ReactNode } from "react";

interface InfoPageProps {
  title: string;
  intro?: string;
  children: ReactNode;
}

// Kerangka halaman informasi statis (Tentang, Laporkan Penyalahgunaan, Ketentuan & Privasi):
// judul serif + kolom baca sempit supaya nyaman dibaca di semua ukuran layar.
export function InfoPage({ title, intro, children }: InfoPageProps) {
  return (
    <article className="mx-auto max-w-180 px-6 pb-10 pt-12">
      <h1 className="mb-3 font-serif text-3xl font-bold sm:text-4xl">{title}</h1>
      {intro && <p className="mb-8 text-[17px] leading-relaxed text-muted">{intro}</p>}
      <div className="space-y-8 text-[15px] leading-relaxed">{children}</div>
    </article>
  );
}

export function InfoSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2.5 font-serif text-xl font-semibold">{heading}</h2>
      <div className="space-y-3 text-fg/90">{children}</div>
    </section>
  );
}
