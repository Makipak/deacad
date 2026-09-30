"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { PasswordInput } from "@/components/password-input";
import { ApiError } from "@/lib/api-client";

const EMAIL_PATTERN = /\S+@\S+\.\S+/;

// Form login — field mengikuti loginInputSchema di @deacad/shared-types.
// Access token disimpan di memori lewat AuthProvider (bukan localStorage), refresh token
// otomatis di-set backend sebagai httpOnly cookie (ARCHITECTURE.md #8).
export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Validasi inline realtime (PRD §7.3), bukan hanya saat submit.
  const emailInvalid = emailTouched && email.length > 0 && !EMAIL_PATTERN.test(email);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-10">
      <div className="animate-slide-up w-full max-w-105 rounded-lg border border-line bg-elevated p-8 shadow-(--shadow-hover) sm:px-8 sm:py-9">
        <h1 className="text-center font-serif text-2xl font-semibold">Masuk ke Deacad</h1>
        <p className="mb-6 mt-1 text-center text-[14px] text-muted">
          Lanjutkan untuk mengakses dokumen dan riwayat kamu.
        </p>

        <form
          className="flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            setSubmitting(true);
            try {
              const user = await login({ email, password });
              router.push(user.role === "admin" ? "/admin" : "/");
            } catch (err) {
              setError(err instanceof ApiError ? err.message : "Gagal masuk. Coba lagi.");
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
            <label className="field-label" htmlFor="login-email">
              Email
            </label>
            <input
              id="login-email"
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
            <label className="field-label" htmlFor="login-password">
              Kata Sandi
            </label>
            <PasswordInput
              id="login-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Kata sandi akun kamu"
              className="input h-11 bg-surface"
            />
          </div>
          <button type="submit" disabled={submitting} className="btn-primary mt-1 h-12 w-full rounded-md">
            {submitting ? "Memproses..." : "Masuk"}
          </button>
        </form>

        <p className="mt-5 text-center text-[14px] text-muted">
          Belum punya akun?{" "}
          <Link href="/register" className="font-medium text-primary">
            Daftar
          </Link>
        </p>
      </div>
    </div>
  );
}
