import { ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { prisma } from "@deacad/database";
import type { DocumentSearchQuery, UploadDocumentInput } from "@deacad/shared-types";
import { FileValidationService } from "../file-validation/file-validation.service.js";
import { StorageService } from "../common/storage/storage.service.js";
import { ConvertQueueService } from "../queue/convert-queue.service.js";
import { SettingsService } from "../settings/settings.service.js";

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly fileValidationService: FileValidationService,
    private readonly storageService: StorageService,
    private readonly convertQueueService: ConvertQueueService,
    private readonly settingsService: SettingsService,
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

    // Kalau upload berbayar, convert job SENGAJA tidak di-enqueue di sini — baru di-enqueue oleh
    // TransactionsService.syncStatus() setelah pembayaran Midtrans sukses (ARCHITECTURE.md #5).
    // Tanpa gate ini dokumen tetap ke-convert & published walau belum dibayar.
    if (!this.settingsService.get().uploadPaymentEnabled) {
      await this.convertQueueService.enqueue({
        documentId: document.id,
        originalFileUrl,
        fileType,
      });
    }

    return document;
  }

  // Search & discovery (ARCHITECTURE.md #11): full-text search + ranking relevance+popularitas,
  // filter kategori/tipe file, pagination bernomor (page + limit) dengan total untuk nomor halaman.
  async search(query: DocumentSearchQuery) {
    const where = {
      status: "ready" as const,
      // Dokumen milik user yang diblokir disembunyikan dari browse/search publik (data tetap ada — kembali
      // tampil otomatis kalau admin membuka blokirnya).
      user: { bannedAt: null },
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
    const fullWhere = {
      ...where,
      ...(query.q ? { title: { contains: query.q, mode: "insensitive" as const } } : {}),
    };

    const [total, documents] = await Promise.all([
      prisma.document.count({ where: fullWhere }),
      prisma.document.findMany({
        where: fullWhere,
        // id sebagai tie-breaker supaya urutan stabil antar halaman saat createdAt/downloadCount sama.
        orderBy: [orderBy, { id: "asc" as const }],
        take: query.limit,
        skip: (query.page - 1) * query.limit,
        include: {
          category: true,
          // Fallback sampul: dokumen yang di-convert sebelum kolom thumbnail_url ada belum punya
          // thumbnail kecil — pakai gambar halaman 1 full-res sebagai gantinya (di-coalesce di bawah).
          pages: { orderBy: { pageNumber: "asc" as const }, take: 1, select: { imageUrl: true } },
        },
      }),
    ]);

    return {
      items: documents.map(({ pages, ...document }) => ({
        ...document,
        thumbnailUrl: document.thumbnailUrl ?? pages[0]?.imageUrl ?? null,
      })),
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    };
  }

  async findOne(id: string) {
    // findFirst (bukan findUnique) supaya filter relasi pemilik-diblokir bisa ikut di query yang sama.
    const document = await prisma.document.findFirst({
      where: { id, user: { bannedAt: null } },
      include: { pages: { orderBy: { pageNumber: "asc" } }, category: true },
    });
    // Resource tidak ada, bukan status ready, ATAU pemiliknya diblokir -> 404, bukan 403 — hindari information leakage (ARCHITECTURE.md #7).
    if (!document || (document.status !== "ready" && document.status !== "processing")) {
      throw new NotFoundException("Dokumen tidak ditemukan");
    }
    await prisma.document.update({ where: { id }, data: { viewCount: { increment: 1 } } });
    return document;
  }

  // Dipanggil setelah DownloadAccessGuard meloloskan request — tinggal catat count & return URL asli.
  async recordDownload(id: string) {
    // Dokumen milik user yang diblokir tidak boleh diunduh lewat link/ID yang sudah tersebar.
    const visible = await prisma.document.findFirst({
      where: { id, user: { bannedAt: null } },
      select: { id: true },
    });
    if (!visible) throw new NotFoundException("Dokumen tidak ditemukan");

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

  // Hapus permanen oleh admin (mis. konten melanggar dari user yang diblokir). Transaction.document di schema
  // onDelete: Cascade — menghapus dokumen akan ikut menghapus catatan transaksinya, jadi dokumen yang pernah
  // menghasilkan transaksi paid/refunded DITOLAK (pakai Unpublish untuk menyembunyikannya, catatan keuangan utuh).
  async deleteByAdmin(id: string) {
    const document = await prisma.document.findUnique({
      where: { id },
      include: { pages: { select: { imageUrl: true } } },
    });
    if (!document) throw new NotFoundException("Dokumen tidak ditemukan");

    const financialRecords = await prisma.transaction.count({
      where: { documentId: id, status: { in: ["paid", "refunded"] } },
    });
    if (financialRecords > 0) {
      throw new ConflictException(
        "Dokumen ini punya riwayat transaksi berhasil/refund sehingga tidak bisa dihapus permanen. Gunakan Unpublish.",
      );
    }

    // DB dulu (sumber kebenaran), storage menyusul best-effort: gagal hapus file = objek yatim di storage,
    // jauh lebih ringan daripada baris DB yang menunjuk ke file yang sudah hilang.
    await prisma.document.delete({ where: { id } });
    try {
      await this.storageService.deleteByUrls([
        document.originalFileUrl,
        document.convertedPdfUrl,
        document.thumbnailUrl,
        ...document.pages.map((page) => page.imageUrl),
      ]);
    } catch (err) {
      this.logger.warn(`Dokumen ${id} terhapus dari DB tapi gagal membersihkan storage: ${String(err)}`);
    }

    return { id, title: document.title, userId: document.userId, status: document.status, fileType: document.fileType };
  }

  // Dipakai halaman profil user — semua dokumen milik sendiri, termasuk yang belum "ready"
  // (mis. masih "processing" menunggu pembayaran upload), bukan cuma yang sudah publik lewat search().
  async findMine(userId: string) {
    const documents = await prisma.document.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      // Fallback sampul yang sama dengan search() — dokumen processing belum punya halaman, tetap null.
      include: { pages: { orderBy: { pageNumber: "asc" as const }, take: 1, select: { imageUrl: true } } },
    });
    return documents.map(({ pages, ...document }) => ({
      ...document,
      thumbnailUrl: document.thumbnailUrl ?? pages[0]?.imageUrl ?? null,
    }));
  }

  async listForAdmin(status?: string) {
    return prisma.document.findMany({
      where: status ? { status: status as never } : undefined,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, email: true } } },
    });
  }
}
