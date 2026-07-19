"use client";

import { useEffect, useMemo, useState } from "react";
import type { Document, DocumentStatus } from "@deacad/shared-types";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, ApiError } from "@/lib/api-client";
import { ConfirmModal } from "@/components/confirm-modal";

// Baris hasil GET /documents/admin/all — join manual di documents.service.ts#listForAdmin.
type AdminDocumentRow = Document & { user: { name: string; email: string } };

// Di admin, status "rejected" ditampilkan sebagai "Unpublished" (desain Admin Documents) —
// istilah dari sudut pandang moderator, bukan pengunggah.
const STATUS_META: Record<DocumentStatus, { label: string; className: string }> = {
  ready: { label: "Siap", className: "badge-success" },
  processing: { label: "Diproses", className: "badge-warning" },
  failed: { label: "Gagal", className: "badge-danger" },
  rejected: { label: "Unpublished", className: "badge-neutral" },
};

// Manajemen dokumen admin — browse semua status, filter + search di atas tabel, force-unpublish
// per row dengan modal konfirmasi; row yang sudah unpublished ditandai redup (PRD §7.7).
export default function AdminDocumentsPage() {
  const { accessToken, status } = useAuth();
  const [documents, setDocuments] = useState<AdminDocumentRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"semua" | DocumentStatus>("semua");
  const [confirmDoc, setConfirmDoc] = useState<AdminDocumentRow | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    apiFetch<AdminDocumentRow[]>("/documents/admin/all", { accessToken })
      .then(setDocuments)
      .catch(() => setError("Gagal memuat daftar dokumen."));
  }, [status, accessToken]);

  const filtered = useMemo(() => {
    if (!documents) return null;
    let rows = documents;
    if (statusFilter !== "semua") rows = rows.filter((d) => d.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((d) => d.title.toLowerCase().includes(q));
    }
    return rows;
  }, [documents, statusFilter, search]);

  if (status !== "authenticated") return null;

  async function handleUnpublish(doc: AdminDocumentRow) {
    setError(null);
    setBusyId(doc.id);
    try {
      await apiFetch(`/documents/${doc.id}/unpublish`, { method: "POST", accessToken });
      setDocuments((prev) =>
        prev ? prev.map((d) => (d.id === doc.id ? { ...d, status: "rejected" } : d)) : prev,
      );
      setConfirmDoc(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal unpublish dokumen.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      {error && (
        <p className="mb-5 rounded-sm border border-danger bg-danger-subtle px-3 py-2 text-[14px] text-danger">
          {error}
        </p>
      )}

      <div className="mb-4.5 flex flex-wrap gap-2.5">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari judul dokumen..."
          aria-label="Cari judul dokumen"
          className="input max-w-80 flex-1 text-[14px]"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          aria-label="Filter status"
          className="input w-auto text-[14px]"
        >
          <option value="semua">Semua Status</option>
          <option value="ready">Siap</option>
          <option value="processing">Diproses</option>
          <option value="failed">Gagal</option>
          <option value="rejected">Unpublished</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-2xl">
            <div className="grid grid-cols-[2.2fr_1fr_1fr_1fr_1fr] gap-2 bg-surface px-4.5 py-2.5 text-[12px] font-semibold text-muted">
              <span>Judul</span>
              <span>Tipe</span>
              <span>Uploader</span>
              <span>Status</span>
              <span>Aksi</span>
            </div>

            {filtered === null &&
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="border-t border-line px-4.5 py-3">
                  <div className="skeleton h-5 w-full" />
                </div>
              ))}

            {filtered?.map((doc) => {
              const meta = STATUS_META[doc.status];
              const unpublished = doc.status === "rejected";
              return (
                <div
                  key={doc.id}
                  className={`grid grid-cols-[2.2fr_1fr_1fr_1fr_1fr] items-center gap-2 border-t border-line px-4.5 py-3 text-[13px] transition-colors hover:bg-surface ${
                    unpublished ? "opacity-55" : ""
                  }`}
                >
                  <span className="truncate pr-3">{doc.title}</span>
                  <span className="uppercase text-muted">{doc.fileType}</span>
                  <span className="truncate text-muted">{doc.user.name}</span>
                  <span>
                    <span className={meta.className}>{meta.label}</span>
                  </span>
                  <button
                    type="button"
                    disabled={busyId === doc.id || unpublished}
                    onClick={() => setConfirmDoc(doc)}
                    className="btn-secondary btn-sm w-fit bg-transparent text-[12px] text-danger disabled:text-muted"
                  >
                    {unpublished ? "Unpublished" : "Unpublish"}
                  </button>
                </div>
              );
            })}

            {filtered !== null && filtered.length === 0 && (
              <p className="border-t border-line px-4.5 py-10 text-center text-[14px] text-muted">
                Tidak ada dokumen yang cocok dengan filter.
              </p>
            )}
          </div>
        </div>
      </div>

      {confirmDoc && (
        <ConfirmModal
          title="Force-Unpublish Dokumen?"
          message={<>Dokumen &quot;{confirmDoc.title}&quot; akan disembunyikan dari halaman publik segera.</>}
          confirmLabel="Ya, Unpublish"
          danger
          busy={busyId === confirmDoc.id}
          onConfirm={() => void handleUnpublish(confirmDoc)}
          onCancel={() => setConfirmDoc(null)}
        />
      )}
    </div>
  );
}
