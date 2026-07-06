import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { prisma } from "@deacad/database";
import { MidtransService } from "./midtrans.service.js";
import { TransactionsService } from "./transactions.service.js";

const STALE_THRESHOLD_MS = 5 * 60 * 1000; // transaksi pending lebih tua dari 5 menit dianggap "lama".

// Reconciliation job (ARCHITECTURE.md #9, Webhook tidak pernah sampai): jangan cuma pasif
// nunggu webhook — cron ini aktif query Midtrans Get Status API untuk semua transaksi pending lama.
@Injectable()
export class ReconciliationCron {
  private readonly logger = new Logger(ReconciliationCron.name);

  constructor(
    private readonly midtransService: MidtransService,
    private readonly transactionsService: TransactionsService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async reconcilePendingTransactions(): Promise<void> {
    const staleBefore = new Date(Date.now() - STALE_THRESHOLD_MS);
    const stalePending = await prisma.transaction.findMany({
      where: { status: "pending", createdAt: { lt: staleBefore } },
      take: 100, // batasi per run supaya tidak membanjiri Midtrans API kalau backlog besar.
    });

    for (const transaction of stalePending) {
      try {
        const result = await this.midtransService.getStatus(transaction.midtransOrderId);
        await this.transactionsService.syncStatus(
          transaction.midtransOrderId,
          result.transaction_status,
        );
      } catch (error) {
        // Satu transaksi gagal di-cek tidak boleh menghentikan reconciliation transaksi lain.
        this.logger.error(`Reconciliation gagal untuk ${transaction.midtransOrderId}`, error as Error);
      }
    }
  }
}
