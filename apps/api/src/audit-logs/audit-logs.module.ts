import { Module } from "@nestjs/common";
import { AuditLogsService } from "./audit-logs.service.js";

@Module({
  providers: [AuditLogsService],
  exports: [AuditLogsService], // dipakai module lain (settings, documents, transactions) untuk mencatat aksi admin.
})
export class AuditLogsModule {}
