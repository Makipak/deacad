"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Category, Document, MonetizationSettings } from "@deacad/shared-types";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, ApiError } from "@/lib/api-client";
import { loadSnapScript, snapPay } from "@/lib/midtrans";
import { formatRupiah } from "@/lib/format";

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL}/api/v1`;
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

// Upload pakai XMLHttpRequest, bukan fetch — fetch tidak mengekspos progress upload, sedangkan
// desain & PRD §7.4 mewajibkan progress bar untuk file besar (bukan spinner tanpa indikasi).
function uploadWithProgress(
  formData: FormData,
  accessToken: string | null,
  onProgress: (pct: number) => void,
): Promise<Document> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/documents`);
    xhr.withCredentials = true;
    if (accessToken) xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText) as Document);
      } else {
        let message = `Permintaan gagal (${xhr.status})`;
        try {
          const payload = JSON.parse(xhr.responseText) as { message?: string | string[] };
          if (typeof payload.message === "string") message = payload.message;
          else if (Array.isArray(payload.message)) message = payload.message.join(", ");
        } catch {
          // response bukan JSON — pakai pesan fallback.
        }
        reject(new ApiError(xhr.status, message));
      }
    };
    xhr.onerror = () => reject(new ApiError(0, "Gagal terhubung ke server."));
    xhr.send(formData);
  });
}

