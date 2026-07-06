"use client";

import Link from "next/link";
import { useState } from "react";

// Form registrasi demo — field mengikuti registerInputSchema di @deacad/shared-types.
// Di production: submit ke POST /auth/register, lalu user harus verifikasi email dulu (ARCHITECTURE.md #8)
// sebelum bisa login penuh.
export default function RegisterPage() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-semibold">Daftar</h1>

      {submitted ? (
        <p className="mt-4 text-sm" style={{ color: "var(--color-muted)" }}>
          Registrasi berhasil (demo). Cek email untuk verifikasi.
        </p>
      ) : (
        <form
          className="mt-6 flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(true);
          }}
        >
          <div>
            <label className="block text-sm font-medium">Nama</label>
            <input
              required
              minLength={2}
              type="text"
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--color-border)" }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Email</label>
            <input
              required
              type="email"
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--color-border)" }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Password</label>
            <input
              required
              minLength={8}
              type="password"
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--color-border)" }}
            />
          </div>
          <button
            type="submit"
            className="rounded-md px-4 py-2 text-sm text-white"
            style={{ background: "var(--color-primary)" }}
          >
            Daftar
          </button>
        </form>
      )}

      <p className="mt-4 text-sm" style={{ color: "var(--color-muted)" }}>
        Sudah punya akun?{" "}
        <Link href="/login" className="underline">
          Masuk
        </Link>
      </p>
    </div>
  );
}
