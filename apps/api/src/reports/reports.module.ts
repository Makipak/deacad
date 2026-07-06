import { Module } from "@nestjs/common";
import { AuditLogsModule } from "../audit-logs/audit-logs.module.js";
import { ReportsController } from "./reports.controller.js";
import { ReportsService } from "./reports.service.js";

@Module({
  imports: [AuditLogsModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
