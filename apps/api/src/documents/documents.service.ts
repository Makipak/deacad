import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@deacad/database";
import type { DocumentSearchQuery, UploadDocumentInput } from "@deacad/shared-types";
import { FileValidationService } from "../file-validation/file-validation.service.js";
import { StorageService } from "../common/storage/storage.service.js";
import { ConvertQueueService } from "../queue/convert-queue.service.js";

@Injectable()
export class DocumentsService {
  constructor(
    private readonly fileValidationService: FileValidationService,
    private readonly storageService: StorageService,
    private readonly convertQueueService: ConvertQueueService,
  ) {}

  async upload(userId: string, input: UploadDocumentInput, file: Express.Multer.File) {
    // Validasi magic bytes dulu SEBELUM apa pun disimpan (ARCHITECTURE.md #7).
    const fileType = await this.fileValidationService.validate(file);
    const originalFileUrl = await this.storageService.upload(
      file.buffer,
      file.originalname,
      file.mimetype,
    );

    const document = await prisma.document.create({
      data: {
        userId,
        title: input.title,
        description: input.description,
        categoryId: input.categoryId,
        fileType,
        originalFileUrl,
        status: "processing",
      },
    });

    // Auto-publish begitu convert selesai (hybrid moderation, ARCHITECTURE.md #6) —
    // enqueue job convert, job ini yang nanti ubah status jadi "ready" lewat worker.
    await this.convertQueueService.enqueue({
      documentId: document.id,
      originalFileUrl,
      fileType,
    });

    return document;
  }

  // Search & discovery (ARCHITECTURE.md #11): full-text search + ranking relevance+popularitas,
  // filter kategori/tipe file, cursor pagination (bukan offset — lebih stabil di halaman jauh).
  async search(query: DocumentSearchQuery) {
    const where = {
      status: "ready" as const,
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.fileType ? { fileType: query.fileType } : {}),
    };

    const orderBy =
      query.sort === "terbaru"
        ? { createdAt: "desc" as const }
        : query.sort === "terpopuler"
          ? { downloadCount: "desc" as const }
          : { createdAt: "desc" as const }; // "relevan" tanpa q jatuh balik ke terbaru; dengan q pakai raw query search_vector (lihat catatan di bawah).

    // Catatan: pencarian teks (q) idealnya pakai websearch_to_tsquery + ts_rank lewat $queryRaw
    // ke kolom search_vector (ARCHITECTURE.md #11) — di sini disederhanakan jadi filter title
    // "contains" dulu supaya demo tetap jalan tanpa migration search_vector diterapkan lebih dulu.
    const documents = await prisma.document.findMany({
      where: {
        ...where,
        ...(query.q ? { title: { contains: query.q, mode: "insensitive" as const } } : {}),
      },
      orderBy,
      take: query.limit,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      include: { category: true },
    });

    return {
      items: documents,
      nextCursor: documents.length === query.limit ? documents[documents.length - 1]!.id : null,
    };
  }

  async findOne(id: string) {
    const document = await prisma.document.findUnique({
      where: { id },
      include: { pages: { orderBy: { pageNumber: "asc" } }, category: true },
    });
    // Resource tidak ada ATAU bukan status ready -> 404, bukan 403 — hindari information leakage (ARCHITECTURE.md #7).
    if (!document || (document.status !== "ready" && document.status !== "processing")) {
      throw new NotFoundException("Dokumen tidak ditemukan");
    }
    await prisma.document.update({ where: { id }, data: { viewCount: { increment: 1 } } });
    return document;
  }

  // Dipanggil setelah DownloadAccessGuard meloloskan request — tinggal catat count & return URL asli.
  async recordDownload(id: string) {
    const document = await prisma.document.update({
      where: { id },
      data: { downloadCount: { increment: 1 } },
    });
    return { downloadUrl: document.convertedPdfUrl ?? document.originalFileUrl };
  }

  // Dipakai IDOR check: query di-scope where { id, userId } sekaligus, BUKAN findById lalu cek belakangan
  // (ARCHITECTURE.md #7).
  async assertOwnership(id: string, userId: string): Promise<void> {
    const document = await prisma.document.findFirst({ where: { id, userId } });
    if (!document) throw new ForbiddenException("Bukan pemilik dokumen ini");
  }

  async unpublish(id: string): Promise<void> {
    const document = await prisma.document.findUnique({ where: { id } });
    if (!document) throw new NotFoundException("Dokumen tidak ditemukan");
    await prisma.document.update({ where: { id }, data: { status: "rejected" } });
  }

  async listForAdmin(status?: string) {
    return prisma.document.findMany({
      where: status ? { status: status as never } : undefined,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, email: true } } },
    });
  }
}
