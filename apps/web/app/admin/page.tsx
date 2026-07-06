import { formatRupiah, mockAdminSummary } from "@/lib/mock-data";

const CARDS = [
  { label: "Pendapatan bulan ini", value: formatRupiah(mockAdminSummary.totalRevenueMonth) },
  { label: "Dokumen baru minggu ini", value: mockAdminSummary.newDocumentsWeek },
  { label: "Laporan pending", value: mockAdminSummary.pendingReports },
  { label: "Total user", value: mockAdminSummary.totalUsers },
];

// Dashboard ringkasan (ARCHITECTURE.md #12) — cukup angka + tabel untuk MVP, chart visual menyusul.
export default function AdminDashboardPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {CARDS.map((card) => (
          <div key={card.label} className="rounded-lg border p-4" style={{ borderColor: "var(--color-border)" }}>
            <p className="text-xs" style={{ color: "var(--color-muted)" }}>
              {card.label}
            </p>
            <p className="mt-1 text-lg font-semibold">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
