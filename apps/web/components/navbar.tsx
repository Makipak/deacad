import Link from "next/link";

// Navigasi global sederhana — tanpa state login sungguhan dulu (demo mock, lihat lib/mock-data.ts).
export function Navbar() {
  return (
    <header className="border-b" style={{ borderColor: "var(--color-border)" }}>
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-lg font-semibold">
          Deacad
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="hover:underline">
            Jelajah
          </Link>
          <Link href="/upload" className="hover:underline">
            Upload
          </Link>
          <Link href="/admin" className="hover:underline">
            Admin
          </Link>
          <Link
            href="/login"
            className="rounded-md px-3 py-1.5 text-white"
            style={{ background: "var(--color-primary)" }}
          >
            Masuk
          </Link>
        </nav>
      </div>
    </header>
  );
}
