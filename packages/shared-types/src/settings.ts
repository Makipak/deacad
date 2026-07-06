import { z } from "zod";

// Bentuk value JSONB kolom settings — satu row per grup pengaturan monetisasi.
export const monetizationSettingsSchema = z.object({
  uploadPaymentEnabled: z.boolean(),
  downloadPaymentEnabled: z.boolean(),
  uploadPrice: z.int().nonnegative(), // Rupiah penuh, default 15000 (ARCHITECTURE.md #1).
  downloadPrice: z.int().nonnegative(),
});
export type MonetizationSettings = z.infer<typeof monetizationSettingsSchema>;

// Payload update settings dari admin panel — semua field opsional (partial update).
export const updateSettingsInputSchema = monetizationSettingsSchema.partial();
export type UpdateSettingsInput = z.infer<typeof updateSettingsInputSchema>;
