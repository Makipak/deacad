// Sumber data tunggal untuk demo frontend — BELUM connect ke apps/api (lihat README "Status saat ini").
// Shape data sengaja mengikuti persis type dari @deacad/shared-types supaya nanti tinggal diganti
// fetch(`${NEXT_PUBLIC_API_URL}/...`) tanpa perlu ubah komponen.
import type { Category, Document, Report, Transaction } from "@deacad/shared-types";

export const mockCategories: Category[] = [
  { id: "cat_skripsi", name: "Skripsi" },
  { id: "cat_tesis", name: "Tesis" },
  { id: "cat_makalah", name: "Makalah" },
  { id: "cat_praktikum", name: "Laporan Praktikum" },
  { id: "cat_ppt", name: "Presentasi/PPT" },
  { id: "cat_jurnal", name: "Jurnal" },
];

export const mockDocuments: Document[] = [
  {
    id: "doc_1",
    userId: "user_1",
    title: "Analisis Sentimen Media Sosial dengan LSTM",
    description: "Skripsi S1 Teknik Informatika — klasifikasi sentimen review produk memakai model LSTM.",
    fileType: "pdf",
    status: "ready",
    categoryId: "cat_skripsi",
    viewCount: 482,
    downloadCount: 96,
    createdAt: "2026-06-20T08:00:00.000Z",
    pages: [
      { id: "p1", pageNumber: 1, imageUrl: "/mock/page-placeholder.svg", isWatermarked: false },
      { id: "p2", pageNumber: 2, imageUrl: "/mock/page-placeholder.svg", isWatermarked: false },
      { id: "p3", pageNumber: 3, imageUrl: "/mock/page-placeholder.svg", isWatermarked: false },
    ],
  },
  {
    id: "doc_2",
    userId: "user_2",
    title: "Presentasi Sidang: Sistem Rekomendasi Berbasis Collaborative Filtering",
    description: "Slide sidang akhir — arsitektur sistem, hasil evaluasi, dan demo aplikasi.",
    fileType: "pptx",
    status: "ready",
    categoryId: "cat_ppt",
    viewCount: 210,
    downloadCount: 54,
    createdAt: "2026-06-25T08:00:00.000Z",
    pages: [
      { id: "p4", pageNumber: 1, imageUrl: "/mock/page-placeholder.svg", isWatermarked: false },
      { id: "p5", pageNumber: 2, imageUrl: "/mock/page-placeholder.svg", isWatermarked: false },
    ],
  },
  {
    id: "doc_3",
    userId: "user_1",
    title: "Laporan Praktikum Jaringan Komputer: Konfigurasi VLAN",
    description: "Laporan praktikum minggu 8 — setup VLAN antar switch Cisco.",
    fileType: "pdf",
    status: "ready",
    categoryId: "cat_praktikum",
    viewCount: 88,
    downloadCount: 12,
    createdAt: "2026-06-28T08:00:00.000Z",
    pages: [{ id: "p6", pageNumber: 1, imageUrl: "/mock/page-placeholder.svg", isWatermarked: false }],
  },
  {
    id: "doc_4",
    userId: "user_3",
    title: "Tesis: Optimasi Query PostgreSQL pada Sistem OLTP Skala Besar",
    description: "Tesis S2 — studi kasus tuning index dan partisi tabel.",
    fileType: "pdf",
    status: "processing",
    categoryId: "cat_tesis",
    viewCount: 5,
    downloadCount: 0,
    createdAt: "2026-07-01T08:00:00.000Z",
    pages: [],
  },
];

export const mockTransactions: Transaction[] = [
  {
    id: "trx_1",
    userId: "user_4",
    documentId: "doc_1",
    type: "download",
    amount: 15_000,
    status: "paid",
    midtransOrderId: "deacad-download-abc123",
    createdAt: "2026-06-30T10:00:00.000Z",
  },
  {
    id: "trx_2",
    userId: "user_5",
    documentId: "doc_2",
    type: "download",
    amount: 15_000,
    status: "pending",
    midtransOrderId: "deacad-download-def456",
    createdAt: "2026-07-01T09:00:00.000Z",
  },
];

export const mockReports: Report[] = [
  {
    id: "rep_1",
    documentId: "doc_3",
    reporterId: "user_6",
    reason: "Dokumen ini kelihatannya bukan hasil kerja sendiri, mirip laporan kelompok lain.",
    status: "pending",
    createdAt: "2026-06-29T12:00:00.000Z",
  },
];

export const mockSettings = {
  uploadPaymentEnabled: false,
  downloadPaymentEnabled: true,
  uploadPrice: 15_000,
  downloadPrice: 15_000,
};

export const mockAdminSummary = {
  totalRevenueMonth: 1_350_000,
  newDocumentsWeek: 14,
  pendingReports: mockReports.filter((r) => r.status === "pending").length,
  totalUsers: 128,
};

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(
    amount,
  );
}

export function findDocumentById(id: string): Document | undefined {
  return mockDocuments.find((doc) => doc.id === id);
}

export function findCategoryName(categoryId: string | null): string {
  return mockCategories.find((c) => c.id === categoryId)?.name ?? "Tanpa kategori";
}
