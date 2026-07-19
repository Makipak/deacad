"use client"; // butuh state modal & event klik.

import { useState } from "react";
import type { MonetizationSettings } from "@deacad/shared-types";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, ApiError } from "@/lib/api-client";
import { loadSnapScript, snapPay } from "@/lib/midtrans";
import { formatRupiah } from "@/lib/format";

const POLL_INTERVAL_MS = 2000;
const POLL_ATTEMPTS = 5;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface DownloadButtonProps {
  documentId: string;
  documentTitle: string;
  // Di-fetch server-side oleh halaman detail (endpoint publik /settings) — untuk label CTA
  // "Bayar untuk Download (Rp xx)" sesuai desain, tanpa fetch dobel di client.
  settings: MonetizationSettings | null;
}

// Alur download asli (ARCHITECTURE.md #5 & #9): coba GET /documents/:id/download langsung — kalau
// DownloadAccessGuard menolak dengan "PAYMENT_REQUIRED", baru munculkan modal bayar Midtrans Snap.
export function DownloadButton({ documentId, documentTitle, settings }: DownloadButtonProps) {
  const { accessToken, status } = useAuth();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paying, setPaying] = useState(false);
  const [waitingConfirmation, setWaitingConfirmation] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paymentEnabled = settings?.downloadPaymentEnabled ?? false;

  function triggerDownload(downloadUrl: string) {
    window.location.href = downloadUrl;
  }

  async function attemptDownload(): Promise<boolean> {
    try {
      const { downloadUrl } = await apiFetch<{ downloadUrl: string }>(`/documents/${documentId}/download`, {
        accessToken,
      });
      triggerDownload(downloadUrl);
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) return false;
      throw err;
    }
  }

  async function handleClick() {
    setError(null);
    if (status === "unauthenticated") {
      setError("Masuk dulu untuk mengunduh dokumen ini.");
      return;
    }
    try {
      const ok = await attemptDownload();
      if (!ok) setShowPaymentModal(true);
    } catch {
      setError("Gagal mengunduh dokumen. Coba lagi.");
    }
  }

  async function handlePay() {
    setError(null);
    setPaying(true);
    try {
      const { token } = await apiFetch<{ transactionId: string; token: string; redirectUrl: string }>(
        "/transactions",
        {
          method: "POST",
          accessToken,
          body: { documentId, type: "download", idempotencyKey: crypto.randomUUID() },
        },
      );
      await loadSnapScript();
      setShowPaymentModal(false);
      snapPay(token, {
        onSuccess: () => void pollAfterPayment(),
        onPending: () => void pollAfterPayment(),
        onError: () => setError("Pembayaran gagal. Coba lagi."),
        onClose: () => setPaying(false),
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memulai pembayaran. Coba lagi.");
      setPaying(false);
    }
  }

  async function pollAfterPayment() {
    setWaitingConfirmation(true);
    for (let i = 0; i < POLL_ATTEMPTS; i++) {
      await sleep(POLL_INTERVAL_MS);
      try {
        const ok = await attemptDownload();
        if (ok) {
          setWaitingConfirmation(false);
          setPaying(false);
          return;
        }
      } catch {
        // abaikan, coba lagi di iterasi berikutnya
      }
    }
    setWaitingConfirmation(false);
    setPaying(false);
    setError("Pembayaran diterima tapi konfirmasi belum masuk. Coba klik unduh lagi sebentar lagi.");
  }

  const label = waitingConfirmation
    ? "Menunggu konfirmasi..."
    : paymentEnabled && settings
      ? `Bayar untuk Download (${formatRupiah(settings.downloadPrice)})`
      : "Unduh Dokumen";

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={paying || waitingConfirmation}
        className="btn-primary btn-lg w-full"
      >
        {(paying || waitingConfirmation) && (
          <span
            aria-hidden
            className="h-4 w-4 animate-spin rounded-full border-2 border-primary-fg/40 border-t-primary-fg"
          />
        )}
        {label}
      </button>
      {paymentEnabled && (
        <p className="mt-2.5 text-center text-[13px] text-muted">
          Anda akan mendapat akses unduh permanen setelah pembayaran berhasil.
        </p>
      )}

      {error && <p className="field-error mt-2.5">{error}</p>}

      {showPaymentModal && settings && (
        <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-[rgba(28,25,23,0.5)] p-4">
          <div className="animate-slide-up w-full max-w-95 rounded-lg bg-elevated p-7 shadow-(--shadow-modal)">
            <h2 className="font-serif text-xl font-semibold">Bayar untuk Download</h2>
            <p className="mt-1.5 text-[14px] text-muted">Midtrans Snap — {documentTitle}</p>
            <div className="my-5 flex items-center justify-between border-y border-line py-3 text-[15px]">
              <span>Total</span>
              <span className="font-bold">{formatRupiah(settings.downloadPrice)}</span>
            </div>
            <button type="button" disabled={paying} onClick={handlePay} className="btn-primary mb-2.5 h-12 w-full rounded-md">
              {paying ? "Memproses..." : "Bayar Sekarang"}
            </button>
            <button
              type="button"
              onClick={() => setShowPaymentModal(false)}
              className="btn-secondary h-11 w-full rounded-md bg-transparent"
            >
              Batal
            </button>
          </div>
        </div>
      )}
    </>
  );
}
