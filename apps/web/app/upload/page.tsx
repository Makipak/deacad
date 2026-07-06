"use client"; // form dengan state lokal — belum kirim ke API sungguhan (demo).

import { useState } from "react";
import { mockCategories } from "@/lib/mock-data";

// Form upload — field & validasi mengikuti uploadDocumentInputSchema di @deacad/shared-types,
// termasuk checkbox pernyataan kepemilikan (lapis pertama moderasi, ARCHITECTURE.md #6).
export default function UploadPage() {
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="rounded-lg border p-6 text-sm" style={{ borderColor: "var(--color-border)" }}>
        Dokumen berhasil diunggah (demo). Di production, dokumen berstatus &quot;processing&quot;
        sampai worker selesai convert jadi gambar per halaman.
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold">Upload Dokumen</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>
        Format yang didukung: PDF dan PPTX.
      </p>

      <form
        className="mt-6 flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(true);
        }}
      >
        <div>
          <label className="block text-sm font-medium">Judul</label>
          <input
            required
            minLength={3}
            type="text"
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--color-border)" }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Deskripsi</label>
          <textarea
            rows={3}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--color-border)" }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Kategori</label>
          <select className="mt-1 w-full rounded-md border px-3 py-2 text-sm" style={{ borderColor: "var(--color-border)" }}>
            {mockCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">File (PDF/PPTX)</label>
          <input
            required
            type="file"
            accept=".pdf,.pptx"
            className="mt-1 w-full text-sm"
          />
        </div>

        <label className="flex items-start gap-2 text-sm">
          <input required type="checkbox" className="mt-0.5" />
          <span>Saya menyatakan dokumen ini milik saya atau saya punya hak untuk mengunggahnya.</span>
        </label>

        <button
          type="submit"
          className="rounded-md px-4 py-2 text-sm text-white"
          style={{ background: "var(--color-primary)" }}
        >
          Upload
        </button>
      </form>
    </div>
  );
}
