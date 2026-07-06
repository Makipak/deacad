import { randomUUID } from "node:crypto";
import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { prisma } from "@deacad/database";
import type { CreateTransactionInput } from "@deacad/shared-types";
import { SettingsService } from "../settings/settings.service.js";
import { ConvertQueueService } from "../queue/convert-queue.service.js";
import { MidtransService } from "./midtrans.service.js";

// Status Midtrans yang dianggap "transaksi selesai sukses" (ARCHITECTURE.md #9).
const PAID_STATUSES = new Set(["settlement", "capture"]);
const FAILED_STATUSES = new Set(["deny", "cancel"]);
const REFUND_STATUSES = new Set(["refund", "partial_refund"]);

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    private readonly settingsService: SettingsService,
    private readonly midtransService: MidtransService,
    private readonly convertQueueService: ConvertQueueService,
  ) {}

  async create(userId: string, input: CreateTransactionInput) {
    // Cek transaksi pending yang sudah ada untuk kombinasi user+document+type SEBELUM bikin baru
    // (ARCHITECTURE.md #9, Duplicate transaction).
    const existingPending = await prisma.transaction.findFirst({
      where: { userId, documentId: input.documentId, type: input.type, status: "pending" },
    });
    if (existingPending) {
      return this.buildSnapResponse(existingPending);
    }

    // idempotencyKey unique di kolom DB (constraint, bukan cuma cek manual) — cegah race condition TOCTOU.
    const existingByKey = await prisma.transaction.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (existingByKey) {
      return this.buildSnapResponse(existingByKey);
    }

    // Harga SELALU dihitung dari SettingsService di backend, tidak pernah dari body request client
    // (ARCHITECTURE.md #7, Payment Amount Tampering).
    const settings = this.settingsService.get();
    const amount = input.type === "upload" ? settings.uploadPrice : settings.downloadPrice;

    const document = await prisma.document.findUnique({ where: { id: input.documentId } });
    if (!document) throw new NotFoundException("Dokumen tidak ditemukan");

    const midtransOrderId = `deacad-${input.type}-${randomUUID()}`;
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        documentId: input.documentId,
        type: input.type,
        amount, // snapshot — perubahan harga admin setelah ini tidak mempengaruhi transaksi ini (ARCHITECTURE.md #4).
        midtransOrderId,
        idempotencyKey: input.idempotencyKey,
        status: "pending",
      },
    });

    return this.buildSnapResponse(transaction);
  }

  private async buildSnapResponse(transaction: { id: string; midtransOrderId: string; amount: number; userId: string }) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: transaction.userId } });
    try {
      const snap = await this.midtransService.createSnapToken({
        orderId: transaction.midtransOrderId,
        amount: transaction.amount,
        customerEmail: user.email,
        itemName: "Deacad",
      });
      return { transactionId: transaction.id, ...snap };
    } catch (error) {
      // Midtrans outage — tangkap error eksplisit, jangan biarkan frontend infinite loading (ARCHITECTURE.md #9).
      this.logger.error(`Gagal generate Snap token untuk ${transaction.midtransOrderId}`, error as Error);
      throw new BadRequestException("Gagal memulai pembayaran, coba lagi sebentar lagi");
    }
  }

  // Dipanggil dari dua tempat: WebhookController (real-time) dan reconciliation cron (polling aktif).
  // Satu method sama supaya logika transisi status TIDAK duplikat di dua tempat.
  async syncStatus(orderId: string, transactionStatus: string, grossAmount?: string): Promise<void> {
    // SELECT ... FOR UPDATE — row-level lock supaya webhook & reconciliation job yang jalan
    // bersamaan untuk order_id sama tidak saling override (ARCHITECTURE.md #9, Race condition).
    await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        Array<{ id: string; status: string; amount: number; type: string; document_id: string; user_id: string }>
      >`SELECT id, status, amount, type, document_id, user_id FROM transactions WHERE midtrans_order_id = ${orderId} FOR UPDATE`;
      const row = rows[0];
      if (!row) {
        this.logger.warn(`Webhook diterima untuk order_id tak dikenal: ${orderId}`);
        return;
      }

      // Transaksi berstatus final tidak diproses ulang meski webhook diterima berkali-kali (ARCHITECTURE.md #9).
      if (row.status === "paid" || row.status === "failed") return;

      if (grossAmount && Number(grossAmount) !== row.amount) {
        // gross_amount webhook dicocokkan ke amount tersimpan — mismatch = indikasi tampering, jangan diproses.
        this.logger.error(`Mismatch amount untuk ${orderId}: webhook=${grossAmount} db=${row.amount}`);
        return;
      }

      const nextStatus = this.mapMidtransStatus(transactionStatus);
      if (!nextStatus) return; // status "pending" Midtrans -> tidak ada perubahan, tetap tunggu.

      await tx.transaction.update({ where: { id: row.id }, data: { status: nextStatus } });

      if (nextStatus === "paid") {
        if (row.type === "download") {
          await tx.documentAccess.upsert({
            where: { userId_documentId: { userId: row.user_id, documentId: row.document_id } },
            update: {},
            create: { userId: row.user_id, documentId: row.document_id },
          });
        }
        if (row.type === "upload") {
          // Pembayaran upload sukses -> BARU enqueue convert (ARCHITECTURE.md #5) — sebelum ini file
          // sudah tersimpan di storage tapi belum diproses jadi gambar per halaman.
          const document = await tx.document.findUnique({ where: { id: row.document_id } });
          if (document) {
            await this.convertQueueService.enqueue({
              documentId: document.id,
              originalFileUrl: document.originalFileUrl,
              fileType: document.fileType,
            });
          }
        }
      }

      if (nextStatus === "refunded") {
        // Chargeback/refund -> revoke akses otomatis (ARCHITECTURE.md #9, Chargeback/fraud).
        await tx.documentAccess.deleteMany({
          where: { userId: row.user_id, documentId: row.document_id },
        });
      }
    });
  }

  private mapMidtransStatus(status: string): "paid" | "failed" | "expired" | "refunded" | null {
    if (PAID_STATUSES.has(status)) return "paid";
    if (FAILED_STATUSES.has(status)) return "failed";
    if (status === "expire") return "expired";
    if (REFUND_STATUSES.has(status)) return "refunded";
    return null; // "pending" atau status lain yang belum final.
  }

  async listForAdmin(status?: string) {
    return prisma.transaction.findMany({
      where: status ? { status: status as never } : undefined,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, email: true } }, document: { select: { title: true } } },
    });
  }

  // Tombol "cek ulang status" manual di admin panel (ARCHITECTURE.md #12) — trigger reconciliation on-demand.
  async manualRecheck(transactionId: string): Promise<void> {
    const transaction = await prisma.transaction.findUnique({ where: { id: transactionId } });
    if (!transaction) throw new NotFoundException("Transaksi tidak ditemukan");
    const midtransStatus = await this.midtransService.getStatus(transaction.midtransOrderId);
    await this.syncStatus(transaction.midtransOrderId, midtransStatus.transaction_status);
  }
}
