"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, ApiError } from "@/lib/api-client";

// Tombol "Laporkan" — lapis kedua moderasi konten (ARCHITECTURE.md #6), masuk ke tabel reports.
// Sengaja subtle (teks kecil bergaris bawah, PRD §7.2) supaya tidak bersaing dengan CTA download.
export function ReportButton({ documentId }: { documentId: string }) {
  const { accessToken, status } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (status === "unauthenticated") {
    return (
      <Link href="/login" className="text-[13px] text-muted underline transition-colors hover:text-fg">
        Masuk untuk melaporkan dokumen ini
      </Link>
    );
  }

  if (submitted) {
    return <p className="text-[13px] text-success">Terima kasih, laporan sudah dikirim ke admin.</p>;
  }

  return (
    <div>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="cursor-pointer py-1.5 text-[13px] text-muted underline transition-colors hover:text-fg"
        >
          Laporkan dokumen ini
        </button>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            setSubmitting(true);
            try {
              await apiFetch("/reports", {
                method: "POST",
                accessToken,
                body: { documentId, reason },
              });
              setSubmitted(true);
            } catch (err) {
              setError(err instanceof ApiError ? err.message : "Gagal mengirim laporan. Coba lagi.");
            } finally {
              setSubmitting(false);
            }
          }}
          className="animate-slide-up mt-2 flex flex-col gap-2.5"
        >
          {error && <p className="field-error">{error}</p>}
          <label className="field-label" htmlFor="report-reason">
            Alasan laporan
          </label>
          <textarea
            id="report-reason"
            required
            minLength={10}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Jelaskan alasan laporan (minimal 10 karakter)..."
            className="input-textarea"
            rows={3}
          />
          <div className="flex gap-2">
            <button type="submit" disabled={submitting} className="btn-primary btn-sm">
              {submitting ? "Mengirim..." : "Kirim Laporan"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary btn-sm">
              Batal
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
