import {
  Injectable,
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { ROLES_KEY } from "../decorators/roles.decorator.js";
import type { UserRole } from "@deacad/shared-types";

// Dipasang per-endpoint lewat @Roles('admin') + @UseGuards(RolesGuard).
// Jalan SETELAH JwtAuthGuard (request.user harus sudah ada).
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    // Endpoint tanpa @Roles() berarti semua role login boleh akses — guard ini no-op.
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user;
    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException("Tidak punya akses ke resource ini");
    }
    return true;
  }
}
