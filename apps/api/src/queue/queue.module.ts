import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { ConvertQueueService } from "./convert-queue.service.js";
import { CONVERT_QUEUE_NAME } from "./queue.constants.js";

@Module({
  imports: [
    // Registrasi koneksi Redis sekali di sini, dipakai semua queue lewat BullModule.registerQueue.
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? "localhost",
        port: Number(process.env.REDIS_PORT ?? 6379),
      },
    }),
    BullModule.registerQueue({ name: CONVERT_QUEUE_NAME }),
  ],
  providers: [ConvertQueueService],
  exports: [ConvertQueueService],
})
export class QueueModule {}
