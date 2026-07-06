import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { createTransactionInputSchema, type CreateTransactionInput } from "@deacad/shared-types";
import { Roles } from "../common/decorators/roles.decorator.js";
import { RolesGuard } from "../common/guards/roles.guard.js";
import { CurrentUser } from "../common/decorators/current-user.decorator.js";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe.js";
import type { AuthenticatedUser } from "../common/types/authenticated-user.js";
import { TransactionsService } from "./transactions.service.js";

@Controller("transactions")
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  // Butuh login (guard global) — hasil Snap token cuma boleh diminta user yang benar-benar mau bayar.
  @Post()
  create(
    @Body(new ZodValidationPipe(createTransactionInputSchema)) body: CreateTransactionInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.transactionsService.create(user.id, body);
  }

  @Get("admin/all")
  @Roles("admin")
  @UseGuards(RolesGuard)
  listForAdmin(@Query("status") status?: string) {
    return this.transactionsService.listForAdmin(status);
  }

  @Post(":id/recheck")
  @Roles("admin")
  @UseGuards(RolesGuard)
  async recheck(@Param("id") id: string) {
    await this.transactionsService.manualRecheck(id);
    return { message: "Status transaksi sudah disinkronkan ulang" };
  }
}
