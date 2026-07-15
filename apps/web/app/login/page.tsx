"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api-client";

// Form login — field mengikuti loginInputSchema di @deacad/shared-types.
// Access token disimpan di memori lewat AuthProvider (bukan localStorage), refresh token
// otomatis di-set backend sebagai httpOnly cookie (ARCHITECTURE.md #8).
export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-semibold">Masuk</h1>

      <form
        className="mt-6 flex flex-col gap-4"
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
          <p className="rounded-md border px-3 py-2 text-sm" style={{ borderColor: "#f87171", color: "#dc2626" }}>
            {error}
          </p>
        )}
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
          {submitting ? "Memproses..." : "Masuk"}
        </button>
      </form>

      <p className="mt-4 text-sm" style={{ color: "var(--color-muted)" }}>
        Belum punya akun?{" "}
        <Link href="/register" className="underline">
          Daftar
        </Link>
      </p>
    </div>
  );
}
