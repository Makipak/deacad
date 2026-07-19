"use client";

interface ConfirmModalProps {
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// Modal konfirmasi aksi admin ireversibel/berdampak besar (PRD §5 & §7.7) — overlay gelap,
// card center radius besar, dua tombol sejajar. Dipakai reports/documents/settings admin.
export function ConfirmModal({
  title,
  message,
  confirmLabel,
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-[rgba(28,25,23,0.5)] p-4"
    >
      <div className="animate-slide-up w-full max-w-95 rounded-lg bg-elevated p-7 shadow-(--shadow-modal)">
        <h2 className="mb-2.5 font-serif text-[19px] font-semibold">{title}</h2>
        <p className="mb-5 text-[14px] leading-relaxed text-muted">{message}</p>
        <div className="flex gap-2.5">
          <button type="button" onClick={onCancel} className="btn-secondary h-11 flex-1 rounded-lg bg-transparent">
            Batal
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={`${danger ? "btn-danger" : "btn-primary"} h-11 flex-1 rounded-lg`}
          >
            {busy ? "Memproses..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
