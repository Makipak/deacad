"use client";

import { useState } from "react";
import { updateProfileInputSchema, type User } from "@deacad/shared-types";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, ApiError } from "@/lib/api-client";

interface ProfileEditorProps {
  profile: User;
  onSaved: (user: User) => void;
}

// Kartu "Data Diri" di halaman profil: mode lihat + mode ubah (nama, kampus, prodi, NIM/NIDN, HP).
// Validasi pakai updateProfileInputSchema yang sama dengan backend; setelah simpan, user di
// AuthProvider ikut diperbarui supaya nama di navbar langsung berubah.
export function ProfileEditor({ profile, onSaved }: ProfileEditorProps) {
  const { accessToken, setUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile.name);
  const [university, setUniversity] = useState(profile.university ?? "");
  const [studyProgram, setStudyProgram] = useState(profile.studyProgram ?? "");
  const [studentId, setStudentId] = useState(profile.studentId ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [errors, setErrors] = useState<Partial<Record<string, boolean>>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function startEdit() {
    setName(profile.name);
    setUniversity(profile.university ?? "");
    setStudyProgram(profile.studyProgram ?? "");
    setStudentId(profile.studentId ?? "");
    setPhone(profile.phone ?? "");
    setErrors({});
    setError(null);
    setEditing(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const parsed = updateProfileInputSchema.safeParse({ name, university, studyProgram, studentId, phone });
    if (!parsed.success) {
      const next: Record<string, boolean> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] = true;
      setErrors(next);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const me = await apiFetch<User>("/users/me", { method: "PATCH", body: parsed.data, accessToken });
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
      onSaved(me);
      setEditing(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menyimpan profil. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  const rows: Array<[string, string | null]> = [
    ["Kampus / Universitas", profile.university],
    ["Program Studi", profile.studyProgram],
    ["NIM / NIDN", profile.studentId],
    ["Nomor HP", profile.phone],
  ];

  if (!editing) {
    return (
      <section className="mb-8 rounded-md border border-line bg-elevated p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">Data Diri</h2>
          <button type="button" onClick={startEdit} className="btn-secondary h-9 px-4 text-[14px]">
            Ubah Profil
          </button>
        </div>
        <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt className="text-[13px] text-muted">{label}</dt>
              <dd className="text-[15px]">{value || "—"}</dd>
            </div>
          ))}
        </dl>
      </section>
    );
  }

  const field = (
    id: string,
    key: string,
    label: string,
    value: string,
    set: (v: string) => void,
    hint: string,
    type = "text",
  ) => (
    <div>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        required
        type={type}
        value={value}
        onChange={(e) => set(e.target.value)}
        aria-invalid={Boolean(errors[key])}
        className={`input h-11 bg-surface ${errors[key] ? "border-danger" : ""}`}
      />
      {errors[key] && <p className="field-error">{hint}</p>}
    </div>
  );

  return (
    <section className="mb-8 rounded-md border border-line bg-elevated p-5">
      <h2 className="mb-4 text-[15px] font-semibold">Ubah Profil</h2>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {error && (
          <p className="rounded-sm border border-danger bg-danger-subtle px-3 py-2 text-[14px] text-danger">
            {error}
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          {field("edit-name", "name", "Nama Lengkap", name, setName, "Nama minimal 2 karakter.")}
          {field("edit-university", "university", "Kampus / Universitas", university, setUniversity, "Isi nama kampus (minimal 2 karakter).")}
          {field("edit-program", "studyProgram", "Program Studi / Jurusan", studyProgram, setStudyProgram, "Isi program studi (minimal 2 karakter).")}
          {field("edit-student-id", "studentId", "NIM / NIDN", studentId, setStudentId, "Isi NIM/NIDN (huruf/angka, minimal 3 karakter).")}
          {field("edit-phone", "phone", "Nomor HP / WhatsApp", phone, setPhone, "Nomor HP tidak valid (contoh: 081234567890).", "tel")}
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={saving} className="btn-primary h-11 px-6">
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
          <button type="button" onClick={() => setEditing(false)} disabled={saving} className="btn-secondary h-11 px-6">
            Batal
          </button>
        </div>
      </form>
    </section>
  );
}
