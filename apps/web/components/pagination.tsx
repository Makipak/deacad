import Link from "next/link";

interface PaginationProps {
  page: number;
  totalPages: number;
  // Fungsi pembuat href per halaman — mempertahankan q/category/sort yang sedang aktif.
  hrefFor: (page: number) => string;
}

// Daftar nomor halaman dengan elipsis: selalu tampil halaman 1, terakhir, dan aktif ±1.
// Contoh (aktif 5 dari 9): 1 … 4 5 6 … 9
function pageItems(page: number, totalPages: number): Array<number | "gap"> {
  const wanted = new Set([1, totalPages, page - 1, page, page + 1]);
  const pages = [...wanted].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const items: Array<number | "gap"> = [];
  pages.forEach((p, i) => {
    if (i > 0 && p - pages[i - 1]! > 1) items.push("gap");
    items.push(p);
  });
  return items;
}

// Server Component — cuma <Link>, tanpa state. Tidak dirender kalau hanya ada satu halaman.
export function Pagination({ page, totalPages, hrefFor }: PaginationProps) {
  if (totalPages <= 1) return null;

  const base =
    "flex h-10 min-w-10 items-center justify-center rounded-sm border px-3 text-[14px] font-medium transition-colors";
  const idle = "border-line text-fg hover:bg-surface";
  const disabled = "pointer-events-none border-line text-muted opacity-50";

  return (
    <nav aria-label="Navigasi halaman" className="mt-10 flex flex-wrap items-center justify-center gap-1.5">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} rel="prev" className={`${base} ${idle}`}>
          ‹ Sebelumnya
        </Link>
      ) : (
        <span aria-disabled className={`${base} ${disabled}`}>
          ‹ Sebelumnya
        </span>
      )}

      {pageItems(page, totalPages).map((item, i) =>
        item === "gap" ? (
          <span key={`gap-${i}`} aria-hidden className="px-1 text-muted">
            …
          </span>
        ) : (
          <Link
            key={item}
            href={hrefFor(item)}
            aria-current={item === page ? "page" : undefined}
            aria-label={`Halaman ${item}`}
            className={`${base} ${item === page ? "border-primary bg-primary text-primary-fg" : idle}`}
          >
            {item}
          </Link>
        ),
      )}

      {page < totalPages ? (
        <Link href={hrefFor(page + 1)} rel="next" className={`${base} ${idle}`}>
          Berikutnya ›
        </Link>
      ) : (
        <span aria-disabled className={`${base} ${disabled}`}>
          Berikutnya ›
        </span>
      )}
    </nav>
  );
}
