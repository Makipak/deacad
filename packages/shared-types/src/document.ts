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
  // Sampul kartu dokumen: thumbnail kecil halaman 1 dari worker, atau fallback gambar halaman 1
  // penuh yang di-coalesce API untuk dokumen lama (documents.service.ts). Null selama processing.
  thumbnailUrl: z.url().nullable(),
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
  page: z.int().positive().default(1), // pagination bernomor (offset) — halaman mulai dari 1.
  limit: z.int().positive().max(50).default(12), // 12 = pas untuk grid 3 & 4 kolom.
});
export type DocumentSearchQuery = z.infer<typeof documentSearchQuerySchema>;

// Baris dokumen milik satu user di menu Pengguna admin (GET /users/:id/documents) — semua status,
// plus URL file asli supaya admin bisa memeriksa isinya sebelum memutuskan menghapus.
export const adminUserDocumentSchema = documentSchema
  .pick({ id: true, title: true, fileType: true, status: true, viewCount: true, downloadCount: true, createdAt: true })
  .extend({ originalFileUrl: z.url() });
export type AdminUserDocument = z.infer<typeof adminUserDocumentSchema>;
