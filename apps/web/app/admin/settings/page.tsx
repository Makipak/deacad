"use client";

import { useCallback, useEffect, useState } from "react";
import type { MonetizationSettings } from "@deacad/shared-types";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, ApiError } from "@/lib/api-client";
import { formatRupiah } from "@/lib/format";
import { ConfirmModal } from "@/components/confirm-modal";

// Baris hasil GET /settings/history — audit_logs target "monetization" (settings.controller.ts).
interface SettingsAuditRow {
  id: string;
  createdAt: string;
  oldValue: Partial<MonetizationSettings> | null;
  newValue: Partial<MonetizationSettings> | null;
  admin: { name: string } | null;
}

// Ubah diff oldValue→newValue jadi kalimat timeline (desain Admin Settings:
// "Download Berbayar diaktifkan (Rp 12.000)", "Harga Upload diubah dari X ke Y").
function describeChange(oldV: Partial<MonetizationSettings> | null, newV: Partial<MonetizationSettings> | null): string {
  if (!oldV || !newV) return "Pengaturan diperbarui";
  const parts: string[] = [];
  if (oldV.uploadPaymentEnabled !== newV.uploadPaymentEnabled) {
    parts.push(
      newV.uploadPaymentEnabled
        ? `Upload Berbayar diaktifkan (${formatRupiah(newV.uploadPrice ?? 0)})`
        : "Upload Berbayar dinonaktifkan",
    );
  } else if (oldV.uploadPrice !== newV.uploadPrice) {
    parts.push(`Harga Upload diubah dari ${formatRupiah(oldV.uploadPrice ?? 0)} ke ${formatRupiah(newV.uploadPrice ?? 0)}`);
  }
  if (oldV.downloadPaymentEnabled !== newV.downloadPaymentEnabled) {
    parts.push(
      newV.downloadPaymentEnabled
        ? `Download Berbayar diaktifkan (${formatRupiah(newV.downloadPrice ?? 0)})`
        : "Download Berbayar dinonaktifkan",
    );
  } else if (oldV.downloadPrice !== newV.downloadPrice) {
    parts.push(
      `Harga Download diubah dari ${formatRupiah(oldV.downloadPrice ?? 0)} ke ${formatRupiah(newV.downloadPrice ?? 0)}`,
    );
  }
  return parts.length > 0 ? parts.join(" · ") : "Pengaturan diperbarui";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function parseRupiahInput(raw: string): number {
  return Number.parseInt(raw.replace(/\D/g, ""), 10) || 0;
}

// Toggle switch besar dan jelas untuk pengaturan berdampak besar (PRD §7.10 — bukan checkbox kecil).
function ToggleSwitch({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      className={`relative h-7 w-12 shrink-0 cursor-pointer rounded-full border-none transition-colors duration-150 ${
        on ? "bg-primary" : "bg-line-strong"
      }`}
    >
      <span
        className={`absolute top-0.75 h-5.5 w-5.5 rounded-full bg-white transition-[left] duration-150 ${
          on ? "left-5.75" : "left-0.75"
        }`}
      />
    </button>
  );
}

// Panel settings monetisasi — toggle upload/download independen + harga, konfirmasi eksplisit
// sebelum apply (ARCHITECTURE.md #12). Perubahan tercatat di audit_logs dan tampil sebagai
// timeline "Riwayat Perubahan" di bawah form.
export default function AdminSettingsPage() {
  const { accessToken, status } = useAuth();
  const [settings, setSettings] = useState<MonetizationSettings | null>(null);
  const [draft, setDraft] = useState<MonetizationSettings | null>(null);
  const [history, setHistory] = useState<SettingsAuditRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const loadHistory = useCallback(() => {
    apiFetch<SettingsAuditRow[]>("/settings/history", { accessToken })
      .then(setHistory)
      .catch(() => setHistory([]));
  }, [accessToken]);

  useEffect(() => {
    apiFetch<MonetizationSettings>("/settings")
      .then((data) => {
        setSettings(data);
        setDraft(data);
      })
      .catch(() => setError("Gagal memuat settings."));
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    loadHistory();
  }, [status, loadHistory]);

  if (status !== "authenticated") return null;

  if (!settings || !draft) {
    return (
      <div className="max-w-160">
        <div className="skeleton mb-4 h-40 w-full rounded-md" />
        <div className="skeleton h-12 w-44 rounded-md" />
      </div>
    );
  }

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(draft);

  async function handleSave() {
    if (!draft) return;
    setError(null);
    setSaving(true);
    try {
      const updated = await apiFetch<MonetizationSettings>("/settings", {
        method: "PATCH",
        accessToken,
        body: {
          uploadPaymentEnabled: draft.uploadPaymentEnabled,
          downloadPaymentEnabled: draft.downloadPaymentEnabled,
          uploadPrice: draft.uploadPrice,
          downloadPrice: draft.downloadPrice,
        },
      });
      setSettings(updated);
      setDraft(updated);
      setShowConfirm(false);
      loadHistory();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menyimpan settings. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-160">
      {error && (
        <p className="mb-5 rounded-sm border border-danger bg-danger-subtle px-3 py-2 text-[14px] text-danger">
          {error}
        </p>
      )}

      <div className="card mb-6 p-6">
        <div className="flex items-center justify-between border-b border-line pb-5">
          <div>
            <p className="mb-1 text-[15px] font-semibold">Upload Berbayar</p>
            <p className="text-[13px] text-muted">Wajibkan pembayaran saat mengunggah dokumen baru.</p>
          </div>
          <ToggleSwitch
            on={draft.uploadPaymentEnabled}
            onToggle={() => setDraft({ ...draft, uploadPaymentEnabled: !draft.uploadPaymentEnabled })}
            label="Upload berbayar"
          />
        </div>

        {draft.uploadPaymentEnabled && (
          <div className="animate-fade-in border-b border-line py-5">
            <label className="mb-1.5 block text-[13px] font-medium text-muted" htmlFor="upload-price">
              Harga Upload
            </label>
            <input
              id="upload-price"
              type="text"
              inputMode="numeric"
              value={formatRupiah(draft.uploadPrice)}
              onChange={(e) => setDraft({ ...draft, uploadPrice: parseRupiahInput(e.target.value) })}
              className="input h-11 bg-surface"
            />
          </div>
        )}

        <div className="flex items-center justify-between pt-5">
          <div>
            <p className="mb-1 text-[15px] font-semibold">Download Berbayar</p>
            <p className="text-[13px] text-muted">Wajibkan pembayaran untuk mengunduh dokumen.</p>
          </div>
          <ToggleSwitch
            on={draft.downloadPaymentEnabled}
            onToggle={() => setDraft({ ...draft, downloadPaymentEnabled: !draft.downloadPaymentEnabled })}
            label="Download berbayar"
          />
        </div>

        {draft.downloadPaymentEnabled && (
          <div className="animate-fade-in pt-5">
            <label className="mb-1.5 block text-[13px] font-medium text-muted" htmlFor="download-price">
              Harga Download
            </label>
            <input
              id="download-price"
              type="text"
              inputMode="numeric"
              value={formatRupiah(draft.downloadPrice)}
              onChange={(e) => setDraft({ ...draft, downloadPrice: parseRupiahInput(e.target.value) })}
              className="input h-11 bg-surface"
            />
          </div>
        )}
      </div>

      <button
        type="button"
        disabled={!hasChanges || saving}
        onClick={() => setShowConfirm(true)}
        className="btn-primary mb-8 h-12 rounded-md px-6"
      >
        Simpan Perubahan
      </button>

      <h2 className="mb-3.5 text-[15px] font-semibold">Riwayat Perubahan</h2>
      <div className="flex flex-col">
        {history.map((row, i) => (
          <div key={row.id} className="flex gap-3.5 pb-4.5">
            <div className="flex flex-col items-center">
              <span aria-hidden className="mt-1.5 h-2 w-2 rounded-full bg-primary" />
              {i < history.length - 1 && <span aria-hidden className="mt-1 w-px flex-1 bg-line" />}
            </div>
            <div>
              <p className="mb-0.5 text-[13px] font-semibold">{describeChange(row.oldValue, row.newValue)}</p>
              <p className="text-[12px] text-muted">
                {row.admin?.name ?? "admin"} · {formatDate(row.createdAt)}
              </p>
            </div>
          </div>
        ))}
        {history.length === 0 && (
          <p className="text-[14px] text-muted">Belum ada perubahan tercatat.</p>
        )}
      </div>

      {showConfirm && (
        <ConfirmModal
          title="Terapkan Pengaturan?"
          message="Perubahan akan langsung berlaku untuk semua pengguna. Pastikan nilai sudah benar."
          confirmLabel="Ya, Terapkan"
          busy={saving}
          onConfirm={() => void handleSave()}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
}
