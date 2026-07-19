"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, ApiError } from "@/lib/api-client";
import { ConfirmModal } from "@/components/confirm-modal";

// Baris hasil GET /reports/pending — join manual di reports.service.ts#listPending, belum ada
// schema shared-types khusus untuk shape gabungan ini.
interface PendingReport {
  id: string;
  documentId: string;
  reason: string;
  createdAt: string;
  document: { id: string; title: string } | null;
  reporter: { name: string; email: string } | null;
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

// Antrian moderasi laporan — status pending, urut terlama dulu (ARCHITECTURE.md #12).
// Desain "Admin Reports": row expandable (detail alasan), aksi Unpublish (dengan modal
// konfirmasi) dan Tolak per row.
export default function AdminReportsPage() {
  const { accessToken, status } = useAuth();
  const [reports, setReports] = useState<PendingReport[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmReport, setConfirmReport] = useState<PendingReport | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    apiFetch<PendingReport[]>("/reports/pending", { accessToken })
      .then(setReports)
      .catch(() => setError("Gagal memuat antrian laporan."));
  }, [status, accessToken]);

  if (status !== "authenticated") return null;

  async function handleUnpublish(report: PendingReport) {
    setError(null);
    setBusyId(report.id);
    try {
      await apiFetch(`/documents/${report.documentId}/unpublish`, { method: "POST", accessToken });
      await apiFetch(`/reports/${report.id}/resolve`, { method: "PATCH", accessToken });
      setReports((prev) => (prev ? prev.filter((r) => r.id !== report.id) : prev));
      setConfirmReport(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memproses laporan.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDismiss(report: PendingReport) {
    setError(null);
    setBusyId(report.id);
    try {
      await apiFetch(`/reports/${report.id}/dismiss`, { method: "PATCH", accessToken });
      setReports((prev) => (prev ? prev.filter((r) => r.id !== report.id) : prev));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menolak laporan.");
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

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-2xl">
            <div className="grid grid-cols-[2fr_1fr_1.4fr_0.7fr_1.6fr] gap-2 bg-surface px-4.5 py-2.5 text-[12px] font-semibold text-muted">
              <span>Dokumen</span>
              <span>Pelapor</span>
              <span>Alasan</span>
              <span>Tanggal</span>
              <span>Aksi</span>
            </div>

            {reports === null &&
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="border-t border-line px-4.5 py-3">
                  <div className="skeleton h-5 w-full" />
                </div>
              ))}

            {reports?.map((report) => (
              <div key={report.id} className="border-t border-line transition-colors hover:bg-surface">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setExpandedId((id) => (id === report.id ? null : report.id))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setExpandedId((id) => (id === report.id ? null : report.id));
                    }
                  }}
                  aria-expanded={expandedId === report.id}
                  className="grid cursor-pointer grid-cols-[2fr_1fr_1.4fr_0.7fr_1.6fr] items-center gap-2 px-4.5 py-3 text-[13px]"
                >
                  <span className="truncate pr-3">
                    {report.document?.title ?? "(dokumen tidak ditemukan)"}
                  </span>
                  <span className="truncate text-muted">{report.reporter?.name ?? "-"}</span>
                  <span className="truncate text-muted">{report.reason}</span>
                  <span className="text-muted">{shortDate(report.createdAt)}</span>
                  <span className="flex gap-2">
                    <button
                      type="button"
                      disabled={busyId === report.id || !report.document}
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmReport(report);
                      }}
                      className="btn-danger btn-sm text-[12px]"
                    >
                      Unpublish
                    </button>
                    <button
                      type="button"
                      disabled={busyId === report.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDismiss(report);
                      }}
                      className="btn-secondary btn-sm bg-transparent text-[12px]"
                    >
                      Tolak
                    </button>
                  </span>
                </div>
                {expandedId === report.id && (
                  <div className="animate-fade-in px-4.5 pb-4 text-[13px] leading-relaxed text-muted">
                    <p className="m-0">{report.reason}</p>
                    {report.reporter && (
                      <p className="m-0 mt-1.5">
                        Dilaporkan oleh {report.reporter.name} ({report.reporter.email})
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}

            {reports !== null && reports.length === 0 && (
              <p className="border-t border-line px-4.5 py-10 text-center text-[14px] text-muted">
                Tidak ada laporan pending. Antrian moderasi bersih 🎉
              </p>
            )}
          </div>
        </div>
      </div>

      {confirmReport && (
        <ConfirmModal
          title="Unpublish Dokumen?"
          message={
            <>
              Dokumen &quot;{confirmReport.document?.title}&quot; akan disembunyikan dari publik dan
              laporan ditandai selesai. Tindakan ini dapat ditinjau kembali dari halaman Manajemen
              Dokumen.
            </>
          }
          confirmLabel="Ya, Unpublish"
          danger
          busy={busyId === confirmReport.id}
          onConfirm={() => void handleUnpublish(confirmReport)}
          onCancel={() => setConfirmReport(null)}
        />
      )}
    </div>
  );
}
