import { z } from "zod";

// Dua jenis transaksi yang bisa di-charge terpisah (toggle independen di admin).
export const transactionTypeSchema = z.enum(["upload", "download"]);
export type TransactionType = z.infer<typeof transactionTypeSchema>;

// Semua status Midtrans yang di-handle eksplisit (ARCHITECTURE.md #9) dipetakan ke status internal ini.
export const transactionStatusSchema = z.enum([
  "pending",
  "paid",
  "failed",
  "expired",
  "refunded",
]);
export type TransactionStatus = z.infer<typeof transactionStatusSchema>;

export const transactionSchema = z.object({
  id: z.cuid(),
  userId: z.cuid(),
  documentId: z.cuid(),
  type: transactionTypeSchema,
  amount: z.int().positive(), // integer Rupiah penuh — hindari floating point (ARCHITECTURE.md #9).
  status: transactionStatusSchema,
  midtransOrderId: z.string(),
  createdAt: z.iso.datetime(),
});
export type Transaction = z.infer<typeof transactionSchema>;

// Payload memulai transaksi dari frontend — amount SENGAJA tidak ada di sini,
// harga selalu dihitung backend dari SettingsService (cegah payment amount tampering).
export const createTransactionInputSchema = z.object({
  documentId: z.cuid(),
  type: transactionTypeSchema,
  // Idempotency key dibuat sekali oleh frontend saat klik pertama (ARCHITECTURE.md #9).
  idempotencyKey: z.uuid(),
});
export type CreateTransactionInput = z.infer<typeof createTransactionInputSchema>;

// Payload webhook Midtrans — hanya field yang benar-benar dipakai untuk verifikasi & sync status.
export const midtransWebhookSchema = z.object({
  order_id: z.string(),
  transaction_status: z.enum([
    "capture",
    "settlement",
    "pending",
    "deny",
    "cancel",
    "expire",
    "refund",
    "partial_refund",
  ]),
  fraud_status: z.string().optional(),
  gross_amount: z.string(), // Midtrans kirim string, di-parse & dicocokkan ke amount tersimpan di DB.
  signature_key: z.string(),
  status_code: z.string(),
});
export type MidtransWebhookPayload = z.infer<typeof midtransWebhookSchema>;
