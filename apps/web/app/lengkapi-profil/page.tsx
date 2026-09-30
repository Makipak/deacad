"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { completeProfileInputSchema, type User } from "@deacad/shared-types";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, ApiError } from "@/lib/api-client";

// Halaman "Lengkapi Data Diri" — wajib diisi user baru (dan akun lama yang datanya kosong) sebelum
// bisa ke halaman lain. Pengalihan paksa ke sini dilakukan AdminGate (components/admin-gate.tsx);
// field mengikuti completeProfileInputSchema di @deacad/shared-types, divalidasi ulang di backend.
export default function CompleteProfilePage() {
  const { user, accessToken, status, setUser, logout } = useAuth();
  const router = useRouter();
  const [university, setUniversity] = useState("");
  const [studyProgram, setStudyProgram] = useState("");
  const [studentId, setStudentId] = useState("");
  const [phone, setPhone] = useState("");
  // Key = nama field yang gagal validasi; pesannya tetap (Indonesia), bukan pesan default Zod.
  const [errors, setErrors] = useState<Partial<Record<string, boolean>>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Belum login → ke /login. Gate yang sama menangani user yang sudah lengkap (dilempar ke beranda).
  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  if (status !== "authenticated" || !user) return null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const parsed = completeProfileInputSchema.safeParse({ university, studyProgram, studentId, phone });
    if (!parsed.success) {
      const next: Record<string, boolean> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] = true;
      setErrors(next);
      return;
    }
    setErrors({});

    setSubmitting(true);
    try {
      const me = await apiFetch<User>("/users/me", { method: "PATCH", body: parsed.data, accessToken });
      // Perbarui user di memori → gate melihat profil sudah lengkap dan melepas redirect.
      setUser({
        id: me.id,
        name: me.name,
        email: me.email,
        role: me.role,
        university: me.university,
        studyProgram: me.studyProgram,
        studentId: me.studentId,
        phone: me.phone,
      });
      router.replace("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menyimpan data diri. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-10">
      <div className="animate-slide-up w-full max-w-120 rounded-lg border border-line bg-elevated p-8 shadow-(--shadow-hover) sm:px-8 sm:py-9">
        <h1 className="text-center font-serif text-2xl font-semibold">Lengkapi Data Diri</h1>
        <p className="mb-6 mt-1 text-center text-[14px] text-muted">
          Hai, {user.name}. Isi data akademik kamu dulu sebelum mulai memakai Deacad.
        </p>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          {error && (
            <p className="rounded-sm border border-danger bg-danger-subtle px-3 py-2 text-[14px] text-danger">
              {error}
            </p>
          )}

          <div>
            <label className="field-label" htmlFor="profile-university">
              Kampus / Universitas
            </label>
            <input
              id="profile-university"
              required
              type="text"
              value={university}
              onChange={(e) => setUniversity(e.target.value)}
              placeholder="Contoh: Universitas Faletehan"
              aria-invalid={Boolean(errors.university)}
              className={`input h-11 bg-surface ${errors.university ? "border-danger" : ""}`}
            />
            {errors.university && <p className="field-error">Isi nama kampus (minimal 2 karakter).</p>}
          </div>

          <div>
            <label className="field-label" htmlFor="profile-program">
              Program Studi / Jurusan
            </label>
            <input
              id="profile-program"
              required
              type="text"
              value={studyProgram}
              onChange={(e) => setStudyProgram(e.target.value)}
              placeholder="Contoh: Informatika"
              aria-invalid={Boolean(errors.studyProgram)}
              className={`input h-11 bg-surface ${errors.studyProgram ? "border-danger" : ""}`}
            />
            {errors.studyProgram && (
              <p className="field-error">Isi program studi (minimal 2 karakter).</p>
            )}
          </div>

          <div>
            <label className="field-label" htmlFor="profile-student-id">
              NIM / NIDN
            </label>
            <input
              id="profile-student-id"
              required
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="Nomor induk mahasiswa / dosen"
              aria-invalid={Boolean(errors.studentId)}
              className={`input h-11 bg-surface ${errors.studentId ? "border-danger" : ""}`}
            />
            {errors.studentId && <p className="field-error">Isi NIM/NIDN (huruf/angka, minimal 3 karakter).</p>}
          </div>

          <div>
            <label className="field-label" htmlFor="profile-phone">
              Nomor HP / WhatsApp
            </label>
            <input
              id="profile-phone"
              required
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="081234567890"
              aria-invalid={Boolean(errors.phone)}
              className={`input h-11 bg-surface ${errors.phone ? "border-danger" : ""}`}
            />
            {errors.phone && <p className="field-error">Nomor HP tidak valid (contoh: 081234567890).</p>}
          </div>

          <button type="submit" disabled={submitting} className="btn-primary mt-1 h-12 w-full rounded-md">
            {submitting ? "Menyimpan..." : "Simpan & Lanjut"}
          </button>
        </form>

        <button
          type="button"
          onClick={async () => {
            await logout();
            router.replace("/login");
          }}
          className="mt-4 block w-full cursor-pointer text-center text-[13px] text-muted transition-colors hover:text-fg"
        >
          Keluar
        </button>
      </div>
    </div>
  );
}
