"use client";

import Link from "next/link";
import { useState } from "react";

// Form login demo — field mengikuti loginInputSchema di @deacad/shared-types.
// Di production: submit ke POST /auth/login, access token disimpan di memori (bukan localStorage),
// refresh token otomatis di-set backend sebagai httpOnly cookie (ARCHITECTURE.md #8).
export default function LoginPage() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-semibold">Masuk</h1>

      {submitted ? (
        <p className="mt-4 text-sm" style={{ color: "var(--color-muted)" }}>
          Login berhasil (demo).
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
            Masuk
          </button>
        </form>
      )}

      <p className="mt-4 text-sm" style={{ color: "var(--color-muted)" }}>
        Belum punya akun?{" "}
        <Link href="/register" className="underline">
          Daftar
        </Link>
      </p>
    </div>
  );
}
