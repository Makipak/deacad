import { randomBytes, createHash } from "node:crypto";

// Token opaque acak (bukan JWT) — dipakai untuk email verification & refresh token,
// supaya bisa di-revoke sepihak dari server (JWT stateless tidak bisa di-revoke tanpa blocklist).
export function generateOpaqueToken(): string {
  return randomBytes(32).toString("hex");
}

// Yang disimpan di database SELALU hash-nya, bukan token mentah (ARCHITECTURE.md #8) —
// kalau DB bocor, token asli tetap tidak bisa direkonstruksi (SHA-256 satu arah).
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
