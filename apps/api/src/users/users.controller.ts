import { Controller, Get, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator.js";
import { Roles } from "../common/decorators/roles.decorator.js";
import { RolesGuard } from "../common/guards/roles.guard.js";
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

  @Get()
  @Roles("admin")
  @UseGuards(RolesGuard)
  listForAdmin() {
    return this.usersService.listForAdmin();
  }
}
