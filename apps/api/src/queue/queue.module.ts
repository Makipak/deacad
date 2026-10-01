import { Module } from "@nestjs/common";
import { ConvertQueueService } from "./convert-queue.service.js";

// Antrean convert sekarang cuma tabel Postgres (convert_jobs) — tidak ada koneksi Redis/BullMQ lagi.
@Module({
  providers: [ConvertQueueService],
  exports: [ConvertQueueService],
})
export class QueueModule {}
