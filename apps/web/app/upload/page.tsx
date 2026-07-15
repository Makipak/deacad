"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Category, Document } from "@deacad/shared-types";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, ApiError } from "@/lib/api-client";

// Form upload — field & validasi mengikuti uploadDocumentInputSchema di @deacad/shared-types,
// termasuk checkbox pernyataan kepemilikan (lapis pertama moderasi, ARCHITECTURE.md #6).
export default function UploadPage() {
  const { user, status, accessToken } = useAuth();
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [ownershipConfirmed, setOwnershipConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploaded, setUploaded] = useState<Document | null>(null);

  useEffect(() => {
    apiFetch<Category[]>("/categories")
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  if (status !== "authenticated") return null;

  if (uploaded) {
    return (
      <div className="rounded-lg border p-6 text-sm" style={{ borderColor: "var(--color-border)" }}>
        Dokumen &quot;{uploaded.title}&quot; berhasil diunggah, status saat ini{" "}
        <strong>{uploaded.status}</strong>. Dokumen baru muncul di halaman utama setelah worker
        selesai convert jadi gambar per halaman (butuh apps/worker jalan).
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
        onSubmit={async (e) => {
          e.preventDefault();
          if (!file) return;
          setError(null);
          setSubmitting(true);
          try {
            const formData = new FormData();
            formData.append("title", title);
            if (description) formData.append("description", description);
            if (categoryId) formData.append("categoryId", categoryId);
            formData.append("ownershipConfirmed", "true");
            formData.append("file", file);

            const doc = await apiFetch<Document>("/documents", {
              method: "POST",
              body: formData,
              accessToken,
            });
            setUploaded(doc);
          } catch (err) {
            setError(err instanceof ApiError ? err.message : "Gagal mengunggah dokumen. Coba lagi.");
          } finally {
            setSubmitting(false);
          }
        }}
      >
        {error && (
          <p className="rounded-md border px-3 py-2 text-sm" style={{ borderColor: "#f87171", color: "#dc2626" }}>
            {error}
          </p>
        )}

        <div>
          <label className="block text-sm font-medium">Judul</label>
          <input
            required
            minLength={3}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--color-border)" }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Deskripsi</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--color-border)" }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Kategori</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--color-border)" }}
          >
            <option value="">Tanpa kategori</option>
            {categories.map((cat) => (
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
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mt-1 w-full text-sm"
          />
        </div>

        <label className="flex items-start gap-2 text-sm">
          <input
            required
            type="checkbox"
            checked={ownershipConfirmed}
            onChange={(e) => setOwnershipConfirmed(e.target.checked)}
            className="mt-0.5"
          />
          <span>Saya menyatakan dokumen ini milik saya atau saya punya hak untuk mengunggahnya.</span>
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="rounded-md px-4 py-2 text-sm text-white disabled:opacity-60"
          style={{ background: "var(--color-primary)" }}
        >
          {submitting ? "Mengunggah..." : "Upload"}
        </button>
      </form>
    </div>
  );
}
