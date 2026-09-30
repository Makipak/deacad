"use client";

import { useEffect, useMemo, useState } from "react";
import type { Transaction, TransactionStatus } from "@deacad/shared-types";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, ApiError } from "@/lib/api-client";
import { formatRupiah } from "@/lib/format";
import { TxStatusBadge } from "@/components/status-badge";

// Baris hasil GET /transactions/admin/all — join manual di transactions.service.ts#listForAdmin.
type AdminTransactionRow = Transaction & {
  user: { name: string; email: string };
  document: { title: string };
};

// Manajemen transaksi (desain Admin Transactions) — search by order id/nama user, filter status,
// tombol "Cek Ulang Status" per row dengan loading inline saat trigger reconciliation manual.
export default function AdminTransactionsPage() {
  const { accessToken, status } = useAuth();
  const [transactions, setTransactions] = useState<AdminTransactionRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"semua" | TransactionStatus>("semua");

  useEffect(() => {
    if (status !== "authenticated") return;
    apiFetch<AdminTransactionRow[]>("/transactions/admin/all", { accessToken })
      .then(setTransactions)
      .catch(() => setError("Gagal memuat daftar transaksi."));
  }, [status, accessToken]);

  const filtered = useMemo(() => {
    if (!transactions) return null;
    let rows = transactions;
    if (statusFilter !== "semua") rows = rows.filter((t) => t.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (t) => t.midtransOrderId.toLowerCase().includes(q) || t.user.name.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [transactions, statusFilter, search]);

  if (status !== "authenticated") return null;

  async function handleRecheck(id: string) {
    setError(null);
    setNotice(null);
    setBusyId(id);
    try {
      const res = await apiFetch<{ message: string }>(`/transactions/${id}/recheck`, {
        method: "POST",
        accessToken,
      });
      setNotice(res.message);
      const refreshed = await apiFetch<AdminTransactionRow[]>("/transactions/admin/all", { accessToken });
      setTransactions(refreshed);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal cek ulang status transaksi.");
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

      {notice && (
        <p className="mb-5 rounded-sm border border-line bg-elevated px-3 py-2 text-[14px] text-muted">{notice}</p>
      )}

      <div className="mb-4.5 flex flex-wrap gap-2.5">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari order ID atau nama user..."
          aria-label="Cari order ID atau nama user"
          className="input max-w-80 flex-1 text-[14px]"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          aria-label="Filter status"
          className="input w-auto text-[14px]"
        >
          <option value="semua">Semua Status</option>
          <option value="paid">Berhasil</option>
          <option value="pending">Pending</option>
          <option value="failed">Gagal</option>
          <option value="expired">Kedaluwarsa</option>
          <option value="refunded">Refund</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-3xl">
            <div className="grid grid-cols-[1.2fr_1fr_1.8fr_0.9fr_1fr_1.2fr] gap-2 bg-surface px-4.5 py-2.5 text-[12px] font-semibold text-muted">
              <span>Order ID</span>
              <span>User</span>
              <span>Dokumen</span>
              <span>Jumlah</span>
              <span>Status</span>
              <span>Aksi</span>
            </div>

            {filtered === null &&
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="border-t border-line px-4.5 py-3">
                  <div className="skeleton h-5 w-full" />
                </div>
              ))}

            {filtered?.map((tx) => (
              <div
                key={tx.id}
                className="grid grid-cols-[1.2fr_1fr_1.8fr_0.9fr_1fr_1.2fr] items-center gap-2 border-t border-line px-4.5 py-3 text-[13px] transition-colors hover:bg-surface"
              >
                <span className="truncate font-mono text-[12px] text-muted">{tx.midtransOrderId}</span>
                <span className="truncate">{tx.user.name}</span>
                <span className="truncate pr-3 text-muted">{tx.document.title}</span>
                <span>{formatRupiah(tx.amount)}</span>
                <span>
                  <TxStatusBadge status={tx.status} />
                </span>
                <button
                  type="button"
                  disabled={busyId === tx.id}
                  onClick={() => handleRecheck(tx.id)}
                  className="btn-secondary btn-sm w-fit bg-transparent text-[12px]"
                >
                  {busyId === tx.id && (
                    <span
                      aria-hidden
                      className="h-3 w-3 animate-spin rounded-full border-2 border-line border-t-primary"
                    />
                  )}
                  {busyId === tx.id ? "Mengecek…" : "Cek Ulang Status"}
                </button>
              </div>
            ))}

            {filtered !== null && filtered.length === 0 && (
              <p className="border-t border-line px-4.5 py-10 text-center text-[14px] text-muted">
                Tidak ada transaksi yang cocok dengan filter.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
