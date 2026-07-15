"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { LoginInput, RegisterInput, User, UserRole } from "@deacad/shared-types";
import { apiFetch } from "./api-client";

type AuthUser = Pick<User, "id" | "role">;

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  // "loading" cuma sebentar di awal mount selagi coba restore sesi dari refresh token cookie.
  status: "loading" | "authenticated" | "unauthenticated";
  login: (input: LoginInput) => Promise<AuthUser>;
  register: (input: RegisterInput) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Access token disimpan di memori (state React), BUKAN localStorage — hilang saat full reload,
// dipulihkan lagi lewat POST /auth/refresh (httpOnly cookie) di effect di bawah (ARCHITECTURE.md #8).
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");

  useEffect(() => {
    let cancelled = false;

    apiFetch<{ accessToken: string }>("/auth/refresh", { method: "POST" })
      .then((res) => apiFetch<User>("/users/me", { accessToken: res.accessToken }).then((me) => ({ res, me })))
      .then(({ res, me }) => {
        if (cancelled) return;
        setAccessToken(res.accessToken);
        setUser({ id: me.id, role: me.role });
        setStatus("authenticated");
      })
      .catch(() => {
        if (!cancelled) setStatus("unauthenticated");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const res = await apiFetch<{ accessToken: string; user: { id: string; role: UserRole } }>("/auth/login", {
      method: "POST",
      body: input,
    });
    setAccessToken(res.accessToken);
    setUser(res.user);
    setStatus("authenticated");
    return res.user;
  }, []);

  const register = useCallback(
    async (input: RegisterInput) => {
      await apiFetch<{ message: string }>("/auth/register", { method: "POST", body: input });
      // Register cuma kirim email verifikasi, tidak langsung login (auth.service.ts) — tapi login
      // sendiri tidak mengecek emailVerified, jadi susulkan login otomatis pakai kredensial yang
      // sama supaya user langsung masuk tanpa menunggu klik link verifikasi dulu.
      return login({ email: input.email, password: input.password });
    },
    [login],
  );

  const logout = useCallback(async () => {
    await apiFetch("/auth/logout", { method: "POST" }).catch(() => {});
    setAccessToken(null);
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  return (
    <AuthContext.Provider value={{ user, accessToken, status, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam <AuthProvider>");
  return ctx;
}
