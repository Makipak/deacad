import { Module } from "@nestjs/common";
import { SettingsModule } from "../settings/settings.module.js";
import { QueueModule } from "../queue/queue.module.js";
import { FileValidationService } from "../file-validation/file-validation.service.js";
import { StorageService } from "../common/storage/storage.service.js";
import { DocumentsController } from "./documents.controller.js";
import { DocumentsService } from "./documents.service.js";
import { DownloadAccessGuard } from "./guards/download-access.guard.js";

@Module({
  imports: [SettingsModule, QueueModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, FileValidationService, StorageService, DownloadAccessGuard],
  exports: [DocumentsService],
})
export class DocumentsModule {}
