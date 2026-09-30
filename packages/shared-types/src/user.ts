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
  // Data diri akademik — null selama user belum melengkapi profil.
  university: z.string().nullable(),
  studyProgram: z.string().nullable(),
  studentId: z.string().nullable(),
  phone: z.string().nullable(),
  createdAt: z.iso.datetime(),
});
export type User = z.infer<typeof userSchema>;

// Profil dianggap lengkap kalau keempat data diri terisi. Dipakai FE (gate redirect) dan BE.
export function isProfileComplete(user: Pick<User, "university" | "studyProgram" | "studentId" | "phone">): boolean {
  return Boolean(user.university && user.studyProgram && user.studentId && user.phone);
}

// Payload "Lengkapi Data Diri" — semua field wajib. Nomor HP format Indonesia (08xx / +628xx / 628xx).
export const completeProfileInputSchema = z.object({
  university: z.string().trim().min(2).max(150),
  studyProgram: z.string().trim().min(2).max(100),
  studentId: z
    .string()
    .trim()
    .min(3)
    .max(30)
    .regex(/^[A-Za-z0-9./-]+$/, "NIM/NIDN hanya boleh huruf, angka, titik, garis miring, atau strip"),
  phone: z
    .string()
    .trim()
    .regex(/^(\+62|62|0)8[1-9][0-9]{6,11}$/, "Nomor HP tidak valid (contoh: 081234567890)"),
});
export type CompleteProfileInput = z.infer<typeof completeProfileInputSchema>;

// Payload ubah profil dari halaman /profile — sama dengan data diri, plus nama (opsional).
export const updateProfileInputSchema = completeProfileInputSchema.extend({
  name: z.string().trim().min(2).max(100).optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileInputSchema>;

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

// Payload ban user dari dashboard admin — alasan wajib supaya ada jejak kenapa akun diblokir.
export const banUserInputSchema = z.object({
  reason: z.string().trim().min(5, "Alasan minimal 5 karakter").max(500),
});
export type BanUserInput = z.infer<typeof banUserInputSchema>;

// Baris daftar user di dashboard admin (GET /users) — tanpa password_hash & data sensitif lain.
export const adminUserSchema = userSchema
  .pick({ id: true, name: true, email: true, role: true, emailVerified: true, university: true, createdAt: true })
  .extend({
    bannedAt: z.iso.datetime().nullable(), // null = akun aktif.
    banReason: z.string().nullable(),
    documentCount: z.number().int().nonnegative(),
  });
export type AdminUser = z.infer<typeof adminUserSchema>;
