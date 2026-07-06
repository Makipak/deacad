"use client";

import { useState } from "react";
import { formatRupiah, mockSettings } from "@/lib/mock-data";

// Panel settings — toggle payment upload/download independen + harga, dengan konfirmasi
// sebelum simpan (ARCHITECTURE.md #12). Perubahan di sini di production tercatat di audit_logs.
export default function AdminSettingsPage() {
  const [settings, setSettings] = useState(mockSettings);
  const [draft, setDraft] = useState(mockSettings);

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(draft);

  function handleSave() {
    // eslint-disable-next-line no-alert
    const confirmed = confirm("Simpan perubahan settings monetisasi?");
    if (!confirmed) return;
    setSettings(draft);
  }

  return (
    <div className="max-w-md">
      <h1 className="text-xl font-semibold">Settings Monetisasi</h1>

      <div className="mt-4 flex flex-col gap-4">
        <label className="flex items-center justify-between text-sm">
          <span>Pembayaran upload</span>
          <input
            type="checkbox"
            checked={draft.uploadPaymentEnabled}
            onChange={(e) => setDraft({ ...draft, uploadPaymentEnabled: e.target.checked })}
          />
        </label>

        <label className="flex items-center justify-between text-sm">
          <span>Pembayaran download</span>
          <input
            type="checkbox"
            checked={draft.downloadPaymentEnabled}
            onChange={(e) => setDraft({ ...draft, downloadPaymentEnabled: e.target.checked })}
          />
        </label>

        <div>
          <label className="block text-sm font-medium">Harga upload</label>
          <input
            type="number"
            value={draft.uploadPrice}
            onChange={(e) => setDraft({ ...draft, uploadPrice: Number(e.target.value) })}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--color-border)" }}
          />
          <p className="mt-1 text-xs" style={{ color: "var(--color-muted)" }}>
            {formatRupiah(draft.uploadPrice)}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium">Harga download</label>
          <input
            type="number"
            value={draft.downloadPrice}
            onChange={(e) => setDraft({ ...draft, downloadPrice: Number(e.target.value) })}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--color-border)" }}
          />
          <p className="mt-1 text-xs" style={{ color: "var(--color-muted)" }}>
            {formatRupiah(draft.downloadPrice)}
          </p>
        </div>

        <button
          type="button"
          disabled={!hasChanges}
          onClick={handleSave}
          className="rounded-md px-4 py-2 text-sm text-white disabled:opacity-40"
          style={{ background: "var(--color-primary)" }}
        >
          Simpan perubahan
        </button>
      </div>
    </div>
  );
}
