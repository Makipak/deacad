"use client";

import { useEffect, useState } from "react";
import type { Document, Transaction } from "@deacad/shared-types";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import { formatRupiah } from "@/lib/format";
import { TxStatusBadge } from "@/components/status-badge";

interface AdminUserRow {
  id: string;
  createdAt: string;
}

type AdminTransactionRow = Transaction & {
  user: { name: string; email: string };
  document: { title: string };
};

interface Metric {
  label: string;
  value: string;
  trend: { label: string; up: boolean } | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

// Tren sederhana (desain Admin Dashboard: "↑ +12%" hijau / "↓ ..." merah) — dibanding periode
// sebelumnya dengan panjang sama; null kalau dua-duanya nol (tidak ada yang bisa dibandingkan).
function trendOf(current: number, previous: number): Metric["trend"] {
  if (current === previous) return null;
  const up = current > previous;
  const arrow = up ? "↑" : "↓";
  if (previous > 0) {
    const pct = Math.round(((current - previous) / previous) * 100);
    return { label: `${arrow} ${pct > 0 ? "+" : ""}${pct}%`, up };
  }
  const delta = current - previous;
  return { label: `${arrow} ${delta > 0 ? "+" : ""}${delta}`, up };
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

// Tidak ada satu endpoint agregat khusus dashboard di backend — angka-angka dikomposisi
// client-side dari endpoint admin yang sudah ada (users, reports/pending, documents/admin/all,
// transactions/admin/all), termasuk perbandingan periode untuk indikator tren.
export default function AdminDashboardPage() {
  const { accessToken, status } = useAuth();
  const [metrics, setMetrics] = useState<Metric[] | null>(null);
  const [recentTx, setRecentTx] = useState<AdminTransactionRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;

    async function loadSummary() {
      const now = Date.now();
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const todayStart = startOfToday.getTime();

      const [users, pendingReports, documents, transactions] = await Promise.all([
        apiFetch<AdminUserRow[]>("/users", { accessToken }),
        apiFetch<unknown[]>("/reports/pending", { accessToken }),
        apiFetch<Document[]>("/documents/admin/all", { accessToken }),
        apiFetch<AdminTransactionRow[]>("/transactions/admin/all", { accessToken }),
      ]);

      const paid = transactions.filter((t) => t.status === "paid");
      const sumBetween = (from: number, to: number) =>
        paid
          .filter((t) => {
            const at = new Date(t.createdAt).getTime();
            return at >= from && at < to;
          })
          .reduce((sum, t) => sum + t.amount, 0);
      const countDocsBetween = (from: number, to: number) =>
        documents.filter((d) => {
          const at = new Date(d.createdAt).getTime();
          return at >= from && at < to;
        }).length;

      const revenueToday = sumBetween(todayStart, now + 1);
      const revenueYesterday = sumBetween(todayStart - DAY_MS, todayStart);
      const revenueWeek = sumBetween(now - WEEK_MS, now + 1);
      const revenuePrevWeek = sumBetween(now - 2 * WEEK_MS, now - WEEK_MS);
      const docsWeek = countDocsBetween(now - WEEK_MS, now + 1);
      const docsPrevWeek = countDocsBetween(now - 2 * WEEK_MS, now - WEEK_MS);
      const usersWeek = users.filter((u) => new Date(u.createdAt).getTime() >= now - WEEK_MS).length;

      setMetrics([
        { label: "Pendapatan Hari Ini", value: formatRupiah(revenueToday), trend: trendOf(revenueToday, revenueYesterday) },
        { label: "Pendapatan Minggu Ini", value: formatRupiah(revenueWeek), trend: trendOf(revenueWeek, revenuePrevWeek) },
        { label: "Dokumen Baru (7 hari)", value: String(docsWeek), trend: trendOf(docsWeek, docsPrevWeek) },
        { label: "Laporan Pending", value: String(pendingReports.length), trend: null },
        {
          label: "Total Pengguna",
          value: users.length.toLocaleString("id-ID"),
          trend: usersWeek > 0 ? { label: `↑ +${usersWeek}`, up: true } : null,
        },
      ]);
      setRecentTx(transactions.slice(0, 8));
    }

    loadSummary().catch(() => setError("Gagal memuat ringkasan dashboard."));
  }, [status, accessToken]);

  if (status !== "authenticated") return null;

  return (
    <div>
      {error && (
        <p className="mb-5 rounded-sm border border-danger bg-danger-subtle px-3 py-2 text-[14px] text-danger">
          {error}
        </p>
      )}

      <div className="mb-7 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        {(metrics ?? Array.from({ length: 5 }).map(() => null)).map((metric, i) =>
          metric ? (
            <div key={metric.label} className="card p-4.5">
              <p className="mb-2 text-[13px] text-muted">{metric.label}</p>
              <p className="mb-1.5 text-[26px] font-bold leading-none">{metric.value}</p>
              {metric.trend && (
                <p className={`text-[12px] font-semibold ${metric.trend.up ? "text-success" : "text-danger"}`}>
                  {metric.trend.label}
                </p>
              )}
            </div>
          ) : (
            <div key={i} className="card p-4.5">
              <div className="skeleton mb-2 h-3.5 w-24" />
              <div className="skeleton h-7 w-20" />
            </div>
          ),
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center border-b border-line px-4.5 py-3.5">
          <h2 className="text-[15px] font-semibold">Transaksi Terbaru</h2>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-2xl">
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-2 bg-surface px-4.5 py-2.5 text-[12px] font-semibold text-muted">
              <span>Dokumen</span>
              <span>User</span>
              <span>Jumlah</span>
              <span>Status</span>
              <span>Tanggal</span>
            </div>
            {recentTx.map((tx) => (
              <div
                key={tx.id}
                className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] items-center gap-2 border-t border-line px-4.5 py-3 text-[13px] transition-colors hover:bg-surface"
              >
                <span className="truncate pr-3">{tx.document.title}</span>
                <span className="text-muted">{tx.user.name}</span>
                <span>{formatRupiah(tx.amount)}</span>
                <span>
                  <TxStatusBadge status={tx.status} />
                </span>
                <span className="text-muted">{shortDate(tx.createdAt)}</span>
              </div>
            ))}
            {metrics && recentTx.length === 0 && (
              <p className="border-t border-line px-4.5 py-8 text-center text-[14px] text-muted">
                Belum ada transaksi.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
