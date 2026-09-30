"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { isProfileComplete, type LoginInput, type RegisterInput, type User, type UserRole } from "@deacad/shared-types";
import { apiFetch } from "./api-client";

// name+email ikut disimpan untuk navbar (avatar inisial + header dropdown, desain Landing Browse).
type AuthUser = Pick<User, "id" | "name" | "email" | "role" | "university" | "studyProgram" | "studentId" | "phone">;

function toAuthUser(me: User): AuthUser {
  const { id, name, email, role, university, studyProgram, studentId, phone } = me;
  return { id, name, email, role, university, studyProgram, studentId, phone };
}

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  // "loading" cuma sebentar di awal mount selagi coba restore sesi dari refresh token cookie.
  status: "loading" | "authenticated" | "unauthenticated";
  // true kalau user (non-admin) sudah mengisi data diri — dipakai ProfileGate untuk redirect.
  profileComplete: boolean;
  // Ganti data user di memori setelah profil disimpan (tanpa perlu reload/refresh token).
  setUser: (user: AuthUser) => void;
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
        setUser(toAuthUser(me));
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
    // Response login cuma {id, role} (auth.service.ts) — susulkan GET /users/me untuk name+email.
    const me = await apiFetch<User>("/users/me", { accessToken: res.accessToken });
    const authUser = toAuthUser(me);
    setAccessToken(res.accessToken);
    setUser(authUser);
    setStatus("authenticated");
    return authUser;
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

  // Admin tidak punya data diri akademik — dianggap selalu lengkap.
  const profileComplete = user !== null && (user.role === "admin" || isProfileComplete(user));

  return (
    <AuthContext.Provider
      value={{ user, accessToken, status, profileComplete, setUser, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam <AuthProvider>");
  return ctx;
}
