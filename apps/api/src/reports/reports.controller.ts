import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { createReportInputSchema, type CreateReportInput } from "@deacad/shared-types";
import { Roles } from "../common/decorators/roles.decorator.js";
import { RolesGuard } from "../common/guards/roles.guard.js";
import { CurrentUser } from "../common/decorators/current-user.decorator.js";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe.js";
import type { AuthenticatedUser } from "../common/types/authenticated-user.js";
import { AuditLogsService } from "../audit-logs/audit-logs.service.js";
import { ReportsService } from "./reports.service.js";

@Controller("reports")
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  // Butuh login (guard global) supaya laporan spam anonim lebih terkontrol — role apapun boleh lapor.
  @Post()
  create(
    @Body(new ZodValidationPipe(createReportInputSchema)) body: CreateReportInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.create(user.id, body);
  }

  @Get("pending")
  @Roles("admin")
  @UseGuards(RolesGuard)
  listPending() {
    return this.reportsService.listPending();
  }

  @Patch(":id/resolve")
  @Roles("admin")
  @UseGuards(RolesGuard)
  async resolve(@Param("id") id: string, @CurrentUser() admin: AuthenticatedUser) {
    const result = await this.reportsService.resolve(id, "resolved");
    await this.auditLogsService.record({
      adminId: admin.id,
      action: "report.resolve",
      targetId: id,
    });
    return result;
  }

  @Patch(":id/dismiss")
  @Roles("admin")
  @UseGuards(RolesGuard)
  async dismiss(@Param("id") id: string, @CurrentUser() admin: AuthenticatedUser) {
    const result = await this.reportsService.resolve(id, "dismissed");
    await this.auditLogsService.record({
      adminId: admin.id,
      action: "report.dismiss",
      targetId: id,
    });
    return result;
  }
}
