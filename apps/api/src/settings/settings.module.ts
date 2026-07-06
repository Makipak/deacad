import { Module } from "@nestjs/common";
import { AuditLogsModule } from "../audit-logs/audit-logs.module.js";
import { SettingsController } from "./settings.controller.js";
import { SettingsService } from "./settings.service.js";

@Module({
  imports: [AuditLogsModule],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService], // dipakai documents.module (cek upload payment) & transactions.module (hitung harga).
})
export class SettingsModule {}
