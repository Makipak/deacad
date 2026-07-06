"use client"; // butuh state modal & event klik.

import { useState } from "react";
import { formatRupiah, mockSettings } from "@/lib/mock-data";

// Simulasi alur download (ARCHITECTURE.md #5): kalau downloadPaymentEnabled true dan user
// belum punya akses, munculkan modal bayar dulu. Di sini murni UI demo — belum panggil Midtrans asli.
export function DownloadButton({ documentTitle }: { documentTitle: string }) {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [status, setStatus] = useState<"idle" | "paid">("idle");

  function handleClick() {
    if (mockSettings.downloadPaymentEnabled && status !== "paid") {
      setShowPaymentModal(true);
      return;
    }
    // eslint-disable-next-line no-alert
    alert(`Mengunduh "${documentTitle}" (demo — belum ada file sungguhan).`);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="rounded-md px-4 py-2 text-sm text-white"
        style={{ background: "var(--color-primary)" }}
      >
        Unduh dokumen
      </button>

      {showPaymentModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-5" style={{ color: "var(--color-fg)" }}>
            <h2 className="font-medium">Pembayaran diperlukan</h2>
            <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
              Download dokumen ini berbayar {formatRupiah(mockSettings.downloadPrice)}. Di production,
              tombol ini membuka Snap Midtrans (ARCHITECTURE.md #5 & #9).
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="rounded-md border px-3 py-1.5 text-sm"
                style={{ borderColor: "var(--color-border)" }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatus("paid");
                  setShowPaymentModal(false);
                }}
                className="rounded-md px-3 py-1.5 text-sm text-white"
                style={{ background: "var(--color-primary)" }}
              >
                Simulasikan bayar sukses
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
