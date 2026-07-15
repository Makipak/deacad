"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api-client";

// Form registrasi — field mengikuti registerInputSchema di @deacad/shared-types.
// Backend cuma kirim email verifikasi (belum langsung login, ARCHITECTURE.md #8), tapi login
// sendiri tidak mengecek emailVerified — AuthProvider.register() susulkan login otomatis
// (lihat lib/auth-context.tsx) supaya user baru langsung masuk ke halaman utama.
export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-semibold">Daftar</h1>

      <form
        className="mt-6 flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          setSubmitting(true);
          try {
            await register({ name, email, password });
            // Akun baru selalu role "user" (backend tidak punya cara bikin admin lewat register).
            router.push("/");
          } catch (err) {
            setError(err instanceof ApiError ? err.message : "Gagal mendaftar. Coba lagi.");
          } finally {
            setSubmitting(false);
          }
        }}
      >
        {error && (
          <p className="rounded-md border px-3 py-2 text-sm" style={{ borderColor: "#f87171", color: "#dc2626" }}>
            {error}
          </p>
        )}
        <div>
          <label className="block text-sm font-medium">Nama</label>
          <input
            required
            minLength={2}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--color-border)" }}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Email</label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--color-border)" }}
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md px-4 py-2 text-sm text-white disabled:opacity-60"
          style={{ background: "var(--color-primary)" }}
        >
          {submitting ? "Memproses..." : "Daftar"}
        </button>
      </form>

      <p className="mt-4 text-sm" style={{ color: "var(--color-muted)" }}>
        Sudah punya akun?{" "}
        <Link href="/login" className="underline">
          Masuk
        </Link>
      </p>
    </div>
  );
}
