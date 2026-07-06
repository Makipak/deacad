import {
  Injectable,
  type CanActivate,
  type ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator.js";
import type { AuthenticatedUser } from "../types/authenticated-user.js";

// Guard global (dipasang lewat APP_GUARD di app.module.ts) — DEFAULT MENOLAK semua request.
// Ini implementasi "fail-secure" dari ARCHITECTURE.md #7: endpoint baru otomatis ke-protect,
// developer harus SADAR menandai @Public() kalau memang mau endpoint terbuka.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    // Cek metadata @Public() di handler atau class — kalau ada, lolos tanpa cek token.
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractBearerToken(request);
    if (!token) {
      throw new UnauthorizedException("Token akses tidak ditemukan");
    }

    try {
      // Verifikasi signature + expiry access token (short-lived, stateless — tidak query DB).
      const payload = this.jwtService.verify<AuthenticatedUser>(token, {
        secret: process.env.JWT_ACCESS_SECRET,
      });
      // Tempel user hasil decode ke request supaya bisa dipakai @CurrentUser() dan RolesGuard.
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException("Token akses tidak valid atau kedaluwarsa");
    }
  }

  private extractBearerToken(request: Request): string | undefined {
    const header = request.headers.authorization;
    if (!header?.startsWith("Bearer ")) return undefined;
    return header.slice("Bearer ".length);
  }
}
