import { findDocumentById, mockReports } from "@/lib/mock-data";

// Antrian moderasi laporan — status pending, urut terlama dulu (ARCHITECTURE.md #12).
export default function AdminReportsPage() {
  const pendingReports = mockReports
    .filter((r) => r.status === "pending")
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return (
    <div>
      <h1 className="text-xl font-semibold">Antrian Laporan</h1>

      <div className="mt-4 flex flex-col gap-3">
        {pendingReports.map((report) => {
          const document = findDocumentById(report.documentId);
          return (
            <div key={report.id} className="rounded-lg border p-4" style={{ borderColor: "var(--color-border)" }}>
              <p className="font-medium">{document?.title ?? "(dokumen tidak ditemukan)"}</p>
              <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>
                {report.reason}
              </p>
              <div className="mt-3 flex gap-2">
                <button className="rounded-md border px-3 py-1.5 text-sm" style={{ borderColor: "var(--color-border)" }}>
                  Unpublish dokumen
                </button>
                <button className="rounded-md border px-3 py-1.5 text-sm" style={{ borderColor: "var(--color-border)" }}>
                  Tolak laporan
                </button>
              </div>
            </div>
          );
        })}
        {pendingReports.length === 0 && (
          <p className="text-sm" style={{ color: "var(--color-muted)" }}>
            Tidak ada laporan pending.
          </p>
        )}
      </div>
    </div>
  );
}