// Form upload — field & validasi mengikuti uploadDocumentInputSchema di @deacad/shared-types,
// termasuk checkbox pernyataan kepemilikan (lapis pertama moderasi, ARCHITECTURE.md #6).
// Desain "Upload": drag-and-drop zone eksplisit, progress bar, state sukses gratis vs berbayar.
export default function UploadPage() {
  const { status, accessToken } = useAuth();
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [ownershipConfirmed, setOwnershipConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploaded, setUploaded] = useState<Document | null>(null);
  const [settings, setSettings] = useState<MonetizationSettings | null>(null);
  const [paying, setPaying] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiFetch<Category[]>("/categories")
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    apiFetch<MonetizationSettings>("/settings")
      .then(setSettings)
      .catch(() => setSettings(null));
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  if (status !== "authenticated") return null;

  function acceptFile(candidate: File | undefined) {
    if (!candidate) return;
    setDragActive(false);
    if (!/\.(pdf|pptx)$/i.test(candidate.name)) {
      setFile(null);
      setFileError("Format tidak didukung. Gunakan file PDF atau PPTX.");
      return;
    }
    if (candidate.size > MAX_FILE_SIZE_BYTES) {
      setFile(null);
      setFileError("Ukuran file melebihi 50MB.");
      return;
    }
    setFileError(null);
    setFile(candidate);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) return;
    setError(null);
    setSubmitting(true);
    setProgress(0);
    try {
      const formData = new FormData();
      formData.append("title", title);
      if (description) formData.append("description", description);
      if (categoryId) formData.append("categoryId", categoryId);
      formData.append("ownershipConfirmed", "true");
      formData.append("file", file);
      const doc = await uploadWithProgress(formData, accessToken, setProgress);
      setUploaded(doc);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal mengunggah dokumen. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePay() {
    if (!uploaded) return;
    setPaymentError(null);
    setPaying(true);
    try {
      const { token } = await apiFetch<{ transactionId: string; token: string; redirectUrl: string }>(
        "/transactions",
        {
          method: "POST",
          accessToken,
          body: { documentId: uploaded.id, type: "upload", idempotencyKey: crypto.randomUUID() },
        },
      );
      await loadSnapScript();
      snapPay(token, {
        onSuccess: () => {
          setPaymentDone(true);
          setPaying(false);
        },
        onPending: () => {
          setPaymentDone(true);
          setPaying(false);
        },
        onError: () => {
          setPaymentError("Pembayaran gagal. Coba lagi.");
          setPaying(false);
        },
        onClose: () => setPaying(false),
      });
    } catch (err) {
      setPaymentError(err instanceof ApiError ? err.message : "Gagal memulai pembayaran. Coba lagi.");
      setPaying(false);
    }
  }

  // --- State setelah submit (PRD §7.4): gratis → sukses; berbayar → langkah pembayaran. ---
  if (uploaded) {
    const needsPayment = settings?.uploadPaymentEnabled && !paymentDone;

    if (needsPayment) {
      return (
        <div className="animate-slide-up mx-auto max-w-160 px-6 pb-20 pt-12 text-center">
          <h1 className="mb-2.5 font-serif text-2xl font-semibold">Satu Langkah Lagi</h1>
          <p className="mb-6 text-[15px] leading-relaxed text-muted">
            Unggah dokumen berbayar dikenakan biaya proses{" "}
            <strong className="text-fg">{formatRupiah(settings!.uploadPrice)}</strong>. Selesaikan
            pembayaran agar dokumen &quot;{uploaded.title}&quot; dapat diproses.
          </p>
          {paymentError && <p className="field-error mb-4">{paymentError}</p>}
          <button type="button" disabled={paying} onClick={handlePay} className="btn-primary btn-lg mb-3.5 w-full">
            {paying ? "Memproses..." : "Bayar Sekarang"}
          </button>
          <Link href="/profile" className="text-[14px] text-muted underline transition-colors hover:text-fg">
            Lanjutkan nanti dari halaman Profil
          </Link>
        </div>
      );
    }

    return (
      <div className="animate-slide-up mx-auto max-w-160 px-6 pb-20 pt-12 text-center">
        <div
          aria-hidden
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success-subtle text-2xl font-bold text-success"
        >
          ✓
        </div>
        <h1 className="mb-2.5 font-serif text-2xl font-semibold">Dokumen Terkirim</h1>
        <p className="mb-6 text-[15px] leading-relaxed text-muted">
          {paymentDone ? (
            <>
              Pembayaran diterima, menunggu konfirmasi. Dokumen kamu berstatus{" "}
              <strong className="text-warning">Diproses</strong> dan akan otomatis dikonversi setelah
              konfirmasi masuk.
            </>
          ) : (
            <>
              Dokumen kamu berstatus <strong className="text-warning">Diproses</strong> — akan tampil
              di halaman Jelajah setelah selesai dikonversi.
            </>
          )}
        </p>
        <Link href="/profile" className="btn-primary inline-flex h-12 rounded-md px-6">
          Lihat di Profil
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-160 px-6 pb-20 pt-12">
      <h1 className="mb-2 font-serif text-3xl font-semibold">Unggah Dokumen</h1>
      <p className="mb-8 text-[15px] text-muted">
        Bagikan karya akademikmu — proses cepat, dan file kamu tetap aman.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col">
        {error && (
          <p className="mb-5 rounded-sm border border-danger bg-danger-subtle px-3 py-2 text-[14px] text-danger">
            {error}
          </p>
        )}

        <label className="field-label" htmlFor="upload-title">
          Judul
        </label>
        <input
          id="upload-title"
          required
          minLength={3}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="mis. Analisis Sentimen Ulasan E-Commerce"
          className="input mb-5 h-11"
        />

        <label className="field-label" htmlFor="upload-description">
          Deskripsi
        </label>
        <textarea
          id="upload-description"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ringkasan singkat isi dokumen"
          className="input-textarea mb-5 resize-y"
        />

        <label className="field-label" htmlFor="upload-category">
          Kategori
        </label>
        <select
          id="upload-category"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="input mb-6 h-11"
        >
          <option value="">Tanpa kategori</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>

        <span className="field-label">File Dokumen</span>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            acceptFile(e.dataTransfer.files[0]);
          }}
          className={`mb-5 rounded-md border-2 border-dashed p-7 text-center transition-colors ${
            fileError
              ? "border-danger bg-elevated"
              : dragActive
                ? "border-primary bg-primary-subtle"
                : "border-line bg-elevated"
          }`}
        >
          {file ? (
            <div className="flex items-center gap-3.5 text-left">
              <div
                aria-hidden
                className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-subtle text-[12px] font-bold text-primary"
              >
                {/\.pptx$/i.test(file.name) ? "PPTX" : "PDF"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold">{file.name}</p>
                <p className="text-[13px] text-muted">{formatFileSize(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setFileError(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="cursor-pointer text-[13px] text-muted underline transition-colors hover:text-fg"
              >
                Hapus
              </button>
            </div>
          ) : (
            <>
              <p className="mb-1.5 text-[15px] font-medium">Tarik &amp; lepas file di sini</p>
              <p className="mb-3.5 text-[13px] text-muted">Format PDF atau PPTX, maks 50MB</p>
              <label className="btn-secondary inline-flex cursor-pointer">
                Pilih File
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.pptx"
                  onChange={(e) => acceptFile(e.target.files?.[0])}
                  className="hidden"
                />
              </label>
            </>
          )}
          {fileError && <p className="mt-2.5 text-[13px] text-danger">{fileError}</p>}
        </div>

        {/* Pernyataan kepemilikan — sengaja diberi kotak highlight, bukan checkbox kecil yang
            gampang di-skip (PRD §7.4: ini pernyataan legal penting). */}
        <label className="mb-7 flex cursor-pointer items-start gap-3 rounded-md bg-primary-subtle p-4">
          <input
            required
            type="checkbox"
            checked={ownershipConfirmed}
            onChange={(e) => setOwnershipConfirmed(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-(--primary)"
          />
          <span className="text-[14px] leading-normal text-fg">
            Saya menyatakan bahwa dokumen ini adalah karya saya sendiri atau saya memiliki hak untuk
            mengunggahnya, dan bertanggung jawab penuh atas isinya.
          </span>
        </label>

        {submitting && (
          <div className="mb-5">
            <div className="h-2 overflow-hidden rounded-full bg-line">
              <div
                className="h-full bg-primary transition-[width] duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2 text-[13px] text-muted">Mengunggah… {progress}%</p>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !file || !ownershipConfirmed}
          className="btn-primary btn-lg w-full"
        >
          {submitting ? "Mengunggah…" : "Unggah Dokumen"}
        </button>
      </form>
    </div>
  );
}
