"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Category, Document, MonetizationSettings, Transaction, User } from "@deacad/shared-types";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, ApiError } from "@/lib/api-client";
import { loadSnapScript, snapPay } from "@/lib/midtrans";
import { formatRupiah } from "@/lib/format";
import { StatusBadge, TxStatusBadge } from "@/components/status-badge";

// Baris hasil GET /transactions/mine — include document.title (join di transactions.service.ts#listMine).
type MyTransaction = Transaction & { document: { title: string } };

// Transaksi pending yang lebih tua dari ini diberi penekanan visual ringan (PRD §7.5).
const STALE_PENDING_MS = 24 * 60 * 60 * 1000;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join("");
}

// Halaman profil (desain "Profile"): header identitas + dua tab — Dokumen Saya dan Riwayat
// Transaksi. Juga jadi jalan balik untuk lanjut bayar upload yang tertunda (ARCHITECTURE.md #9).
export default function ProfilePage() {
  const { status, accessToken } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<"documents" | "transactions">("documents");
  const [profile, setProfile] = useState<User | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [transactions, setTransactions] = useState<MyTransaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<MonetizationSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  // Cutoff dihitung saat data dimuat (bukan Date.now() di render — render harus pure).
  const [staleCutoff, setStaleCutoff] = useState(0);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  const loadData = useCallback(async () => {
    const [userRes, docsRes, txRes, categoriesRes, settingsRes] = await Promise.all([
      apiFetch<User>("/users/me", { accessToken }),
      apiFetch<Document[]>("/documents/mine", { accessToken }),
      apiFetch<MyTransaction[]>("/transactions/mine", { accessToken }),
      apiFetch<Category[]>("/categories").catch(() => [] as Category[]),
      apiFetch<MonetizationSettings>("/settings").catch(() => null),
    ]);
    setProfile(userRes);
    setDocuments(docsRes);
    setTransactions(txRes);
    setCategories(categoriesRes);
    setSettings(settingsRes);
    setStaleCutoff(Date.now() - STALE_PENDING_MS);
  }, [accessToken]);

  useEffect(() => {
    if (status !== "authenticated") return;
    async function run() {
      try {
        await loadData();
      } catch {
        setError("Gagal memuat data profil.");
      }
    }
    void run();
  }, [status, loadData]);

  if (status !== "authenticated") return null;

  if (!profile) {
    return (
      <div className="mx-auto max-w-230 px-6 py-10">
        <div className="mb-9 flex items-center gap-5">
          <div className="skeleton h-16 w-16 rounded-full" />
          <div className="space-y-2">
            <div className="skeleton h-6 w-48" />
            <div className="skeleton h-4 w-64" />
          </div>
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton mb-3 h-20 w-full rounded-md" />
        ))}
      </div>
    );
  }

  const categoryName = (categoryId: string | null) =>
    categories.find((cat) => cat.id === categoryId)?.name ?? "Tanpa kategori";

  // Dokumen processing dianggap masih menunggu pembayaran hanya kalau belum ada transaksi upload
  // yang sudah paid untuk dokumen itu — lebih akurat daripada sekadar cek status dokumen.
  const hasPaidUpload = (documentId: string) =>
    transactions.some((tx) => tx.documentId === documentId && tx.type === "upload" && tx.status === "paid");

  async function handlePay(documentId: string) {
    setError(null);
    setPayingId(documentId);
    try {
      const { token } = await apiFetch<{ transactionId: string; token: string; redirectUrl: string }>(
        "/transactions",
        {
          method: "POST",
          accessToken,
          body: { documentId, type: "upload", idempotencyKey: crypto.randomUUID() },
        },
      );
      await loadSnapScript();
      const settle = () => {
        setPayingId(null);
        loadData().catch(() => {});
      };
      snapPay(token, {
        onSuccess: settle,
        onPending: settle,
        onError: () => {
          setError("Pembayaran gagal. Coba lagi.");
          setPayingId(null);
        },
        onClose: () => setPayingId(null),
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memulai pembayaran. Coba lagi.");
      setPayingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-230 px-6 pb-20 pt-10">
      {/* Header profil */}
      <div className="mb-9 flex items-center gap-5">
        <div
          aria-hidden
          className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-subtle text-[22px] font-bold text-primary"
        >
          {initials(profile.name)}
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-serif text-2xl font-semibold">{profile.name}</h1>
            {profile.role === "admin" && <span className="badge-primary">Admin</span>}
          </div>
          <p className="mt-1 text-[14px] text-muted">{profile.email}</p>
        </div>
      </div>

      {error && (
        <p className="mb-5 rounded-sm border border-danger bg-danger-subtle px-3 py-2 text-[14px] text-danger">
          {error}
        </p>
      )}

      {/* Tabs */}
      <div role="tablist" className="mb-6 flex gap-6 border-b border-line">
        <button
          role="tab"
          type="button"
          aria-selected={tab === "documents"}
          onClick={() => setTab("documents")}
          className={`h-11 cursor-pointer border-b-2 px-1 text-[15px] font-semibold transition-colors ${
            tab === "documents" ? "border-primary text-fg" : "border-transparent text-muted hover:text-fg"
          }`}
        >
          Dokumen Saya
        </button>
        <button
          role="tab"
          type="button"
          aria-selected={tab === "transactions"}
          onClick={() => setTab("transactions")}
          className={`h-11 cursor-pointer border-b-2 px-1 text-[15px] font-semibold transition-colors ${
            tab === "transactions" ? "border-primary text-fg" : "border-transparent text-muted hover:text-fg"
          }`}
        >
          Riwayat Transaksi
        </button>
      </div>

      {tab === "documents" && (
        <div className="flex flex-col gap-3">
          {documents.map((doc) => {
            const needsPayment =
              doc.status === "processing" && settings?.uploadPaymentEnabled && !hasPaidUpload(doc.id);
            return (
              <div key={doc.id} className="card flex flex-wrap items-center gap-4 p-4">
                {doc.thumbnailUrl ? (
                  <Image
                    src={doc.thumbnailUrl}
                    alt=""
                    width={48}
                    height={48}
                    unoptimized
                    className="h-12 w-12 shrink-0 rounded-lg border border-line object-cover object-top"
                  />
                ) : (
                  <div aria-hidden className="doc-cover h-12 w-12 shrink-0 rounded-lg border border-line" />
                )}
                <div className="min-w-0 flex-1">
                  {doc.status === "ready" ? (
                    <Link
                      href={`/documents/${doc.id}`}
                      className="block truncate text-[15px] font-semibold transition-colors hover:text-primary"
                    >
                      {doc.title}
                    </Link>
                  ) : (
                    <p className="truncate text-[15px] font-semibold">{doc.title}</p>
                  )}
                  <p className="mt-0.5 text-[13px] text-muted">
                    {categoryName(doc.categoryId)} · {doc.fileType.toUpperCase()} ·{" "}
                    {formatDate(doc.createdAt)}
                  </p>
                </div>
                {needsPayment && (
                  <button
                    type="button"
                    disabled={payingId === doc.id}
                    onClick={() => handlePay(doc.id)}
                    className="btn-primary btn-sm"
                  >
                    {payingId === doc.id ? "Memproses..." : `Bayar ${formatRupiah(settings!.uploadPrice)}`}
                  </button>
                )}
                <span className="shrink-0">
                  <StatusBadge status={doc.status} />
                </span>
              </div>
            );
          })}
          {documents.length === 0 && (
            <div className="px-5 py-14 text-center text-muted">
              <div aria-hidden className="mx-auto mb-4 h-14 w-14 rounded-full border-2 border-line" />
              <p className="mb-1.5 text-[15px] font-semibold text-fg">Belum ada dokumen</p>
              <p className="text-[14px]">
                Kamu belum mengunggah dokumen apa pun.{" "}
                <Link href="/upload" className="text-primary underline">
                  Unggah sekarang
                </Link>
                .
              </p>
            </div>
          )}
        </div>
      )}

      {tab === "transactions" && (
        <div className="card overflow-hidden">
          <div className="hidden grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-2 border-b border-line bg-surface px-4 py-3 text-[13px] font-semibold text-muted sm:grid">
            <span>Dokumen</span>
            <span>Tipe</span>
            <span>Jumlah</span>
            <span>Status</span>
            <span>Tanggal</span>
          </div>
          {transactions.map((tx) => {
            const stalePending = tx.status === "pending" && new Date(tx.createdAt).getTime() < staleCutoff;
            return (
              <div
                key={tx.id}
                className={`grid grid-cols-1 gap-2 border-b border-line px-4 py-3.5 text-[14px] last:border-b-0 sm:grid-cols-[2fr_1fr_1fr_1fr_1fr] sm:items-center ${
                  stalePending ? "bg-warning-subtle" : ""
                }`}
              >
                <span className="truncate pr-3 font-medium sm:font-normal">{tx.document.title}</span>
                <span className="text-muted">{tx.type === "upload" ? "Upload" : "Download"}</span>
                <span>{formatRupiah(tx.amount)}</span>
                <span>
                  <TxStatusBadge status={tx.status} />
                </span>
                <span className="text-muted">{formatDate(tx.createdAt)}</span>
              </div>
            );
          })}
          {transactions.length === 0 && (
            <div className="px-5 py-14 text-center text-muted">
              <div aria-hidden className="mx-auto mb-4 h-14 w-14 rounded-full border-2 border-line" />
              <p className="mb-1.5 text-[15px] font-semibold text-fg">Belum ada transaksi</p>
              <p className="text-[14px]">Riwayat pembayaran upload/download kamu akan tampil di sini.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
