import { Injectable } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import type { Queue } from "bullmq";
import { CONVERT_QUEUE_NAME } from "./queue.module.js";

// Job payload disepakati bersama apps/worker — kalau field di sini berubah, worker juga harus ikut disesuaikan.
export interface ConvertJobData {
  documentId: string;
  originalFileUrl: string;
  fileType: "pdf" | "pptx";
}

// Producer sisi API — cuma nge-enqueue, TIDAK pernah proses convert di process ini
// (proses berat dipisah ke worker, ARCHITECTURE.md #3, supaya API utama tidak ikut lemot/hang).
@Injectable()
export class ConvertQueueService {
  constructor(@InjectQueue(CONVERT_QUEUE_NAME) private readonly queue: Queue<ConvertJobData>) {}

  async enqueue(data: ConvertJobData): Promise<void> {
    await this.queue.add("convert", data, {
      // Retry otomatis dengan backoff kalau LibreOffice crash/corrupt (ARCHITECTURE.md #9).
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: true,
      removeOnFail: false, // job gagal tetap disimpan supaya bisa diinspeksi admin.
    });
  }
}
