// Loader Snap.js Midtrans — dimuat sekali secara lazy (cuma dipanggil pas user benar-benar mau
// bayar), bukan di setiap page load, karena cuma dipakai di upload/download payment flow.

declare global {
  interface Window {
    snap?: {
      pay: (token: string, options: SnapPayOptions) => void;
    };
  }
}

export interface SnapPayOptions {
  onSuccess?: (result: unknown) => void;
  onPending?: (result: unknown) => void;
  onError?: (result: unknown) => void;
  onClose?: () => void;
}

let loadPromise: Promise<void> | null = null;

export function loadSnapScript(): Promise<void> {
  if (window.snap) return Promise.resolve();
  if (loadPromise) return loadPromise;

  const isProduction = process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true";
  const src = isProduction
    ? "https://app.midtrans.com/snap/snap.js"
    : "https://app.sandbox.midtrans.com/snap/snap.js";

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.setAttribute("data-client-key", process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ?? "");
    script.onload = () => resolve();
    script.onerror = () => {
      loadPromise = null;
      reject(new Error("Gagal memuat Snap.js — cek koneksi internet."));
    };
    document.body.appendChild(script);
  });

  return loadPromise;
}

export function snapPay(token: string, options: SnapPayOptions): void {
  if (!window.snap) throw new Error("Snap.js belum dimuat");
  window.snap.pay(token, options);
}
