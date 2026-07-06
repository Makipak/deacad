import { z } from "zod";

// Tipe file yang didukung upload — dibatasi 2 nilai sesuai konsep produk (bukan sembarang office file).
export const fileTypeSchema = z.enum(["pdf", "pptx"]);
export type FileType = z.infer<typeof fileTypeSchema>;

// Status pipeline dokumen: processing → ready, atau failed/rejected.
export const documentStatusSchema = z.enum([
  "processing",
  "ready",
  "failed",
  "rejected",
]);
export type DocumentStatus = z.infer<typeof documentStatusSchema>;

// Satu halaman/slide hasil convert — ditampilkan sebagai slideshow, bukan render native file.
export const documentPageSchema = z.object({
  id: z.cuid(),
  pageNumber: z.int().positive(),
  imageUrl: z.url(),
  isWatermarked: z.boolean(),
});
export type DocumentPage = z.infer<typeof documentPageSchema>;

// Shape dokumen lengkap (dipakai di halaman detail).
export const documentSchema = z.object({
  id: z.cuid(),
  userId: z.cuid(),
  title: z.string().min(3).max(200),
  description: z.string().max(2000).nullable(),
  fileType: fileTypeSchema,
  status: documentStatusSchema,
  categoryId: z.cuid().nullable(),
  viewCount: z.int().nonnegative(),
  downloadCount: z.int().nonnegative(),
  createdAt: z.iso.datetime(),
  pages: z.array(documentPageSchema).optional(), // hanya di-include di endpoint detail, bukan list.
});
export type Document = z.infer<typeof documentSchema>;

// Payload form upload dari client — field file sendiri ditangani multipart, bukan lewat schema ini.
export const uploadDocumentInputSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  categoryId: z.cuid().optional(),
  // Checkbox pernyataan kepemilikan hak upload — lapis pertama moderasi (ARCHITECTURE.md #6).
  ownershipConfirmed: z.literal(true, {
    error: "Wajib menyatakan kepemilikan hak upload dokumen",
  }),
});
export type UploadDocumentInput = z.infer<typeof uploadDocumentInputSchema>;

// Query filter & sorting untuk halaman browse dokumen (ARCHITECTURE.md #11).
export const documentSearchQuerySchema = z.object({
  q: z.string().optional(),
  categoryId: z.cuid().optional(),
  fileType: fileTypeSchema.optional(),
  sort: z.enum(["terbaru", "terpopuler", "relevan"]).default("relevan"),
  cursor: z.string().optional(), // cursor pagination, bukan offset — lihat ARCHITECTURE.md #11.
  limit: z.int().positive().max(50).default(20),
});
export type DocumentSearchQuery = z.infer<typeof documentSearchQuerySchema>;
