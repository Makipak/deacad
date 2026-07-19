import type { DocumentStatus, TransactionStatus } from "@deacad/shared-types";

// Satu sumber label+warna status dokumen — dipakai di card, halaman detail, profil, dan tabel
// admin supaya konsisten (PRD §5: badge status pill semantik).
const STATUS_META: Record<DocumentStatus, { label: string; className: string }> = {
  ready: { label: "Siap", className: "badge-success" },
  processing: { label: "Diproses", className: "badge-warning" },
  failed: { label: "Gagal", className: "badge-danger" },
  rejected: { label: "Ditolak", className: "badge-danger" },
};

export function statusLabel(status: DocumentStatus) {
  return STATUS_META[status].label;
}

export function StatusBadge({ status }: { status: DocumentStatus }) {
  const meta = STATUS_META[status];
  return <span className={meta.className}>{meta.label}</span>;
}

// Padanan untuk status transaksi — dipakai di profil (riwayat) dan tabel admin.
const TX_STATUS_META: Record<TransactionStatus, { label: string; className: string }> = {
  paid: { label: "Berhasil", className: "badge-success" },
  pending: { label: "Pending", className: "badge-warning" },
  failed: { label: "Gagal", className: "badge-danger" },
  expired: { label: "Kedaluwarsa", className: "badge-danger" },
  refunded: { label: "Refund", className: "badge-neutral" },
};

export function txStatusLabel(status: TransactionStatus) {
  return TX_STATUS_META[status].label;
}

export function TxStatusBadge({ status }: { status: TransactionStatus }) {
  const meta = TX_STATUS_META[status];
  return <span className={meta.className}>{meta.label}</span>;
}
