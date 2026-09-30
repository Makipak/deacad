"use client";

import { useEffect, useMemo, useState } from "react";
import type { AdminUser, AdminUserDocument } from "@deacad/shared-types";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, ApiError } from "@/lib/api-client";
import { ConfirmModal } from "@/components/confirm-modal";
import { StatusBadge } from "@/components/status-badge";

type StatusFilter = "semua" | "aktif" | "diblokir";
// undefined = belum pernah dibuka; "loading"/"error" = state fetch dokumen per user.
type UserDocsState = AdminUserDocument[] | "loading" | "error" | undefined;

const MIN_REASON_LENGTH = 5; // selaras banUserInputSchema di @deacad/shared-types.

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

// Manajemen pengguna — daftar semua user, cari (nama/email), filter status, dan blokir/buka blokir.
// Filter & search dilakukan client-side karena GET /users mengembalikan semua user sekaligus;
// kalau jumlah user sudah ribuan, pindahkan ke query param + pagination di backend.
// Pembatasan sebenarnya (admin tidak bisa ban admin/diri sendiri) ada di UsersService.ban() —
// tombol yang disembunyikan di sini cuma demi UX.
export default function AdminUsersPage() {
  const { accessToken, status } = useAuth();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("semua");
  const [banTarget, setBanTarget] = useState<AdminUser | null>(null);
  const [unbanTarget, setUnbanTarget] = useState<AdminUser | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [docsByUser, setDocsByUser] = useState<Record<string, UserDocsState>>({});
  const [deleteTarget, setDeleteTarget] = useState<{ user: AdminUser; doc: AdminUserDocument } | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    apiFetch<AdminUser[]>("/users", { accessToken })
      .then(setUsers)
      .catch(() => setError("Gagal memuat daftar pengguna."));
  }, [status, accessToken]);

  const filtered = useMemo(() => {
    if (!users) return null;
    let rows = users;
    if (statusFilter === "aktif") rows = rows.filter((u) => !u.bannedAt);
    if (statusFilter === "diblokir") rows = rows.filter((u) => u.bannedAt);
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    return rows;
  }, [users, statusFilter, search]);

  const bannedCount = users?.filter((u) => u.bannedAt).length ?? 0;

  if (status !== "authenticated") return null;

  async function toggleDocs(user: AdminUser) {
    if (expandedId === user.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(user.id);
    // Selalu ambil ulang saat dibuka — admin butuh data terbaru sebelum memutuskan menghapus.
    setDocsByUser((prev) => ({ ...prev, [user.id]: "loading" }));
    try {
      const docs = await apiFetch<AdminUserDocument[]>(`/users/${user.id}/documents`, { accessToken });
      setDocsByUser((prev) => ({ ...prev, [user.id]: docs }));
    } catch {
      setDocsByUser((prev) => ({ ...prev, [user.id]: "error" }));
    }
  }

  async function handleDeleteDoc(user: AdminUser, doc: AdminUserDocument) {
    setError(null);
    setBusy(true);
    try {
      await apiFetch(`/documents/${doc.id}`, { method: "DELETE", accessToken });
      setDocsByUser((prev) => {
        const current = prev[user.id];
        return Array.isArray(current) ? { ...prev, [user.id]: current.filter((d) => d.id !== doc.id) } : prev;
      });
      setUsers((prev) =>
        prev ? prev.map((u) => (u.id === user.id ? { ...u, documentCount: Math.max(0, u.documentCount - 1) } : u)) : prev,
      );
      setNotice(`Dokumen "${doc.title}" dihapus permanen.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menghapus dokumen.");
    } finally {
      setDeleteTarget(null);
      setBusy(false);
    }
  }

  function openBan(user: AdminUser) {
    setError(null);
    setNotice(null);
    setReason("");
    setBanTarget(user);
  }

  async function handleBan(user: AdminUser) {
    setError(null);
    setBusy(true);
    try {
      const res = await apiFetch<{ bannedAt: string; banReason: string }>(`/users/${user.id}/ban`, {
        method: "POST",
        accessToken,
        body: { reason: reason.trim() },
      });
      setUsers((prev) =>
        prev ? prev.map((u) => (u.id === user.id ? { ...u, bannedAt: res.bannedAt, banReason: res.banReason } : u)) : prev,
      );
      setNotice(`${user.name} diblokir. Semua sesi login-nya sudah dicabut.`);
      setBanTarget(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memblokir pengguna.");
      setBanTarget(null);
    } finally {
      setBusy(false);
    }
  }

  async function handleUnban(user: AdminUser) {
    setError(null);
    setBusy(true);
    try {
      await apiFetch(`/users/${user.id}/unban`, { method: "POST", accessToken });
      setUsers((prev) => (prev ? prev.map((u) => (u.id === user.id ? { ...u, bannedAt: null, banReason: null } : u)) : prev));
      setNotice(`Blokir ${user.name} dibuka. User bisa login lagi.`);
      setUnbanTarget(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal membuka blokir pengguna.");
      setUnbanTarget(null);
    } finally {
      setBusy(false);
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

      <div className="mb-4.5 flex flex-wrap items-center gap-2.5">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama atau email..."
          aria-label="Cari nama atau email"
          className="input max-w-80 flex-1 text-[14px]"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          aria-label="Filter status akun"
          className="input w-auto text-[14px]"
        >
          <option value="semua">Semua Status</option>
          <option value="aktif">Aktif</option>
          <option value="diblokir">Diblokir</option>
        </select>
        {users && (
          <span className="text-[13px] text-muted">
            {users.length.toLocaleString("id-ID")} pengguna · {bannedCount} diblokir
          </span>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-3xl">
            <div className="grid grid-cols-[1.5fr_1.5fr_0.6fr_0.9fr_0.8fr_1.6fr] gap-2 bg-surface px-4.5 py-2.5 text-[12px] font-semibold text-muted">
              <span>Nama</span>
              <span>Email</span>
              <span>Dokumen</span>
              <span>Bergabung</span>
              <span>Status</span>
              <span>Aksi</span>
            </div>

            {filtered === null &&
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="border-t border-line px-4.5 py-3">
                  <div className="skeleton h-5 w-full" />
                </div>
              ))}

            {filtered?.map((user) => (
              <div
                key={user.id}
                className="grid grid-cols-[1.5fr_1.5fr_0.6fr_0.9fr_0.8fr_1.6fr] items-center gap-2 border-t border-line px-4.5 py-3 text-[13px] transition-colors hover:bg-surface"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{user.name}</span>
                  {user.university && <span className="truncate text-[12px] text-muted">{user.university}</span>}
                </span>
                <span className="truncate text-muted">{user.email}</span>
                <span>{user.documentCount}</span>
                <span className="text-muted">{shortDate(user.createdAt)}</span>
                <span className="flex flex-col items-start gap-1">
                  {user.role === "admin" ? (
                    <span className="badge-primary">Admin</span>
                  ) : user.bannedAt ? (
                    <span className="badge-danger">Diblokir</span>
                  ) : (
                    <span className="badge-success">Aktif</span>
                  )}
                </span>
                <span className="flex flex-wrap items-center gap-2">
                  {user.role !== "admin" && (
                    <button
                      type="button"
                      onClick={() => void toggleDocs(user)}
                      aria-expanded={expandedId === user.id}
                      className="btn-secondary btn-sm bg-transparent text-[12px]"
                    >
                      Dokumen
                    </button>
                  )}
                  {user.role === "admin" ? (
                    <span className="text-muted">—</span>
                  ) : user.bannedAt ? (
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setNotice(null);
                        setUnbanTarget(user);
                      }}
                      className="btn-secondary btn-sm bg-transparent text-[12px]"
                    >
                      Buka Blokir
                    </button>
                  ) : (
                    <button type="button" onClick={() => openBan(user)} className="btn-danger btn-sm text-[12px]">
                      Blokir
                    </button>
                  )}
                </span>
                {user.bannedAt && user.banReason && (
                  <p className="col-span-full m-0 text-[12px] text-muted">
                    Diblokir {shortDate(user.bannedAt)} — alasan: {user.banReason}
                  </p>
                )}
                {expandedId === user.id && (
                  <UserDocuments
                    state={docsByUser[user.id]}
                    onDelete={(doc) => {
                      setError(null);
                      setNotice(null);
                      setDeleteTarget({ user, doc });
                    }}
                  />
                )}
              </div>
            ))}

            {filtered !== null && filtered.length === 0 && (
              <p className="border-t border-line px-4.5 py-10 text-center text-[14px] text-muted">
                Tidak ada pengguna yang cocok dengan filter.
              </p>
            )}
          </div>
        </div>
      </div>

      {banTarget && (
        <ConfirmModal
          title="Blokir Pengguna?"
          message={
            <>
              {banTarget.name} ({banTarget.email}) tidak akan bisa login dan semua sesinya langsung dicabut. Dokumen
              yang sudah diunggah tidak ikut dihapus.
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Alasan pemblokiran (wajib, min. 5 karakter)"
                aria-label="Alasan pemblokiran"
                className="input-textarea mt-3 text-[14px]"
              />
            </>
          }
          confirmLabel="Ya, Blokir"
          danger
          busy={busy}
          confirmDisabled={reason.trim().length < MIN_REASON_LENGTH}
          onConfirm={() => void handleBan(banTarget)}
          onCancel={() => setBanTarget(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Hapus Dokumen Permanen?"
          message={
            <>
              &quot;{deleteTarget.doc.title}&quot; milik {deleteTarget.user.name} akan dihapus permanen beserta file-nya di
              storage. Tindakan ini tidak bisa dibatalkan. Dokumen yang pernah punya transaksi berhasil tidak bisa dihapus
              (gunakan Unpublish di menu Dokumen).
            </>
          }
          confirmLabel="Ya, Hapus"
          danger
          busy={busy}
          onConfirm={() => void handleDeleteDoc(deleteTarget.user, deleteTarget.doc)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {unbanTarget && (
        <ConfirmModal
          title="Buka Blokir?"
          message={<>{unbanTarget.name} akan bisa login kembali ke Deacad.</>}
          confirmLabel="Ya, Buka Blokir"
          busy={busy}
          onConfirm={() => void handleUnban(unbanTarget)}
          onCancel={() => setUnbanTarget(null)}
        />
      )}
    </div>
  );
}

// Panel daftar dokumen satu user — tampil di bawah row-nya (col-span-full di grid row).
function UserDocuments({
  state,
  onDelete,
}: {
  state: UserDocsState;
  onDelete: (doc: AdminUserDocument) => void;
}) {
  return (
    <div className="animate-fade-in col-span-full rounded-sm border border-line bg-surface p-3">
      {(state === undefined || state === "loading") && <div className="skeleton h-5 w-full" />}
      {state === "error" && <p className="m-0 text-[13px] text-danger">Gagal memuat dokumen user ini.</p>}
      {Array.isArray(state) && state.length === 0 && (
        <p className="m-0 text-[13px] text-muted">User ini belum mengunggah dokumen.</p>
      )}
      {Array.isArray(state) &&
        state.map((doc) => (
          <div
            key={doc.id}
            className="grid grid-cols-[2fr_0.5fr_0.8fr_1fr_1.2fr] items-center gap-2 border-b border-line py-2 text-[12px] last:border-b-0"
          >
            <span className="truncate font-medium">{doc.title}</span>
            <span className="uppercase text-muted">{doc.fileType}</span>
            <span>
              <StatusBadge status={doc.status} />
            </span>
            <span className="text-muted">
              {doc.viewCount} dilihat · {doc.downloadCount} unduh · {shortDate(doc.createdAt)}
            </span>
            <span className="flex items-center gap-2">
              <a
                href={doc.originalFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary btn-sm bg-transparent text-[12px]"
              >
                Buka File
              </a>
              <button type="button" onClick={() => onDelete(doc)} className="btn-danger btn-sm text-[12px]">
                Hapus
              </button>
            </span>
          </div>
        ))}
    </div>
  );
}
