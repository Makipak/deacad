import { z } from "zod";

export const reportStatusSchema = z.enum(["pending", "resolved", "dismissed"]);
export type ReportStatus = z.infer<typeof reportStatusSchema>;

export const reportSchema = z.object({
  id: z.cuid(),
  documentId: z.cuid(),
  reporterId: z.cuid(),
  reason: z.string().min(10).max(1000),
  status: reportStatusSchema,
  createdAt: z.iso.datetime(),
});
export type Report = z.infer<typeof reportSchema>;

// Payload tombol "Laporkan" di halaman dokumen (lapis kedua moderasi, ARCHITECTURE.md #6).
export const createReportInputSchema = z.object({
  documentId: z.cuid(),
  reason: z.string().min(10).max(1000),
});
export type CreateReportInput = z.infer<typeof createReportInputSchema>;
