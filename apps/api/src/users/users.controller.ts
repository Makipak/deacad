import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from "@nestjs/common";
import {
  banUserInputSchema,
  updateProfileInputSchema,
  type BanUserInput,
  type UpdateProfileInput,
} from "@deacad/shared-types";
import { CurrentUser } from "../common/decorators/current-user.decorator.js";
import { Roles } from "../common/decorators/roles.decorator.js";
import { RolesGuard } from "../common/guards/roles.guard.js";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe.js";
import type { AuthenticatedUser } from "../common/types/authenticated-user.js";
import { UsersService } from "./users.service.js";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Butuh login (guard global default protect), tidak butuh role tertentu.
  @Get("me")
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findPublicProfile(user.id);
  }

  // Simpan/ubah profil (nama opsional + kampus, prodi, NIM/NIDN, HP). Selalu untuk user yang sedang login — id
  // diambil dari token, bukan dari body/URL (IDOR-safe).
  @Patch("me")
  updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(updateProfileInputSchema)) body: UpdateProfileInput,
  ) {
    return this.usersService.updateProfile(user.id, body);
  }

  @Get()
  @Roles("admin")
  @UseGuards(RolesGuard)
  listForAdmin() {
    return this.usersService.listForAdmin();
  }

  @Get(":id/documents")
  @Roles("admin")
  @UseGuards(RolesGuard)
  listDocuments(@Param("id") id: string) {
    return this.usersService.listDocuments(id);
  }

  // Blokir user — alasan wajib. adminId dari token (bukan body) supaya audit log tidak bisa dipalsukan.
  @Post(":id/ban")
  @HttpCode(HttpStatus.OK)
  @Roles("admin")
  @UseGuards(RolesGuard)
  ban(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(banUserInputSchema)) body: BanUserInput,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.usersService.ban(admin.id, id, body.reason);
  }

  @Post(":id/unban")
  @HttpCode(HttpStatus.OK)
  @Roles("admin")
  @UseGuards(RolesGuard)
  unban(@Param("id") id: string, @CurrentUser() admin: AuthenticatedUser) {
    return this.usersService.unban(admin.id, id);
  }
}
