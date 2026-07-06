import { z } from "zod"; // Zod v4 — pakai top-level format API (z.email(), bukan z.string().email() yang sudah deprecated).

// Role user di sistem — dibuat union literal (bukan enum TS) supaya gampang di-infer di FE tanpa import enum runtime.
export const userRoleSchema = z.enum(["user", "admin"]);
export type UserRole = z.infer<typeof userRoleSchema>;

// Shape user publik — TANPA password_hash, field ini tidak boleh pernah keluar dari backend.
export const userSchema = z.object({
  id: z.cuid(), // format id sesuai keputusan IDOR di ARCHITECTURE.md — cuid, bukan integer.
  name: z.string().min(2).max(100),
  email: z.email(),
  role: userRoleSchema,
  emailVerified: z.boolean(),
  createdAt: z.iso.datetime(),
});
export type User = z.infer<typeof userSchema>;

// Payload registrasi — password minimal 8 karakter, validasi kekuatan lebih detail dilakukan di backend.
export const registerInputSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.email(),
  password: z.string().min(8).max(72), // 72 char = batas aman bcrypt.
});
export type RegisterInput = z.infer<typeof registerInputSchema>;

// Payload login.
export const loginInputSchema = z.object({
  email: z.email(),
  password: z.string().min(1), // panjang minimal login sengaja longgar, validasi kekuatan cukup saat register.
});
export type LoginInput = z.infer<typeof loginInputSchema>;
