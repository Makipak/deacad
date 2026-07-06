"use client";

import { useState } from "react";

// Tombol "Laporkan" — lapis kedua moderasi konten (ARCHITECTURE.md #6), masuk ke tabel reports.
export function ReportButton({ documentId }: { documentId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <p className="text-sm" style={{ color: "var(--color-muted)" }}>
        Terima kasih, laporan sudah dikirim ke admin.
      </p>
    );
  }

  return (
    <div>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="text-sm underline">
          Laporkan dokumen ini
        </button>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            // Demo — di production ini POST ke /reports dengan { documentId, reason }.
            console.log("submit report", { documentId, reason });
            setSubmitted(true);
          }}
          className="mt-2 flex flex-col gap-2"
        >
          <textarea
            required
            minLength={10}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Jelaskan alasan laporan (minimal 10 karakter)..."
            className="rounded-md border p-2 text-sm"
            style={{ borderColor: "var(--color-border)" }}
            rows={3}
          />
          <div className="flex gap-2">
            <button type="submit" className="rounded-md px-3 py-1.5 text-sm text-white" style={{ background: "var(--color-primary)" }}>
              Kirim laporan
            </button>
            <button type="button" onClick={() => setOpen(false)} className="rounded-md border px-3 py-1.5 text-sm" style={{ borderColor: "var(--color-border)" }}>
              Batal
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
