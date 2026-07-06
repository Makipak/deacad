import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { updateSettingsInputSchema, type UpdateSettingsInput } from "@deacad/shared-types";
import { Public } from "../common/decorators/public.decorator.js";
import { Roles } from "../common/decorators/roles.decorator.js";
import { RolesGuard } from "../common/guards/roles.guard.js";
import { CurrentUser } from "../common/decorators/current-user.decorator.js";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe.js";
import type { AuthenticatedUser } from "../common/types/authenticated-user.js";
import { AuditLogsService } from "../audit-logs/audit-logs.service.js";
import { SettingsService } from "./settings.service.js";

@Controller("settings")
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  // Publik — frontend (termasuk guest belum login) perlu tahu apakah upload/download
  // berbayar sebelum render tombol bayar, jadi endpoint ini sengaja dibuka lewat @Public().
  @Public()
  @Get()
  getSettings() {
    return this.settingsService.get();
  }

  @Patch()
  @Roles("admin")
  @UseGuards(RolesGuard)
  async updateSettings(
    @Body(new ZodValidationPipe(updateSettingsInputSchema)) patch: UpdateSettingsInput,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    const before = this.settingsService.get();
    const after = await this.settingsService.update(patch);

    // Semua toggle admin wajib tercatat di audit_logs (ARCHITECTURE.md #7 & #12).
    await this.auditLogsService.record({
      adminId: admin.id,
      action: "settings.update",
      targetId: "monetization",
      oldValue: before,
      newValue: after,
    });

    return after;
  }
}
