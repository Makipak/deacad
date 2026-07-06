import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { AuthenticatedUser } from "../types/authenticated-user.js";

// Shortcut ambil user yang sudah divalidasi JwtAuthGuard, dipasang guard ke request.user.
// Pemakaian: findOne(@CurrentUser() user: AuthenticatedUser)
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
