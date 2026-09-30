"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { PasswordInput } from "@/components/password-input";
import { ApiError } from "@/lib/api-client";

const EMAIL_PATTERN = /\S+@\S+\.\S+/;

// Form registrasi — field mengikuti registerInputSchema di @deacad/shared-types.
// Backend cuma kirim email verifikasi (belum langsung login, ARCHITECTURE.md #8), tapi login
// sendiri tidak mengecek emailVerified — AuthProvider.register() susulkan login otomatis, lalu
// halaman ini menampilkan state "Cek Email Kamu" (desain Login Register), lalu user wajib mengisi
// data diri di /lengkapi-profil sebelum bisa ke beranda.
export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [registered, setRegistered] = useState(false);

  const emailInvalid = emailTouched && email.length > 0 && !EMAIL_PATTERN.test(email);
  const confirmMismatch = confirmTouched && confirm.length > 0 && confirm !== password;

  if (registered) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4 py-10">
        <div className="animate-slide-up w-full max-w-105 rounded-lg border border-line bg-elevated p-8 text-center shadow-(--shadow-hover) sm:px-8 sm:py-9">
          <div
            aria-hidden
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-subtle text-2xl font-bold text-primary"
          >
            ✓
          </div>
          <h1 className="mb-2.5 font-serif text-[22px] font-semibold">Cek Email Kamu</h1>
          <p className="mb-6 text-[14px] leading-relaxed text-muted">
            Kami sudah kirim tautan verifikasi ke <strong className="text-fg">{email}</strong>. Akun
            kamu sudah bisa dipakai, tapi verifikasi email membantu mengamankan akses transaksi.
          </p>
          <button
            type="button"
            onClick={() => router.push("/lengkapi-profil")}
            className="btn-primary h-12 w-full rounded-md"
          >
            Lanjut Lengkapi Data Diri
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-10">
      <div className="animate-slide-up w-full max-w-105 rounded-lg border border-line bg-elevated p-8 shadow-(--shadow-hover) sm:px-8 sm:py-9">
        <h1 className="text-center font-serif text-2xl font-semibold">Buat Akun Deacad</h1>
        <p className="mb-6 mt-1 text-center text-[14px] text-muted">
          Bagikan dan temukan dokumen akademik dengan mudah.
        </p>

        <form
          className="flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (confirm !== password) {
              setConfirmTouched(true);
              return;
            }
            setError(null);
            setSubmitting(true);
            try {
              // Akun baru selalu role "user" (backend tidak punya cara bikin admin lewat register).
              await register({ name, email, password });
              setRegistered(true);
            } catch (err) {
              setError(err instanceof ApiError ? err.message : "Gagal mendaftar. Coba lagi.");
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {error && (
            <p className="rounded-sm border border-danger bg-danger-subtle px-3 py-2 text-[14px] text-danger">
              {error}
            </p>
          )}
          <div>
            <label className="field-label" htmlFor="register-name">
              Nama Lengkap
            </label>
            <input
              id="register-name"
              required
              minLength={2}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama sesuai identitas"
              className="input h-11 bg-surface"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="register-email">
              Email
            </label>
            <input
              id="register-email"
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setEmailTouched(true)}
              placeholder="nama@kampus.ac.id"
              aria-invalid={emailInvalid}
              className={`input h-11 bg-surface ${emailInvalid ? "border-danger" : ""}`}
            />
            {emailInvalid && <p className="field-error">Format email tidak valid.</p>}
          </div>
          <div>
            <label className="field-label" htmlFor="register-password">
              Kata Sandi
            </label>
            <PasswordInput
              id="register-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 8 karakter"
              className="input h-11 bg-surface"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="register-confirm">
              Konfirmasi Kata Sandi
            </label>
            <PasswordInput
              id="register-confirm"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onBlur={() => setConfirmTouched(true)}
              placeholder="Ulangi kata sandi"
              aria-invalid={confirmMismatch}
              className={`input h-11 bg-surface ${confirmMismatch ? "border-danger" : ""}`}
            />
            {confirmMismatch && <p className="field-error">Kata sandi tidak sama.</p>}
          </div>
          <button type="submit" disabled={submitting} className="btn-primary mt-1 h-12 w-full rounded-md">
            {submitting ? "Memproses..." : "Buat Akun"}
          </button>
        </form>

        <p className="mt-5 text-center text-[14px] text-muted">
          Sudah punya akun?{" "}
          <Link href="/login" className="font-medium text-primary">
            Masuk
          </Link>
        </p>
      </div>
    </div>
  );
}
